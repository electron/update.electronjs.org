#!/usr/bin/env node

import { config } from "dotenv-safe";
import assert from "node:assert";
import redis from "redis";
import ms, { StringValue } from "ms";
import Redlock, { CompatibleRedisClient } from "redlock";
import Updates from "../src/updates.js";

config();

process.title = "update-server";

//
// Args
//

const {
  GH_TOKEN: token,
  REDIS_URL: redisUrl = "redis://localhost:6379",
  PORT: port = "3000",
  CACHE_TTL: cacheTTL = "15m",
} = process.env;
assert(token, "GH_TOKEN required");

//
// Cache
//
async function getCache() {
  const fixedRedisUrl = redisUrl.replace("redis://h:", "redis://:");
  const client = redis.createClient({
    url: fixedRedisUrl,
    socket: {
      tls: true,
      rejectUnauthorized: false,
    },
  });

  await client.connect();
  await client.ping();

  client.on("error", (err) => console.log("Redis Client Error", err));

  const redlock = new Redlock([client.legacy() as CompatibleRedisClient], {
    retryDelay: ms("10s"),
  });

  const cache = {
    async get(key: string) {
      const json = await client.get(key);
      return json && typeof json === "string" && JSON.parse(json);
    },
    async set(key: string, value: any) {
      const json = JSON.stringify(value);

      await client.set(key, json, {
        EX: Math.floor(ms(cacheTTL as StringValue) / 1000),
      });
    },
    async lock(resource: string) {
      const result = await redlock.lock([`locks:${resource}`], ms("1m"));
      return {
        async unlock() {
          await result.unlock();
        },
      };
    },
  };

  return cache;
}

//
// Go!
//
async function main() {
  const cache = await getCache();
  const updates = new Updates({ token, cache });
  updates.listen(Number(port), () => {
    console.log(`http://localhost:${port}`);
  });
}

main();
