# Exercise: Keep a Test Helper Off `PartialDeep` with Overloads

In this exercise we will add overloads to a Nuxt test helper, `mockUseRuntimeConfig`, so a spec that passes a spy typed with the full `RuntimeConfig` no longer makes TypeScript compare the whole config with `PartialDeep<RuntimeConfig>`. That comparison walks into a library type the specs never read, Nitro's `HTTPStatusCode`, and building it costs about 187,000 types. The obvious fix, in the helper's body, moves the cost into a spec file instead, so we'll use a trace to follow it there.

## Goal

At the end of this exercise the `Types` count that `tsc --extendedDiagnostics` reports for `tsconfig.slow.json` drops from 188,390 to 902, and neither spec file changes.

## Prerequisites

Complete [Exercise 0: Setup](./0-setup.md) first: repo cloned, `npm install` done.
Start at the repository root: step 1 changes into `projects/test-lib-1/src/examples/12-deep-partial-overloads`, and every command after that runs from there.

The numbers in this exercise come from TypeScript 5.9.3 and type-fest 4.41.0, the versions the repo pins.

> [!WARNING]
> This exercise needs type-fest 4.41.0, which arrived after the first exercises. If you ran `npm install` before this exercise existed, run it again from the repository root. You're set when `npm ls type-fest` lists `type-fest@4.41.0` under `test-lib-1`.

> [!TIP]
> The example has seven files, and you only edit one of them:
>
> | File | What it is |
> |---|---|
> | [`mock-use-runtime-config.slow.ts`](../../projects/test-lib-1/src/examples/12-deep-partial-overloads/mock-use-runtime-config.slow.ts) | The helper. **The file you edit.** |
> | [`specs/account-page.ts`](../../projects/test-lib-1/src/examples/12-deep-partial-overloads/specs/account-page.ts) | A spec with an untyped `vi.fn()` spy and partial overrides, the common shape. |
> | [`specs/home-page.ts`](../../projects/test-lib-1/src/examples/12-deep-partial-overloads/specs/home-page.ts) | A spec with a spy typed `vi.fn<() => RuntimeConfig>()`. |
> | [`runtime-config.ts`](../../projects/test-lib-1/src/examples/12-deep-partial-overloads/runtime-config.ts) | The app's `RuntimeConfig`, including the `nitro` key Nuxt adds. |
> | [`server-types.d.ts`](../../projects/test-lib-1/src/examples/12-deep-partial-overloads/server-types.d.ts) | Nitro's route-rule types, copied as Nitro declares them. |
> | `vitest-stub.d.ts`, `mock-use-runtime-config.fixed.ts` | Just enough of Vitest's `vi.fn` typing, and the reference solution. |
>
> The specs import the helper as `@test-utils/mocks/mockUseRuntimeConfig`, the way an app imports it from a test-utils package. `paths` in `tsconfig.slow.json` points that import at the slow file, and `tsconfig.fixed.json` points it at the fixed one, so both configs check the same two specs.

This example spans several files joined by `paths`, so it has no TS Playground link. The playground checks one file at a time.

## 1. Measure the baseline

Before changing anything, get the number you're trying to beat:

```bash
cd projects/test-lib-1/src/examples/12-deep-partial-overloads

npx tsc --noEmit -p tsconfig.slow.json --extendedDiagnostics
```

```
Files:                         341
Lines of Library:            51126
Lines of Definitions:        69295
Lines of TypeScript:            87
Lines of JavaScript:             0
Lines of JSON:                   0
Lines of Other:                  0
Identifiers:                117256
Symbols:                    455245
Types:                      188390
Instantiations:             196129
Memory used:               290614K
Assignability cache size:     1506
Identity cache size:             4
Subtype cache size:              0
Strict subtype cache size:      29
I/O Read time:               0.01s
Parse time:                  0.17s
ResolveModule time:          0.02s
ResolveTypeReference time:   0.00s
ResolveLibrary time:         0.01s
Program time:                0.24s
Bind time:                   0.09s
Check time:                  0.25s
printTime time:              0.00s
Emit time:                   0.00s
Total time:                  0.58s
```

This block is one of five runs. Its `Check time` and `Total time` match the five-run medians, and `Types` and `Instantiations` came out identical on all five. Most of the 341 files are type-fest and the `@types` packages; the example itself is 87 lines of TypeScript. Those 87 lines produce **Types 188,390**. Let's find out where they come from.

## 2. Find the hot spot with a trace

