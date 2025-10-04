import http from "node:http";
import nock from "nock";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "./helpers/create-server.js";

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

describe("Updates", () => {
  let server: http.Server;
  let address: string;

  beforeAll(async () => {
    const result = await createServer();
    server = result.server;
    address = result.address;
  });

  afterAll(() => {
    server.close();
  });

  describe("Routes", () => {
    it("handles root path", async () => {
      const res = await fetch(`${address}/`);
      void res.text();
      expect(res.status).toBe(200);
    });

    it("exists and has update", async () => {
      for (let i = 0; i < 2; i++) {
        const res = await fetch(`${address}/owner/repo/darwin/0.0.0`);
        expect(res.status).toBe(200);

        const body = await res.json();
        expect(body).toEqual({
          name: "name",
          url: "app-mac.zip",
          notes: "notes",
        });
      }
    });

    it("exists but no updates", async () => {
      for (let i = 0; i < 2; i++) {
        const res = await fetch(`${address}/owner/repo/darwin/1.0.0`);
        expect(res.status).toBe(204);
      }
    });

    it("parses semver with optional leading v", async () => {
      for (let i = 0; i < 2; i++) {
        const res = await fetch(`${address}/owner/repo/darwin/v1.0.0`);
        expect(res.status).toBe(204);
      }
      for (let i = 0; i < 2; i++) {
        const res = await fetch(`${address}/owner/repo-with-v/darwin/1.0.0`);
        expect(res.status).toBe(204);
      }
      for (let i = 0; i < 2; i++) {
        const res = await fetch(`${address}/owner/repo-with-v/darwin/v1.0.0`);
        expect(res.status).toBe(204);
      }
    });

    it("invalid semver in request", async () => {
      const res = await fetch(`${address}/owner/repo/darwin/latest`);
      expect(res.status).toBe(400);
      const body = await res.text();
      expect(body).toBe('Invalid SemVer: "latest"');
    });

    it("invalid semver in release", async () => {
      const res = await fetch(
        `${address}/owner/repo-invalid-semver/darwin/0.0.0`
      );
      expect(res.status).toBe(404);
    });

    it("exists but has no releases", async () => {
      for (let i = 0; i < 2; i++) {
        const res = await fetch(
          `${address}/owner/repo-without-releases/darwin/0.0.0`
        );
        expect(res.status).toBe(404);
      }
    });

    it("doesn't exist", async () => {
      for (let i = 0; i < 2; i++) {
        const res = await fetch(`${address}/owner/not-exist/darwin/0.0.0`);
        expect(res.status).toBe(404);
      }
    });
  });

  describe("Platforms", () => {
    describe("Darwin", () => {
      it(".zip", async () => {
        for (let i = 0; i < 2; i++) {
          let res = await fetch(`${address}/owner/repo/darwin-x64/0.0.0`);
          expect(res.status).toBe(200);
          let body = (await res.json()) as any;
          expect(body.url).toBe("app-mac.zip");

          res = await fetch(`${address}/owner/repo/darwin-arm64/0.0.0`);
          expect(res.status).toBe(200);
          body = await res.json();
          expect(body.url).toBe("app-mac-arm64.zip");

          res = await fetch(`${address}/owner/repo/darwin/0.0.0`);
          expect(res.status).toBe(200);
          body = await res.json();
          expect(body.url).toBe("app-mac.zip");

          res = await fetch(`${address}/owner/repo/darwin-universal/0.0.0`);
          expect(res.status).toBe(200);
          body = await res.json();
          expect(body.url).toBe("app-universal-mac.zip");

          res = await fetch(`${address}/owner/repo-darwin/darwin-x64/0.0.0`);
          expect(res.status).toBe(200);
          body = await res.json();
          expect(body.url).toMatch("app-darwin.zip");

          res = await fetch(`${address}/owner/repo-darwin/darwin-arm64/0.0.0`);
          expect(res.status).toBe(200);
          body = await res.json();
          expect(body.url).toMatch("app-darwin-arm64.zip");

          res = await fetch(`${address}/owner/repo-darwin/darwin/0.0.0`);
          expect(res.status).toBe(200);
          body = await res.json();
          expect(body.url).toMatch("app-darwin.zip");

          res = await fetch(
            `${address}/owner/repo-darwin/darwin-universal/0.0.0`
          );
          expect(res.status).toBe(200);
          body = await res.json();
          expect(body.url).toMatch("app-universal-mac.zip");
        }
      });

      it("missing asset", async () => {
        let res = await fetch(
          `${address}/owner/repo-win32-zip/darwin-x64/0.0.0`
        );
        expect(res.status).toBe(404);
        let body = await res.text();
        expect(body).toBe(
          "No updates found (needs asset matching .*-(mac|darwin|osx).*.zip in public repository)"
        );

        res = await fetch(`${address}/owner/repo-win32-zip/darwin/0.0.0`);
        expect(res.status).toBe(404);
        body = await res.text();
        expect(body).toBe(
          "No updates found (needs asset matching .*-(mac|darwin|osx).*.zip in public repository)"
        );
      });

      describe("darwin universal assets", () => {
        it("use universal asset if platform-specific asset not available", async () => {
          const res = await fetch(
            `${address}/owner/repo-universal/darwin-x64/0.0.0`
          );
          expect(res.status).toBe(200);
          const body = (await res.json()) as any;
          expect(body.url).toMatch("app-universal-mac.zip");
        });

        it("skip universal asset if platform-specific asset available", async () => {
          const res = await fetch(
            `${address}/owner/repo-universal/darwin-arm64/0.0.0`
          );
          expect(res.status).toBe(200);
          const body = (await res.json()) as any;
          expect(body.url).toMatch("app-arm64-mac.zip");
        });
      });
    });

    describe("Win32", () => {
      it(".exe", async () => {
        for (let i = 0; i < 2; i++) {
          const res = await fetch(`${address}/owner/repo/win32/0.0.0`);
          expect(res.status).toBe(200);
          const body = (await res.json()) as any;
          expect(body.url).toBe("electron-fiddle-1.0.0-win32-x64-setup.exe");
          expect(body.name).toBeTruthy();
        }
      });

      it("win32-x64", async () => {
        for (let i = 0; i < 2; i++) {
          let res = await fetch(
            `${address}/owner/repo-win32-zip/win32-x64/0.0.0`
          );

          expect(res.status).toBe(200);
          let body = (await res.json()) as any;
          expect(body.url).toBe("electron-fiddle-1.0.0-win32-x64-setup.exe");
          expect(body.name).toBeTruthy();
        }

        for (let i = 0; i < 2; i++) {
          const res = await fetch(
            `${address}/owner/repo-win32-zip/win32/0.0.0`
          );
          expect(res.status).toBe(200);
          const body = (await res.json()) as any;
          expect(body.url).toBe("electron-fiddle-1.0.0-win32-x64-setup.exe");
          expect(body.name).toBeTruthy();
        }
      });

      it("win32-arm64", async () => {
        for (let i = 0; i < 2; i++) {
          const res = await fetch(
            `${address}/owner/repo-win32-zip/win32-arm64/0.0.0`
          );
          expect(res.status).toBe(200);
          const body = (await res.json()) as any;
          expect(body.url).toBe("electron-fiddle-1.0.0-win32-arm64-setup.exe");
          expect(body.name).toBeTruthy();
        }
      });

      it("win32-ia32", async () => {
        for (let i = 0; i < 2; i++) {
          const res = await fetch(
            `${address}/owner/repo-win32-zip/win32-ia32/0.0.0`
          );
          expect(res.status).toBe(200);
          const body = (await res.json()) as any;
          expect(body.url).toBe("electron-fiddle-1.0.0-win32-ia32-setup.exe");
          expect(body.name).toBeTruthy();
        }
      });

      describe("RELEASES", () => {
        it("win32-x64", async () => {
          for (let i = 0; i < 2; i++) {
            const res = await fetch(
              `${address}/owner/repo/win32-x64/0.0.0/RELEASES?some-extra`
            );
            expect(res.status).toBe(200);
            const body = await res.text();
            expect(body).toMatch(
              /^[^ ]+ https:\/\/github.com\/owner\/repo\/releases\/download\/[^/]+\/name.nupkg [^ ]+$/
            );
          }

          for (let i = 0; i < 2; i++) {
            const res = await fetch(
              `${address}/owner/repo/win32/0.0.0/RELEASES?some-extra`
            );
            expect(res.status).toBe(200);
            const body = await res.text();
            expect(body).toMatch(
              /^[^ ]+ https:\/\/github.com\/owner\/repo\/releases\/download\/[^/]+\/name.nupkg [^ ]+$/
            );
          }
        });

        it("win32-ia32", async () => {
          for (let i = 0; i < 2; i++) {
            const res = await fetch(
              `${address}/owner/repo/win32-ia32/0.0.0/RELEASES?some-extra`
            );
            expect(res.status).toBe(200);
            const body = await res.text();
            expect(body).toMatch(
              /^[^ ]+ https:\/\/github.com\/owner\/repo\/releases\/download\/[^/]+\/name.nupkg [^ ]+$/
            );
          }
        });

        it("handles missing RELEASES files", async () => {
          for (let i = 0; i < 2; i++) {
            const res = await fetch(
              `${address}/owner/repo-no-releases/win32-x64/0.0.0/RELEASES`
            );
            expect(res.status).toBe(404);
          }

          for (let i = 0; i < 2; i++) {
            const res = await fetch(
              `${address}/owner/repo-no-releases/win32/0.0.0/RELEASES`
            );
            expect(res.status).toBe(404);
          }
        });
      });

      it("missing asset", async () => {
        const res = await fetch(`${address}/owner/repo-darwin/win32/0.0.0`);
        expect(res.status).toBe(404);
        const body = await res.text();
        expect(body).toBe(
          "No updates found (needs asset containing .*-win32-(x64|ia32|arm64) or .exe in public repository)"
        );
      });
    });

    describe("Linux", () => {
      it("not supported", async () => {
        const res = await fetch(`${address}/owner/repo/linux/0.0.0`);
        expect(res.status).toBe(404);
        const body = await res.text();
        expect(body).toBe(
          'Unsupported platform: "linux". Supported: darwin-x64, darwin-arm64, darwin-universal, win32-x64, win32-ia32, win32-arm64.'
        );
      });
    });

    describe("Others", () => {
      it("not supported", async () => {
        const res = await fetch(`${address}/owner/repo/os/0.0.0`);
        expect(res.status).toBe(404);
        const body = await res.text();
        expect(body).toBe(
          'Unsupported platform: "os". Supported: darwin-x64, darwin-arm64, darwin-universal, win32-x64, win32-ia32, win32-arm64.'
        );
      });
    });
  });
});

