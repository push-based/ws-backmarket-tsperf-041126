import type { RawConfig, NormalizedConfig, DeepRequired } from "./types";
import { assertValidConfig } from "./validators";
import { deepMerge } from "./merge";
import { catalogDefaults } from "./catalog";

const DEFAULTS: DeepRequired<RawConfig> = {
  name: "default",
  env: "development",
  features: {},
  limits: { maxItems: 100, maxSize: 1_000_000 },
  plugins: [],
  catalog: catalogDefaults,
};

export function normalizeConfig(input: unknown): NormalizedConfig {
  assertValidConfig(input);
  return deepMerge(DEFAULTS, input) as NormalizedConfig;
}
