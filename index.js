'use strict'

const http = require('http')
const hazel = require('hazel-server')

const server = http.createServer((req, res) => {
  const segs = req.url.split('/').filter(Boolean)
  const [account, repository] = segs
  if (!account || !repository) {
    res.statusCode = 404
    return res.end('Not found')
  }
  req.url = '/' + segs.slice(2).join('/')
  hazel({ account, repository })(req, res)
})

server.listen(3000, () => console.log(`http://localhost:${server.address().port}`))