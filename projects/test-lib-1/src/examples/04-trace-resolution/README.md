# Diagnosing Module Resolution (`--traceResolution`)

## Problem

Nothing in a normal `tsc` run shows which physical file an import resolved to. `import { Calculator } from "test-lib-2"` looks identical whether it resolved to the package's `.ts` source or its built `.d.ts` - a `paths` override (or a stray relative import) can silently redirect a workspace import from declarations to raw source, invisible until you go looking for it.

```json
// tsconfig.slow.json - paths override shadows the package's own package.json
"paths": { "test-lib-2": ["../../../../test-lib-2/src/index.ts"] }
```

See [`tsconfig.slow.json`](./tsconfig.slow.json) for the full config.

## Solution

Run the file through `tsc --traceResolution` and grep for the import in question (from `projects/test-lib-1`, so `-p` resolves against this workspace member's root):

```bash
cd projects/test-lib-1

# test-lib-2/dist is gitignored - build it first, or tsconfig.fixed.json fails with
# TS2307 "Cannot find module 'test-lib-2'" (node_modules/test-lib-2 is the workspace
# symlink created by `npm install` at the repo root)
npx tsc -p ../test-lib-2/tsconfig.json

npx tsc --noEmit -p src/examples/04-trace-resolution/tsconfig.slow.json --traceResolution 2>&1 | grep -A 20 "Resolving module 'test-lib-2'"
```

See [`tsconfig.fixed.json`](./tsconfig.fixed.json) - no `paths` override, so Node-style resolution finds `test-lib-2` through `node_modules` and reads its `package.json` normally.

### ❌ Bad: `paths` shadows the package, resolves to source

```
'paths' option is specified, looking for a pattern to match module name 'test-lib-2'.
Trying substitution '../../../../test-lib-2/src/index.ts' ... File exists - use it as a name resolution result.
======== Module name 'test-lib-2' was successfully resolved to '.../projects/test-lib-2/src/index.ts'. ========
```

`test-lib-2`'s own `package.json` is never consulted - `paths` wins before `node_modules` lookup is attempted at all.

### ✅ Good: resolved through `package.json`'s `types` field to `dist`

```
Loading module 'test-lib-2' from 'node_modules' folder, target file types: TypeScript, Declaration.
Found 'package.json' ...; 'types' field 'dist/index.d.ts' that references '.../node_modules/test-lib-2/dist/index.d.ts'.
======== Module name 'test-lib-2' was successfully resolved to '.../projects/test-lib-2/dist/index.d.ts' with Package ID 'test-lib-2/dist/index.d.ts@1.0.0'. ========
```

No `paths` override, so plain Node resolution walks `node_modules`, finds the package's `package.json`, and reads its `types` field.

## Why It Works

- `--traceResolution` logs every step the resolver takes for each module specifier: which strategy fired (`paths`, `node_modules`, relative path), which candidates it probed, which one won
- Each import ends with one `======== Module name '<x>' was successfully resolved to '<path>' ========` line - that's what's worth grepping for, but the lines above explain *why*
- It distinguishes two entirely different resolution stories that produce the exact same import statement - exactly the ambiguity this problem needs solved

## Common Pitfalls

- Grepping only the final `was successfully resolved to` line and missing *why* - when it disagrees with expectation, the answer is a few lines above (`paths` substitution vs. `package.json` `types`/`typesVersions`/`typings`)
- Reading raw `--traceResolution` output instead of grepping `Resolving module '<the specific import>'` - it's per-file and enormous on a real project
- Checking `--traceResolution` once after fixing the config and not re-checking after a later refactor - a stray `paths` entry can quietly come back

## Impact Measurement

Both configs load the same [`consumer-example.ts`](./consumer-example.ts) - only `tsconfig.slow.json`'s `paths` entry differs from [`tsconfig.fixed.json`](./tsconfig.fixed.json):

```typescript
import { Calculator } from "test-lib-2";
```

`--traceResolution` explains *why* the two configs diverge; `--extendedDiagnostics` shows what that divergence costs.

```bash
npx tsc --noEmit -p src/examples/04-trace-resolution/tsconfig.slow.json --extendedDiagnostics    # paths -> test-lib-2/src/index.ts
npx tsc --noEmit -p src/examples/04-trace-resolution/tsconfig.fixed.json --extendedDiagnostics   # no paths -> resolves via package.json to dist/index.d.ts
```

| Metric               | `paths` -> `src/index.ts` | resolved -> `dist/index.d.ts` | Change     |
|-----------------------|----------------------------:|---------------------------------:|:-----------|
| Lines of TypeScript   |                          307 |                                12 | -96%       |
| Types                 |                       64,963 |                                98 | -99.8%     |
| Instantiations        |                       77,131 |                                 0 | -100%      |
| Check time            |                        0.17s |                             0.01s | -94% (17x) |
| Total time            |                        0.44s |                             0.25s | -43%       |

`test-lib-2`'s public API is just `add`, `multiply`, and `Calculator` - `dist/index.d.ts` only declares those three. `src/index.ts` also carries unexported internal plumbing (recursive `DeepMerge`/`DeepPartial`/`Zip`/`Flatten`, a template-literal permission matrix, tuple-length arithmetic) that gets fully checked whenever `paths` resolves to source instead of declarations - proof that tsc checks every file in the program, not just the symbols a consumer actually imports. The tuple-length arithmetic (`BuildTuple`/`CombinedCapacity`) carries most of that weight, which is why `Instantiations` swings from 0 to 77,131.

Numbers above are from a single `--extendedDiagnostics` run per config, not averaged - treat exact percentages as directional, though the ~17x `Check time` gap repeats consistently across runs. The `with Package ID '...@1.0.0'` suffix in the `--traceResolution` output above is the tell that catches this before it grows further.
