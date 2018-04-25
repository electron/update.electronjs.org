'use strict'

require('dotenv-safe').load()

const http = require('http')
const fetch = require('node-fetch')
const semver = require('semver')
const assert = require('assert')

const { NODE_ENV: env } = process.env

class Updates {
  constructor ({ token, cache } = {}) {
    assert(cache, '.cache required')
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
    const [account, repository, platform, version, file] = segs
    if (!account || !repository || !platform || !version) {
      redirect(res, 'https://github.com/electron/update.electronjs.org')
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
    } else if (semver.eq(latest.version, version)) {
      this.log('up to date')
      noContent(res)
    } else {
      this.log(`update available: ${latest.version}`)
      json(res, {
        name: latest.name || latest.version,
        notes: latest.notes,
        url: latest.url
      })
    }
  }

  async cachedGetLatest (account, repository, platform) {
    const key = `${account}/${repository}`
    let latest = await this.cache.get(key)
    if (latest) {
      this.log(`cache hit ${key}`)
      return latest[platform] ? latest[platform] : null
    }

    let lock
    if (this.cache.lock) {
      this.log(`aquiring lock ${key}`)
      lock = await this.cache.lock(key)
      this.log(`aquired lock ${key}`)
      latest = await this.cache.get(key)
      if (latest) {
        this.log(`cache hit after lock ${key}`)
        return latest[platform] ? latest[platform] : null
      }
    }

    latest = await this.getLatest(account, repository)

    if (latest) {
      await this.cache.set(key, latest)
    } else {
      await this.cache.set(key, {})
    }

    if (lock) {
      this.log(`releasing lock ${key}`)
      await lock.unlock()
      this.log(`released lock ${key}`)
    }

    return latest && latest[platform]
  }

  async getLatest (account, repository) {
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

    const latest = {}

    const releases = await res.json()
    for (const release of releases) {
      if (release.draft || release.prerelease) continue
      for (const asset of release.assets) {
        const platform = assetPlatform(asset.name)
        if (platform && !latest[platform]) {
          latest[platform] = {
            name: release.name,
            version: release.tag_name,
            url: asset.browser_download_url,
            notes: release.body
          }
        }
        if (latest.darwin && latest.win32) break
      }
      if (latest.darwin && latest.win32) break
    }

    if (latest.win32) {
      const rurl = `https://github.com/${account}/${repository}/releases/download/${
        latest.win32.version
      }/RELEASES`
      const rres = await fetch(rurl)
      if (rres.status < 400) {
        const body = await rres.text()
        const matches = body.match(/[^ ]*\.nupkg/gim)
        const nuPKG = rurl.replace('RELEASES', matches[0])
        latest.win32.RELEASES = body.replace(matches[0], nuPKG)
      }
    }

    return latest.darwin || latest.win32 ? latest : null
  }
}

const assetPlatform = fileName => {
  if (/.*(mac|darwin|osx).*\.zip/i.test(fileName)) return 'darwin'
  if (/win32-x64|(\.exe$)/.test(fileName)) return 'win32'
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

const redirect = (res, url) => {
  res.statusCode = 302
  res.setHeader('Location', url)
  res.end(url)
}

module.exports = Updates
