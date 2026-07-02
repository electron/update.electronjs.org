import http from 'node:http';
import crypto from 'node:crypto';
import assert from 'node:assert';
import semver from 'semver';
import { pino } from 'pino';
import requestIp from 'request-ip';

import { assetPlatform } from './asset-platform.ts';
import {
  PLATFORM,
  PLATFORM_ARCH,
  PLATFORM_ARCHS,
  UPDATE_FORMAT,
  UPDATE_FORMATS,
  SQUIRREL_TO_MSIX,
  type PlatformArch,
  type UpdateFormat,
} from './constants.ts';

const log = pino({
  level: process.env.NODE_ENV === 'test' ? 'error' : 'info',
});

// Upper bound on the size of a RELEASES asset we are willing to read from an
// untrusted, externally-hosted release. RELEASES files describe Squirrel.Windows
// packages and are only ever a few lines long; this cap is far larger than any
// legitimate file while preventing an attacker-controlled release from forcing
// the server to buffer (and scan) unbounded content.
const MAX_RELEASES_BYTES = 10 * 1024 * 1024;

// Read the response body as UTF-8 text, stopping once maxBytes have been read.
// fetch()'s Response.text() reads the entire body regardless of size, so we
// consume the stream manually to enforce a hard limit on untrusted input.
const readBoundedText = async (res: Response, maxBytes: number): Promise<string> => {
  const reader = res.body?.getReader();
  if (!reader) return '';

  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (total < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.byteLength;
    }
  } finally {
    await reader.cancel().catch(() => {});
  }

  let buf = Buffer.concat(chunks);
  if (buf.byteLength > maxBytes) buf = buf.subarray(0, maxBytes);
  return buf.toString('utf8');
};

// Locate the first whitespace-delimited (space-separated) token that references
// a `.nupkg` package in a RELEASES file. This replaces a `/[^ ]*\.nupkg/` regex
// whose greedy quantifier backtracked quadratically on long runs of non-space
// characters that never matched. The scan below is strictly linear in the size
// of the input so untrusted content cannot cause super-linear CPU consumption.
const findNupkgName = (body: string): string | null => {
  const marker = '.nupkg';
  const idx = body.toLowerCase().indexOf(marker);
  if (idx === -1) return null;

  // Expand to the surrounding space-delimited run. `[^ ]` in the original regex
  // excluded only the literal space character (0x20), so we match that exactly.
  let start = idx;
  while (start > 0 && body[start - 1] !== ' ') start--;
  let runEnd = idx + marker.length;
  while (runEnd < body.length && body[runEnd] !== ' ') runEnd++;

  // The greedy quantifier consumed the whole run then backtracked to the last
  // `.nupkg` within it; reproduce that by taking the final occurrence in the run.
  const lastRel = body.slice(start, runEnd).toLowerCase().lastIndexOf(marker);
  return body.slice(start, start + lastRel + marker.length);
};

interface Asset {
  name: string;
  browser_download_url: string;
}

interface Release {
  name?: string;
  tag_name: string;
  body?: string;
  draft?: boolean;
  prerelease?: boolean;
  assets: Asset[];
}

interface LatestRelease {
  name?: string;
  version: string;
  url: string;
  notes?: string;
  RELEASES?: string;
}

type LatestReleases = Partial<Record<PlatformArch, LatestRelease>>;

interface Cache {
  get(key: string): Promise<LatestReleases | null | undefined>;
  set(key: string, value: LatestReleases): Promise<void>;
  lock?(key: string): Promise<{ unlock(): Promise<void> }>;
}

export default class Updates {
  private token?: string;
  private cache: Cache;

  constructor({ token, cache }: { token?: string; cache: Cache }) {
    assert(cache, '.cache required');
    this.token = token;
    this.cache = cache;
  }

