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
  WIN_X64_MSIX: "win32-x64-msix",
  WIN_ARM64_MSIX: "win32-arm64-msix",
} as const;

export const UPDATE_FORMAT = {
  SQUIRREL: "squirrel",
  MSIX: "msix",
} as const;

export type Platform = (typeof PLATFORM)[keyof typeof PLATFORM];
export type PlatformArch = (typeof PLATFORM_ARCH)[keyof typeof PLATFORM_ARCH];
export type UpdateFormat = (typeof UPDATE_FORMAT)[keyof typeof UPDATE_FORMAT];

export const ENV = process.env.NODE_ENV || "development";

// Base platform-archs used for URL validation (excludes internal MSIX variants)
export const PLATFORM_ARCHS: readonly PlatformArch[] = (
  Object.values(PLATFORM_ARCH) as PlatformArch[]
).filter((v) => !v.endsWith("-msix"));

export const UPDATE_FORMATS: readonly UpdateFormat[] =
  Object.values(UPDATE_FORMAT);

type SquirrelWindowsPlatform =
  | typeof PLATFORM_ARCH.WIN_X64
  | typeof PLATFORM_ARCH.WIN_IA32
  | typeof PLATFORM_ARCH.WIN_ARM64;
type MsixPlatform =
  | typeof PLATFORM_ARCH.WIN_X64_MSIX
  | typeof PLATFORM_ARCH.WIN_ARM64_MSIX;

export const SQUIRREL_TO_MSIX: Partial<
  Record<SquirrelWindowsPlatform, MsixPlatform>
> = {
  [PLATFORM_ARCH.WIN_X64]: PLATFORM_ARCH.WIN_X64_MSIX,
  [PLATFORM_ARCH.WIN_ARM64]: PLATFORM_ARCH.WIN_ARM64_MSIX,
};
