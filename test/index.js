'use strict'

const { test } = require('tap')
const fetch = require('node-fetch')
const Updates = require('..')

const createServer = () =>
  new Promise(resolve => {
    const updates = new Updates()
    const server = updates.listen(() => {
      resolve({
        server,
        address: `http://localhost:${server.address().port}`
      })
    })
  })

test('Updates', async t => {
  const { server, address } = await createServer()
  const res = await fetch(`${address}/`)
  t.equal(res.status, 404)
  server.close()
})
