# update-server

WIP Public electron update server.

## Usage

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
const server = 'https://electron-update-server.herokuapp.com'
const feed = `${server}/update/USER/REPOSITORY/${process.platform}/${app.getVersion()}`

autoUpdater.setFeedURL(feed)
```

As the final step, check for updates. The example below will check every minute:

```javascript
setInterval(() => {
  autoUpdater.checkForUpdates()
}, 60000)
```

Once your application is [packaged](https://electronjs.org/docs/tutorial/application-distribution),
it will receive an update for each new
[GitHub Release](https://help.github.com/articles/creating-releases/) that you
publish.

## Routes

### `/update?/:owner/:repo/:platform/:version`
### `/update?/:owner/:repo/win32/:version/RELEASES`

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
$ ./dist/mac/hyper.app/Contents/MacOS/hyper
```

On Windows:

```bash
$ npm install --save 7zip-bin-win app-builder-bin-win electron-builder-squirrel-windows
$ npm run build
$ "example\dist\squirrel-windows\hyper Setup 0.0.0.exe"
```
