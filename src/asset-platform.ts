import { PLATFORM_ARCH, type PlatformArch } from './constants.ts';

// Windows installers and Squirrel.Windows metadata may carry an architecture
// prefix, e.g. `arm64.RELEASES` or `arm64.MyApp Setup.exe`. The prefix is
// lowercase only, matching the `<arch>.RELEASES` asset names the server fetches;
// this also keeps the classification of names such as `ARM64.MyApp Setup.exe`
// unchanged (the generic `.exe` fallback below has always ignored them).
const WINDOWS_ARCH_PREFIX = /^(x64|ia32|arm64)\./;

const WINDOWS_ARCH_BY_PREFIX: Record<string, PlatformArch> = {
  x64: PLATFORM_ARCH.WIN_X64,
  ia32: PLATFORM_ARCH.WIN_IA32,
  arm64: PLATFORM_ARCH.WIN_ARM64,
};

export const assetPlatform = (fileName: string): PlatformArch | false => {
  const archPrefix = WINDOWS_ARCH_PREFIX.exec(fileName);

  // Squirrel.Windows metadata (`RELEASES`, `<arch>.RELEASES`) and the packages it
  // lists (`*.nupkg`) are served through the RELEASES endpoint and must never be
  // selected as the installer asset.
  const unprefixedName = archPrefix ? fileName.slice(archPrefix[0].length) : fileName;
  if (unprefixedName === 'RELEASES' || /\.nupkg$/i.test(fileName)) return false;

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

  // Windows installers with an architecture prefix, e.g. `arm64.MyApp Setup.exe`.
  // Evaluated after the `-win32-<arch>` marker so that names which already
  // classify today keep their classification.
  if (archPrefix && /\.(exe|zip)$/i.test(fileName)) {
    return WINDOWS_ARCH_BY_PREFIX[archPrefix[1]];
  }

  // Special case handling: We don't know what kind of asset
  // we're looking at, so it might be the default x64 windows
  // asset
  if (fileName.endsWith('.exe') && !/arm/.test(fileName) && !/ia32/.test(fileName)) {
    return PLATFORM_ARCH.WIN_X64;
  }

  return false;
};