  listen(port?: number): http.Server;
  listen(cb: () => void): http.Server;
  listen(port: number, cb: () => void): http.Server;
  listen(portOrCb?: number | (() => void), cb?: () => void): http.Server {
    let port: number | undefined;
    let callback: (() => void) | undefined;

    if (typeof portOrCb === 'function') {
      callback = portOrCb;
    } else {
      port = portOrCb;
      callback = cb;
    }

    const server = http.createServer((req, res) => {
      const start = new Date();
      void this.handle(req, res)
        .catch((err: any) => {
          log.error(err);
          res.statusCode = err.statusCode || 500;
          // Never expose stack traces or internal details to remote clients;
          // detailed diagnostics are captured in the server-side log above.
          res.end('Internal Server Error');
        })
        .then(() => {
          log.debug(
            {
              method: req.method,
              url: req.url,
              status: res.statusCode,
              ipHash: this.hashIp(requestIp.getClientIp(req)),
              duration: new Date().valueOf() - start.valueOf(),
            },
            'request',
          );
        });
    });
    server.listen(port, callback);
    return server;
  }

  async handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const segs = (req.url || '').split(/[/?]/).filter(Boolean);
    const [account, repository] = segs;
    let platform = segs[2];

    if (platform === PLATFORM.WIN32) platform = PLATFORM_ARCH.WIN_X64;
    if (platform === PLATFORM.DARWIN) platform = PLATFORM_ARCH.DARWIN_X64;

    // Validate platform before parsing format
    if (!account || !repository || !platform) {
      redirect(res, 'https://github.com/electron/update.electronjs.org');
      return;
    } else if (!PLATFORM_ARCHS.includes(platform as PlatformArch)) {
      const message = `Unsupported platform: "${platform}". Supported: ${PLATFORM_ARCHS.join(
        ', ',
      )}.`;
      notFound(res, message);
      return;
    }

    // Detect optional format segment: /:platform/:format/:version
    // If segs[3] is a known update format, it's the format param;
    // otherwise it's the version (existing behavior).
    let format: UpdateFormat | undefined;
    let version: string | undefined;
    let file: string | undefined;

    if (segs[3] && UPDATE_FORMATS.includes(segs[3] as UpdateFormat)) {
      format = segs[3] as UpdateFormat;
      version = segs[4];
      file = segs[5];
    } else {
      version = segs[3];
      file = segs[4];
    }

    // Map win32 platform to MSIX variant when format is "msix"
    if (format === UPDATE_FORMAT.MSIX) {
      const msixPlatform = SQUIRREL_TO_MSIX[platform as keyof typeof SQUIRREL_TO_MSIX];
      if (msixPlatform) {
        platform = msixPlatform;
      } else {
        badRequest(
          res,
          `MSIX format is not supported for platform "${platform}". MSIX is available for: win32-x64, win32-arm64.`,
        );
        return;
      }
    }

