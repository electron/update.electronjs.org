const PLATFORM = {
  WIN32: "win32",
  DARWIN: "darwin",
};

const PLATFORM_ARCH = {
  DARWIN_X64: "darwin-x64",
  DARWIN_ARM64: "darwin-arm64",
  WIN_X64: "win32-x64",
  WIN_IA32: "win32-ia32",
  WIN_ARM64: "win32-arm64",
};

const ENV = process.env.NODE_ENV || "development";

const PLATFORM_ARCHS = Object.values(PLATFORM_ARCH);

module.exports = {
  PLATFORM,
  PLATFORM_ARCH,
  PLATFORM_ARCHS,
  ENV,
};
