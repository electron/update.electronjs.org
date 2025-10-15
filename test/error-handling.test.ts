import http from "node:http";
import nock from "nock";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "./helpers/create-server.js";

nock.disableNetConnect();
nock.enableNetConnect("localhost");

describe("Error Handling", () => {
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

  describe("GitHub API Errors", () => {
    it("handles rate limiting (403)", async () => {
      nock("https://api.github.com")
        .get("/repos/owner/rate-limited/releases?per_page=100")
        .reply(403, { message: "API rate limit exceeded" });

      const res = await fetch(`${address}/owner/rate-limited/darwin-x64/0.0.0`);
      expect(res.status).toBe(404);
    });

    it("handles 500 server errors", async () => {
      nock("https://api.github.com")
        .get("/repos/owner/server-error/releases?per_page=100")
        .reply(500, "Internal Server Error");

      const res = await fetch(`${address}/owner/server-error/darwin-x64/0.0.0`);
      expect(res.status).toBe(404);
    });

    it("handles 401 unauthorized", async () => {
      nock("https://api.github.com")
        .get("/repos/owner/unauthorized/releases?per_page=100")
        .reply(401, { message: "Bad credentials" });

      const res = await fetch(`${address}/owner/unauthorized/darwin-x64/0.0.0`);
      expect(res.status).toBe(404);
    });

    it("handles network errors", async () => {
      nock("https://api.github.com")
        .get("/repos/owner/network-error/releases?per_page=100")
        .replyWithError("Network error");

      const res = await fetch(
        `${address}/owner/network-error/darwin-x64/0.0.0`
      );
      expect(res.status).toBe(500);
    });
  });

  describe("Draft and Prerelease Filtering", () => {
    it("skips draft releases", async () => {
      nock("https://api.github.com")
        .get("/repos/owner/draft-repo/releases?per_page=100")
        .reply(200, [
          {
            name: "Draft Release",
            tag_name: "v2.0.0",
            body: "Draft release notes",
            draft: true,
            assets: [
              {
                name: "app-mac.zip",
                browser_download_url: "app-mac.zip",
              },
            ],
          },
          {
            name: "Stable Release",
            tag_name: "v1.0.0",
            body: "Stable release notes",
            draft: false,
            prerelease: false,
            assets: [
              {
                name: "app-mac.zip",
                browser_download_url: "app-mac-v1.zip",
              },
            ],
          },
        ]);

      const res = await fetch(`${address}/owner/draft-repo/darwin-x64/0.0.0`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.name).toBe("Stable Release");
      expect(body.url).toBe("app-mac-v1.zip");
    });

    it("skips prerelease versions", async () => {
      nock("https://api.github.com")
        .get("/repos/owner/prerelease-repo/releases?per_page=100")
        .reply(200, [
          {
            name: "Beta Release",
            tag_name: "v2.0.0-beta.1",
            body: "Beta release notes",
            draft: false,
            prerelease: true,
            assets: [
              {
                name: "app-mac.zip",
                browser_download_url: "app-mac-beta.zip",
              },
            ],
          },
          {
            name: "Stable Release",
            tag_name: "v1.5.0",
            body: "Stable release notes",
            draft: false,
            prerelease: false,
            assets: [
              {
                name: "app-mac.zip",
                browser_download_url: "app-mac-stable.zip",
              },
            ],
          },
        ]);

      const res = await fetch(
        `${address}/owner/prerelease-repo/darwin-x64/0.0.0`
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.name).toBe("Stable Release");
      expect(body.url).toBe("app-mac-stable.zip");
    });

    it("returns 404 when all releases are drafts or prereleases", async () => {
      nock("https://api.github.com")
        .get("/repos/owner/no-stable/releases?per_page=100")
        .reply(200, [
          {
            name: "Draft",
            tag_name: "v2.0.0",
            body: "Draft",
            draft: true,
            assets: [
              {
                name: "app-mac.zip",
                browser_download_url: "app-mac.zip",
              },
            ],
          },
          {
            name: "Prerelease",
            tag_name: "v1.0.0-alpha.1",
            body: "Alpha",
            prerelease: true,
            assets: [
              {
                name: "app-mac.zip",
                browser_download_url: "app-mac.zip",
              },
            ],
          },
        ]);

      const res = await fetch(`${address}/owner/no-stable/darwin-x64/0.0.0`);
      expect(res.status).toBe(404);
    });
  });
});
