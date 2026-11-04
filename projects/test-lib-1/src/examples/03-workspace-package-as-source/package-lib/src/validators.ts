import type { RawConfig, PluginConfig } from "./types";

export function isPluginConfig(value: unknown): value is PluginConfig {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as PluginConfig).name === "string"
  );
}

export function assertValidConfig(value: unknown): asserts value is RawConfig {
  if (typeof value !== "object" || value === null) {
    throw new Error("Config must be an object");
  }
  const raw = value as RawConfig;
  if (typeof raw.name !== "string") {
    throw new Error("Config.name must be a string");
  }
  if (raw.plugins && !raw.plugins.every(isPluginConfig)) {
    throw new Error("Config.plugins must be PluginConfig[]");
  }
}
