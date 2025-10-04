import http from "node:http";
import nock from "nock";
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import Updates from "../src/updates.js";

nock.disableNetConnect();
nock.enableNetConnect("localhost");

interface CacheData {
  [key: string]: any;
}

class MemoryCacheWithLock {
  private data: Map<string, CacheData>;
  private locks: Map<string, boolean>;

  constructor() {
    this.data = new Map();
    this.locks = new Map();
  }

  async get(key: string): Promise<CacheData | undefined> {
    return this.data.get(key);
  }

  async set(key: string, value: CacheData): Promise<void> {
    this.data.set(key, value);
  }

  async lock(key: string): Promise<{ unlock(): Promise<void> }> {
    // Simulate waiting for lock if already locked
    while (this.locks.get(key)) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    this.locks.set(key, true);
    return {
      unlock: async () => {
        this.locks.delete(key);
      },
    };
  }
}

describe("Cache Locking", () => {
  let server: http.Server;
  let address: string;
  let cache: MemoryCacheWithLock;

  beforeEach(() => {
    cache = new MemoryCacheWithLock();
    nock.cleanAll();
  });

  beforeAll(async () => {
    cache = new MemoryCacheWithLock();
    const updates = new Updates({ cache });
    server = await new Promise((resolve) => {
      const s = updates.listen(() => resolve(s));
    });
    const addr = server.address();
    const port = typeof addr === "object" && addr !== null ? addr.port : 3000;
    address = `http://localhost:${port}`;
  });

  afterAll(() => {
    server.close();
  });

  it("prevents duplicate API calls with lock", async () => {
    let apiCallCount = 0;

    nock("https://api.github.com")
      .get("/repos/owner/locked-repo/releases?per_page=100")
      .reply(200, function () {
        apiCallCount++;
        return [
          {
            name: "Release",
            tag_name: "v1.0.0",
            body: "notes",
            assets: [
              {
                name: "app-mac.zip",
                browser_download_url: "app-mac.zip",
              },
            ],
          },
        ];
      });

    // Make two concurrent requests
    const [res1, res2] = await Promise.all([
      fetch(`${address}/owner/locked-repo/darwin-x64/0.0.0`),
      fetch(`${address}/owner/locked-repo/darwin-x64/0.0.0`),
    ]);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);

    // Lock should prevent duplicate API calls
    expect(apiCallCount).toBe(1);
  });

  it("uses cached data after lock is released", async () => {
    let apiCallCount = 0;

    nock("https://api.github.com")
      .get("/repos/owner/cached-repo/releases?per_page=100")
      .reply(200, function () {
        apiCallCount++;
        return [
          {
            name: "Release",
            tag_name: "v1.0.0",
            body: "notes",
            assets: [
              {
                name: "app-mac.zip",
                browser_download_url: "app-mac.zip",
              },
            ],
          },
        ];
      });

    // First request
    const res1 = await fetch(`${address}/owner/cached-repo/darwin-x64/0.0.0`);
    expect(res1.status).toBe(200);
    expect(apiCallCount).toBe(1);

    // Second request should use cache
    const res2 = await fetch(`${address}/owner/cached-repo/darwin-x64/0.0.0`);
    expect(res2.status).toBe(200);
    expect(apiCallCount).toBe(1); // No additional API call
  });
});

describe("Cache Migration", () => {
  let server: http.Server;
  let address: string;

  class LegacyCache {
    private data: Map<string, any>;

    constructor() {
      this.data = new Map();
      // Populate with old-format cache data
      this.data.set("owner/legacy-repo", {
        darwin: {
          name: "Legacy Release",
          version: "1.0.0",
          url: "app-mac-legacy.zip",
          notes: "Legacy format",
        },
        win32: {
          name: "Legacy Release",
          version: "1.0.0",
          url: "app-win32-legacy.exe",
          notes: "Legacy format",
        },
      });
    }

    async get(key: string): Promise<any> {
      return this.data.get(key);
    }

    async set(key: string, value: any): Promise<void> {
      this.data.set(key, value);
    }
  }

  beforeAll(async () => {
    const cache = new LegacyCache();
    const updates = new Updates({ cache });
    server = await new Promise((resolve) => {
      const s = updates.listen(() => resolve(s));
    });
    const addr = server.address();
    const port = typeof addr === "object" && addr !== null ? addr.port : 3000;
    address = `http://localhost:${port}`;
  });

  afterAll(() => {
    server.close();
  });

  it("migrates old darwin cache format to darwin-x64", async () => {
    const res = await fetch(`${address}/owner/legacy-repo/darwin-x64/0.0.0`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.name).toBe("Legacy Release");
    expect(body.url).toBe("app-mac-legacy.zip");
  });

  it("migrates old darwin cache format for darwin platform", async () => {
    const res = await fetch(`${address}/owner/legacy-repo/darwin/0.0.0`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.name).toBe("Legacy Release");
    expect(body.url).toBe("app-mac-legacy.zip");
  });

  it("migrates old win32 cache format to win32-x64", async () => {
    const res = await fetch(`${address}/owner/legacy-repo/win32-x64/0.0.0`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.name).toBe("Legacy Release");
    expect(body.url).toBe("app-win32-legacy.exe");
  });

  it("migrates old win32 cache format for win32 platform", async () => {
    const res = await fetch(`${address}/owner/legacy-repo/win32/0.0.0`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.name).toBe("Legacy Release");
    expect(body.url).toBe("app-win32-legacy.exe");
  });
});
