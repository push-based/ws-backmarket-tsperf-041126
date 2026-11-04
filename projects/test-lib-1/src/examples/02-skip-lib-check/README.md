# Skip Library Type Checking (`skipLibCheck`)

## Problem

By default, TypeScript type-checks every `.d.ts` file it encounters, including all of `node_modules`. Large dependency trees - and duplicate or slightly conflicting versions of the same `@types` package - can make this a significant, and mostly wasted, share of total check time.

```json
// skipLibCheck defaults to false - every .d.ts in node_modules is checked
```

`include`/`exclude` don't change this: both configs below explicitly set `"exclude": ["node_modules"]`, yet `@aws-sdk/client-s3`'s declaration files are still loaded and checked whenever `skipLibCheck` is `false`. `exclude` only controls which files TypeScript treats as *root* files - it can't stop a `.d.ts` from being pulled in once your code `import`s it.

## Solution

```json
"skipLibCheck": true
```

TypeScript still *uses* declaration files to resolve types for your code - it just stops re-verifying that the declarations themselves are internally consistent.

## Why It Works

- Your own source files are unaffected - they're still fully checked
- `.d.ts` files ship from packages you don't control and rarely change; checking them on every build buys little safety
- Removes a whole class of "type error inside a dependency's declaration file" build failures that have nothing to do with your code

## Trade-off

`skipLibCheck: true` won't catch genuine inconsistencies between two packages' type definitions (e.g. conflicting global augmentations). This is a well-known, generally accepted trade-off - enable it unless you have a specific reason not to.

## Common Pitfalls

- Leaving `skipLibCheck` unset ("defaults to false") without realizing it - see the [tsconfig performance checklist](../../../../../docs/tsconfig-checklist.md)
- Assuming it hides errors in *your own* code - it only skips `.d.ts` files, never your `.ts` sources

## Impact Measurement

One import is enough to demonstrate the effect:

```typescript
import { S3Client } from "@aws-sdk/client-s3";
```

See [`skip-lib-check-example.ts`](./skip-lib-check-example.ts). `@aws-sdk/client-s3` ships thousands of lines of generated declaration files - with `skipLibCheck: false`, TypeScript fully type-checks all of that on every build; with `skipLibCheck: true`, it's skipped entirely.

This folder has its own [`tsconfig.slow.json`](./tsconfig.slow.json) and [`tsconfig.fixed.json`](./tsconfig.fixed.json). They compile only `skip-lib-check-example.ts` and are identical except for `skipLibCheck`, so that flag is the only variable. Run both from `projects/test-lib-1`, where `@aws-sdk/client-s3` is installed:

```bash
cd projects/test-lib-1

npx tsc -p src/examples/02-skip-lib-check/tsconfig.slow.json --extendedDiagnostics   # skipLibCheck: false
npx tsc -p src/examples/02-skip-lib-check/tsconfig.fixed.json --extendedDiagnostics  # skipLibCheck: true
```

| Metric                    | `skipLibCheck: false` | `skipLibCheck: true` | Change      |
|----------------------------|-----------------------:|-----------------------:|:------------|
| Files                      |                    757 |                    757 | unchanged - the `.d.ts` files are still loaded, just not checked |
| Symbols                    |                174,139 |                 88,116 | -49%        |
| Types                      |                127,769 |                    754 | -99%        |
| Instantiations             |                130,783 |                    770 | -99%        |
| Assignability cache size   |                232,589 |                    424 | -99%        |
| Memory used                |               335,638K |               156,295K | -53%        |
| Check time                 |                  1.60s |                  0.03s | -98% (~50x) |
| Total time                 |                  2.04s |                  0.47s | -77% (~4x)  |

Same file count both times: `skipLibCheck` doesn't remove anything from the program. TypeScript still parses and binds every `.d.ts`, which is why `Symbols` only halves. What disappears is the checking. `Types` and `Instantiations` fall by more than two orders of magnitude, memory roughly halves, and `Check time` goes from 1.60s to 0.03s, all from one compiler flag. The remaining ~0.45s of `Total time` is parsing and binding, which `skipLibCheck` can't skip.
