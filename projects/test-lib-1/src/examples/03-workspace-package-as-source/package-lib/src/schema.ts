import type { NormalizedConfig } from "./types";
import type { Paths } from "./paths";

export type ConfigPath = Paths<NormalizedConfig>;

export function getConfigValue(
  config: NormalizedConfig,
  path: ConfigPath,
): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (acc, key) => (acc as Record<string, unknown> | undefined)?.[key],
      config,
    );
}
