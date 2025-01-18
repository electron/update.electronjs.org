# 📡 update.electronjs.org

> A free service that makes it easy for open-source Electron apps to update themselves.

[![Test](https://github.com/electron/update.electronjs.org/actions/workflows/test.yml/badge.svg)](https://github.com/electron/update.electronjs.org/actions/workflows/test.yml)

## Requirements

Before using this service, make sure your Electron app meets these criteria:

- Your app runs on macOS or Windows
- Your app has a public GitHub repository
- Your builds are published to GitHub Releases
- Your builds are [code signed] **(macOS only)**

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

The following API endpoints are available:

- `/:owner/:repo/:platform/:version`
- `/:owner/:repo/:platform-:arch/:version`
- `/:owner/:repo/:platform/:version/RELEASES`

These API endpoints support the query path arguments as defined below:
- `:owner` - GitHub repository owner (organization or user)
- `:repo` - GitHub repository name
- `:platform` - Platform type
  - Windows: `win32`
  - macOS: `darwin`
- `:arch` - Architecture type
  - Windows: `x64`, `ia32`, `arm64`
  - macOS: `x64`, `arm64`, `universal`
- `:version` - Semantic Versioning (SemVer) compatible application version number
  

## Asset Naming Convention

This project supports specific naming conventions for GitHub Releases assets. 

The following heuristics are used to identify update availability for a specific platform and architecture:

### macOS Assets
- Asset must be a `.zip` file.
- Asset name must include one of the following platform identifiers: `-mac`, `-darwin`, or `-osx`.
- Asset name may specify the architecture (if not specified, will default to `-x64`):
  - `-arm64` for Apple Silicon.
  - `-x64` for Intel-based macOS.
  -  `-universal` for Universal binaries.
**Example asset names:**
- `app-mac-arm64-0.0.1.zip`
- `app-mac-arm64.zip`
- `app-0.0.1-osx-x64.zip`
- `app-osx-x64.zip`
- `app-darwin-universal.zip`
- `app-mac.zip` (no architecture specified - treated as `-x64`) 

### Windows Assets
- Asset must be a `.zip` or `.exe` file.
- Asset name must include the `-win32` platform identifier.
- Asset name may specify the architecture (if not specified, will default to `-x64`):
  - `-ia32` for 32-bit Windows.
  - `-x64` for 64-bit Windows.
  - `-arm64` for ARM-based Windows.
- `.exe` files without specific architecture tags or the `-win32` platform identifier are assumed to be `-x64` by default.  

**Example asset names:**
- `app-win32-ia32-0.0.1.zip`
- `app-win32-ia32.zip`
- `app-0.0.1-win32-x64.zip`
- `app-win32-x64.zip`
- `app-win32-arm64.zip`
- `app-win32-arm64.exe`  
- `app-win32-arm64-v1.2.3.exe`  
- `app-win32.exe` (no architecture specified - treated as `-x64`)  
- `app-installer.exe` (generic `.exe` file with no architecture or platform identifier specified - treated as `-x64`) 

## Development

You'll first need to have a running Redis server. There are two options:

1) Locally: Install Redis locally and run it directly with `redis-server`. Guides can be found [here](https://redis.io/docs/getting-started/installation/install-redis-on-mac-os/).
2) Docker: Install and run Redis with `docker run -p 6379:6379 -it redis/redis-stack-server:latest`.

```bash
$ yarn
$ GH_TOKEN=TOKEN npm start
```

To try with an actual electron app, run:

```bash
$ yarn start &
$ cd example
$ yarn
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
[code signed]: https://github.com/electron/electron/blob/main/docs/tutorial/code-signing.md