`--extendedDiagnostics` tells us how much work there is, and a trace tells us where it happens. Record one for the slow config and summarize it with `analyze-trace`, which the repo installs.

> [!WARNING]
> `analyze-trace` only reports events over 500 ms by default, and this whole check takes 0.25 s, so a plain `npx analyze-trace tmp/trace-slow` prints `Found nothing in 1 project(s)`. Lower the thresholds with `--forceMillis 50 --skipMillis 20` to see the hot spot.

```bash
npx tsc --noEmit -p tsconfig.slow.json --generateTrace tmp/trace-slow
npx analyze-trace --forceMillis 50 --skipMillis 20 tmp/trace-slow
```

```
Hot Spots
└─ Check file …/12-deep-partial-overloads/mock-use-runtime-config.slow.ts (247ms)
   └─ Check deferred node from (line 13, char 10) to (line 25, char 4) (226ms)
      └─ Check expression from (line 17, char 12) to (line 24, char 6) (225ms)
         └─ Compare types 117 and 826 (207ms)
            └─ … four more Compare types …
                        └─ Compare types 861 and 868 (206ms)
                           ├─ {"id":861,"kind":"AnonymousType","location":{"path":"…/12-deep-partial-overloads/server-types.d.ts","line":14,"char":23}}
                           └─ {"id":868,"kind":"AnonymousType","location":{"path":"…/node_modules/type-fest/source/partial-deep.d.ts","line":149,"char":12}}
```

We shortened the paths here, and your milliseconds will differ. Read it top to bottom:

- **Lines 17–24 of the helper** are its `return { ...base, ...overrides, public: { … } }`. To type that spread, the checker compares the config with its deep-partial, field by field.
- **The chain ends at `server-types.d.ts` line 14**, the `redirect` object `{ to: string; statusCode?: HTTPStatusCode }` inside Nitro's route rules. Nothing in the specs mentions redirects. The comparison got there by walking `nitro.routeRules`.

You're done with this step when your output names lines 17–24 of `mock-use-runtime-config.slow.ts` and ends at `server-types.d.ts` line 14.

## 3. Cast before spreading

The trace blames the spread, so the first fix is to stop the spread from computing a deep-partial at all. Give the function an explicit return type of `() => RuntimeConfig`, and cast both `base` and `overrides` to `RuntimeConfig` before spreading them. The `PartialDeep<RuntimeConfig>` parameter stays, so TypeScript checks callers as before.

<details>
  <summary>Cast-before-spread solution</summary>

```ts
// mock-use-runtime-config.slow.ts
export function mockUseRuntimeConfig(
  original: (() => RuntimeConfig) | undefined,
  useRuntimeConfig: () => PartialDeep<RuntimeConfig> | undefined,
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
```

</details>

Check that it still compiles, then measure:

```bash
npx tsc --noEmit -p tsconfig.slow.json                          # no output, exit code 0
npx tsc --noEmit -p tsconfig.slow.json --extendedDiagnostics
```

```
Types:                      188375
Instantiations:             196129
```

15 types fewer, and `Check time` stays at 0.25 s (median of five runs). That's the expected checkpoint for this step: the cast cleared the helper's body, and another caller still pays. Keep the cast; step 5 builds on it.

## 4. Trace again

Same two commands as in step 2, into a new folder:

```bash
npx tsc --noEmit -p tsconfig.slow.json --generateTrace tmp/trace-cast
npx analyze-trace --forceMillis 50 --skipMillis 20 tmp/trace-cast
```

```
Hot Spots
└─ Check file …/12-deep-partial-overloads/specs/home-page.ts (216ms)
   └─ Check variable declaration from (line 9, char 14) to (line 9, char 71) (215ms)
      └─ Check expression from (line 9, char 23) to (line 9, char 71) (215ms)
         └─ Compare types 1464 and 791 (215ms)
            └─ … six more Compare types …
                                 ├─ {"id":1491,"kind":"AnonymousType","location":{"path":"…/12-deep-partial-overloads/server-types.d.ts","line":14,"char":23}}
                                 └─ {"id":1498,"kind":"AnonymousType","location":{"path":"…/node_modules/type-fest/source/partial-deep.d.ts","line":149,"char":12}}
```

The hot spot moved from the helper to `specs/home-page.ts` line 9, and the chain still ends at the same `redirect` object:

```ts
// specs/home-page.ts
const useRuntimeConfig = vi.fn<() => RuntimeConfig>()
export const mocked = mockUseRuntimeConfig(original, useRuntimeConfig) // line 9
```

