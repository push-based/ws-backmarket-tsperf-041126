// Route-rule types as Nitro 2.x declares them (nitropack 2.13, MIT). Nuxt adds
// them to every app's RuntimeConfig under `nitro.routeRules`. Like any library
// type, this file sits under `skipLibCheck`: nothing here is computed until
// your own code reaches it.
declare type Enumerate<N extends number, Acc extends number[] = []> = Acc['length'] extends N
  ? Acc[number]
  : Enumerate<N, [...Acc, Acc['length']]>
declare type IntRange<F extends number, T extends number> = Exclude<Enumerate<T>, Enumerate<F>>

export type HTTPStatusCode = IntRange<100, 600>

export interface RouteRule {
  headers?: Record<string, string>
  redirect?: string | { to: string; statusCode?: HTTPStatusCode }
  prerender?: boolean
  cors?: boolean
  swr?: boolean | number
}
