# Workspace Package Consumed as `.ts` Source (`paths` / relative source imports)

## Problem

Importing a sibling workspace package by pointing at its `.ts` source - directly:

```typescript
import { normalizeConfig } from "../../config/src";
```

or through a `paths` alias:

```json
// tsconfig.slow.json - paths alias points at the library's .ts source
"paths": { "@workspace/config": ["./package-lib/src/index.ts"] }
```

pulls the package's entire implementation into the consumer's program - function bodies, generic instantiations, recursive types, all re-checked on every consumer build. `skipLibCheck` doesn't help: it only skips `.d.ts` files, and nothing here is one.

See [`tsconfig.slow.json`](./tsconfig.slow.json) for the full config.

## Solution

Build the package and point the alias at its declaration output instead:

```json
"paths": { "@workspace/config": ["./package-lib/dist/index.d.ts"] }
```

`consumer-example.ts` is unchanged - same `import { normalizeConfig } from "@workspace/config"`. Only the resolution target moves from `src/index.ts` to `dist/index.d.ts`.

See [`tsconfig.fixed.json`](./tsconfig.fixed.json), and [`package-lib/package.json`](./package-lib/package.json) / [`package-lib/tsconfig.json`](./package-lib/tsconfig.json) for how a properly built package exposes `main`/`types`/`exports` so this works without any `paths` override at all.

## Why It Works

- A `.d.ts` file carries only type signatures, never function bodies - none of the library's internal generic work (`DeepMerge<A, B>`, `Paths<T>`, etc.) is ever computed by a consumer
- The library is checked once, when it's built - not re-derived by every consumer on every build
- In a `composite` / project-references setup this compounds: each consumer's `.tsbuildinfo` stays small instead of re-embedding the library's full check state

## Trade-off

Consumers see whatever was last published to `dist/` - source edits require rebuilding the library (or running it in watch mode alongside the consumer). That's the normal cost of any package boundary, and exactly what `composite: true` + project references + `tsc -b` exist to make cheap.

## Common Pitfalls

- Pointing a `paths` alias at `src` "for convenience" - reintroduces the problem even after the package is properly built
- Pointing `paths` at a `.d.ts` when a bundler or test runner reuses the same aliases (`vite-tsconfig-paths`, `tsconfig-paths` for ts-node, Jest's `moduleNameMapper`) - `paths` only affects type resolution in `tsc`, but those tools apply it at runtime too and end up importing a file with no code in it. Prefer dropping the `paths` override and letting the workspace symlink plus the package's `exports` resolve it: TypeScript picks `types` (`.d.ts`), the runtime picks `import` (`.js`)
- Assuming `skipLibCheck: true` covers this - it only skips `.d.ts` files; anything reached via `paths` or a relative import is still checked in full
- Benchmarking with too small a library - a handful of files produces too little checker work to see `Check time` move (see [Regenerating the Benchmark](#regenerating-the-benchmark))

## Impact Measurement

`consumer-example.ts` is identical in both runs - one import, one function call:

```typescript
import { normalizeConfig } from "@workspace/config";
```

See [`consumer-example.ts`](./consumer-example.ts). [`package-lib/src`](./package-lib/src) is the real implementation - recursive `DeepMerge`/`Paths`/`DeepRequired` types run over a 40-entry [plugin catalog](./package-lib/src/catalog.ts) of distinct, deeply-nested settings shapes. [`package-lib/dist`](./package-lib/dist) has just the equivalent `.d.ts` signatures, built with `tsc -p package-lib/tsconfig.json`.

Run the same consumer file through both configs - only the `paths` target differs:

```bash
cd projects/test-lib-1/src/examples/03-workspace-package-as-source

# package-lib/dist is gitignored - build it first, or tsconfig.fixed.json fails with
# TS2307 "Cannot find module '@workspace/config'"
npx tsc -p package-lib/tsconfig.json

npx tsc -p tsconfig.slow.json --extendedDiagnostics   # paths -> package-lib/src/index.ts
npx tsc -p tsconfig.fixed.json --extendedDiagnostics  # paths -> package-lib/dist/index.d.ts
```

| Metric         | `paths` -> `src/index.ts` | `paths` -> `dist/index.d.ts` | Change      |
|-----------------|----------------------------:|--------------------------------:|:------------|
| Types           |                       15,813 |                               99 | -99%        |
| Instantiations  |                      106,888 |                                0 | -100%       |
| Memory used     |                     189,671K |                         140,764K | -26%        |
| Check time      |                        0.16s |                            0.01s | -94% (~16x) |
| Total time      |                        0.41s |                            0.27s | -34%        |

`Instantiations` drops to zero - reading a `.d.ts` never triggers generic instantiation, however much recursive-type work the library's implementation does. Confirm what's actually being resolved:

```bash
npx tsc -p tsconfig.slow.json --traceResolution 2>&1 | grep "successfully resolved"
#   Module name '@workspace/config' was successfully resolved to '.../package-lib/src/index.ts'

npx tsc -p tsconfig.fixed.json --traceResolution 2>&1 | grep "successfully resolved"
#   Module name '@workspace/config' was successfully resolved to '.../package-lib/dist/index.d.ts'
```

The gap widens with the library's real size - a real internal package reused across many consumers pays this cost on every one of their builds.

## Regenerating the Benchmark

[`package-lib/src/catalog.ts`](./package-lib/src/catalog.ts) is generated by [`generate-plugin-catalog.mjs`](./generate-plugin-catalog.mjs) - the numbers above use 40 plugin kinds:

```bash
node generate-plugin-catalog.mjs 40   # plugin kinds, defaults to 40

# rebuild the library's declaration output so the fixed config's paths target stays in sync
cd package-lib && npx tsc -p tsconfig.json
```

Each plugin kind is a distinct named interface with its own `retry`/`timeout`/`cache`/`auth`/`logging`/`limits` sub-shape, so `DeepMerge`/`DeepRequired`/`Paths` can't shortcut the recursion across them - forcing a full structural walk instead of TypeScript's recursive-type shortcut.
