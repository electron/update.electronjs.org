// @ts-check
"use strict";

const http = require("http");
const fetch = require("node-fetch");
const semver = require("semver");
const assert = require("assert");
const log = require("pino")();
const crypto = require("crypto");
const requestIp = require("request-ip");

const { NODE_ENV: env } = process.env;
if (env === "test") log.level = "error";

const PLATFORM = {
  WIN32: "win32",
  DARWIN: "darwin",
};

const PLATFORM_ARCH = {
  DARWIN_X64: "darwin-x64",
  DARWIN_ARM64: "darwin-arm64",
  WIN_X64: "win32-x64",
  WIN_IA32: "win32-ia32",
  WIN_ARM64: "win32-arm64",
};
const PLATFORM_ARCHS = Object.values(PLATFORM_ARCH);

class Updates {
  constructor({ token, cache } = {}) {
    assert(cache, ".cache required");
    this.token = token;
    this.cache = cache;
  }

  listen(port, cb) {
    if (typeof port === "function") {
      [port, cb] = [undefined, port];
    }
    const server = http.createServer((req, res) => {
      const start = new Date();
      this.handle(req, res)
        .catch((err) => {
          log.error(err);
          res.statusCode = err.statusCode || 500;
          const msg =
            env === "production" ? "Internal Server Error" : err.stack;
          res.end(msg);
        })
        .then(() => {
          log.info(
            {
              method: req.method,
              url: req.url,
              status: res.statusCode,
              ipHash: this.hashIp(requestIp.getClientIp(req)),
              duration: new Date() - start,
            },
            "request"
          );
        });
    });
    server.listen(port, cb);
    return server;
  }

  async handle(req, res) {
    const segs = req.url.split(/[/?]/).filter(Boolean);
    const [account, repository, , version, file] = segs;
    let platform = segs[2];

    if (platform === PLATFORM.WIN32) platform = PLATFORM_ARCH.WIN_X64;
    if (platform === PLATFORM.DARWIN) platform = PLATFORM_ARCH.DARWIN_X64;

    if (!account || !repository || !platform || !version) {
      redirect(res, "https://github.com/electron/update.electronjs.org");
    } else if (!PLATFORM_ARCHS.includes(platform)) {
      const message = `Unsupported platform: "${platform}". Supported: ${PLATFORM_ARCHS.join(
        ", "
      )}.`;
      notFound(res, message);
    } else if (version && !semver.valid(version)) {
      badRequest(res, `Invalid SemVer: "${version}"`);
    } else if (file === "RELEASES") {
      await this.handleReleases(res, account, repository, platform);
    } else {
      await this.handleUpdate(res, account, repository, platform, version);
    }
  }

  async handleReleases(res, account, repository, platform) {
    const latest = await this.cachedGetLatest(account, repository, platform);
    if (!latest || !latest.RELEASES) return notFound(res);
    res.end(latest.RELEASES);
  }

