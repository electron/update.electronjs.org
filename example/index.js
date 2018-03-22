'use strict'

const { autoUpdater } = require('electron')

const server = 'http://localhost:3000'
const feed = `${server}/dat-land/dat-desktop/${process.platform}/0.0.0`

autoUpdater.setFeedURL(feed)
autoUpdater.checkForUpdates()

autoUpdater.on('checking-for-update', () => {
  console.log('checking-for-update')
})

autoUpdater.on('update-available', () => {
  console.log('update-available')
})

autoUpdater.on('update-not-available', () => {
  console.log('update-not-available')
})

autoUpdater.on(
  'update-downloaded',
  (event, releaseNotes, releaseName, updateURL) => {
    console.log('update-downloaded', {
      event,
      releaseNotes,
      releaseName,
      updateURL
    })
  }
)

autoUpdater.on('error', error => {
  console.log('error', { error })
})
