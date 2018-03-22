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

  // exists and has update
  res = await fetch(`${address}/dat-land/dat-desktop/darwin/1.0.0`)
  t.equal(res.status, 200)
  const body = await res.json()
  t.ok(body.name)
  t.match(body.url, /-mac\.zip$/)
  t.ok(body.notes)

  // exists but no updates
  res = await fetch(
    `https://api.github.com/repos/dat-land/dat-desktop/releases?per_page=1`
  )
  const releases = await res.json()
  res = await fetch(
    `${address}/dat-land/dat-desktop/darwin/${releases[0].name}`
  )
  t.equal(res.status, 204)

  // exists but has no releases
  res = await fetch(`${address}/juliangruber/brace-expansion/darwin/0.0.0`)
  t.equal(res.status, 404)

  // doesn't exist
  res = await fetch(`${address}/doesnot/exist-123123123/darwin/0.0.0`)
  t.equal(res.status, 404)

  server.close()
})
