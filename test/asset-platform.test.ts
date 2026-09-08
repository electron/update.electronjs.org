import { describe, it, expect } from 'vitest';
import { assetPlatform } from '../src/asset-platform.ts';
import { PLATFORM_ARCH, type PlatformArch } from '../src/constants.ts';

describe('assetPlatform()', () => {
  it('matches the right platform', () => {
    const releases: Array<{ name: string; platform: PlatformArch | false }> = [
      { name: 'electron-fiddle-0.27.3-1.arm64.rpm', platform: false },
      { name: 'electron-fiddle-0.27.3-1.armv7hl.rpm', platform: false },
      { name: 'electron-fiddle-0.27.3-1.x86_64.rpm', platform: false },
      { name: 'electron-fiddle-0.27.3-full.nupkg', platform: false },
      {
        name: 'electron-fiddle-0.27.3-win32-arm64-setup.exe',
        platform: PLATFORM_ARCH.WIN_ARM64,
      },
      {
        name: 'electron-fiddle-0.27.3-win32-ia32-setup.exe',
        platform: PLATFORM_ARCH.WIN_IA32,
      },
      {
        name: 'electron-fiddle-0.27.3-win32-x64-setup.exe',
        platform: PLATFORM_ARCH.WIN_X64,
      },
      {
        name: 'win32.exe',
        platform: PLATFORM_ARCH.WIN_X64,
      },
      {
        name: 'win32-arm64.exe',
        platform: false,
      },
      {
        name: 'win32-ia32.exe',
        platform: false,
      },
      { name: 'electron-fiddle_0.27.3_amd64.deb', platform: false },
      { name: 'electron-fiddle_0.27.3_arm64.deb', platform: false },
      { name: 'electron-fiddle_0.27.3_armhf.deb', platform: false },
      {
        name: 'Electron.Fiddle-darwin-arm64-0.27.3.zip',
        platform: PLATFORM_ARCH.DARWIN_ARM64,
      },
      {
        name: 'Electron.Fiddle-darwin-x64-0.27.3.zip',
        platform: PLATFORM_ARCH.DARWIN_X64,
      },
      {
        name: 'Electron-Builder-1.2.3-mac.zip',
        platform: PLATFORM_ARCH.DARWIN_X64,
      },
      {
        name: 'Electron-Builder-1.2.3-universal-mac.zip',
        platform: PLATFORM_ARCH.DARWIN_UNIVERSAL,
      },
      {
        name: 'Electron-Builder-1.2.3-arm64-mac.zip',
        platform: PLATFORM_ARCH.DARWIN_ARM64,
      },
      {
        name: 'Electron.Builder-1.2.3-mac.zip.blockmap',
        platform: false,
      },
      {
        name: 'mac.zip',
        platform: false,
      },
      {
        name: 'darwin.zip',
        platform: false,
      },
      {
        name: 'osx.zip',
        platform: false,
      },
      {
        name: 'app-1.0.0-win32-x64.msix',
        platform: PLATFORM_ARCH.WIN_X64_MSIX,
      },
      {
        name: 'app-1.0.0-win32-arm64.msix',
        platform: PLATFORM_ARCH.WIN_ARM64_MSIX,
      },
      {
        name: 'app-win32-x64-setup.msix',
        platform: PLATFORM_ARCH.WIN_X64_MSIX,
      },
      {
        name: 'app-win32-arm64.msix',
        platform: PLATFORM_ARCH.WIN_ARM64_MSIX,
      },
      {
        name: 'app-installer.msix',
        platform: false,
      },
      {
        name: 'win32.msix',
        platform: false,
      },
      {
        name: 'win32-arm64.msix',
        platform: false,
      },
      {
        name: 'app-win32-ia32.msix',
        platform: false,
      },
      {
        name: 'app-1.0.0-win32-ia32.msix',
        platform: false,
      },
    ];

    for (const release of releases) {
      expect(assetPlatform(release.name)).toBe(release.platform);
    }
  });

  it('never selects Squirrel.Windows RELEASES or nupkg assets as installers', () => {
    const names = [
      'RELEASES',
      'x64.RELEASES',
      'ia32.RELEASES',
      'arm64.RELEASES',
      'ARM64.RELEASES',
      'app-1.0.0-full.nupkg',
      'app-1.0.0-delta.nupkg',
      'app-1.0.0-win32-x64-full.nupkg',
      'app-1.0.0-win32-arm64-full.nupkg',
      'app-win32-ia32-1.0.0-full.nupkg',
      'arm64.app-1.0.0-full.nupkg',
      'arm64.app-1.0.0-delta.nupkg',
      'App-1.0.0-Full.NUPKG',
    ];

    for (const name of names) {
      expect(assetPlatform(name)).toBe(false);
    }
  });

  it('classifies arch-prefixed Windows installers', () => {
    const releases: Array<{ name: string; platform: PlatformArch | false }> = [
      { name: 'arm64.MyApp-1.0.0 Setup.exe', platform: PLATFORM_ARCH.WIN_ARM64 },
      { name: 'ia32.MyApp Setup.exe', platform: PLATFORM_ARCH.WIN_IA32 },
      { name: 'x64.MyApp Setup.exe', platform: PLATFORM_ARCH.WIN_X64 },
      // The prefix is lowercase only; these names classify exactly as before.
      { name: 'ARM64.MyApp Setup.exe', platform: PLATFORM_ARCH.WIN_X64 },
      { name: 'IA32.MyApp Setup.exe', platform: PLATFORM_ARCH.WIN_X64 },
      { name: 'ARM64.MyApp Setup.EXE', platform: false },
      { name: 'arm64.MyApp-1.0.0.zip', platform: PLATFORM_ARCH.WIN_ARM64 },
      // The prefix does not apply to unrelated extensions.
      { name: 'arm64.MyApp Setup.msi', platform: false },
      { name: 'arm64.MyApp.AppImage', platform: false },
      // A prefix without the separating dot is not a prefix.
      { name: 'arm64-MyApp Setup.exe', platform: false },
      // Existing markers keep precedence over the prefix.
      { name: 'arm64.app-mac.zip', platform: PLATFORM_ARCH.DARWIN_X64 },
      { name: 'arm64.app-win32-x64.msix', platform: PLATFORM_ARCH.WIN_X64_MSIX },
      { name: 'arm64.app-win32-x64-setup.exe', platform: PLATFORM_ARCH.WIN_X64 },
      { name: 'x64.app-win32-arm64-setup.exe', platform: PLATFORM_ARCH.WIN_ARM64 },
    ];

    for (const release of releases) {
      expect(assetPlatform(release.name)).toBe(release.platform);
    }
  });
});