describe("electron/fiddle", () => {
  let server: http.Server;
  let address: string;

  beforeAll(async () => {
    const result = await createServer();
    server = result.server;
    address = result.address;
  });

  afterAll(() => {
    server.close();
  });

  describe("first updates to v0.35.1", () => {
    it("on macOS", async () => {
      for (const platform of ["darwin", "darwin-x64", "darwin-arm64"]) {
        for (let i = 0; i < 2; i++) {
          const res = await fetch(
            `${address}/electron/fiddle/${platform}/0.34.0`
          );
          expect(res.status).toBe(200);

          const body = (await res.json()) as any;
          expect(body).toMatchObject({
            name: "v0.35.1",
            notes: "notes",
          });
        }
      }
    });

    it("not on Windows", async () => {
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
          expect(res.status).toBe(200);

          const body = (await res.json()) as any;
          expect(body).toMatchObject({
            name: "v0.36.0",
            notes: "notes",
          });
        }
      }
    });
  });

  describe("updates to latest", () => {
    it("on macOS", async () => {
      for (const platform of ["darwin", "darwin-x64", "darwin-arm64"]) {
        for (let i = 0; i < 2; i++) {
          const res = await fetch(
            `${address}/electron/fiddle/${platform}/0.35.1`
          );
          expect(res.status).toBe(200);

          const body = (await res.json()) as any;
          expect(body).toMatchObject({
            name: "v0.36.0",
            notes: "notes",
          });
        }
      }
    });

    it("on Windows", async () => {
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
          expect(res.status).toBe(200);

          const body = (await res.json()) as any;
          expect(body).toMatchObject({
            name: "v0.36.0",
            notes: "notes",
          });
        }
      }
    });
  });
});
