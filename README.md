# update-server

WIP public electron update server.

## Routes

### `/:owner/:repo/:platform/:version`
### `/:owner/:repo/win32/:version/RELEASES`

## Development

```bash
$ npm install
$ npm start
```

To try with an actual electron app, run:

```bash
$ npm start &
$ cd example
$ npm install
$ npm run build
$ ./dist/mac/dat-desktop.app/Contents/MacOS/dat-desktop
```