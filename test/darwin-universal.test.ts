import http from "node:http";
import nock from "nock";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "./helpers/create-server.js";

nock.disableNetConnect();
nock.enableNetConnect("localhost");

describe("Darwin Universal Fallback", () => {
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

  it("prefers newer universal build over older arch-specific build", async () => {
    nock("https://api.github.com")
      .get("/repos/owner/newer-universal/releases?per_page=100")
      .reply(200, [
        {
          name: "v2.0.0",
          tag_name: "v2.0.0",
          body: "Universal build",
          assets: [
            {
              name: "app-universal-mac.zip",
              browser_download_url: "app-universal-v2.zip",
            },
          ],
        },
        {
          name: "v1.0.0",
          tag_name: "v1.0.0",
          body: "x64 build",
          assets: [
            {
              name: "app-mac.zip",
              browser_download_url: "app-mac-v1.zip",
            },
          ],
        },
      ]);

    const res = await fetch(
      `${address}/owner/newer-universal/darwin-x64/0.0.0`
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.name).toBe("v2.0.0");
    expect(body.url).toBe("app-universal-v2.zip");
    expect(body.notes).toBe("Universal build");
  });

  it("prefers arch-specific build when universal build is older", async () => {
    nock("https://api.github.com")
      .get("/repos/owner/newer-arch/releases?per_page=100")
      .reply(200, [
        {
          name: "v2.0.0",
          tag_name: "v2.0.0",
          body: "x64 build",
          assets: [
            {
              name: "app-mac.zip",
              browser_download_url: "app-mac-v2.zip",
            },
          ],
        },
        {
          name: "v1.0.0",
          tag_name: "v1.0.0",
          body: "Universal build",
          assets: [
            {
              name: "app-universal-mac.zip",
              browser_download_url: "app-universal-v1.zip",
            },
          ],
        },
      ]);

    const res = await fetch(`${address}/owner/newer-arch/darwin-x64/0.0.0`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.name).toBe("v2.0.0");
    expect(body.url).toBe("app-mac-v2.zip");
    expect(body.notes).toBe("x64 build");
  });

  it("tests darwin-arm64 with universal fallback when universal is newer", async () => {
    nock("https://api.github.com")
      .get("/repos/owner/arm64-universal/releases?per_page=100")
      .reply(200, [
        {
          name: "v2.0.0",
          tag_name: "v2.0.0",
          body: "Universal build",
          assets: [
            {
              name: "app-universal-mac.zip",
              browser_download_url: "app-universal-v2.zip",
            },
          ],
        },
        {
          name: "v1.0.0",
          tag_name: "v1.0.0",
          body: "ARM64 build",
          assets: [
            {
              name: "app-arm64-mac.zip",
              browser_download_url: "app-arm64-v1.zip",
            },
          ],
        },
      ]);

    const res = await fetch(
      `${address}/owner/arm64-universal/darwin-arm64/0.0.0`
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.name).toBe("v2.0.0");
    expect(body.url).toBe("app-universal-v2.zip");
  });

  it("does not apply universal fallback to win32 platforms", async () => {
    nock("https://api.github.com")
      .get("/repos/owner/win32-no-fallback/releases?per_page=100")
      .reply(200, [
        {
          name: "v1.0.0",
          tag_name: "v1.0.0",
          body: "Release",
          assets: [
            {
              name: "app-universal-mac.zip",
              browser_download_url: "app-universal.zip",
            },
          ],
        },
      ]);

    const res = await fetch(
      `${address}/owner/win32-no-fallback/win32-x64/0.0.0`
    );
    expect(res.status).toBe(404);
    const body = await res.text();
    expect(body).toContain("No updates found");
  });

  it("handles when both arch-specific and universal have same version", async () => {
    nock("https://api.github.com")
      .get("/repos/owner/same-version/releases?per_page=100")
      .reply(200, [
        {
          name: "v1.0.0",
          tag_name: "v1.0.0",
          body: "Same version release",
          assets: [
            {
              name: "app-mac.zip",
              browser_download_url: "app-mac-v1.zip",
            },
            {
              name: "app-universal-mac.zip",
              browser_download_url: "app-universal-v1.zip",
            },
          ],
        },
      ]);

    const res = await fetch(`${address}/owner/same-version/darwin-x64/0.0.0`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.name).toBe("v1.0.0");
    // Should use the arch-specific build when versions are equal
    expect(body.url).toBe("app-mac-v1.zip");
  });
});
