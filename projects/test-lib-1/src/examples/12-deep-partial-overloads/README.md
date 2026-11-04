# Deep-Partial Test Helper (`PartialDeep<RuntimeConfig>` parameter)

## Problem

A test helper that types its override spy as `() => PartialDeep<RuntimeConfig>` makes TypeScript compare the complete config with its deep-partial, field by field, whenever a caller passes a spy typed with the full `RuntimeConfig`, and again when the helper spreads the overrides. That walk reaches every type nested in the config, including library types the app never reads. Here it reaches Nitro's `HTTPStatusCode`, which costs about 187,000 types to build.

```ts
// mock-use-runtime-config.slow.ts
export function mockUseRuntimeConfig(
  original: (() => RuntimeConfig) | undefined,
  useRuntimeConfig: () => PartialDeep<RuntimeConfig> | undefined,
) { /* spreads the overrides over the real config */ }

// specs/home-page.ts
const useRuntimeConfig = vi.fn<() => RuntimeConfig>()
mockUseRuntimeConfig(original, useRuntimeConfig) // relates RuntimeConfig to PartialDeep<RuntimeConfig>
```

See [`mock-use-runtime-config.slow.ts`](./mock-use-runtime-config.slow.ts) for the full helper.

## Solution

```ts
export function mockUseRuntimeConfig(original: …, useRuntimeConfig: () => RuntimeConfig | undefined): () => RuntimeConfig
export function mockUseRuntimeConfig(original: …, useRuntimeConfig: () => PartialDeep<RuntimeConfig> | undefined): () => RuntimeConfig
export function mockUseRuntimeConfig(original: …, useRuntimeConfig: () => unknown): () => RuntimeConfig { /* cast, then spread */ }
```

A first overload takes full and untyped spies without touching `PartialDeep`, partial overrides fall through to the second overload, and the implementation casts before it spreads.

See [`mock-use-runtime-config.fixed.ts`](./mock-use-runtime-config.fixed.ts) for the full helper.

## Why It Works

- A spy typed `() => RuntimeConfig` matches the first overload by identity, so `PartialDeep<RuntimeConfig>` is never compared with the full config.
- An untyped `vi.fn()` returns `any`, which also matches the first overload.
- A partial literal fails the first overload on its first missing key and moves on to the second, where TypeScript only follows the paths the literal names.
- The implementation receives `unknown` and casts to `RuntimeConfig` before spreading, so the helper's body computes no deep-partial either.

## Trade-off

A spy with the wrong shape fails both overloads and pays the full comparison while the error exists. The error message lists both overloads (`TS2769`) instead of one assignment error.

## Common Pitfalls

- Fixing only the helper's body (cast before spread, explicit return type). That removes the cost from the helper, and any spec that passes a spy typed with the full config pays it at the call instead.
- Putting the `PartialDeep` overload first. Every call then matches it and pays the comparison: 188,383 types instead of 902.
- Expecting the saving in every program. `HTTPStatusCode` is built once per program, by whichever code reaches it first. If other code in the same program resolves it, for example server code typed with Nitro's route rules, the helper fix saves nothing there.
- Reading the drop as check time. The 180,909 types are mostly tuple type parameters and cheap to create. In this small program check time drops from 0.25 s to 0.04 s. In a full Nuxt app with 1.19 M types the same change removed 16% of types and about 100 MB, and check time stayed within noise.

## Impact Measurement

The specs pass two kinds of spy to the helper: an untyped `vi.fn()` with partial overrides (`specs/account-page.ts`) and a spy typed with the full config (`specs/home-page.ts`). `paths` in each tsconfig points the helper's import at the slow or the fixed file, so both runs check the same specs:

```ts
const useRuntimeConfig = vi.fn<() => RuntimeConfig>()
```

See [`specs/home-page.ts`](./specs/home-page.ts). Relating this spy to `() => PartialDeep<RuntimeConfig> | undefined` walks into `nitro.routeRules[path].redirect.statusCode` and builds `IntRange<100, 600>` ([`server-types.d.ts`](./server-types.d.ts)), a union produced by growing a tuple one element at a time up to 600, the same pattern as [example 07](../08-recursive-tuple-construction/README.md).

Run the same specs through both project configs and compare the full diagnostics:

```bash
cd projects/test-lib-1/src/examples/12-deep-partial-overloads

npx tsc --noEmit -p tsconfig.slow.json --extendedDiagnostics    # PartialDeep parameter
npx tsc --noEmit -p tsconfig.fixed.json --extendedDiagnostics   # overloads
```

| Metric                   | `PartialDeep` parameter | Overloads | Change |
|--------------------------|------------------------:|----------:|:-------|
| Types                    | 188,390                 | 902       | -99.5% |
| Instantiations           | 196,129                 | 1,592     | -99.2% |
| Symbols                  | 455,245                 | 71,692    | -84%   |
| Assignability cache size | 1,506                   | 158       | -90%   |
| Memory used              | 291,541K                | 124,899K  | -57%   |
| Check time               | 0.25s                   | 0.04s     | -84%   |

Times and memory are medians of five runs; the counters were identical on all five. Types drop hardest: 180,909 of the 188,390 are declaration-less `TypeParameter` entries in `--generateTrace`'s `types.json`, the element type parameters of every tuple length from 1 to 600 (1 + 2 + … + 600 = 180,300).
