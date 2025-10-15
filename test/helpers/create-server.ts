import http from "node:http";
import Updates from "../../src/updates.js";

interface CacheData {
  [key: string]: any;
}

class MemoryCache {
  private data: Map<string, CacheData>;

  constructor() {
    this.data = new Map();
  }

  async get(key: string): Promise<CacheData | undefined> {
    return this.data.get(key);
  }

  async set(key: string, value: CacheData): Promise<void> {
    this.data.set(key, value);
  }
}

export function createServer(): Promise<{
  server: http.Server;
  address: string;
}> {
  return new Promise((resolve) => {
    const updates = new Updates({ cache: new MemoryCache() });
    const server = updates.listen(() => {
      const addr = server.address();
      const port = typeof addr === "object" && addr !== null ? addr.port : 3000;
      resolve({
        server,
        address: `http://localhost:${port}`,
      });
    });
  });
}
