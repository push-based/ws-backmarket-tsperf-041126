import type { PluginCatalog } from "./catalog";

export interface RawConfig {
  name: string;
  env?: "development" | "staging" | "production";
  features?: Record<string, boolean>;
  limits?: {
    maxItems?: number;
    maxSize?: number;
  };
  plugins?: PluginConfig[];
  catalog?: PluginCatalog;
}

export interface PluginConfig {
  name: string;
  options?: Record<string, unknown>;
}

export type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

export type DeepRequired<T> = T extends object
  ? { [K in keyof T]-?: DeepRequired<T[K]> }
  : T;

export interface NormalizedConfig {
  name: string;
  env: "development" | "staging" | "production";
  features: Record<string, boolean>;
  limits: {
    maxItems: number;
    maxSize: number;
  };
  plugins: PluginConfig[];
  catalog: PluginCatalog;
}
