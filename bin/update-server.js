#!/usr/bin/env node

'use strict'

process.title = 'update-server'

const Updates = require('..')
const redis = require('redis')
const { promisify } = require('util')
const ms = require('ms')
const assert = require('assert')

//
// Args
//

const {
  GH_TOKEN: token,
  REDIS_URL: redisUrl,
  PORT: port = 3000,
  CACHE_TTL: cacheTTL = '15m'
} = process.env
assert(token, 'GH_TOKEN required')

//
// Cache
//

const client = redis.createClient(redisUrl)
const get = promisify(client.get).bind(client)

const cache = {
  async get (key) {
    const json = await get(key)
    return json && JSON.parse(json)
  },
  async set (key, value) {
    const multi = client.multi()
    multi.set(key, JSON.stringify(value))
    multi.expire(key, ms(cacheTTL) / 1000)
    const exec = promisify(multi.exec).bind(multi)
    await exec()
  }
}

//
// Go!
//

const updates = new Updates({ token, cache })
updates.listen(port, () => {
  console.log(`http://localhost:${port}`)
})
