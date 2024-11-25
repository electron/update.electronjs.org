const { PLATFORM_ARCH } = require("./constants");

const assetPlatform = (fileName) => {
  if (/.*(mac|darwin|osx).*(-arm).*\.zip/i.test(fileName)) {
    return PLATFORM_ARCH.DARWIN_ARM64;
  }

  if (/.*(mac|darwin|osx).*\.zip/i.test(fileName) && !/arm64/.test(fileName)) {
    return PLATFORM_ARCH.DARWIN_X64;
  }

  if (/.*-win32-(ia32|x64|arm64).*$/i.test(fileName)) {
    if (/ia32/.test(fileName)) return PLATFORM_ARCH.WIN_IA32;
    if (/x64/.test(fileName)) return PLATFORM_ARCH.WIN_X64;
    if (/arm64/.test(fileName)) return PLATFORM_ARCH.WIN_ARM64;
  }

  // Special case handling: We don't know what kind of asset
  // we're looking at, so it might be the default x64 windows
  // asset
  if (
    /\.exe$/.test(fileName) &&
    !/arm/.test(fileName) &&
    !/ia32/.test(fileName)
  ) {
    return PLATFORM_ARCH.WIN_X64;
  }

  return false;
};

module.exports = {
  assetPlatform,
};
