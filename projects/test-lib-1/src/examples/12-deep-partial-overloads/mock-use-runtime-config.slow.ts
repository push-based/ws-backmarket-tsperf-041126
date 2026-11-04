import type { PartialDeep } from 'type-fest'
import type { RuntimeConfig } from './runtime-config'

/**
 * Factory for mocking Nuxt's `useRuntimeConfig` in a spec. Keeps the real
 * config (`original`) and layers each test's overrides, returned by a spy,
 * on top of it.
 */
export function mockUseRuntimeConfig(
  original: (() => RuntimeConfig) | undefined,
  useRuntimeConfig: () => PartialDeep<RuntimeConfig> | undefined,
) {
  return () => {
    const base = original?.() ?? { public: {} }
    const overrides = useRuntimeConfig() ?? {}

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
