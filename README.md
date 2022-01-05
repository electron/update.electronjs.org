# 📡 update.electronjs.org

> A free service that makes it easy for open-source Electron apps to update themselves.

[![Build Status](https://travis-ci.org/electron/update.electronjs.org.svg?branch=master)](https://travis-ci.org/electron/update.electronjs.org)

## Requirements

Before using this service, make sure your Electron app meets these criteria:

- Your app runs on macOS or Windows
- Your app has a public GitHub repository
- Your builds are published to GitHub Releases
- Your builds are [code signed]

## Quick Setup

Install [update-electron-app] as a runtime dependency (not a devDependency):

```sh
npm install update-electron-app --save
```

Call it from in your [main process] file:

```js
require('update-electron-app')()
```

And that's all it takes! To customize, see the [update-electron-app API].

Once your application is [packaged](https://electronjs.org/docs/tutorial/application-distribution),
it will update itself for each new
[GitHub Release](https://help.github.com/articles/creating-releases/) that you
publish.

## Manual Setup

Use something like the following setup to add automatic updates to your application:

**Important:** Please ensure that the code below will only be executed in
your packaged app, and not in development. You can use
[electron-is-dev](https://github.com/sindresorhus/electron-is-dev) to check for
the environment.

```javascript
const { app, autoUpdater } = require('electron')
```

Next, construct the URL of the update server and tell
[autoUpdater](https://electronjs.org/docs/api/auto-updater) about it:

```javascript
const server = 'https://update.electronjs.org'
const feed = `${server}/OWNER/REPO/${process.platform}-${process.arch}/${app.getVersion()}`

autoUpdater.setFeedURL(feed)
```

As the final step, check for updates. The example below will check every 10
minutes:

```javascript
setInterval(() => {
  autoUpdater.checkForUpdates()
}, 10 * 60 * 1000)
```

Once your application is [packaged](https://electronjs.org/docs/tutorial/application-distribution),
it will update itself for each new
[GitHub Release](https://help.github.com/articles/creating-releases/) that you
publish.

## Routes

### `/:owner/:repo/:platform/:version`
### `/:owner/:repo/win32/:version/RELEASES`

## Development

```bash
$ npm install
$ redis-server
$ GH_TOKEN=TOKEN npm start
```

To try with an actual electron app, run:

```bash
$ npm start &
$ cd example
$ npm install
```

On Darwin:

```bash
$ npm run build
$ ./out/test-darwin-x64/test.app/Contents/MacOS/test
```

On Windows:

```bash
$ npm run build
$ "example\out\make\squirrel.windows\x64\test-0.0.0 Setup.exe"
```

[update-electron-app API]: https://github.com/electron/update-electron-app#api
[update-electron-app]: https://github.com/electron/update-electron-app
[main process]: https://electronjs.org/docs/glossary#main-process
[code signed]: https://github.com/electron/electron/blob/master/docs/tutorial/code-signing.md
