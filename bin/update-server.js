#!/usr/bin/env node

"use strict";

require("dotenv-safe").config();

process.title = "update-server";

const Updates = require("../src/updates");
const redis = require("redis");
const ms = require("ms");
const assert = require("assert");
const Redlock = require("redlock");

//
// Args
//

const {
  GH_TOKEN: token,
  REDIS_URL: redisUrl = "redis://localhost:6379",
  PORT: port = 3000,
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
    // Needed for compatibility with Redlock. However, it also requires all "modern" commands
    // to be prefixed with `client.v4`.
    // See also: https://github.com/redis/node-redis/blob/master/docs/v3-to-v4.md#legacy-mode
    legacyMode: true,
    socket: {
      tls: true,
      rejectUnauthorized: false,
    },
  });

  await client.connect();
  await client.ping();

  client.on('error', err => console.log('Redis Client Error', err));

  const redlock = new Redlock([client], {
    retryDelay: ms("10s"),
  });

  const cache = {
    async get(key) {
      const json = await client.v4.get(key);
      return json && JSON.parse(json);
    },
    async set(key, value) {
      const json = JSON.stringify(value);

      await client.v4.set(key, json, {
        EX: ms(cacheTTL) / 1000,
      });
    },
    async lock(resource) {
      return redlock.lock(`locks:${resource}`, ms("1m"));
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
  updates.listen(port, () => {
    console.log(`http://localhost:${port}`);
  });
}

main();
