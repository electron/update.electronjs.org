import http from "node:http";
import nock from "nock";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "./helpers/create-server.js";

nock.disableNetConnect();
nock.enableNetConnect("localhost");

describe("RELEASES File Edge Cases", () => {
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

  it("handles RELEASES file with invalid format (no .nupkg)", async () => {
    nock("https://api.github.com")
      .get("/repos/owner/invalid-releases/releases?per_page=100")
      .reply(200, [
        {
          name: "Release",
          tag_name: "v1.0.0",
          body: "notes",
          assets: [
            {
              name: "app-win32-x64-setup.exe",
              browser_download_url: "app-win32-x64-setup.exe",
            },
          ],
        },
      ]);

    nock("https://github.com")
      .get("/owner/invalid-releases/releases/download/v1.0.0/RELEASES")
      .reply(200, "INVALID FORMAT WITHOUT NUPKG");

    const res = await fetch(
      `${address}/owner/invalid-releases/win32-x64/0.0.0/RELEASES`
    );
    // The assertion in updates.ts should cause an error
    expect(res.status).toBe(500);
  });

  it("handles win32-arm64 RELEASES endpoint", async () => {
    nock("https://api.github.com")
      .get("/repos/owner/arm64-releases/releases?per_page=100")
      .reply(200, [
        {
          name: "ARM64 Release",
          tag_name: "v1.0.0",
          body: "ARM64 notes",
          assets: [
            {
              name: "app-win32-arm64-setup.exe",
              browser_download_url: "app-win32-arm64-setup.exe",
            },
          ],
        },
      ]);

    nock("https://github.com")
      .get("/owner/arm64-releases/releases/download/v1.0.0/RELEASES")
      .reply(200, "HASH arm64-package.nupkg NUMBER");

    const res = await fetch(
      `${address}/owner/arm64-releases/win32-arm64/0.0.0/RELEASES`
    );
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toMatch(/arm64-package\.nupkg/);
    expect(body).toMatch(
      /https:\/\/github\.com\/owner\/arm64-releases\/releases\/download\/v1\.0\.0\/arm64-package\.nupkg/
    );
  });

  it("handles RELEASES file with multiple .nupkg entries", async () => {
    nock("https://api.github.com")
      .get("/repos/owner/multi-nupkg/releases?per_page=100")
      .reply(200, [
        {
          name: "Release",
          tag_name: "v2.0.0",
          body: "notes",
          assets: [
            {
              name: "app-win32-x64-setup.exe",
              browser_download_url: "app-win32-x64-setup.exe",
            },
          ],
        },
      ]);

    nock("https://github.com")
      .get("/owner/multi-nupkg/releases/download/v2.0.0/RELEASES")
      .reply(200, "HASH1 first.nupkg SIZE1\nHASH2 second.nupkg SIZE2");

    const res = await fetch(
      `${address}/owner/multi-nupkg/win32-x64/0.0.0/RELEASES`
    );
    expect(res.status).toBe(200);
    const body = await res.text();
    // Should replace the first .nupkg match
    expect(body).toMatch(/first\.nupkg/);
    expect(body).toMatch(
      /https:\/\/github\.com\/owner\/multi-nupkg\/releases\/download\/v2\.0\.0\/first\.nupkg/
    );
  });

  it("handles empty RELEASES file", async () => {
    nock("https://api.github.com")
      .get("/repos/owner/empty-releases/releases?per_page=100")
      .reply(200, [
        {
          name: "Release",
          tag_name: "v1.0.0",
          body: "notes",
          assets: [
            {
              name: "app-win32-ia32-setup.exe",
              browser_download_url: "app-win32-ia32-setup.exe",
            },
          ],
        },
      ]);

    nock("https://github.com")
      .get("/owner/empty-releases/releases/download/v1.0.0/RELEASES")
      .reply(200, "");

    const res = await fetch(
      `${address}/owner/empty-releases/win32-ia32/0.0.0/RELEASES`
    );
    // Empty RELEASES file won't match the regex, causing assertion to fail
    expect(res.status).toBe(500);
  });
});
