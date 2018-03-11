'use strict'

const http = require('http')

class Updates {
  constructor () {
    this.cache = new Map()
  }

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
    const [account, repository, method, platform, version] = segs

    if (account && repository && method === 'update' && platform && version) {
      this.handleUpdate(res, account, repository, platform, version)
    } else if (account && repository && method === 'download' && platform) {
      this.handleDownload(res, account, repository, platform)
    } else {
      notFound(res)
    }
  }

  handleUpdate (res, account, repository, platform, version) {
    const key = `${account}/${repository}/${platform}`
    if (this.cache.has(key)) {
      const latest = this.cache.get(key)
      if (latest.version === version) return noContent(res)
      json(res, {
        name: latest.version,
        url: `/${account}/${repository}/download/${platform}`
      })
    } else {
      if (this.cache.has(`${account / repository}`)) return notFound(res)
    }
  }

  handleDownload (res, account, repository, platform) {
    const key = `${account}/${repository}/${platform}`
    if (this.cache.has(key)) {
      const latest = this.cache.get(key)
      redirect(res, latest.url)
    } else {
    }
  }
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
