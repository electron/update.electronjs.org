import http from "node:http";
import crypto from "node:crypto";
import assert from "node:assert";
import semver from "semver";
import { pino } from "pino";
import requestIp from "request-ip";

import { assetPlatform } from "./asset-platform.js";
import {
  PLATFORM,
  PLATFORM_ARCH,
  PLATFORM_ARCHS,
  ENV,
  type PlatformArch,
} from "./constants.js";

// TODO: Nock does not support native fetch, use node-fetch instead
//       This dance will hopefully not be necessary once nock figures
//       out a way to mock Node's native fetch() implementation
let fetchFn = global.fetch;

if (process.env.NODE_ENV === "test") {
  const nodeFetch = await import("node-fetch");
  fetchFn = nodeFetch.default as unknown as typeof fetch;
}

const log = pino({
  level: process.env.NODE_ENV === "test" ? "error" : "info",
});

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
    assert(cache, ".cache required");
    this.token = token;
    this.cache = cache;
  }

  listen(port?: number): http.Server;
  listen(cb: () => void): http.Server;
  listen(port: number, cb: () => void): http.Server;
  listen(portOrCb?: number | (() => void), cb?: () => void): http.Server {
    let port: number | undefined;
    let callback: (() => void) | undefined;

    if (typeof portOrCb === "function") {
      callback = portOrCb;
    } else {
      port = portOrCb;
      callback = cb;
    }

    const server = http.createServer((req, res) => {
      const start = new Date();
      this.handle(req, res)
        .catch((err: any) => {
          log.error(err);
          res.statusCode = err.statusCode || 500;
          const msg =
            ENV === "production" ? "Internal Server Error" : err.stack;
          res.end(msg);
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
            "request"
          );
        });
    });
    server.listen(port, callback);
    return server;
  }

  async handle(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<void> {
    const segs = (req.url || "").split(/[/?]/).filter(Boolean);
    const [account, repository, , version, file] = segs;
    let platform = segs[2];

    if (platform === PLATFORM.WIN32) platform = PLATFORM_ARCH.WIN_X64;
    if (platform === PLATFORM.DARWIN) platform = PLATFORM_ARCH.DARWIN_X64;

    if (!account || !repository || !platform || !version) {
      redirect(res, "https://github.com/electron/update.electronjs.org");
    } else if (!PLATFORM_ARCHS.includes(platform as PlatformArch)) {
      const message = `Unsupported platform: "${platform}". Supported: ${PLATFORM_ARCHS.join(
        ", "
      )}.`;
      notFound(res, message);
    } else if (version && !semver.valid(version)) {
      badRequest(res, `Invalid SemVer: "${version}"`);
    } else if (file === "RELEASES") {
      await this.handleReleases(
        res,
        account,
        repository,
        platform as PlatformArch,
        version
      );
    } else {
      await this.handleUpdate(
        res,
        account,
        repository,
        platform as PlatformArch,
        version
      );
    }
  }

  async handleReleases(
    res: http.ServerResponse,
    account: string,
    repository: string,
    platform: PlatformArch,
    version: string
  ): Promise<void> {
    const latest = await this.cachedGetLatest(
      account,
      repository,
      platform,
      version
    );
    if (!latest || !latest.RELEASES) return notFound(res);
    res.end(latest.RELEASES);
  }

  async handleUpdate(
    res: http.ServerResponse,
    account: string,
    repository: string,
    platform: PlatformArch,
    version: string
  ): Promise<void> {
    let latest = await this.cachedGetLatest(
      account,
      repository,
      platform,
      version
    );

    if (platform.includes(PLATFORM.DARWIN)) {
      const latestUniversal = await this.cachedGetLatest(
        account,
        repository,
        PLATFORM_ARCH.DARWIN_UNIVERSAL,
        version
      );
      latest = latest || latestUniversal;

      if (
        latestUniversal &&
        latest &&
        semver.gt(latestUniversal.version, latest.version)
      ) {
        log.info("Falling back to universal build for darwin");
        latest = latestUniversal;
      }
    }

    if (!latest) {
      const message = platform.includes(PLATFORM.DARWIN)
        ? "No updates found (needs asset matching .*-(mac|darwin|osx).*.zip in public repository)"
        : "No updates found (needs asset containing .*-win32-(x64|ia32|arm64) or .exe in public repository)";
      notFound(res, message);
    } else if (semver.lte(latest.version, version)) {
      log.debug({ account, repository, platform, version }, "up to date");
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
        "update available"
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
    version: string
  ): Promise<LatestRelease | null> {
    const tag = needsSpecificReleaseTag(account, repository, platform, version);

    const key = tag
      ? `${account}/${repository}-${tag}`
      : `${account}/${repository}`;
    let latest = await this.cache.get(key);

    if (latest) {
      // reuse cache entries using the old non-arch-aware format
      if ("darwin" in latest && !latest[PLATFORM_ARCH.DARWIN_X64]) {
        latest[PLATFORM_ARCH.DARWIN_X64] = (latest as any)
          .darwin as LatestRelease;
      }
      if ("win32" in latest && !latest[PLATFORM_ARCH.WIN_X64]) {
        latest[PLATFORM_ARCH.WIN_X64] = (latest as any).win32 as LatestRelease;
      }

      log.debug({ key }, "cache hit");
      return latest[platform] || null;
    }

    let lock: { unlock(): Promise<void> } | undefined;
    if (this.cache.lock) {
      log.debug({ key }, "lock acquiring");
      lock = await this.cache.lock(key);
      log.debug({ key }, "lock acquired");
      latest = await this.cache.get(key);
      if (latest) {
        log.debug({ key }, "cache hit after lock");
        return latest[platform] ? latest[platform]! : null;
      }
    }

    latest = await this.getLatest(account, repository, platform, version);

    if (latest) {
      await this.cache.set(key, latest);
    } else {
      await this.cache.set(key, {});
    }

    if (lock) {
      log.debug({ key }, "lock releasing");
      await lock.unlock();
      log.debug({ key }, "lock released");
    }

    return latest && latest[platform] ? latest[platform]! : null;
  }

  async getLatest(
    account: string,
    repository: string,
    platform: PlatformArch,
    version: string
  ): Promise<LatestReleases | null> {
    account = encodeURIComponent(account);
    repository = encodeURIComponent(repository);

    const tag = needsSpecificReleaseTag(account, repository, platform, version);

    const url = tag
      ? `https://api.github.com/repos/${account}/${repository}/releases/tags/${tag}`
      : `https://api.github.com/repos/${account}/${repository}/releases?per_page=100`;
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.preview",
    };
    if (this.token) headers.Authorization = `token ${this.token}`;
    const res = await fetchFn(url, { headers });
    log.debug(
      { account, repository, status: res.status },
      "github releases api"
    );

    if (res.status === 403) {
      console.error("Rate Limited!");
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
      if (
        !semver.valid(release.tag_name) ||
        release.draft ||
        release.prerelease
      ) {
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
        if (hasAllAssets(latest)) {
          break;
        }
      }

      if (hasAllAssets(latest)) {
        break;
      }
    }

    for (const key of [
      PLATFORM_ARCH.WIN_X64,
      PLATFORM_ARCH.WIN_IA32,
      PLATFORM_ARCH.WIN_ARM64,
    ]) {
      const releaseForKey = latest[key];
      if (releaseForKey) {
        const rurl = `https://github.com/${account}/${repository}/releases/download/${releaseForKey.version}/RELEASES`;
        const rres = await fetchFn(rurl);
        if (rres.status < 400) {
          const body = await rres.text();
          const matches = body.match(/[^ ]*\.nupkg/gim);
          assert(matches);
          const nuPKG = rurl.replace("RELEASES", matches[0]!);
          releaseForKey.RELEASES = body.replace(matches[0]!, nuPKG);
        }
      }
    }

    return hasAnyAsset(latest) ? latest : null;
  }

  hashIp(ip: string | null | undefined): string | undefined {
    if (!ip) return undefined;
    return crypto.createHash("sha256").update(ip).digest("hex");
  }
}

