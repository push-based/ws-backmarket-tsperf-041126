import type { PartialDeep } from 'type-fest'
import type { RuntimeConfig } from './runtime-config'

/**
 * Factory for mocking Nuxt's `useRuntimeConfig` in a spec. Keeps the real
 * config (`original`) and layers each test's overrides, returned by a spy,
 * on top of it.
 *
 * The first overload takes spies typed with the full `RuntimeConfig` and
 * untyped `vi.fn()` spies without touching `PartialDeep`. Partial overrides
 * fall through to the second overload, which checks them as strictly as before.
 */
export function mockUseRuntimeConfig(
  original: (() => RuntimeConfig) | undefined,
  useRuntimeConfig: () => RuntimeConfig | undefined,
): () => RuntimeConfig
export function mockUseRuntimeConfig(
  original: (() => RuntimeConfig) | undefined,
  useRuntimeConfig: () => PartialDeep<RuntimeConfig> | undefined,
): () => RuntimeConfig
export function mockUseRuntimeConfig(
  original: (() => RuntimeConfig) | undefined,
  useRuntimeConfig: () => unknown,
): () => RuntimeConfig {
  return () => {
    const base = original?.() ?? ({ public: {} } as RuntimeConfig)
    const overrides = (useRuntimeConfig() ?? {}) as RuntimeConfig

    return {
      ...base,
      ...overrides,
      public: {
        ...base.public,
        ...overrides.public,
      },
    }
  }
}
