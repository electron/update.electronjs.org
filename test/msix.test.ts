import http from 'node:http';
import nock from 'nock';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from './helpers/create-server.js';

nock.disableNetConnect();
nock.enableNetConnect('localhost');

// Repo with both Squirrel (.exe) and MSIX assets
nock('https://api.github.com')
  .get('/repos/owner/repo-msix/releases?per_page=100')
  .reply(200, [
    {
      name: 'name',
      tag_name: '1.0.0',
      body: 'notes',
      assets: [
        {
          name: 'app-1.0.0-win32-x64-setup.exe',
          browser_download_url: 'app-1.0.0-win32-x64-setup.exe',
        },
        {
          name: 'app-1.0.0-win32-ia32-setup.exe',
          browser_download_url: 'app-1.0.0-win32-ia32-setup.exe',
        },
        {
          name: 'app-1.0.0-win32-arm64-setup.exe',
          browser_download_url: 'app-1.0.0-win32-arm64-setup.exe',
        },
        {
          name: 'app-1.0.0-win32-x64.msix',
          browser_download_url: 'app-1.0.0-win32-x64.msix',
        },
        {
          name: 'app-1.0.0-win32-arm64.msix',
          browser_download_url: 'app-1.0.0-win32-arm64.msix',
        },
        {
          name: 'app-mac.zip',
          browser_download_url: 'app-mac.zip',
        },
      ],
    },
  ])
  .get('/repos/owner/repo-msix-only/releases?per_page=100')
  .reply(200, [
    {
      name: 'name',
      tag_name: '1.0.0',
      body: 'notes',
      assets: [
        {
          name: 'app-1.0.0-win32-x64.msix',
          browser_download_url: 'app-1.0.0-win32-x64.msix',
        },
      ],
    },
  ]);

nock('https://github.com')
  .get('/owner/repo-msix/releases/download/1.0.0/RELEASES')
  .times(4)
  .reply(200, 'HASH name.nupkg NUMBER');

describe('MSIX Updates', () => {
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

  describe('format parameter routing', () => {
    it('win32-x64/msix returns MSIX asset', async () => {
      const res = await fetch(`${address}/owner/repo-msix/win32-x64/msix/0.0.0`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.url).toBe('app-1.0.0-win32-x64.msix');
      expect(body.name).toBe('name');
      expect(body.notes).toBe('notes');
    });

    it('win32-arm64/msix returns correct arch MSIX asset', async () => {
      const res = await fetch(`${address}/owner/repo-msix/win32-arm64/msix/0.0.0`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.url).toBe('app-1.0.0-win32-arm64.msix');
    });

    it('win32/msix defaults to x64 MSIX', async () => {
      const res = await fetch(`${address}/owner/repo-msix/win32/msix/0.0.0`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.url).toBe('app-1.0.0-win32-x64.msix');
    });
  });

  describe('204 when up to date', () => {
    it('returns 204 when MSIX version is current', async () => {
      const res = await fetch(`${address}/owner/repo-msix/win32-x64/msix/1.0.0`);
      expect(res.status).toBe(204);
    });
  });

  describe('RELEASES not available for MSIX', () => {
    it('returns 404 with informative message for RELEASES endpoint with MSIX format', async () => {
      const res = await fetch(`${address}/owner/repo-msix/win32-x64/msix/0.0.0/RELEASES`);
      expect(res.status).toBe(404);
      const body = await res.text();
      expect(body).toBe(
        'The RELEASES endpoint is not available for MSIX updates. MSIX uses JSON responses from the base update URL.',
      );
    });
  });

  describe('backward compatibility', () => {
    it('win32-x64 without format still returns Squirrel asset', async () => {
      const res = await fetch(`${address}/owner/repo-msix/win32-x64/0.0.0`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.url).toBe('app-1.0.0-win32-x64-setup.exe');
    });

    it('win32-x64/squirrel explicitly returns Squirrel asset', async () => {
      const res = await fetch(`${address}/owner/repo-msix/win32-x64/squirrel/0.0.0`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.url).toBe('app-1.0.0-win32-x64-setup.exe');
    });

    it('RELEASES endpoint still works without format', async () => {
      const res = await fetch(`${address}/owner/repo-msix/win32-x64/0.0.0/RELEASES`);
      expect(res.status).toBe(200);
      const body = await res.text();
      expect(body).toMatch(/\.nupkg/);
    });
  });

  describe('darwin with format', () => {
    it('darwin/msix returns 400 (MSIX not supported on darwin)', async () => {
      const res = await fetch(`${address}/owner/repo-msix/darwin/msix/0.0.0`);
      expect(res.status).toBe(400);
      const body = await res.text();
      expect(body).toContain('MSIX format is not supported for platform');
    });
  });

  describe('MSIX-only repo', () => {
    it('returns MSIX asset when only MSIX assets exist', async () => {
      const res = await fetch(`${address}/owner/repo-msix-only/win32-x64/msix/0.0.0`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.url).toBe('app-1.0.0-win32-x64.msix');
    });

    it('returns 404 for squirrel when only MSIX assets exist', async () => {
      const res = await fetch(`${address}/owner/repo-msix-only/win32-x64/0.0.0`);
      expect(res.status).toBe(404);
    });

    it('shows MSIX-specific error when MSIX asset missing', async () => {
      const res = await fetch(`${address}/owner/repo-msix-only/win32-arm64/msix/0.0.0`);
      expect(res.status).toBe(404);
      const body = await res.text();
      expect(body).toBe(
        'No updates found (needs asset matching .*-win32-(x64|arm64).*.msix in public repository)',
      );
    });
  });

  describe('unsupported platform + MSIX', () => {
    it('win32-ia32/msix returns 400', async () => {
      const res = await fetch(`${address}/owner/repo-msix/win32-ia32/msix/0.0.0`);
      expect(res.status).toBe(400);
      const body = await res.text();
      expect(body).toContain('MSIX format is not supported for platform');
    });
  });

  describe('explicit squirrel format', () => {
    it('RELEASES endpoint works with explicit squirrel format', async () => {
      const res = await fetch(`${address}/owner/repo-msix/win32-x64/squirrel/0.0.0/RELEASES`);
      expect(res.status).toBe(200);
      const body = await res.text();
      expect(body).toMatch(/\.nupkg/);
    });
  });
});
