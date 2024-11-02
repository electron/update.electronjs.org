"use strict";

const nock = require("nock");
const { test, teardown } = require("tap");
const Updates = require("../src/updates");
const { createServer } = require("./helpers/create-server");

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
          name: "app-mac.zip",
          browser_download_url: "app-mac.zip",
        },
        {
          name: "app-mac-arm64.zip",
          browser_download_url: "app-mac-arm64.zip",
        },
        {
          name: "app-universal-mac.zip",
          browser_download_url: "app-universal-mac.zip",
        },
        {
          name: "electron-fiddle-1.0.0-win32-x64-setup.exe",
          browser_download_url: "electron-fiddle-1.0.0-win32-x64-setup.exe",
        },
        {
          name: "electron-fiddle-1.0.0-win32-ia32-setup.exe",
          browser_download_url: "electron-fiddle-1.0.0-win32-ia32-setup.exe",
        },
        {
          name: "electron-fiddle-1.0.0-win32-arm64-setup.exe",
          browser_download_url: "electron-fiddle-1.0.0-win32-arm64-setup.exe",
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
          name: "app-mac.zip",
          browser_download_url: "app-mac.zip",
        },
        {
          name: "app-mac-arm64.zip",
          browser_download_url: "app-mac-arm64.zip",
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
          name: "app-darwin.zip",
          browser_download_url: "app-darwin.zip",
        },
        {
          name: "app-darwin-arm64.zip",
          browser_download_url: "app-darwin-arm64.zip",
        },
        {
          name: "app-universal-mac.zip",
          browser_download_url: "app-universal-mac.zip",
        },
      ],
    },
  ])
  .get("/repos/owner/repo-universal/releases?per_page=100")
  .reply(200, [
    {
      name: "name",
      tag_name: "v2.0.0",
      body: "notes",
      assets: [
        {
          name: "app-universal-mac.zip",
          browser_download_url: "app-universal-mac.zip",
        },
        {
          name: "app-arm64-mac.zip",
          browser_download_url: "app-arm64-mac.zip",
        },
      ],
    },
    {
      name: "name",
      tag_name: "v1.0.0",
      body: "notes",
      assets: [
        {
          name: "app-mac.zip",
          browser_download_url: "app-mac.zip",
        },
        {
          name: "app-arm64-mac.zip",
          browser_download_url: "app-arm64-mac.zip",
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
          name: "electron-fiddle-1.0.0-win32-ia32-setup.exe",
          browser_download_url: "electron-fiddle-1.0.0-win32-ia32-setup.exe",
        },
        {
          name: "electron-fiddle-1.0.0-win32-x64-setup.exe",
          browser_download_url: "electron-fiddle-1.0.0-win32-x64-setup.exe",
        },
        {
          name: "electron-fiddle-1.0.0-win32-arm64-setup.exe",
          browser_download_url: "electron-fiddle-1.0.0-win32-arm64-setup.exe",
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
          name: "electron-fiddle-1.0.0-win32-ia32-setup.exe",
          browser_download_url: "electron-fiddle-1.0.0-win32-ia32-setup.exe",
        },
        {
          name: "electron-fiddle-1.0.0-win32-x64-setup.exe",
          browser_download_url: "electron-fiddle-1.0.0-win32-x64-setup.exe",
        },
        {
          name: "electron-fiddle-1.0.0-win32-arm64-setup.exe",
          browser_download_url: "electron-fiddle-1.0.0-win32-arm64-setup.exe",
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
          name: "electron-fiddle-1.0.0-win32-ia32-setup.exe",
          browser_download_url: "electron-fiddle-1.0.0-win32-ia32-setup.exe",
        },
        {
          name: "electron-fiddle-1.0.0-win32-x64-setup.exe",
          browser_download_url: "electron-fiddle-1.0.0-win32-x64-setup.exe",
        },
        {
          name: "electron-fiddle-1.0.0-win32-arm64-setup.exe",
          browser_download_url: "electron-fiddle-1.0.0-win32-arm64-setup.exe",
        },
      ],
    },
  ])
  .get("/repos/electron/fiddle/releases?per_page=100")
  .reply(200, [
    {
      name: "v0.36.0",
      tag_name: "v0.36.0",
      body: "notes",
      assets: [
        {
          name: "app-mac.zip",
          browser_download_url: "app-mac.zip",
        },
        {
          name: "app-mac-arm64.zip",
          browser_download_url: "app-mac-arm64.zip",
        },
        {
          name: "electron-fiddle-0.36.0-win32-x64-setup.exe",
          browser_download_url: "electron-fiddle-0.36.0-win32-x64-setup.exe",
        },
        {
          name: "electron-fiddle-0.36.0-win32-ia32-setup.exe",
          browser_download_url: "electron-fiddle-0.36.0-win32-ia32-setup.exe",
        },
        {
          name: "electron-fiddle-0.36.0-win32-arm64-setup.exe",
          browser_download_url: "electron-fiddle-0.36.0-win32-arm64-setup.exe",
        },
      ],
    },
  ])
  .get("/repos/electron/fiddle/releases/tags/v0.35.1")
  .reply(200, [
    {
      name: "v0.35.1",
      tag_name: "v0.35.1",
      body: "notes",
      assets: [
        {
          name: "app-mac.zip",
          browser_download_url: "app-mac.zip",
        },
        {
          name: "app-mac-arm64.zip",
          browser_download_url: "app-mac-arm64.zip",
        },
        {
          name: "electron-fiddle-1.0.0-win32-x64-setup.exe",
          browser_download_url: "electron-fiddle-1.0.0-win32-x64-setup.exe",
        },
        {
          name: "electron-fiddle-1.0.0-win32-ia32-setup.exe",
          browser_download_url: "electron-fiddle-1.0.0-win32-ia32-setup.exe",
        },
        {
          name: "electron-fiddle-1.0.0-win32-arm64-setup.exe",
          browser_download_url: "electron-fiddle-1.0.0-win32-arm64-setup.exe",
        },
      ],
    },
  ]);