  async handleUpdate(res, account, repository, platform, version) {
    const latest = await this.cachedGetLatest(account, repository, platform);

    if (!latest) {
      const message = platform.includes(PLATFORM.DARWIN)
        ? "No updates found (needs asset matching *{mac,darwin,osx}*.zip in public repository)"
        : "No updates found (needs asset containing win32-{x64,ia32,arm64} or .exe in public repository)";
      notFound(res, message);
    } else if (semver.lte(latest.version, version)) {
      log.info({ account, repository, platform, version }, "up to date");
      noContent(res);
    } else {
      log.info(
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

  async cachedGetLatest(account, repository, platform) {
    const key = `${account}/${repository}`;
    let latest = await this.cache.get(key);

    if (latest) {
      // reuse cache entries using the old non-arch-aware format
      if (latest.darwin) latest[PLATFORM_ARCH.DARWIN_X64] = latest.darwin;
      if (latest.win32) latest[PLATFORM_ARCH.WIN_X64] = latest.win32;

      log.info({ key }, "cache hit");
      return latest[platform] || null;
    }

    let lock;
    if (this.cache.lock) {
      log.debug({ key }, "lock acquiring");
      lock = await this.cache.lock(key);
      log.debug({ key }, "lock acquired");
      latest = await this.cache.get(key);
      if (latest) {
        log.info({ key }, "cache hit after lock");
        return latest[platform] ? latest[platform] : null;
      }
    }

    latest = await this.getLatest(account, repository);

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

    return latest && latest[platform];
  }

  async getLatest(account, repository) {
    account = encodeURIComponent(account);
    repository = encodeURIComponent(repository);
    const url = `https://api.github.com/repos/${account}/${repository}/releases?per_page=100`;
    const headers = { Accept: "application/vnd.github.preview" };
    if (this.token) headers.Authorization = `token ${this.token}`;
    const res = await fetch(url, { headers });
    log.info(
      { account, repository, status: res.status },
      "github releases api"
    );

    if (res.status === 403) {
      console.error("Rate Limited!");
      return;
    }

    if (res.status >= 400) {
      return;
    }

    const latest = {};

    const releases = await res.json();
    for (const release of releases) {
      if (
        !semver.valid(release.tag_name) ||
        release.draft ||
        release.prerelease
      ) {
        continue;
      }

      for (const asset of release.assets) {
        const platform = assetPlatform(asset.name);
        if (platform && !latest[platform]) {
          latest[platform] = {
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
      if (latest[key]) {
        const rurl = `https://github.com/${account}/${repository}/releases/download/${latest[key].version}/RELEASES`;
        const rres = await fetch(rurl);
        if (rres.status < 400) {
          const body = await rres.text();
          const matches = body.match(/[^ ]*\.nupkg/gim);
          const nuPKG = rurl.replace("RELEASES", matches[0]);
          latest[key].RELEASES = body.replace(matches[0], nuPKG);
        }
      }
    }

    return hasAnyAsset(latest) ? latest : null;
  }

  hashIp(ip) {
    if (!ip) return;
    return crypto.createHash("sha256").update(ip).digest("hex");
  }
}

const hasAllAssets = (latest) => {
  return !!(
    latest[PLATFORM_ARCH.DARWIN_X64] &&
    latest[PLATFORM_ARCH.DARWIN_ARM64] &&
    latest[PLATFORM_ARCH.WIN_X64] &&
    latest[PLATFORM_ARCH.WIN_IA32] &&
    latest[PLATFORM_ARCH.WIN_ARM64]
  );
};

const hasAnyAsset = (latest) => {
  return !!(
    latest[PLATFORM_ARCH.DARWIN_X64] ||
    latest[PLATFORM_ARCH.DARWIN_ARM64] ||
    latest[PLATFORM_ARCH.WIN_X64] ||
    latest[PLATFORM_ARCH.WIN_IA32] ||
    latest[PLATFORM_ARCH.WIN_ARM64]
  );
};

const assetPlatform = (fileName) => {
  if (/.*(mac|darwin|osx).*(-arm).*\.zip/i.test(fileName)) {
    return PLATFORM_ARCH.DARWIN_ARM64;
  }

  if (/.*(mac|darwin|osx).*\.zip/i.test(fileName) && !/arm64/.test(fileName)) {
    return PLATFORM_ARCH.DARWIN_X64;
  }

  if (/win32-ia32/.test(fileName)) return PLATFORM_ARCH.WIN_IA32;
  if (/win32-arm64/.test(fileName)) return PLATFORM_ARCH.WIN_ARM64;
  if (/win32-x64/.test(fileName)) return PLATFORM_ARCH.WIN_X64;

  // Special case handling: We don't know what kind of asset
  // we're looking at, so it might be the default x64 windows
  // asset
  if (
    /\.exe$/.test(fileName) &&
    !/arm/.test(fileName) &&
    !/ia32/.test(fileName)
  ) {
    return PLATFORM_ARCH.WIN_X64;
  }

  return false;
};

const notFound = (res, message = "Not found") => {
  res.statusCode = 404;
  res.end(message);
};

const badRequest = (res, message) => {
  res.statusCode = 400;
  res.end(message);
};

const noContent = (res) => {
  res.statusCode = 204;
  res.end();
};

const json = (res, obj) => {
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(obj));
};

// DO NOT PASS USER-SUPPLIED CONTENT TO THIS FUNCTION
// AS IT WILL REDIRECT A USER ANYWHERE
const redirect = (res, url) => {
  res.statusCode = 302;
  res.setHeader("Location", url);
  res.end(url);
};

module.exports = Updates;
