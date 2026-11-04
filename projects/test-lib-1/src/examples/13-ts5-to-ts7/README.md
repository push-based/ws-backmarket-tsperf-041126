# Migrating TypeScript 5 → 6 → 7 (`target`, `moduleResolution`, `baseUrl`, `strict`)

## Problem

TypeScript 7 is the native (Go) compiler, and it drops the legacy options that TypeScript 6 deprecates. A project that compiles cleanly on 5.9 can fail on 7 before a single file is checked, purely because of its `tsconfig.json`:

```json
// tsconfig.slow.json - fine on 5.9, rejected by 6, removed in 7
"target": "es5",
"moduleResolution": "node",
"strict": false,
"baseUrl": ".",
"paths": { "@utils/*": ["utils/*.slow.ts"] }
```

See [`tsconfig.slow.json`](./tsconfig.slow.json) for the full config, and [`index.slow.ts`](./index.slow.ts) / [`utils/math.slow.ts`](./utils/math.slow.ts) for the code. Its untyped parameters only compile because of `strict: false`.

## Solution

```json
"target": "es2022",
"module": "esnext",
"moduleResolution": "bundler",
"strict": true,
"paths": { "@utils/*": ["./utils/*.fixed.ts"] }
```

Replace every removed option, drop `baseUrl`, make `paths` relative, and type what `strict` no longer accepts as implicit `any`:

```typescript
function describe(user: { name: string; age: number }): string { /* ... */ }
export function sum(values: number[]): number { /* ... */ }
```

See [`tsconfig.fixed.json`](./tsconfig.fixed.json), [`index.fixed.ts`](./index.fixed.ts) and [`utils/math.fixed.ts`](./utils/math.fixed.ts). The fixed project compiles on 5.9, 6 and 7 alike.

## Why It Works

- TypeScript 6 is the stepping stone: every option 7 removes is an error in 6 (`TS5101`/`TS5107`) that names the replacement and can be temporarily silenced with `"ignoreDeprecations": "6.0"`. In 7 the same options are hard errors (`TS5102`/`TS5108`) with no opt-out
- `strict` defaults to `true` from TypeScript 6. The implicit-`any` errors are not deprecation warnings: they appear as soon as the explicit `strict: false` goes away, so 6 never warns about them in advance
- Once the config is valid, 7 checks the same program much faster. It is a native binary and type-checks in parallel, so parse, bind and check all drop at once (see Impact Measurement)

## Trade-off

`strict: false` and `"ignoreDeprecations": "6.0"` both make the errors go away without migrating anything. That is a postponement: 7 still accepts `"ignoreDeprecations": "6.0"` but silences nothing with it, and keeping `strict: false` keeps every implicit `any`. For a large legacy codebase, turn the strict flags on one at a time (`noImplicitAny` first) instead of flipping all of them at once.

## Common Pitfalls

- Deleting `baseUrl` but leaving `paths` non-relative: 7 then reports `TS5090` ("Non-relative paths are not allowed"). Every `paths` target needs a leading `./`
- Choosing `module: nodenext` instead of `bundler`: valid, but JSON imports then need `with { type: "json" }` (`TS1543`), and `paths` aliases need a runtime resolver
- Comparing `Files`/`Types` across versions without noticing that 6 stops including every `@types` package automatically (`types` defaults to `[]`). Here that alone drops the program from 168 files to 61
- Adding `isolatedModules: true` after the migration, as Vite/esbuild/swc setups require, stops `tsc` from inlining `const enum` values: imports and the enum object stay in the output. It only becomes an error (`TS2748`) for an ambient `const enum` from a `.d.ts`, such as a library's published types. See [example 12](../05-const-enum/README.md)

## Impact Measurement

First, run the unmigrated project through all three compilers. `npx -p` downloads the requested version for one run without touching `package.json`:

```bash
cd projects/test-lib-1/src/examples/13-ts5-to-ts7

npx tsc -p tsconfig.slow.json                          # 5.9.3: exit 0
npx -p typescript@6.0 tsc -p tsconfig.slow.json        # 6.0.3: exit 2
npx -p typescript@7.0 tsc -p tsconfig.slow.json        # 7.0.2: exit 1
```

```text
# 6.0.3
tsconfig.slow.json(3,15): error TS5107: Option 'target=ES5' is deprecated and will stop functioning in TypeScript 7.0. Specify compilerOption '"ignoreDeprecations": "6.0"' to silence this error.
tsconfig.slow.json(5,25): error TS5107: Option 'moduleResolution=node10' is deprecated and will stop functioning in TypeScript 7.0. ...
tsconfig.slow.json(13,5): error TS5101: Option 'baseUrl' is deprecated and will stop functioning in TypeScript 7.0. ...

# 7.0.2
tsconfig.slow.json(3,15): error TS5108: Option 'target=ES5' has been removed. Please remove it from your configuration.
tsconfig.slow.json(5,25): error TS5108: Option 'moduleResolution=node10' has been removed. Please remove it from your configuration.
tsconfig.slow.json(13,5): error TS5102: Option 'baseUrl' has been removed. Please remove it from your configuration.
tsconfig.slow.json(14,29): error TS5090: Non-relative paths are not allowed. Did you forget a leading './'?
```

To see the `strict` default change on its own, silence the deprecations in 6 and drop `strict: false` from a copy of the slow config: 6 then reports `TS7006` for `user` and `values`.

Then measure the migrated project on each version:

```bash
npx tsc -p tsconfig.fixed.json --extendedDiagnostics
npx -p typescript@6.0 tsc -p tsconfig.fixed.json --extendedDiagnostics
npx -p typescript@7.0 tsc -p tsconfig.fixed.json --extendedDiagnostics
```

| Metric (average of 5 runs) | 5.9.3     | 6.0.3     | 7.0.2     |
|-----------------------------|----------:|----------:|----------:|
| Files                       | 168       | 61        | 61        |
| Memory used                 | 118,696K  | 60,595K   | 24,534K   |
| Total time                  | 0.326s    | 0.162s    | 0.020s    |

From 5.9 to 6 the program halves because `types` now defaults to `[]`, not because the compiler got faster. From 6 to 7 it is the same 61 files, and the native compiler finishes about 8× faster with 40% of the memory. `Types` is not comparable across the two compilers (7 counts 411 against 6's 152 for the same program), so compare time and memory, not type counts.