nock("https://github.com")
  .get("/electron/fiddle/releases/download/v0.35.1/RELEASES")
  .times(3)
  .reply(200, "HASH name.nupkg NUMBER")
  .get("/electron/fiddle/releases/download/v0.36.0/RELEASES")
  .times(3)
  .reply(200, "HASH name.nupkg NUMBER")
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
    void res.text();
    t.equal(res.status, 200);

    await t.test("exists and has update", async (t) => {
      for (let i = 0; i < 2; i++) {
        const res = await fetch(`${address}/owner/repo/darwin/0.0.0`);
        t.equal(res.status, 200);

        const body = await res.json();
        t.same(body, {
          name: "name",
          url: "app-mac.zip",
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
          t.equal(body.url, "app-mac.zip");

          res = await fetch(`${address}/owner/repo/darwin-arm64/0.0.0`);
          t.equal(res.status, 200);
          body = await res.json();
          t.equal(body.url, "app-mac-arm64.zip");

          res = await fetch(`${address}/owner/repo/darwin/0.0.0`);
          t.equal(res.status, 200);
          body = await res.json();
          t.equal(body.url, "app-mac.zip");

          res = await fetch(`${address}/owner/repo/darwin-universal/0.0.0`);
          t.equal(res.status, 200);
          body = await res.json();
          t.equal(body.url, "app-universal-mac.zip");

          res = await fetch(`${address}/owner/repo-darwin/darwin-x64/0.0.0`);
          t.equal(res.status, 200);
          body = await res.json();
          t.match(body.url, "app-darwin.zip");

          res = await fetch(`${address}/owner/repo-darwin/darwin-arm64/0.0.0`);
          t.equal(res.status, 200);
          body = await res.json();
          t.match(body.url, "app-darwin-arm64.zip");

          res = await fetch(`${address}/owner/repo-darwin/darwin/0.0.0`);
          t.equal(res.status, 200);
          body = await res.json();
          t.match(body.url, "app-darwin.zip");

          res = await fetch(
            `${address}/owner/repo-darwin/darwin-universal/0.0.0`
          );
          t.equal(res.status, 200);
          body = await res.json();
          t.match(body.url, "app-universal-mac.zip");
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
          "No updates found (needs asset matching .*-(mac|darwin|osx).*.zip in public repository)"
        );

        res = await fetch(`${address}/owner/repo-win32-zip/darwin/0.0.0`);
        t.equal(res.status, 404);
        body = await res.text();
        t.equal(
          body,
          "No updates found (needs asset matching .*-(mac|darwin|osx).*.zip in public repository)"
        );
      });

      await t.test("darwin universal assets", async (t) => {
        await t.test(
          "use universal asset if platform-specific asset not available",
          async (t) => {
            let res = await fetch(
              `${address}/owner/repo-universal/darwin-x64/0.0.0`
            );
            t.equal(res.status, 200);
            let body = await res.json();
            t.match(body.url, "app-universal-mac.zip");
          }
        );

        await t.test(
          "skip universal asset if platform-specific asset available",
          async (t) => {
            let res = await fetch(
              `${address}/owner/repo-universal/darwin-arm64/0.0.0`
            );
            t.equal(res.status, 200);
            let body = await res.json();
            t.match(body.url, "app-arm64-mac.zip");
          }
        );
      });
    });

    await t.test("Win32", async (t) => {
      await t.test(".exe", async (t) => {
        for (let i = 0; i < 2; i++) {
          const res = await fetch(`${address}/owner/repo/win32/0.0.0`);
          t.equal(res.status, 200);
          const body = await res.json();
          t.equal(body.url, "electron-fiddle-1.0.0-win32-x64-setup.exe");
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
          t.equal(body.url, "electron-fiddle-1.0.0-win32-x64-setup.exe");
          t.ok(body.name);
        }

        for (let i = 0; i < 2; i++) {
          const res = await fetch(
            `${address}/owner/repo-win32-zip/win32/0.0.0`
          );
          t.equal(res.status, 200);
          const body = await res.json();
          t.equal(body.url, "electron-fiddle-1.0.0-win32-x64-setup.exe");
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
          t.equal(body.url, "electron-fiddle-1.0.0-win32-arm64-setup.exe");
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
          t.equal(body.url, "electron-fiddle-1.0.0-win32-ia32-setup.exe");
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
          'Unsupported platform: "linux". Supported: darwin-x64, darwin-arm64, darwin-universal, win32-x64, win32-ia32, win32-arm64.'
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
          'Unsupported platform: "os". Supported: darwin-x64, darwin-arm64, darwin-universal, win32-x64, win32-ia32, win32-arm64.'
        );
      });
    });
  });

  teardown(() => {
    server.close();
  });
});

