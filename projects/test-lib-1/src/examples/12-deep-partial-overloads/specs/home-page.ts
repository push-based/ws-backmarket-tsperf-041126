// A spy typed with the full config, so `mockReturnValue` only accepts a complete RuntimeConfig.
import { mockUseRuntimeConfig } from '@test-utils/mocks/mockUseRuntimeConfig'
import { vi } from 'vitest'
import type { RuntimeConfig } from '../runtime-config'

declare const original: () => RuntimeConfig // what mockNuxtImport hands to the factory

const useRuntimeConfig = vi.fn<() => RuntimeConfig>()
export const mocked = mockUseRuntimeConfig(original, useRuntimeConfig)
