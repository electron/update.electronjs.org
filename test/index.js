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

  let res = await fetch(`${address}/`)
  t.equal(res.status, 404)

  res = await fetch(`${address}/dat-land/dat-desktop/darwin/1.0.0`)
  t.equal(res.status, 200)
  const body = await res.json()
  t.ok(body.name)
  t.match(body.url, /-mac\.zip$/)

  server.close()
})
