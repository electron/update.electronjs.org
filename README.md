# update-server

WIP public electron update server.

## Routes

### `/update?/:owner/:repo/:platform/:version`
### `/update?/:owner/:repo/win32/:version/RELEASES`

## Development

```bash
$ npm install
$ TOKEN=GHTOKEN npm start
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
