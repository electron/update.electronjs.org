"use strict";

const { test } = require("tap");
const fetch = require("node-fetch");
const Updates = require("..");
const nock = require("nock");

class MemoryCache {
  constructor() {
    this.data = new Map();
  }

  async get(key) {
    return this.data.get(key);
  }

  async set(key, value) {
    this.data.set(key, value);
  }
}

const createServer = () =>
  new Promise((resolve) => {
    const updates = new Updates({ cache: new MemoryCache() });
    const server = updates.listen(() => {
      resolve({
        server,
        address: `http://localhost:${server.address().port}`,
      });
    });
  });

nock.disableNetConnect();
nock.enableNetConnect("localhost");

nock("https://github.com").get("/electron/update.electronjs.org").reply(200);
nock("https://api.github.com")
  .get("/repos/owner/repo/releases?per_page=100")
  .reply(200, [
    {
      name: "name",
      tag_name: "1.0.0",
      body: "notes",
      assets: [
        {
          name: "mac.zip",
          browser_download_url: "mac.zip",
        },
        {
          name: "mac-arm64.zip",
          browser_download_url: "mac-arm64.zip",
        },
        {
          name: "win.exe",
          browser_download_url: "win.exe",
        },
        {
          name: "win32-ia32.zip",
          browser_download_url: "win32-ia32.zip",
        },
        {
          name: "win32-arm64.zip",
          browser_download_url: "win32-arm64.zip",
        },
      ],
    },
  ])
  .get("/repos/owner/repo-with-v/releases?per_page=100")
  .reply(200, [
    {
      name: "name",
      tag_name: "v1.0.0",
      body: "notes",
      assets: [
        {
          name: "mac.zip",
          browser_download_url: "mac.zip",
        },
        {
          name: "mac-arm64.zip",
          browser_download_url: "mac-arm64.zip",
        },
      ],
    },
  ])
  .get("/repos/owner/repo-without-releases/releases?per_page=100")
  .reply(200, [])
  .get("/repos/owner/not-exist/releases?per_page=100")
  .reply(404)
  .get("/repos/owner/repo-darwin/releases?per_page=100")
  .reply(200, [
    {
      name: "name",
      tag_name: "v1.0.0",
      body: "notes",
      assets: [
        {
          name: "darwin.zip",
          browser_download_url: "darwin.zip",
        },
        {
          name: "darwin-arm64.zip",
          browser_download_url: "darwin-arm64.zip",
        },
      ],
    },
  ])
  .get("/repos/owner/repo-win32-zip/releases?per_page=100")
  .reply(200, [
    {
      name: "name",
      tag_name: "v1.0.0",
      body: "notes",
      assets: [
        {
          name: "win32-ia32.zip",
          browser_download_url: "win32-ia32.zip",
        },
        {
          name: "win32-x64.zip",
          browser_download_url: "win32-x64.zip",
        },
        {
          name: "win32-arm64.zip",
          browser_download_url: "win32-arm64.zip",
        },
      ],
    },
  ])
  .get("/repos/owner/repo-no-releases/releases?per_page=100")
  .reply(200, [
    {
      name: "name",
      tag_name: "v1.0.0",
      body: "notes",
      assets: [
        {
          name: "win32-ia32.zip",
          browser_download_url: "win32-ia32.zip",
        },
        {
          name: "win32-x64.zip",
          browser_download_url: "win32-x64.zip",
        },
        {
          name: "win32-arm64.zip",
          browser_download_url: "win32-arm64.zip",
        },
      ],
    },
  ])
  .get("/repos/owner/repo-invalid-semver/releases?per_page=100")
  .reply(200, [
    {
      name: "name",
      tag_name: "invalid-semver",
      body: "notes",
      assets: [
        {
          name: "win32-ia32.zip",
          browser_download_url: "win32-ia32.zip",
        },
        {
          name: "win32-x64.zip",
          browser_download_url: "win32-x64.zip",
        },
        {
          name: "win32-arm64.zip",
          browser_download_url: "win32-arm64.zip",
        },
      ],
    },
  ]);
nock("https://github.com")
  .get("/owner/repo/releases/download/1.0.0/RELEASES")
  .times(3)
  .reply(200, "HASH name.nupkg NUMBER")
  .get("/owner/repo-with-v/releases/download/v1.0.0/RELEASES")
  .reply(404)
  .get("/owner/repo-darwin/releases/download/v1.0.0/RELEASES")
  .reply(404)
  .get("/owner/repo-win32-zip/releases/download/v1.0.0/RELEASES")
  .times(3)
  .reply(404)
  .get("/owner/repo-no-releases/releases/download/v1.0.0/RELEASES")
  .times(3)
  .reply(404);

