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

const { TOKEN: token, REDIS_URL: redisUrl } = process.env
assert(token, 'TOKEN required')

//
// Cache
//

const client = redis.createClient(redisUrl)
const get = promisify(client.get).bind(client)
const set = promisify(client.set).bind(client)

const cache = {
  async get (key) {
    const json = await get(key)
    return json && JSON.parse(json)
  },
  async set (key, value) {
    const multi = client.multi()
    multi.set(key, JSON.stringify(value))
    multi.expire(key, ms('15m'))
    const exec = promisify(multi.exec).bind(multi)
    await exec()
  }
}

//
// Go!
//

const updates = new Updates({ token, cache })
const server = updates.listen(3000, () => {
  console.log(`http://localhost:${server.address().port}`)
})
