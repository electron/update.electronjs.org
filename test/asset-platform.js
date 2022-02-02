const { test } = require('tap')
const { assetPlatform } = require('../src/asset-platform')

const {
  PLATFORM_ARCH
} = require('../src/constants')

test('assetPlatform() matches the right platform', t => {
  const releases = [
    { name: 'electron-fiddle-0.27.3-1.arm64.rpm', platform: false },
    { name: 'electron-fiddle-0.27.3-1.armv7hl.rpm', platform: false },
    { name: 'electron-fiddle-0.27.3-1.x86_64.rpm', platform: false },
    { name: 'electron-fiddle-0.27.3-full.nupkg', platform: false },
    { name: 'electron-fiddle-0.27.3-win32-arm64-setup.exe', platform: PLATFORM_ARCH.WIN_ARM64 },
    { name: 'electron-fiddle-0.27.3-win32-ia32-setup.exe', platform: PLATFORM_ARCH.WIN_IA32 },
    { name: 'electron-fiddle-0.27.3-win32-x64-setup.exe', platform: PLATFORM_ARCH.WIN_X64 },
    { name: 'electron-fiddle_0.27.3_amd64.deb', platform: false },
    { name: 'electron-fiddle_0.27.3_arm64.deb', platform: false },
    { name: 'electron-fiddle_0.27.3_armhf.deb', platform: false },
    { name: 'Electron.Fiddle-darwin-arm64-0.27.3.zip', platform: PLATFORM_ARCH.DARWIN_ARM64 },
    { name: 'Electron.Fiddle-darwin-x64-0.27.3.zip', platform: PLATFORM_ARCH.DARWIN_X64 }
  ]

  for (const release of releases) {
    t.equal(assetPlatform(release.name), release.platform)
  }

  t.end()
})
