// The common shape: an untyped spy, and each test returns only the keys it needs.
import { mockUseRuntimeConfig } from '@test-utils/mocks/mockUseRuntimeConfig'
import { vi } from 'vitest'
import type { RuntimeConfig } from '../runtime-config'

declare const original: () => RuntimeConfig // what mockNuxtImport hands to the factory

const useRuntimeConfig = vi.fn()
export const mocked = mockUseRuntimeConfig(original, useRuntimeConfig)

useRuntimeConfig.mockReturnValue({ public: { features: { darkMode: true } } })

export const withConsentOff = mockUseRuntimeConfig(original, () => ({
  public: { analytics: { consent: { required: false } } },
}))
