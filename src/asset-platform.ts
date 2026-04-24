import { PLATFORM_ARCH, type PlatformArch } from './constants.js';

export const assetPlatform = (fileName: string): PlatformArch | false => {
  if (/.*-(mac|darwin|osx).*\.zip$/i.test(fileName)) {
    if (/-arm64/.test(fileName)) return PLATFORM_ARCH.DARWIN_ARM64;
    if (/-universal/.test(fileName)) return PLATFORM_ARCH.DARWIN_UNIVERSAL;

    return PLATFORM_ARCH.DARWIN_X64;
  }

  // Handle all .msix files early so they don't fall through to Squirrel detection.
  // Only match assets with an explicit -win32-(x64|arm64) prefix.
  if (/.*-win32-(x64|arm64).*\.msix$/i.test(fileName)) {
    if (/-arm64/.test(fileName)) return PLATFORM_ARCH.WIN_ARM64_MSIX;

    return PLATFORM_ARCH.WIN_X64_MSIX;
  }

  // Reject any other .msix files (ia32, generic, etc.)
  if (/\.msix$/i.test(fileName)) return false;

  if (/.*-win32-(ia32|x64|arm64).*$/i.test(fileName)) {
    if (/-ia32/.test(fileName)) return PLATFORM_ARCH.WIN_IA32;
    if (/-arm64/.test(fileName)) return PLATFORM_ARCH.WIN_ARM64;

    return PLATFORM_ARCH.WIN_X64;
  }

  // Special case handling: We don't know what kind of asset
  // we're looking at, so it might be the default x64 windows
  // asset
  if (fileName.endsWith('.exe') && !/arm/.test(fileName) && !/ia32/.test(fileName)) {
    return PLATFORM_ARCH.WIN_X64;
  }

  return false;
};
