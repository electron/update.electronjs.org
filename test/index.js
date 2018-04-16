'use strict'

const { test } = require('tap')
const fetch = require('node-fetch')
const Updates = require('..')
const assert = require('assert')
const nock = require('nock')

const { GH_TOKEN: token } = process.env
assert(token, 'GH_TOKEN required')

class MemoryCache {
  constructor () {
    this.data = new Map()
    this.locks = new Map()
  }
  async get (key) {
    return this.data.get(key)
  }
  async set (key, value) {
    this.data.set(key, value)
  }
}

const createServer = () =>
  new Promise(resolve => {
    const updates = new Updates({ token, cache: new MemoryCache() })
    const server = updates.listen(() => {
      resolve({
        server,
        address: `http://localhost:${server.address().port}`
      })
    })
  })

nock.disableNetConnect()
nock.enableNetConnect('localhost')

nock('https://api.github.com')
  .get('/repos/owner/repo/releases?per_page=100')
  .reply(200, [
    {
      name: 'name',
      tag_name: '1.0.0',
      body: 'notes',
      assets: [
        {
          name: 'mac.zip',
          browser_download_url: 'mac.zip'
        },
        {
          name: 'win.exe',
          browser_download_url: 'win.exe'
        }
      ]
    }
  ])
  .get('/repos/owner/repo-with-v/releases?per_page=100')
  .reply(200, [
    {
      name: 'name',
      tag_name: 'v1.0.0',
      body: 'notes',
      assets: [
        {
          name: 'mac.zip',
          browser_download_url: 'mac.zip'
        }
      ]
    }
  ])
  .get('/repos/owner/repo-without-releases/releases?per_page=100')
  .reply(200, [])
  .get('/repos/owner/not-exist/releases?per_page=100')
  .reply(404)
  .get('/repos/owner/repo-darwin/releases?per_page=100')
  .reply(200, [
    {
      name: 'name',
      tag_name: 'v1.0.0',
      body: 'notes',
      assets: [
        {
          name: 'darwin.zip',
          browser_download_url: 'darwin.zip'
        }
      ]
    }
  ])
  .get('/repos/owner/repo-win32-zip/releases?per_page=100')
  .reply(200, [
    {
      name: 'name',
      tag_name: 'v1.0.0',
      body: 'notes',
      assets: [
        {
          name: 'win32-ia32.zip',
          browser_download_url: 'win32-ia32.zip'
        },
        {
          name: 'win32-x64.zip',
          browser_download_url: 'win32-x64.zip'
        }
      ]
    }
  ])
  .get('/repos/owner/repo-no-releases/releases?per_page=100')
  .reply(200, [
    {
      name: 'name',
      tag_name: 'v1.0.0',
      body: 'notes',
      assets: [
        {
          name: 'win32-ia32.zip',
          browser_download_url: 'win32-ia32.zip'
        },
        {
          name: 'win32-x64.zip',
          browser_download_url: 'win32-x64.zip'
        }
      ]
    }
  ])
nock('https://github.com')
  .get('/owner/repo/releases/download/1.0.0/RELEASES')
  .reply(404)
  .get('/owner/repo-with-v/releases/download/v1.0.0/RELEASES')
  .reply(404)
  .get('/owner/repo-darwin/releases/download/v1.0.0/RELEASES')
  .reply(404)
  .get('/owner/repo-win32-zip/releases/download/v1.0.0/RELEASES')
  .reply(404)
  .get('/owner/repo-no-releases/releases/download/v1.0.0/RELEASES')
  .reply(404)