test("Updates", async (t) => {
  const { server, address } = await createServer();

  await t.test("Routes", async (t) => {
    const res = await fetch(`${address}/`);
    t.equal(res.status, 200);

    await t.test("exists and has update", async (t) => {
      for (let i = 0; i < 2; i++) {
        const res = await fetch(`${address}/owner/repo/darwin/0.0.0`);
        t.equal(res.status, 200);
        const body = await res.json();
        t.deepEqual(body, {
          name: "name",
          url: "mac.zip",
          notes: "notes",
        });
      }
    });

    await t.test("exists but no updates", async (t) => {
      for (let i = 0; i < 2; i++) {
        const res = await fetch(`${address}/owner/repo/darwin/1.0.0`);
        t.equal(res.status, 204);
      }
    });

    await t.test("parses semver with optional leading v", async (t) => {
      for (let i = 0; i < 2; i++) {
        const res = await fetch(`${address}/owner/repo/darwin/v1.0.0`);
        t.equal(res.status, 204);
      }
      for (let i = 0; i < 2; i++) {
        const res = await fetch(`${address}/owner/repo-with-v/darwin/1.0.0`);
        t.equal(res.status, 204);
      }
      for (let i = 0; i < 2; i++) {
        const res = await fetch(`${address}/owner/repo-with-v/darwin/v1.0.0`);
        t.equal(res.status, 204);
      }
    });

    await t.test("invalid semver in request", async (t) => {
      const res = await fetch(`${address}/owner/repo/darwin/latest`);
      t.equal(res.status, 400);
      const body = await res.text();
      t.equal(body, 'Invalid SemVer: "latest"');
    });

    await t.test("invalid semver in release", async (t) => {
      const res = await fetch(
        `${address}/owner/repo-invalid-semver/darwin/0.0.0`
      );
      t.equal(res.status, 404);
    });

    await t.test("exists but has no releases", async (t) => {
      for (let i = 0; i < 2; i++) {
        const res = await fetch(
          `${address}/owner/repo-without-releases/darwin/0.0.0`
        );
        t.equal(res.status, 404);
      }
    });

    await t.test("doesn't exist", async (t) => {
      for (let i = 0; i < 2; i++) {
        const res = await fetch(`${address}/owner/not-exist/darwin/0.0.0`);
        t.equal(res.status, 404);
      }
    });
  });

  await t.test("Platforms", async (t) => {
    await t.test("Darwin", async (t) => {
      await t.test(".zip", async (t) => {
        for (let i = 0; i < 2; i++) {
          let res = await fetch(`${address}/owner/repo/darwin-x64/0.0.0`);
          t.equal(res.status, 200);
          let body = await res.json();
          t.equal(body.url, "mac.zip");

          res = await fetch(`${address}/owner/repo/darwin-arm64/0.0.0`);
          t.equal(res.status, 200);
          body = await res.json();
          t.equal(body.url, "mac-arm64.zip");

          res = await fetch(`${address}/owner/repo/darwin/0.0.0`);
          t.equal(res.status, 200);
          body = await res.json();
          t.equal(body.url, "mac.zip");

          res = await fetch(`${address}/owner/repo-darwin/darwin-x64/0.0.0`);
          t.equal(res.status, 200);
          body = await res.json();
          t.match(body.url, "darwin.zip");

          res = await fetch(`${address}/owner/repo-darwin/darwin-arm64/0.0.0`);
          t.equal(res.status, 200);
          body = await res.json();
          t.match(body.url, "darwin-arm64.zip");

          res = await fetch(`${address}/owner/repo-darwin/darwin/0.0.0`);
          t.equal(res.status, 200);
          body = await res.json();
          t.match(body.url, "darwin.zip");
        }
      });

      await t.test("missing asset", async (t) => {
        let res = await fetch(
          `${address}/owner/repo-win32-zip/darwin-x64/0.0.0`
        );
        t.equal(res.status, 404);
        let body = await res.text();
        t.equal(
          body,
          "No updates found (needs asset matching *{mac,darwin,osx}*.zip in public repository)"
        );

        res = await fetch(`${address}/owner/repo-win32-zip/darwin/0.0.0`);
        t.equal(res.status, 404);
        body = await res.text();
        t.equal(
          body,
          "No updates found (needs asset matching *{mac,darwin,osx}*.zip in public repository)"
        );
      });
    });

    await t.test("Win32", async (t) => {
      await t.test(".exe", async (t) => {
        for (let i = 0; i < 2; i++) {
          const res = await fetch(`${address}/owner/repo/win32/0.0.0`);
          t.equal(res.status, 200);
          const body = await res.json();
          t.equal(body.url, "win.exe");
          t.ok(body.name);
        }
      });

      await t.test("win32-x64", async (t) => {
        for (let i = 0; i < 2; i++) {
          const res = await fetch(
            `${address}/owner/repo-win32-zip/win32-x64/0.0.0`
          );
          t.equal(res.status, 200);
          const body = await res.json();
          t.equal(body.url, "win32-x64.zip");
          t.ok(body.name);
        }
        for (let i = 0; i < 2; i++) {
          const res = await fetch(
            `${address}/owner/repo-win32-zip/win32/0.0.0`
          );
          t.equal(res.status, 200);
          const body = await res.json();
          t.equal(body.url, "win32-x64.zip");
          t.ok(body.name);
        }
      });

      await t.test("win32-arm64", async (t) => {
        for (let i = 0; i < 2; i++) {
          const res = await fetch(
            `${address}/owner/repo-win32-zip/win32-arm64/0.0.0`
          );
          t.equal(res.status, 200);
          const body = await res.json();
          t.equal(body.url, "win32-arm64.zip");
          t.ok(body.name);
        }
      });

      await t.test("win32-ia32", async (t) => {
        for (let i = 0; i < 2; i++) {
          const res = await fetch(
            `${address}/owner/repo-win32-zip/win32-ia32/0.0.0`
          );
          t.equal(res.status, 200);
          const body = await res.json();
          t.equal(body.url, "win32-ia32.zip");
          t.ok(body.name);
        }
      });

      await t.test("RELEASES", async (t) => {
        await t.test("win32-x64", async (t) => {
          for (let i = 0; i < 2; i++) {
            const res = await fetch(
              `${address}/owner/repo/win32-x64/0.0.0/RELEASES?some-extra`
            );
            t.equal(res.status, 200);
            const body = await res.text();
            t.match(
              body,
              /^[^ ]+ https:\/\/github.com\/owner\/repo\/releases\/download\/[^/]+\/name.nupkg [^ ]+$/
            );
          }

          for (let i = 0; i < 2; i++) {
            const res = await fetch(
              `${address}/owner/repo/win32/0.0.0/RELEASES?some-extra`
            );
            t.equal(res.status, 200);
            const body = await res.text();
            t.match(
              body,
              /^[^ ]+ https:\/\/github.com\/owner\/repo\/releases\/download\/[^/]+\/name.nupkg [^ ]+$/
            );
          }
        });

        await t.test("win32-ia32", async (t) => {
          for (let i = 0; i < 2; i++) {
            const res = await fetch(
              `${address}/owner/repo/win32-ia32/0.0.0/RELEASES?some-extra`
            );
            t.equal(res.status, 200);
            const body = await res.text();
            t.match(
              body,
              /^[^ ]+ https:\/\/github.com\/owner\/repo\/releases\/download\/[^/]+\/name.nupkg [^ ]+$/
            );
          }
        });

        for (let i = 0; i < 2; i++) {
          const res = await fetch(
            `${address}/owner/repo-no-releases/win32-x64/0.0.0/RELEASES`
          );
          t.equal(res.status, 404);
        }

        for (let i = 0; i < 2; i++) {
          const res = await fetch(
            `${address}/owner/repo-no-releases/win32/0.0.0/RELEASES`
          );
          t.equal(res.status, 404);
        }
      });

      await t.test("missing asset", async (t) => {
        const res = await fetch(`${address}/owner/repo-darwin/win32/0.0.0`);
        t.equal(res.status, 404);
        const body = await res.text();
        t.equal(
          body,
          "No updates found (needs asset containing win32-{x64,ia32,arm64} or .exe in public repository)"
        );
      });
    });

    await t.test("Linux", async (t) => {
      await t.test("not supported", async (t) => {
        const res = await fetch(`${address}/owner/repo/linux/0.0.0`);
        t.equal(res.status, 404);
        const body = await res.text();
        t.equal(
          body,
          'Unsupported platform: "linux". Supported: darwin-x64, darwin-arm64, win32-x64, win32-ia32, win32-arm64.'
        );
      });
    });

    await t.test("Others", async (t) => {
      await t.test("not supported", async (t) => {
        const res = await fetch(`${address}/owner/repo/os/0.0.0`);
        t.equal(res.status, 404);
        const body = await res.text();
        t.equal(
          body,
          'Unsupported platform: "os". Supported: darwin-x64, darwin-arm64, win32-x64, win32-ia32, win32-arm64.'
        );
      });
    });
  });

  server.close();
});
