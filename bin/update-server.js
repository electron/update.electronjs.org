#!/usr/bin/env node

'use strict'

process.title = 'update-server'

const Updates = require('..')
const { TOKEN: token } = process.env

const updates = new Updates({ token })
const server = updates.listen(3000, () => {
  console.log(`http://localhost:${server.address().port}`)
})