    if (!version) {
      redirect(res, 'https://github.com/electron/update.electronjs.org');
    } else if (version && !semver.valid(version)) {
      badRequest(res, `Invalid SemVer: "${version}"`);
    } else if (file === 'RELEASES') {
      if (format === UPDATE_FORMAT.MSIX) {
        notFound(
          res,
          'The RELEASES endpoint is not available for MSIX updates. MSIX uses JSON responses from the base update URL.',
        );
        return;
      }
      await this.handleReleases(res, account, repository, platform as PlatformArch, version);
    } else {
      await this.handleUpdate(res, account, repository, platform as PlatformArch, version, format);
    }
  }

  async handleReleases(
    res: http.ServerResponse,
    account: string,
    repository: string,
    platform: PlatformArch,
    version: string,
  ): Promise<void> {
    const latest = await this.cachedGetLatest(account, repository, platform, version);
    if (!latest || !latest.RELEASES) return notFound(res);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.end(latest.RELEASES);
  }

  async handleUpdate(
    res: http.ServerResponse,
    account: string,
    repository: string,
    platform: PlatformArch,
    version: string,
    format?: UpdateFormat,
  ): Promise<void> {
    let latest = await this.cachedGetLatest(account, repository, platform, version);

    if (platform.includes(PLATFORM.DARWIN)) {
      const latestUniversal = await this.cachedGetLatest(
        account,
        repository,
        PLATFORM_ARCH.DARWIN_UNIVERSAL,
        version,
      );
      latest = latest || latestUniversal;

      if (latestUniversal && latest && semver.gt(latestUniversal.version, latest.version)) {
        log.info('Falling back to universal build for darwin');
        latest = latestUniversal;
      }
    }

    if (!latest) {
      let message: string;
      if (platform.includes(PLATFORM.DARWIN)) {
        message =
          'No updates found (needs asset matching .*-(mac|darwin|osx).*.zip in public repository)';
      } else if (format === UPDATE_FORMAT.MSIX) {
        message =
          'No updates found (needs asset matching .*-win32-(x64|arm64).*.msix in public repository)';
      } else {
        message =
          'No updates found (needs asset containing .*-win32-(x64|ia32|arm64) or .exe in public repository)';
      }
      notFound(res, message);
    } else if (semver.lte(latest.version, version)) {
      log.debug({ account, repository, platform, version }, 'up to date');
      noContent(res);
    } else {
      log.debug(
        {
          account,
          repository,
          platform,
          version,
          latest: latest.name || latest.version,
        },
        'update available',
      );
      json(res, {
        name: latest.name || latest.version,
        notes: latest.notes,
        url: latest.url,
      });
    }
  }

  async cachedGetLatest(
    account: string,
    repository: string,
    platform: PlatformArch,
    version: string,
  ): Promise<LatestRelease | null> {
    const tag = needsSpecificReleaseTag(account, repository, platform, version);

    // Encode each user-controlled segment and use `/` (which cannot appear
    // within a single URL path segment) as the tag delimiter, so that the tag
    // namespace can never collide with a repository name. Without this, a
    // request for repository `foo-<tag>` (no tag) would produce the same key
    // as repository `foo` with tag `<tag>`, allowing cache poisoning.
    const encodedAccount = encodeURIComponent(account);
    const encodedRepository = encodeURIComponent(repository);
    const key = tag
      ? `${encodedAccount}/${encodedRepository}/${encodeURIComponent(tag)}`
      : `${encodedAccount}/${encodedRepository}`;
    let latest = await this.cache.get(key);

    if (latest) {
      // reuse cache entries using the old non-arch-aware format
      if ('darwin' in latest && !latest[PLATFORM_ARCH.DARWIN_X64]) {
        latest[PLATFORM_ARCH.DARWIN_X64] = (latest as any).darwin as LatestRelease;
      }
      if ('win32' in latest && !latest[PLATFORM_ARCH.WIN_X64]) {
        latest[PLATFORM_ARCH.WIN_X64] = (latest as any).win32 as LatestRelease;
      }

      log.debug({ key }, 'cache hit');
      return latest[platform] || null;
    }

    let lock: { unlock(): Promise<void> } | undefined;
    if (this.cache.lock) {
      log.debug({ key }, 'lock acquiring');
      lock = await this.cache.lock(key);
      log.debug({ key }, 'lock acquired');
    }

    try {
      if (lock) {
        latest = await this.cache.get(key);
        if (latest) {
          log.debug({ key }, 'cache hit after lock');
          return latest[platform] ? latest[platform]! : null;
        }
      }

      try {
        latest = await this.getLatest(account, repository, platform, version);

        if (latest) {
          await this.cache.set(key, latest);
        } else {
          await this.cache.set(key, {});
        }
      } catch (err) {
        // Record a negative cache entry on failure so a single failing release
        // fetch cannot repeatedly deny updates for this repository while the
        // error condition persists.
        await this.cache.set(key, {});
        throw err;
      }

      return latest && latest[platform] ? latest[platform]! : null;
    } finally {
      // Always release the lock, even when getLatest or cache.set throws, so a
      // failing request never leaves the distributed lock held for its TTL.
      if (lock) {
        log.debug({ key }, 'lock releasing');
        await lock.unlock();
        log.debug({ key }, 'lock released');
      }
    }
  }

  async getLatest(
    account: string,
    repository: string,
    platform: PlatformArch,
    version: string,
  ): Promise<LatestReleases | null> {
    account = encodeURIComponent(account);
    repository = encodeURIComponent(repository);

    const tag = needsSpecificReleaseTag(account, repository, platform, version);

    const url = tag
      ? `https://api.github.com/repos/${account}/${repository}/releases/tags/${tag}`
      : `https://api.github.com/repos/${account}/${repository}/releases?per_page=100`;
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.preview',
    };
    if (this.token) headers.Authorization = `token ${this.token}`;
    const res = await fetch(url, { headers });
    log.debug({ account, repository, status: res.status }, 'github releases api');

    if (res.status === 403) {
      console.error('Rate Limited!');
      return null;
    }

    if (res.status >= 400) {
      return null;
    }

    const latest: LatestReleases = {};

    let releases = (await res.json()) as Release | Release[];
    if (!Array.isArray(releases)) {
      releases = [releases];
    }
    for (const release of releases) {
      if (!semver.valid(release.tag_name) || release.draft || release.prerelease) {
        continue;
      }

      for (const asset of release.assets) {
        const assetPlatformResult = assetPlatform(asset.name);
        if (assetPlatformResult && !latest[assetPlatformResult]) {
          latest[assetPlatformResult] = {
            name: release.name,
            version: release.tag_name,
            url: asset.browser_download_url,
            notes: release.body,
          };
        }
      }
    }

    for (const key of [PLATFORM_ARCH.WIN_X64, PLATFORM_ARCH.WIN_IA32, PLATFORM_ARCH.WIN_ARM64]) {
      const releaseForKey = latest[key];
      if (releaseForKey) {
        const rurl = `https://github.com/${account}/${repository}/releases/download/${releaseForKey.version}/RELEASES`;
        const rres = await fetch(rurl);
        if (rres.status < 400) {
          const body = await readBoundedText(rres, MAX_RELEASES_BYTES);
          const nupkgName = findNupkgName(body);
          assert(nupkgName);
          const nuPKG = rurl.replace('RELEASES', nupkgName);
          releaseForKey.RELEASES = body.replace(nupkgName, nuPKG);
        }
      }
    }

    return hasAnyAsset(latest) ? latest : null;
  }

  hashIp(ip: string | null | undefined): string | undefined {
    if (!ip) return undefined;
    return crypto.createHash('sha256').update(ip).digest('hex');
  }
}