This spy returns a complete `RuntimeConfig`, and the parameter expects `() => PartialDeep<RuntimeConfig> | undefined`. To accept the call, TypeScript compares `RuntimeConfig` with `PartialDeep<RuntimeConfig>`, field by field, through `nitro.routeRules` down to `statusCode`. It is the same walk the spread did. The step-2 trace didn't show this line because the helper is checked first: the spread built the expensive types, and this call found them already made.

You're done with this step when your output names `specs/home-page.ts` line 9.

## 5. Add overloads

We could change the spec, but the helper is the shared piece: any spec that types its spy with the full config pays again, and nothing tells its author. Let's make the helper cheap for every caller instead.

Add two overload signatures above the implementation. The first takes `() => RuntimeConfig | undefined`, which matches a spy typed with the full config by identity. The second takes `() => PartialDeep<RuntimeConfig> | undefined`, for partial overrides. The implementation signature takes `() => unknown`. Callers can't see it, so it can be as loose as the body needs.

> [!WARNING]
> Put the full-config overload first. TypeScript tries overloads top to bottom and takes the first that fits. With the `PartialDeep` overload on top, every call matches it and pays the comparison: we measured 188,383 types with the order swapped.

<details>
  <summary>Overloads skeleton: what goes where</summary>

```ts
// mock-use-runtime-config.slow.ts
export function mockUseRuntimeConfig(
  original: (() => RuntimeConfig) | undefined,
  useRuntimeConfig: /* a spy that returns the full config */,
): () => RuntimeConfig
export function mockUseRuntimeConfig(
  original: (() => RuntimeConfig) | undefined,
  useRuntimeConfig: /* a spy that returns a deep-partial config */,
): () => RuntimeConfig
export function mockUseRuntimeConfig(
  original: (() => RuntimeConfig) | undefined,
  useRuntimeConfig: /* anything callable: the overloads already checked it */,
): () => RuntimeConfig {
  /* the body from step 3, unchanged */
}
```

</details>

Each call now lands on one of the two overloads:

- **A spy typed with the full config** (`home-page.ts`) matches the first overload by identity, so `PartialDeep` is never computed.
- **An untyped `vi.fn()`** (`account-page.ts`) returns `any`, which also fits the first overload.
- **A partial literal** like `() => ({ public: { analytics: { … } } })` is missing `app`, so it fails the first overload and moves on to the second. There TypeScript only follows the paths the literal names, which never reach `nitro`.

<details>
  <summary>mockUseRuntimeConfig overloads solution</summary>

```ts
// mock-use-runtime-config.slow.ts
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
```

This matches [`mock-use-runtime-config.fixed.ts`](../../projects/test-lib-1/src/examples/12-deep-partial-overloads/mock-use-runtime-config.fixed.ts). `npx tsc --noEmit -p tsconfig.fixed.json --extendedDiagnostics` runs the same specs against it, if you want to check your work.

</details>

Check that it still compiles, then measure:

```bash
npx tsc --noEmit -p tsconfig.slow.json                          # no output, exit code 0
npx tsc --noEmit -p tsconfig.slow.json --extendedDiagnostics
```

```
Files:                         341
Lines of Library:            51126
Lines of Definitions:        69295
Lines of TypeScript:            95
Lines of JavaScript:             0
Lines of JSON:                   0
Lines of Other:                  0
Identifiers:                117277
Symbols:                     71692
Types:                         902
Instantiations:               1592
Memory used:               124899K
Assignability cache size:      158
Identity cache size:             0
Subtype cache size:             10
Strict subtype cache size:       1
I/O Read time:               0.01s
Parse time:                  0.17s
ResolveModule time:          0.02s
ResolveTypeReference time:   0.00s
ResolveLibrary time:         0.01s
Program time:                0.24s
Bind time:                   0.09s
Check time:                  0.04s
printTime time:              0.00s
Emit time:                   0.00s
Total time:                  0.37s
```

| Metric         | Before   | Step 3 (cast) | After (overloads) | Change vs. before |
|----------------|---------:|--------------:|------------------:|:------------------|
| Types          | 188,390  | 188,375       | 902               | -99.5%            |
| Instantiations | 196,129  | 196,129       | 1,592             | -99.2%            |
| Memory used    | 291,541K | 291,935K      | 124,899K          | -57%              |
| Check time     | 0.25s    | 0.25s         | 0.04s             | -84%              |
| Total time     | 0.58s    | 0.59s         | 0.37s             | -36%              |

