#!/usr/bin/env node

import { config } from 'dotenv-safe';
import assert from 'node:assert';
import redis from 'redis';
import ms from 'ms';
import Updates from '../src/updates.ts';

config();

process.title = 'update-server';

//
// Args
//

const {
  GH_TOKEN: token,
  REDIS_URL: redisUrl = 'redis://localhost:6379',
  PORT: port = '3000',
  CACHE_TTL: cacheTTL = '15m',
} = process.env;
assert(token, 'GH_TOKEN required');

//
// Cache
//
async function getCache() {
  const fixedRedisUrl = redisUrl.replace('redis://h:', 'redis://:');
  const client = redis.createClient({
    url: fixedRedisUrl,
    socket: { tls: true, rejectUnauthorized: false },
  });

  await client.connect();
  await client.ping();

  client.on('error', (err) => console.log('Redis Client Error', err));

  const cache = {
    async get(key: string) {
      const json = await client.get(key);
      return json && typeof json === 'string' && JSON.parse(json);
    },
    async set(key: string, value: any) {
      const json = JSON.stringify(value);

      await client.set(key, json, {
        EX: Math.floor(ms(cacheTTL as ms.StringValue) / 1000),
      });
    },
    async lock(resource: string) {
      const lockKey = `locks:${resource}`;
      const lockTTL = Math.floor(ms('1m') / 1000);
      const acquired = await client.set(lockKey, '1', { NX: true, EX: lockTTL });
      if (!acquired) {
        throw new Error(`Could not acquire lock for ${resource}`);
      }
      return {
        async unlock() {
          await client.del(lockKey);
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

void main();