test("electron/fiddle", async (t) => {
  const { server, address } = await createServer();

  await t.test("first updates to v0.35.1", async (t) => {
    await t.test("on macOS", async (t) => {
      for (const platform of ["darwin", "darwin-x64", "darwin-arm64"]) {
        for (let i = 0; i < 2; i++) {
          const res = await fetch(
            `${address}/electron/fiddle/${platform}/0.34.0`
          );
          t.equal(res.status, 200);

          const body = await res.json();
          t.match(body, {
            name: "v0.35.1",
            notes: "notes",
          });
        }
      }
    });

    await t.test("not on Windows", async (t) => {
      for (const platform of [
        "win32",
        "win32-x64",
        "win32-ia32",
        "win32-arm64",
      ]) {
        for (let i = 0; i < 2; i++) {
          const res = await fetch(
            `${address}/electron/fiddle/${platform}/0.34.0`
          );
          t.equal(res.status, 200);

          const body = await res.json();
          t.match(body, {
            name: "v0.36.0",
            notes: "notes",
          });
        }
      }
    });
  });

  await t.test("updates to latest", async (t) => {
    await t.test("on macOS", async (t) => {
      for (const platform of ["darwin", "darwin-x64", "darwin-arm64"]) {
        for (let i = 0; i < 2; i++) {
          const res = await fetch(
            `${address}/electron/fiddle/${platform}/0.35.1`
          );
          t.equal(res.status, 200);

          const body = await res.json();
          t.match(body, {
            name: "v0.36.0",
            notes: "notes",
          });
        }
      }
    });

    await t.test("on Windows", async (t) => {
      for (const platform of [
        "win32",
        "win32-x64",
        "win32-ia32",
        "win32-arm64",
      ]) {
        for (let i = 0; i < 2; i++) {
          const res = await fetch(
            `${address}/electron/fiddle/${platform}/0.35.1`
          );
          t.equal(res.status, 200);

          const body = await res.json();
          t.match(body, {
            name: "v0.36.0",
            notes: "notes",
          });
        }
      }
    });
  });

  teardown(() => {
    server.close();
  });
});
