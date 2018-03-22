'use strict'

const http = require('http')
const fetch = require('node-fetch')

class Updates {
  listen (port, cb) {
    if (typeof port === 'function') {
      ;[port, cb] = [undefined, port]
    }
    const server = http.createServer((req, res) => {
      this.handle(req, res).catch(err => {
        console.error(err.stack)
        res.statusCode = err.statusCode || 500
        res.end(err.stack)
      })
    })
    server.listen(port, cb)
    return server
  }

  log (...args) {
    if (process.env.NODE_ENV !== 'test') console.log(...args)
  }

  async handle (req, res) {
    this.log(req.method, req.url, '...')
    const segs = req.url.split('/').filter(Boolean)
    const [account, repository, platform, version] = segs
    if (!account || !repository || !platform || !version) {
      notFound(res)
    } else {
      await this.handleUpdate(res, account, repository, platform, version)
    }
    this.log(req.method, req.url, res.statusCode)
  }

  async handleUpdate (res, account, repository, platform, version) {
    const latest = await this.getLatest(account, repository, platform)

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

  async getLatest (account, repository, platform) {
    const url = `https://api.github.com/repos/${account}/${repository}/releases?per_page=100`
    const headers = { Accept: 'application/vnd.github.preview' }
    const res = await fetch(url, { headers })

    if (res.status === 403) {
      console.error('Rate Limited!')
      return
    }

    if (res.status >= 400) {
      return
    }

    const releases = await res.json()
    for (const release of releases) {
      for (const asset of release.assets) {
        if (assetPlatform(asset.name) === platform) {
          return {
            version: release.name,
            url: asset.browser_download_url,
            notes: release.body
          }
        }
      }
    }
  }
}

const assetPlatform = fileName => {
  if (/.*(mac|darwin).*\.zip/.test(fileName)) return 'darwin'
  if (/\.AppImage$/.test(fileName)) return 'appimage'
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