// Any logic to require a specific release when updating should go here
const needsSpecificReleaseTag = (
  account: string,
  repository: string,
  platform: PlatformArch,
  version: string,
): string | null => {
  const FIDDLE_TRANSITION_VERSION = 'v0.35.1';

  if (
    account === 'electron' &&
    semver.lt(version, FIDDLE_TRANSITION_VERSION) &&
    ([PLATFORM_ARCH.DARWIN_X64, PLATFORM_ARCH.DARWIN_ARM64] as PlatformArch[]).includes(platform) &&
    repository === 'fiddle'
  ) {
    return FIDDLE_TRANSITION_VERSION;
  }

  return null;
};

const hasAnyAsset = (latest: LatestReleases): boolean => {
  return !!(
    latest[PLATFORM_ARCH.DARWIN_X64] ||
    latest[PLATFORM_ARCH.DARWIN_ARM64] ||
    latest[PLATFORM_ARCH.DARWIN_UNIVERSAL] ||
    latest[PLATFORM_ARCH.WIN_X64] ||
    latest[PLATFORM_ARCH.WIN_IA32] ||
    latest[PLATFORM_ARCH.WIN_ARM64] ||
    latest[PLATFORM_ARCH.WIN_X64_MSIX] ||
    latest[PLATFORM_ARCH.WIN_ARM64_MSIX]
  );
};

const notFound = (res: http.ServerResponse, message = 'Not found'): void => {
  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(message);
};

const badRequest = (res: http.ServerResponse, message: string): void => {
  res.statusCode = 400;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(message);
};

const noContent = (res: http.ServerResponse): void => {
  res.statusCode = 204;
  res.end();
};

const json = (res: http.ServerResponse, obj: any): void => {
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(obj));
};

// DO NOT PASS USER-SUPPLIED CONTENT TO THIS FUNCTION
// AS IT WILL REDIRECT A USER ANYWHERE
const redirect = (res: http.ServerResponse, url: string): void => {
  res.statusCode = 302;
  res.setHeader('Location', url);
  res.end(url);
};