test('Updates', async t => {
  const { server, address } = await createServer()

  await t.test('Routes', async t => {
    const res = await fetch(`${address}/`)
    t.equal(res.status, 404)

    await t.test('exists and has update', async t => {
      for (let i = 0; i < 2; i++) {
        const res = await fetch(`${address}/owner/repo/darwin/0.0.0`)
        t.equal(res.status, 200)
        const body = await res.json()
        t.deepEqual(body, {
          name: 'name',
          url: 'mac.zip',
          notes: 'notes'
        })
      }
    })

    await t.test('exists but no updates', async t => {
      for (let i = 0; i < 2; i++) {
        const res = await fetch(`${address}/owner/repo/darwin/1.0.0`)
        t.equal(res.status, 204)
      }
    })

    await t.test('parses semver with optional leading v', async t => {
      for (let i = 0; i < 2; i++) {
        const res = await fetch(`${address}/owner/repo/darwin/v1.0.0`)
        t.equal(res.status, 204)
      }
      for (let i = 0; i < 2; i++) {
        const res = await fetch(`${address}/owner/repo-with-v/darwin/1.0.0`)
        t.equal(res.status, 204)
      }
      for (let i = 0; i < 2; i++) {
        const res = await fetch(`${address}/owner/repo-with-v/darwin/v1.0.0`)
        t.equal(res.status, 204)
      }
    })

    await t.test('exists but has no releases', async t => {
      for (let i = 0; i < 2; i++) {
        const res = await fetch(
          `${address}/owner/repo-without-releases/darwin/0.0.0`
        )
        t.equal(res.status, 404)
      }
    })

    await t.test("doesn't exist", async t => {
      for (let i = 0; i < 2; i++) {
        const res = await fetch(`${address}/owner/not-exist/darwin/0.0.0`)
        t.equal(res.status, 404)
      }
    })
  })

  await t.test('Platforms', async t => {
    await t.test('Darwin', async t => {
      for (let i = 0; i < 2; i++) {
        let res = await fetch(`${address}/owner/repo/darwin/0.0.0`)
        t.equal(res.status, 200)
        let body = await res.json()
        t.equal(body.url, 'mac.zip')

        res = await fetch(`${address}/owner/repo-darwin/darwin/0.0.0`)
        t.equal(res.status, 200)
        body = await res.json()
        t.match(body.url, 'darwin.zip')
      }
    })

    await t.test('Win32', async t => {
      await t.test('.exe', async t => {
        // FIXME should hit cache
        nock('https://api.github.com')
          .get('/repos/owner/repo/releases?per_page=100')
          .reply(200, [
            {
              name: 'name',
              tag_name: '1.0.0',
              body: 'notes',
              assets: [
                {
                  name: 'mac.zip',
                  browser_download_url: 'mac.zip'
                },
                {
                  name: 'win.exe',
                  browser_download_url: 'win.exe'
                }
              ]
            }
          ])
        nock('https://github.com')
          .get('/owner/repo/releases/download/1.0.0/RELEASES')
          .reply(200, 'HASH name.nupkg NUMBER')
        for (let i = 0; i < 2; i++) {
          const res = await fetch(`${address}/owner/repo/win32/0.0.0`)
          t.equal(res.status, 200)
          const body = await res.json()
          t.equal(body.url, 'win.exe')
          t.ok(body.name)
        }
      })

      await t.test('win32-x64', async t => {
        for (let i = 0; i < 2; i++) {
          const res = await fetch(`${address}/owner/repo-win32-zip/win32/0.0.0`)
          t.equal(res.status, 200)
          const body = await res.json()
          t.equal(body.url, 'win32-x64.zip')
          t.ok(body.name)
        }
      })

      await t.test('RELEASES', async t => {
        for (let i = 0; i < 2; i++) {
          const res = await fetch(
            `${address}/owner/repo/win32/0.0.0/RELEASES?some-extra`
          )
          t.equal(res.status, 200)
          const body = await res.text()
          t.match(
            body,
            /^[^ ]+ https:\/\/github.com\/owner\/repo\/releases\/download\/[^/]+\/name.nupkg [^ ]+$/
          )
        }

        for (let i = 0; i < 2; i++) {
          const res = await fetch(
            `${address}/owner/repo-no-releases/win32/0.0.0/RELEASES`
          )
          t.equal(res.status, 404)
        }
      })
    })
  })

  server.close()
})
