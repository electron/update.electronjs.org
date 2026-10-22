import http from 'node:http';
import nock from 'nock';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from './helpers/create-server.ts';

nock.disableNetConnect();
nock.enableNetConnect('localhost');

// A release that ships every Windows architecture, so each of the three
// Squirrel.Windows keys resolves and performs its own RELEASES lookup.
const mockWindowsRelease = (repo: string, tag: string): void => {
  nock('https://api.github.com')
    .get(`/repos/owner/${repo}/releases?per_page=100`)
    .reply(200, [
      {
        name: 'Release',
        tag_name: tag,
        body: 'notes',
        assets: [
          {
            name: 'app-win32-x64-setup.exe',
            browser_download_url: 'app-win32-x64-setup.exe',
          },
          {
            name: 'app-win32-ia32-setup.exe',
            browser_download_url: 'app-win32-ia32-setup.exe',
          },
          {
            name: 'app-win32-arm64-setup.exe',
            browser_download_url: 'app-win32-arm64-setup.exe',
          },
        ],
      },
    ]);
};

describe('Arch-qualified Squirrel.Windows RELEASES', () => {
  let server: http.Server;
  let address: string;

  beforeAll(async () => {
    const result = await createServer();
    server = result.server;
    address = result.address;
  });

  afterAll(() => {
    server.close();
  });

  describe('win32-x64', () => {
    it('falls back to the bare RELEASES file when x64.RELEASES does not exist', async () => {
      mockWindowsRelease('x64-fallback', '1.0.0');
      const scope = nock('https://github.com')
        .get('/owner/x64-fallback/releases/download/1.0.0/x64.RELEASES')
        .reply(404)
        .get('/owner/x64-fallback/releases/download/1.0.0/ia32.RELEASES')
        .reply(404)
        .get('/owner/x64-fallback/releases/download/1.0.0/arm64.RELEASES')
        .reply(404)
        .get('/owner/x64-fallback/releases/download/1.0.0/RELEASES')
        .reply(200, 'HASH name.nupkg NUMBER');

      const res = await fetch(`${address}/owner/x64-fallback/win32-x64/0.0.0/RELEASES`);
      expect(res.status).toBe(200);
      // Byte-identical to the output produced before arch-qualified lookups existed.
      expect(await res.text()).toBe(
        'HASH https://github.com/owner/x64-fallback/releases/download/1.0.0/name.nupkg NUMBER',
      );

      // Every architecture fell back to the same bare RELEASES file, which was
      // fetched only once; the 404 probes were all consumed.
      expect(scope.isDone()).toBe(true);
    });

    it('prefers x64.RELEASES when it exists', async () => {
      mockWindowsRelease('x64-prefixed', 'v2.0.0');
      const scope = nock('https://github.com')
        .get('/owner/x64-prefixed/releases/download/v2.0.0/x64.RELEASES')
        .reply(200, 'HASH x64.app-2.0.0-full.nupkg 200')
        .get('/owner/x64-prefixed/releases/download/v2.0.0/ia32.RELEASES')
        .reply(404)
        .get('/owner/x64-prefixed/releases/download/v2.0.0/arm64.RELEASES')
        .reply(404)
        .get('/owner/x64-prefixed/releases/download/v2.0.0/RELEASES')
        .reply(200, 'HASH app-2.0.0-full.nupkg 100');

      const res = await fetch(`${address}/owner/x64-prefixed/win32-x64/0.0.0/RELEASES`);
      expect(res.status).toBe(200);
      expect(await res.text()).toBe(
        'HASH https://github.com/owner/x64-prefixed/releases/download/v2.0.0/x64.app-2.0.0-full.nupkg 200',
      );

      // ia32 and arm64 still fell back to the bare RELEASES file.
      const ia32 = await fetch(`${address}/owner/x64-prefixed/win32-ia32/0.0.0/RELEASES`);
      expect(await ia32.text()).toBe(
        'HASH https://github.com/owner/x64-prefixed/releases/download/v2.0.0/app-2.0.0-full.nupkg 100',
      );
      expect(scope.isDone()).toBe(true);
    });
  });

  describe('win32-arm64', () => {
    it('serves arm64.RELEASES when it exists and rewrites its nupkg', async () => {
      mockWindowsRelease('arm64-prefixed', 'v1.0.0');
      const scope = nock('https://github.com')
        .get('/owner/arm64-prefixed/releases/download/v1.0.0/x64.RELEASES')
        .reply(404)
        .get('/owner/arm64-prefixed/releases/download/v1.0.0/ia32.RELEASES')
        .reply(404)
        .get('/owner/arm64-prefixed/releases/download/v1.0.0/arm64.RELEASES')
        .reply(200, 'ARMHASH arm64.app-1.0.0-full.nupkg 300')
        .get('/owner/arm64-prefixed/releases/download/v1.0.0/RELEASES')
        .reply(200, 'HASH app-1.0.0-full.nupkg 100');

      const arm64 = await fetch(`${address}/owner/arm64-prefixed/win32-arm64/0.0.0/RELEASES`);
      expect(arm64.status).toBe(200);
      expect(await arm64.text()).toBe(
        'ARMHASH https://github.com/owner/arm64-prefixed/releases/download/v1.0.0/arm64.app-1.0.0-full.nupkg 300',
      );

      // x64 is unaffected and still gets the bare RELEASES file.
      const x64 = await fetch(`${address}/owner/arm64-prefixed/win32-x64/0.0.0/RELEASES`);
      expect(x64.status).toBe(200);
      expect(await x64.text()).toBe(
        'HASH https://github.com/owner/arm64-prefixed/releases/download/v1.0.0/app-1.0.0-full.nupkg 100',
      );
      expect(scope.isDone()).toBe(true);
    });

    it('falls back to the bare RELEASES file when arm64.RELEASES does not exist', async () => {
      mockWindowsRelease('arm64-fallback', 'v1.0.0');
      const scope = nock('https://github.com')
        .get('/owner/arm64-fallback/releases/download/v1.0.0/x64.RELEASES')
        .reply(404)
        .get('/owner/arm64-fallback/releases/download/v1.0.0/ia32.RELEASES')
        .reply(404)
        .get('/owner/arm64-fallback/releases/download/v1.0.0/arm64.RELEASES')
        .reply(404)
        .get('/owner/arm64-fallback/releases/download/v1.0.0/RELEASES')
        .reply(200, 'HASH name.nupkg NUMBER');

      const res = await fetch(`${address}/owner/arm64-fallback/win32-arm64/0.0.0/RELEASES`);
      expect(res.status).toBe(200);
      expect(await res.text()).toBe(
        'HASH https://github.com/owner/arm64-fallback/releases/download/v1.0.0/name.nupkg NUMBER',
      );
      expect(scope.isDone()).toBe(true);
    });

    it('returns 404 when neither arm64.RELEASES nor RELEASES exists', async () => {
      mockWindowsRelease('arm64-none', 'v1.0.0');
      const scope = nock('https://github.com')
        .get('/owner/arm64-none/releases/download/v1.0.0/x64.RELEASES')
        .reply(404)
        .get('/owner/arm64-none/releases/download/v1.0.0/ia32.RELEASES')
        .reply(404)
        .get('/owner/arm64-none/releases/download/v1.0.0/arm64.RELEASES')
        .reply(404)
        .get('/owner/arm64-none/releases/download/v1.0.0/RELEASES')
        .reply(404);

      const res = await fetch(`${address}/owner/arm64-none/win32-arm64/0.0.0/RELEASES`);
      expect(res.status).toBe(404);

      // The JSON update check still works without any RELEASES file.
      const json = await fetch(`${address}/owner/arm64-none/win32-arm64/0.0.0`);
      expect(json.status).toBe(200);
      expect(((await json.json()) as { url: string }).url).toBe('app-win32-arm64-setup.exe');
      expect(scope.isDone()).toBe(true);
    });
  });

  describe('win32-ia32', () => {
    it('serves ia32.RELEASES when it exists and rewrites its nupkg', async () => {
      mockWindowsRelease('ia32-prefixed', 'v1.0.0');
      const scope = nock('https://github.com')
        .get('/owner/ia32-prefixed/releases/download/v1.0.0/x64.RELEASES')
        .reply(404)
        .get('/owner/ia32-prefixed/releases/download/v1.0.0/ia32.RELEASES')
        .reply(200, 'IAHASH ia32.app-1.0.0-full.nupkg 300')
        .get('/owner/ia32-prefixed/releases/download/v1.0.0/arm64.RELEASES')
        .reply(404)
        .get('/owner/ia32-prefixed/releases/download/v1.0.0/RELEASES')
        .reply(200, 'HASH app-1.0.0-full.nupkg 100');

      const res = await fetch(`${address}/owner/ia32-prefixed/win32-ia32/0.0.0/RELEASES`);
      expect(res.status).toBe(200);
      expect(await res.text()).toBe(
        'IAHASH https://github.com/owner/ia32-prefixed/releases/download/v1.0.0/ia32.app-1.0.0-full.nupkg 300',
      );
      expect(scope.isDone()).toBe(true);
    });

    it('falls back to the bare RELEASES file when ia32.RELEASES does not exist', async () => {
      mockWindowsRelease('ia32-fallback', 'v1.0.0');
      const scope = nock('https://github.com')
        .get('/owner/ia32-fallback/releases/download/v1.0.0/x64.RELEASES')
        .reply(404)
        .get('/owner/ia32-fallback/releases/download/v1.0.0/ia32.RELEASES')
        .reply(404)
        .get('/owner/ia32-fallback/releases/download/v1.0.0/arm64.RELEASES')
        .reply(404)
        .get('/owner/ia32-fallback/releases/download/v1.0.0/RELEASES')
        .reply(200, 'HASH name.nupkg NUMBER');

      const res = await fetch(`${address}/owner/ia32-fallback/win32-ia32/0.0.0/RELEASES`);
      expect(res.status).toBe(200);
      expect(await res.text()).toBe(
        'HASH https://github.com/owner/ia32-fallback/releases/download/v1.0.0/name.nupkg NUMBER',
      );
      expect(scope.isDone()).toBe(true);
    });
  });

  it('never requests a RELEASES asset for a release with no Windows assets', async () => {
    nock('https://api.github.com')
      .get('/repos/owner/mac-only/releases?per_page=100')
      .reply(200, [
        {
          name: 'Release',
          tag_name: 'v1.0.0',
          body: 'notes',
          assets: [{ name: 'app-mac.zip', browser_download_url: 'app-mac.zip' }],
        },
      ]);
    // Any request to github.com here would be unmatched and fail the lookup.
    const res = await fetch(`${address}/owner/mac-only/darwin-x64/0.0.0`);
    expect(res.status).toBe(200);
  });
});
