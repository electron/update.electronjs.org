#!/usr/bin/env node

"use strict";

require("dotenv-safe").config();

process.title = "update-server";

const Updates = require("..");
const redis = require("redis");
const { promisify } = require("util");
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

const fixedRedisUrl = redisUrl.replace("redis://h:", "redis://:");
const client = redis.createClient(fixedRedisUrl);
const get = promisify(client.get).bind(client);
const redlock = new Redlock([client], {
  retryDelay: ms("10s"),
});

const cache = {
  async get(key) {
    const json = await get(key);
    return json && JSON.parse(json);
  },
  async set(key, value) {
    const multi = client.multi();
    multi.set(key, JSON.stringify(value));
    multi.expire(key, ms(cacheTTL) / 1000);
    const exec = promisify(multi.exec).bind(multi);
    await exec();
  },
  async lock(resource) {
    return redlock.lock(`locks:${resource}`, ms("1m"));
  },
};

//
// Go!
//

const updates = new Updates({ token, cache });
updates.listen(port, () => {
  console.log(`http://localhost:${port}`);
});