Times and memory in the table are the median of five interleaved runs per column. The block above is one of the five after-runs, with `Check time` and `Total time` equal to the medians, and the counters came out identical on all five. Your `Lines of TypeScript` may differ by a line or two, depending on how you formatted the edit.

Great job! Both specs are unchanged and still compile, and the helper no longer makes either of them pay for `PartialDeep<RuntimeConfig>`.

> [!NOTE]
> In the Nuxt app this example comes from, the same overloads took the app's program from 1,189,522 to 1,002,072 types (−16%) and saved about 100 MB, with no spec changes. Check time stayed within run-to-run noise there: the extra types are mostly tuple type parameters (step 7), which are cheap to create. Measure this change in `Types` and memory.

## 6. Check the helper is still strict

The overloads should still reject a bad override. Add a third override to the end of `specs/account-page.ts`, with the wrong type for `darkMode`:

```ts
// specs/account-page.ts
/* code before */

export const wrong = mockUseRuntimeConfig(original, () => ({
  public: { features: { darkMode: 'yes' } },
}))
```

```bash
npx tsc --noEmit -p tsconfig.slow.json
```

```
specs/account-page.ts(18,25): error TS2769: No overload matches this call.
  Overload 1 of 2, '(original: (() => RuntimeConfig) | undefined, useRuntimeConfig: () => RuntimeConfig | undefined): () => RuntimeConfig', gave the following error.
    Type 'string' is not assignable to type 'boolean'.
  Overload 2 of 2, '(original: (() => RuntimeConfig) | undefined, useRuntimeConfig: () => { [x: string]: unknown; app?: { baseURL?: string | undefined; buildAssetsDir?: string | undefined; cdnURL?: string | undefined; } | undefined; nitro?: { ...; } | undefined; apiSecret?: string | undefined; public?: { ...; } | undefined; } | undefined): () => RuntimeConfig', gave the following error.
    Type 'string' is not assignable to type 'boolean | undefined'.
```

Your line number depends on where you pasted the override. The error is still there. It reads `TS2769` with one entry per overload, where the original helper reported a single `TS2322`. While it stands, `Types` goes back up to 188,399: to report the error, TypeScript compares against both overloads in full. A wrong-shaped spy is the one case that still pays, and only until someone fixes it.

Remove the three lines when you're done; `npx tsc --noEmit -p tsconfig.slow.json` prints nothing again.

## 7. BONUS: Price `HTTPStatusCode` on its own

> [!NOTE]
> This is a bonus exercise, you don't need to complete it.

The trace pointed at Nitro's `redirect` object, so the cost should belong to `HTTPStatusCode` itself, not to `PartialDeep`. Let's check. With your overloads still in place, add an import and one annotated constant to `specs/home-page.ts`:

```ts
// specs/home-page.ts
import type { RuntimeConfig } from '../runtime-config'
import type { HTTPStatusCode } from '../server-types'

/* code in between */

export const status: HTTPStatusCode = 301
```

```bash
npx tsc --noEmit -p tsconfig.slow.json --extendedDiagnostics
```

```
Types:                      187825
Instantiations:             190846
```

From 902 to 187,825 with no `PartialDeep` anywhere. Here is how [`server-types.d.ts`](../../projects/test-lib-1/src/examples/12-deep-partial-overloads/server-types.d.ts) builds the type:

```ts
// server-types.d.ts
declare type Enumerate<N extends number, Acc extends number[] = []> = Acc['length'] extends N
  ? Acc[number]
  : Enumerate<N, [...Acc, Acc['length']]>
declare type IntRange<F extends number, T extends number> = Exclude<Enumerate<T>, Enumerate<F>>

export type HTTPStatusCode = IntRange<100, 600>
```

`Enumerate<600>` grows a tuple one element at a time, the linear pattern from [Exercise 08](./08-recursive-tuple-construction.md). Every new tuple length gets its own tuple type with one type parameter per element, so lengths 1 to 600 add 1 + 2 + … + 600 = 180,300 type parameters. The baseline trace's `tmp/trace-slow/types.json` agrees: 180,909 of its 188,390 entries are `TypeParameter` types with no declaration.

That also tells you when the overloads stop helping. TypeScript builds `HTTPStatusCode` once per program, for whichever code reaches it first. If other code in the same program resolves it, say a server route typed with Nitro's route rules, the helper fix saves nothing there.

Remove the two lines when you're done, and delete the traces with `rm -rf tmp`.
