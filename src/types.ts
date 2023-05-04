import type { PLATFORM_ARCH } from "./constants.js";

export type Platform = typeof PLATFORM_ARCH[keyof typeof PLATFORM_ARCH];

export interface Lock {
  unlock(): Promise<void>;
}

export interface ServerCache {
  get<T = unknown>(key: string): Promise<T | undefined>;
  set(key: string, value: any): Promise<void>;
  lock(resource: unknown): Promise<Lock>;
}

export type Latest = {
  [P in Platform | "darwin" | "win32"]?: {
    name: string;
    version: string;
    url: string;
    notes: string;
    RELEASES?: string;
  };
};
