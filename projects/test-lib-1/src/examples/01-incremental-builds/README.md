# Incremental Builds (`incremental`)

## Problem

Without `incremental: true`, `tsc` type-checks and re-emits **every** file on **every** invocation, even when only one file changed since the last build. On a watch loop, a CI pipeline, or repeated local builds, you pay the full project check cost every single time.

```json
// no "incremental" - every build starts from zero
```

See [`tsconfig.slow.json`](./tsconfig.slow.json) for the full config.

## Solution

```json
"incremental": true,
"tsBuildInfoFile": "./tsconfig.fixed.tsbuildinfo"
```

On the first build, TypeScript writes a `.tsbuildinfo` file recording per-file signatures and dependency information; every subsequent build compares that file against disk and skips re-checking files whose dependencies haven't changed.

See [`tsconfig.fixed.json`](./tsconfig.fixed.json) for the full config - the two configs are otherwise identical, differing in only the `incremental`/`tsBuildInfoFile` settings.

## Why It Works

- **First build**: same cost as a non-incremental build - this is the cache being written
- **Every build after**: `tsc` reuses cached signatures for unchanged files instead of re-checking them
- The effect compounds in watch mode, in CI with a cached `.tsbuildinfo` artifact, and with project references (`tsc -b`)

## Common Pitfalls

- Committing `.tsbuildinfo` to version control - add `*.tsbuildinfo` to `.gitignore` instead
- Wiping `.tsbuildinfo` on every CI run, which defeats the cache entirely
- Omitting `tsBuildInfoFile` in a monorepo with several `tsconfig*.json` files - configs can silently overwrite each other's cache

## Impact Measurement

A single file's check time is too small to see any of this, so [`generated/`](./generated) holds 80 independent synthetic files (regenerate with [`generate-files.sh`](./generate-files.sh)), each self-contained with no cross-file imports.

```bash
cd projects/test-lib-1/src/examples/01-incremental-builds

# delete any cached buildinfo first so the "cold run" below is actually cold
rm -f tsconfig.fixed.tsbuildinfo

npx tsc --noEmit -p tsconfig.fixed.json --extendedDiagnostics
# 1st (cold) run - checks all 80 files, writes tsconfig.fixed.tsbuildinfo

npx tsc --noEmit -p tsconfig.fixed.json --extendedDiagnostics
# 2nd (warm) run, nothing changed - reuses the cache for all 80 files

echo "// touch" >> generated/file-040.ts   # change exactly ONE of the 80 files
npx tsc --noEmit -p tsconfig.fixed.json --extendedDiagnostics
# rebuild - only the one changed file is rechecked

npx tsc --noEmit -p tsconfig.slow.json --extendedDiagnostics
# every run, changed or not - full recheck, no cache to reuse
```

| Metric                   |  Cold (1st) run | Warm (2nd) run, nothing changed | After touching 1 of 80 files | No-incremental (every run) |
|---------------------------|-----------------:|----------------------------------:|-------------------------------:|------------------------------:|
| Files                      |              244 |                                244 |                             244 |                            244 |
| Symbols                    |           77,419 |                             60,334 |                          60,671 |                         77,419 |
| Types                      |           12,856 |                                 89 |                             374 |                          12,856 |
| Instantiations             |          153,689 |                                  0 |                           1,930 |                         153,689 |
| Assignability cache size   |           17,524 |                                  0 |                             223 |                          17,524 |
| Memory used                |          144,166K|                            122,703K|                         130,156K|                        136,489K |
| Check time                 |            0.21s |               *(line absent - 0)* |                           0.03s |                          0.22s |
| Total time                 |            0.51s |                              0.25s |                           0.38s |                          0.55s |

That's the actual payoff: with `incremental`, changing 1 of 80 files costs roughly what checking 1 file costs (`Instantiations` drop from 153,689 to 1,930); without it, changing 1 of 80 still costs what checking all 80 costs, every single time. The gap only widens as file count grows.
