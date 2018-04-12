'use strict'

const http = require('http')
const fetch = require('node-fetch')

const { NODE_ENV: env } = process.env

class Updates {
  constructor ({ token, cache = new MemoryCache() } = {}) {
    this.token = token
    this.cache = cache
  }

  listen (port, cb) {
    if (typeof port === 'function') {
      ;[port, cb] = [undefined, port]
    }
    const server = http.createServer((req, res) => {
      this.handle(req, res).catch(err => {
        console.error(err.stack)
        res.statusCode = err.statusCode || 500
        const msg = env === 'production' ? 'Internal Server Error' : err.stack
        res.end(msg)
      })
    })
    server.listen(port, cb)
    return server
  }

  log (...args) {
    if (env !== 'test') console.log(...args)
  }

  async handle (req, res) {
    this.log(req.method, req.url, '...')
    let segs = req.url.split(/[/?]/).filter(Boolean)
    if (segs[0] === 'update') segs = segs.slice(1)
    const [account, repository, platform, version, file] = segs
    if (!account || !repository || !platform || !version) {
      notFound(res)
    } else if (file === 'RELEASES') {
      await this.handleReleases(res, account, repository)
    } else {
      await this.handleUpdate(res, account, repository, platform, version)
    }
    this.log(req.method, req.url, res.statusCode)
  }

  async handleReleases (res, account, repository) {
    const latest = await this.cachedGetLatest(account, repository, 'win32')
    if (!latest || !latest.RELEASES) return notFound(res)
    res.end(latest.RELEASES)
  }

  async handleUpdate (res, account, repository, platform, version) {
    const latest = await this.cachedGetLatest(account, repository, platform)

    if (!latest) {
      notFound(res)
    } else if (latest.version === version) {
      noContent(res)
    } else {
      json(res, {
        name: latest.version,
        notes: latest.notes,
        url: latest.url
      })
    }
  }

  async cachedGetLatest (account, repository, platform) {
    const key = `${account}/${repository}/${platform}`
    let latest = await this.cache.get(key)
    if (latest) {
      this.log(`cache hit ${key}`)
      return latest.version ? latest : null
    }

    latest = await this.getLatest(account, repository, platform)
    if (latest) {
      await this.cache.set(key, latest)
      return latest
    } else {
      await this.cache.set(key, {})
      return null
    }
  }

  async getLatest (account, repository, platform) {
    account = encodeURIComponent(account)
    repository = encodeURIComponent(repository)
    const url = `https://api.github.com/repos/${account}/${repository}/releases?per_page=100`
    const headers = { Accept: 'application/vnd.github.preview' }
    if (this.token) headers.Authorization = `token ${this.token}`
    const res = await fetch(url, { headers })
    this.log(`API github releases status=${res.status}`)

    if (res.status === 403) {
      console.error('Rate Limited!')
      return
    }

    if (res.status >= 400) {
      return
    }

    let latest

    const releases = await res.json()
    for (const release of releases) {
      if (release.draft || release.prerelease) continue
      for (const asset of release.assets) {
        if (assetPlatform(asset.name) === platform) {
          latest = {
            version: release.name || release.tag_name,
            url: asset.browser_download_url,
            notes: release.body
          }
          break
        }
      }
      if (latest) break
    }

    if (!latest) return

    const rurl = `https://github.com/${account}/${repository}/releases/download/${
      latest.version
    }/RELEASES`
    const rres = await fetch(rurl)
    if (rres.status < 400) {
      const body = await rres.text()
      const matches = body.match(/[^ ]*\.nupkg/gim)
      const nuPKG = rurl.replace('RELEASES', matches[0])
      latest.RELEASES = body.replace(matches[0], nuPKG)
    }

    return latest
  }
}

class MemoryCache {
  constructor () {
    this.data = new Map()
  }
  async get (key) {
    return this.data.get(key)
  }
  async set (key, value) {
    this.data.set(key, value)
  }
}

const assetPlatform = fileName => {
  if (/.*(mac|darwin).*\.zip/.test(fileName)) return 'darwin'
  if (/\.exe$/.test(fileName)) return 'win32'
  return false
}

const notFound = res => {
  res.statusCode = 404
  res.end('Not found')
}

const noContent = res => {
  res.statusCode = 204
  res.end()
}

const json = (res, obj) => {
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(obj))
}

module.exports = Updates