// Any logic to require a specific release when updating should go here
const needsSpecificReleaseTag = (
  account: string,
  repository: string,
  platform: PlatformArch,
  version: string
): string | null => {
  const FIDDLE_TRANSITION_VERSION = "v0.35.1";

  if (
    account === "electron" &&
    semver.lt(version, FIDDLE_TRANSITION_VERSION) &&
    (
      [PLATFORM_ARCH.DARWIN_X64, PLATFORM_ARCH.DARWIN_ARM64] as PlatformArch[]
    ).includes(platform) &&
    repository === "fiddle"
  ) {
    return FIDDLE_TRANSITION_VERSION;
  }

  return null;
};

const hasAllAssets = (latest: LatestReleases): boolean => {
  return !!(
    latest[PLATFORM_ARCH.DARWIN_X64] &&
    latest[PLATFORM_ARCH.DARWIN_ARM64] &&
    latest[PLATFORM_ARCH.DARWIN_UNIVERSAL] &&
    latest[PLATFORM_ARCH.WIN_X64] &&
    latest[PLATFORM_ARCH.WIN_IA32] &&
    latest[PLATFORM_ARCH.WIN_ARM64]
  );
};

const hasAnyAsset = (latest: LatestReleases): boolean => {
  return !!(
    latest[PLATFORM_ARCH.DARWIN_X64] ||
    latest[PLATFORM_ARCH.DARWIN_ARM64] ||
    latest[PLATFORM_ARCH.DARWIN_UNIVERSAL] ||
    latest[PLATFORM_ARCH.WIN_X64] ||
    latest[PLATFORM_ARCH.WIN_IA32] ||
    latest[PLATFORM_ARCH.WIN_ARM64]
  );
};

const notFound = (res: http.ServerResponse, message = "Not found"): void => {
  res.statusCode = 404;
  res.end(message);
};

const badRequest = (res: http.ServerResponse, message: string): void => {
  res.statusCode = 400;
  res.end(message);
};

const noContent = (res: http.ServerResponse): void => {
  res.statusCode = 204;
  res.end();
};

const json = (res: http.ServerResponse, obj: any): void => {
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(obj));
};

// DO NOT PASS USER-SUPPLIED CONTENT TO THIS FUNCTION
// AS IT WILL REDIRECT A USER ANYWHERE
const redirect = (res: http.ServerResponse, url: string): void => {
  res.statusCode = 302;
  res.setHeader("Location", url);
  res.end(url);
};
