export const PLATFORM = {
  WIN32: "win32",
  DARWIN: "darwin",
} as const;

export const PLATFORM_ARCH = {
  DARWIN_X64: "darwin-x64",
  DARWIN_ARM64: "darwin-arm64",
  DARWIN_UNIVERSAL: "darwin-universal",
  WIN_X64: "win32-x64",
  WIN_IA32: "win32-ia32",
  WIN_ARM64: "win32-arm64",
} as const;

export type Platform = (typeof PLATFORM)[keyof typeof PLATFORM];
export type PlatformArch = (typeof PLATFORM_ARCH)[keyof typeof PLATFORM_ARCH];

export const ENV = process.env.NODE_ENV || "development";

export const PLATFORM_ARCHS: readonly PlatformArch[] =
  Object.values(PLATFORM_ARCH);
