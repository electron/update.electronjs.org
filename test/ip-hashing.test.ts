import { describe, it, expect } from "vitest";
import Updates from "../src/updates.js";

describe("IP Hashing", () => {
  let updates: Updates;

  class MemoryCache {
    private data: Map<string, any>;

    constructor() {
      this.data = new Map();
    }

    async get(key: string): Promise<any> {
      return this.data.get(key);
    }

    async set(key: string, value: any): Promise<void> {
      this.data.set(key, value);
    }
  }

  updates = new Updates({ cache: new MemoryCache() });

  it("hashes valid IP addresses", () => {
    const ip = "192.168.1.1";
    const hash = updates.hashIp(ip);
    expect(hash).toBeDefined();
    expect(typeof hash).toBe("string");
    expect(hash?.length).toBe(64); // SHA-256 produces 64 hex characters
  });

  it("produces consistent hashes for same IP", () => {
    const ip = "10.0.0.1";
    const hash1 = updates.hashIp(ip);
    const hash2 = updates.hashIp(ip);
    expect(hash1).toBe(hash2);
  });

  it("produces different hashes for different IPs", () => {
    const ip1 = "192.168.1.1";
    const ip2 = "192.168.1.2";
    const hash1 = updates.hashIp(ip1);
    const hash2 = updates.hashIp(ip2);
    expect(hash1).not.toBe(hash2);
  });

  it("handles null IP", () => {
    const hash = updates.hashIp(null);
    expect(hash).toBeUndefined();
  });

  it("handles undefined IP", () => {
    const hash = updates.hashIp(undefined);
    expect(hash).toBeUndefined();
  });

  it("hashes IPv6 addresses", () => {
    const ipv6 = "2001:0db8:85a3:0000:0000:8a2e:0370:7334";
    const hash = updates.hashIp(ipv6);
    expect(hash).toBeDefined();
    expect(typeof hash).toBe("string");
    expect(hash?.length).toBe(64);
  });

  it("hashes localhost addresses", () => {
    const localhost = "127.0.0.1";
    const hash = updates.hashIp(localhost);
    expect(hash).toBeDefined();
    expect(typeof hash).toBe("string");
    expect(hash?.length).toBe(64);
  });

  it("hashes IPv6 localhost", () => {
    const ipv6Localhost = "::1";
    const hash = updates.hashIp(ipv6Localhost);
    expect(hash).toBeDefined();
    expect(typeof hash).toBe("string");
    expect(hash?.length).toBe(64);
  });
});
