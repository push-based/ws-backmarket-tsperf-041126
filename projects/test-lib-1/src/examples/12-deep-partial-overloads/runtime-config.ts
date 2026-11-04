// The app's runtime config, shaped like the type Nuxt generates for
// `useRuntimeConfig()`: the app's own keys, plus `app` and `nitro`, which Nuxt
// adds itself.
import type { RouteRule } from './server-types'

export interface PublicRuntimeConfig extends Record<string, unknown> {
  apiBaseUrl: string
  cdnUrl: string
  environment: string
  version: string
  features: {
    newCheckout: boolean
    darkMode: boolean
    searchSuggestions: boolean
  }
  i18n: {
    defaultLocale: string
    fallbackLocale: string
    locales: string[]
  }
  analytics: {
    enabled: boolean
    sampleRate: number
    consent: { required: boolean; vendorIds: string[] }
  }
}

export interface RuntimeConfig extends Record<string, unknown> {
  app: { baseURL: string; buildAssetsDir: string; cdnURL: string }
  nitro: { envPrefix?: string; routeRules?: { [path: string]: RouteRule } }
  apiSecret: string
  public: PublicRuntimeConfig
}
