const { assetPlatform } = require("../src/asset-platform");

const { PLATFORM_ARCH } = require("../src/constants");

describe("assetPlatform()", () => {
  it("matches the right platform", () => {
    const releases = [
      { name: "electron-fiddle-0.27.3-1.arm64.rpm", platform: false },
      { name: "electron-fiddle-0.27.3-1.armv7hl.rpm", platform: false },
      { name: "electron-fiddle-0.27.3-1.x86_64.rpm", platform: false },
      { name: "electron-fiddle-0.27.3-full.nupkg", platform: false },
      {
        name: "electron-fiddle-0.27.3-win32-arm64-setup.exe",
        platform: PLATFORM_ARCH.WIN_ARM64,
      },
      {
        name: "electron-fiddle-0.27.3-win32-ia32-setup.exe",
        platform: PLATFORM_ARCH.WIN_IA32,
      },
      {
        name: "electron-fiddle-0.27.3-win32-x64-setup.exe",
        platform: PLATFORM_ARCH.WIN_X64,
      },
      {
        name: "win32.exe",
        platform: PLATFORM_ARCH.WIN_X64,
      },
      {
        name: "win32-arm64.exe",
        platform: false,
      },
      {
        name: "win32-ia32.exe",
        platform: false,
      },
      { name: "electron-fiddle_0.27.3_amd64.deb", platform: false },
      { name: "electron-fiddle_0.27.3_arm64.deb", platform: false },
      { name: "electron-fiddle_0.27.3_armhf.deb", platform: false },
      {
        name: "Electron.Fiddle-darwin-arm64-0.27.3.zip",
        platform: PLATFORM_ARCH.DARWIN_ARM64,
      },
      {
        name: "Electron.Fiddle-darwin-x64-0.27.3.zip",
        platform: PLATFORM_ARCH.DARWIN_X64,
      },
      {
        name: "Electron-Builder-1.2.3-mac.zip",
        platform: PLATFORM_ARCH.DARWIN_X64,
      },
      {
        name: "Electron-Builder-1.2.3-universal-mac.zip",
        platform: PLATFORM_ARCH.DARWIN_UNIVERSAL,
      },
      {
        name: "Electron-Builder-1.2.3-arm64-mac.zip",
        platform: PLATFORM_ARCH.DARWIN_ARM64,
      },
      {
        name: "Electron.Builder-1.2.3-mac.zip.blockmap",
        platform: false,
      },
      {
        name: "mac.zip",
        platform: false,
      },
      {
        name: "darwin.zip",
        platform: false,
      },
      {
        name: "osx.zip",
        platform: false,
      },
    ];

    for (const release of releases) {
      expect(assetPlatform(release.name)).toBe(release.platform);
    }
  });
});
