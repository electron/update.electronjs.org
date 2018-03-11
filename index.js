'use strict'

const http = require('http')
const fetch = require('node-fetch')

class Updates {
  listen (port, cb) {
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

  async handle (req, res) {
    const segs = req.url.split('/').filter(Boolean)
    const [account, repository, platform, version] = segs
    if (!account || !repository || !platform || !version) return notFound(res)

    await this.handleUpdate(res, account, repository, platform, version)
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
        url: latest.url
      })
    }
  }

  async getLatest (account, repository, platform) {
    const url = `https://api.github.com/repos/${account}/${repository}/releases?per_page=100`
    const headers = { Accept: 'application/vnd.github.preview' }
    const res = await fetch(url, { headers })
    const releases = await res.json()
    const latest = {}
    for (const release of releases) {
      for (const asset of release.assets) {
        if (assetPlatform(asset.name) === platform) {
          latest.version = release.name
          latest.url = asset.browser_download_url
          return latest
        }
      }
    }
  }
}

const assetPlatform = fileName => {
  if (/.*mac.*\.zip/.test(fileName)) return 'darwin'
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
