# Exercise: Skip Checking Library Declarations

In this exercise we will turn on `skipLibCheck` so `tsc` stops type-checking the `.d.ts` files that come with your dependencies. One import of `@aws-sdk/client-s3` pulls about 600 declaration files from `@aws-sdk` and `@smithy` into the program, and by default `tsc` checks all of them on every build. You can't fix errors in those files anyway, so that check time buys you little.

## Goal

At the end of this exercise `tsc --extendedDiagnostics` on `tsconfig.slow.json` reports `Check time` around 0.03s instead of 1.71s, and `Types` drops from 127,769 to 754, by changing one compiler option.

## Prerequisites

Complete [Exercise 0: Setup](./0-setup.md) first: repo cloned, `npm install` done.
Start at the repository root: step 1 changes into `projects/test-lib-1/src/examples/02-skip-lib-check`, and every command after that runs from there.

The project is one file, [`skip-lib-check-example.ts`](../../projects/test-lib-1/src/examples/02-skip-lib-check/skip-lib-check-example.ts), which imports `S3Client` from `@aws-sdk/client-s3`. `npm install` put that package in the repo's `node_modules`, and `tsc` finds it from this folder.

> [!TIP]
> Watch **Files** alongside **Types** and **Check time**. `skipLibCheck` keeps every file in the program, so if Files changes between your runs, something else changed too.

## 1. Measure the baseline

Before changing anything, get the number you're trying to beat:

```bash
cd projects/test-lib-1/src/examples/02-skip-lib-check

npx tsc --noEmit -p tsconfig.slow.json --extendedDiagnostics
```

```
Files:                         757
Lines of Library:            50310
Lines of Definitions:       110691
Lines of TypeScript:            15
Lines of JavaScript:             0
Lines of JSON:                   0
Lines of Other:                  0
Identifiers:                138798
Symbols:                    174139
Types:                      127769
Instantiations:             130783
Memory used:               346903K
Assignability cache size:   232589
Identity cache size:           133
Subtype cache size:              0
Strict subtype cache size:     530
I/O Read time:               0.08s
Parse time:                  0.22s
ResolveModule time:          0.04s
ResolveTypeReference time:   0.00s
ResolveLibrary time:         0.01s
Program time:                0.40s
Bind time:                   0.14s
Check time:                  1.71s
printTime time:              0.00s
Emit time:                   0.00s
Total time:                  2.25s
```

Our own code is 15 lines (`Lines of TypeScript`). The 110,691 `Lines of Definitions` come from declaration files, and checking them costs **Types 127,769, Instantiations 130,783** and 1.71s of `Check time`.

`tsconfig.slow.json` already has `"exclude": ["node_modules"]`, and the numbers show it doesn't help. `exclude` decides which files start the program; `tsc` still loads any `.d.ts` your code imports.

## 2. Turn on `skipLibCheck`

[`tsconfig.slow.json`](../../projects/test-lib-1/src/examples/02-skip-lib-check/tsconfig.slow.json) sets `"skipLibCheck": false`. Flip it, so `tsc` keeps using the declarations to type your code and stops verifying the declarations themselves.

> [!WARNING]
> With `skipLibCheck: true`, `tsc` reports no errors from **any** `.d.ts` file, including ones you write yourself, such as a hand-written `global.d.ts`. It still checks your `.ts` files in full. If your project keeps its own declaration files, or two packages might ship conflicting global types, run the full check now and then, for example in a nightly CI job: `npx tsc --noEmit -p tsconfig.slow.json --skipLibCheck false`.

<details>
  <summary>skipLibCheck solution</summary>

```jsonc
// projects/test-lib-1/src/examples/02-skip-lib-check/tsconfig.slow.json
{
  "compilerOptions": {
    /* ...existing options... */
    "noEmit": true,
    "skipLibCheck": true,
    "incremental": false
  },
  "include": ["./skip-lib-check-example.ts"],
  "exclude": ["node_modules"]
}
```

</details>

Check that `tsc` reads your edit:

```bash
npx tsc --showConfig -p tsconfig.slow.json | grep skipLibCheck
```

You should see `"skipLibCheck": true`.

## 3. Measure again

Re-run the command from step 1:

```bash
npx tsc --noEmit -p tsconfig.slow.json --extendedDiagnostics
```

```
Files:                         757
Lines of Library:            50310
Lines of Definitions:       110691
Lines of TypeScript:            15
Lines of JavaScript:             0
Lines of JSON:                   0
Lines of Other:                  0
Identifiers:                138798
Symbols:                     88116
Types:                         754
Instantiations:                770
Memory used:               155930K
Assignability cache size:      424
Identity cache size:             3
Subtype cache size:              0
Strict subtype cache size:       0
I/O Read time:               0.08s
Parse time:                  0.23s
ResolveModule time:          0.04s
ResolveTypeReference time:   0.00s
ResolveLibrary time:         0.01s
Program time:                0.40s
Bind time:                   0.11s
Check time:                  0.03s
printTime time:              0.00s
Emit time:                   0.00s
Total time:                  0.54s
```

| Metric                   | Before (`skipLibCheck: false`) | After (`skipLibCheck: true`) | Change |
|--------------------------|-------------------------------:|-----------------------------:|:-------|
| Symbols                  | 174,139                        | 88,116                       | -49%   |
| Types                    | 127,769                        | 754                          | -99.4% |
| Instantiations           | 130,783                        | 770                          | -99.4% |
| Assignability cache size | 232,589                        | 424                          | -99.8% |
| Memory used              | 346,699K                       | 156,017K                     | -55%   |
| Check time               | 1.71s                          | 0.03s                        | -98%   |
| Total time               | 2.25s                          | 0.54s                        | -76%   |

Times and memory are the median of five runs; the counts came out the same in all five. The output blocks above are single runs, so their times and memory can differ slightly from these medians. **Files** and **Lines of Definitions** stay put: `tsc` still loads, parses and binds all 757 files, so `Program time` holds at 0.40s and `Total time` falls less than `Check time`. The 1.68s you saved is the checking of those files, down to **Types 754**.

## 4. BONUS: See what `skipLibCheck` hides

> [!NOTE]
> This is a bonus exercise, you don't need to complete it.

Let's test the warning from step 2. Create a declaration file with a deliberate error and add it to `include` in `tsconfig.slow.json`:

```ts
// projects/test-lib-1/src/examples/02-skip-lib-check/broken.d.ts
export declare const broken: NotARealType;
```

```jsonc
// projects/test-lib-1/src/examples/02-skip-lib-check/tsconfig.slow.json
"include": ["./skip-lib-check-example.ts", "./broken.d.ts"],
```

```bash
npx tsc --noEmit -p tsconfig.slow.json                        # exit 0, no output
npx tsc --noEmit -p tsconfig.slow.json --skipLibCheck false   # error TS2304: Cannot find name 'NotARealType'.
```

`tsc` reports the error in `broken.d.ts` only in the second run, where it checks `.d.ts` files. Delete `broken.d.ts` and its `include` entry when you're done.

To see it without touching the repo, compare [`broken.d.ts` with `skipLibCheck` off][playground-broken-dts] and [with it on][playground-broken-dts-skipped] in the TS Playground: the first reports `TS2304` on `NotARealType`, the second reports nothing.

## 5. BONUS: Compare against the fixed reference config

> [!NOTE]
> This is a bonus exercise, you don't need to complete it.

[`tsconfig.fixed.json`](../../projects/test-lib-1/src/examples/02-skip-lib-check/tsconfig.fixed.json) is the reference solution. Run it next to your edited config:

```bash
npx tsc --noEmit -p tsconfig.slow.json --extendedDiagnostics    # your edit
npx tsc --noEmit -p tsconfig.fixed.json --extendedDiagnostics   # reference solution
```

Both should print `Types: 754` and `Instantiations: 770`.

[playground-broken-dts]: https://www.typescriptlang.org/play/?ts=5.9.3&filetype=d.ts&target=9&skipLibCheck=false#code/PTAECMCcHsGsFMB2A6AJsgLgZwFDwB4AO0kGoq8AxgDYCGk8ol0iWZUcSAXKAHLQYAggCV4tagBUAnoXgBuHEA
[playground-broken-dts-skipped]: https://www.typescriptlang.org/play/?ts=5.9.3&filetype=d.ts&target=9&skipLibCheck=true#code/PTAECMCcHsGsFMB2A6AJsgLgZwFDwB4AO0kGoq8AxgDYCGk8ol0iWZUcSAXKAHLQYAggCV4tagBUAnoXgBuHEA
