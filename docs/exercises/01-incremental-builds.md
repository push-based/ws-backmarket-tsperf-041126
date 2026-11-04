# Exercise: Incremental Builds

In this exercise we will turn on `incremental` so `tsc` stops re-checking files that haven't changed. Without it, every run type-checks all 80 files in this project, even when you edited one of them or none at all. With it, `tsc` saves its results to a `.tsbuildinfo` file and re-checks what changed since the last run.

## Goal

At the end of this exercise, re-checking the project after editing 1 of its 80 files reports `Instantiations: 1930` instead of `153689`, and `Check time` drops from 0.20s to 0.02s, because `tsconfig.slow.json` has `incremental` turned on.

## Prerequisites

Complete [Exercise 0: Setup](./0-setup.md) first: repo cloned, `npm install` done.
Start at the repository root: step 1 changes into `projects/test-lib-1/src/examples/01-incremental-builds`, and every command after that runs from there.

The project is the [`generated/`](../../projects/test-lib-1/src/examples/01-incremental-builds/generated) folder: 80 files, each with its own copy of a recursive `DeepReadonly` type and no imports between them. One file is too small to measure, so [`generate-files.sh`](../../projects/test-lib-1/src/examples/01-incremental-builds/generate-files.sh) made enough of them for the cost to show up.

> [!TIP]
> Read **Types**, **Instantiations** and **Check time** first. **Files** stays at 232 in every run of this exercise: `tsc` still reads every file, and with `incremental` it skips checking the ones it already knows.

## 1. Measure the baseline

Before changing anything, check what every build costs today:

```bash
cd projects/test-lib-1/src/examples/01-incremental-builds

npx tsc --noEmit -p tsconfig.slow.json --extendedDiagnostics
```

```
Files:                         232
Lines of Library:             9894
Lines of Definitions:        56016
Lines of TypeScript:          3280
Lines of JavaScript:             0
Lines of JSON:                   0
Lines of Other:                  0
Identifiers:                 86832
Symbols:                     76097
Types:                       12856
Instantiations:             153689
Memory used:               124860K
Assignability cache size:    17524
Identity cache size:             0
Subtype cache size:              0
Strict subtype cache size:       0
I/O Read time:               0.04s
Parse time:                  0.14s
ResolveTypeReference time:   0.00s
ResolveModule time:          0.01s
ResolveLibrary time:         0.00s
Program time:                0.21s
Bind time:                   0.07s
Check time:                  0.20s
printTime time:              0.00s
Emit time:                   0.00s
Total time:                  0.48s
```

Run the same command a second time. You get **Types 12,856, Instantiations 153,689** again, and `Check time` stays around 0.20s. `tsc` repeats all of that work on every run, changed files or not.

## 2. Turn on `incremental`

[`tsconfig.slow.json`](../../projects/test-lib-1/src/examples/01-incremental-builds/tsconfig.slow.json) sets `"incremental": false`. Switch it on, and tell `tsc` where to keep its cache.

<details>
  <summary>Skeleton: which options to touch</summary>

```jsonc
// projects/test-lib-1/src/examples/01-incremental-builds/tsconfig.slow.json
{
  "compilerOptions": {
    /* ...existing options... */
    "noEmit": true,
    "incremental": /* turn the cache on */,
    "tsBuildInfoFile": /* a file next to this config */
  },
  "include": ["./generated/**/*"]
}
```

</details>

With `incremental`, `tsc` writes a `.tsbuildinfo` file after each run, holding a hash of every file and the result of checking it. `tsBuildInfoFile` names that file. Give each config its own name, so two configs in one folder never share a cache.

<details>
  <summary>incremental + tsBuildInfoFile solution</summary>

```jsonc
// projects/test-lib-1/src/examples/01-incremental-builds/tsconfig.slow.json
{
  "compilerOptions": {
    /* ...existing options... */
    "noEmit": true,
    "incremental": true,
    "tsBuildInfoFile": "./tsconfig.slow.tsbuildinfo"
  },
  "include": ["./generated/**/*"]
}
```

`noEmit` and `incremental` work together: `tsc` writes no `.js` files and still writes the `.tsbuildinfo`. The repo's `.gitignore` already covers `*.tsbuildinfo`.

</details>

Check that `tsc` reads your edit:

```bash
npx tsc --showConfig -p tsconfig.slow.json | grep -E 'incremental|tsBuildInfoFile'
```

You should see `"incremental": true` and `"tsBuildInfoFile": "./tsconfig.slow.tsbuildinfo"`.

## 3. Cold run: fill the cache

The first run with `incremental` has no cache to read, so `tsc` checks all 80 files and writes `tsconfig.slow.tsbuildinfo` at the end.

> [!WARNING]
> Start every cold measurement from an empty cache: delete `tsconfig.slow.tsbuildinfo` first. A cache left over from an earlier attempt turns your "cold" run into a warm one, and your numbers won't match this step.

```bash
rm -f tsconfig.slow.tsbuildinfo
npx tsc --noEmit -p tsconfig.slow.json --extendedDiagnostics
```

You should see the baseline's **Types 12,856, Instantiations 153,689** plus a new `I/O Write time` line, which is `tsc` writing the cache. Check that `tsconfig.slow.tsbuildinfo` now sits next to the config.

## 4. Warm run: nothing changed

Run the same command again without touching any file:

```bash
npx tsc --noEmit -p tsconfig.slow.json --extendedDiagnostics
```

```
Files:                        232
Lines of Library:            9894
Lines of Definitions:       56016
Lines of TypeScript:         3280
Lines of JavaScript:            0
Lines of JSON:                  0
Lines of Other:                 0
Identifiers:                86832
Symbols:                    59012
Types:                         89
Instantiations:                 0
Memory used:               95103K
Assignability cache size:       0
Identity cache size:            0
Subtype cache size:             0
Strict subtype cache size:      0
I/O Read time:              0.03s
Parse time:                 0.14s
ResolveTypeReference time:  0.00s
ResolveModule time:         0.01s
ResolveLibrary time:        0.00s
Program time:               0.21s
Bind time:                  0.07s
Total time:                 0.28s
```

**Instantiations: 0**, and the `Check time` line is gone. `tsc` compared every file's hash with the cache, found no changes, and skipped the checker. `Program time` stays at 0.21s because `tsc` still reads and parses all 232 files to compute those hashes.

## 5. Edit one file of 80

Next, change one file and rebuild, the way you do all day.

> [!WARNING]
> This step appends a line to `generated/file-040.ts`. Restore it as soon as you've read the numbers, so the file matches the repo again:
>
> ```bash
> git checkout -- generated/file-040.ts
> ```

```bash
echo "// touch" >> generated/file-040.ts
npx tsc --noEmit -p tsconfig.slow.json --extendedDiagnostics
```

```
Files:                         232
Lines of Library:             9894
Lines of Definitions:        56016
Lines of TypeScript:          3281
Lines of JavaScript:             0
Lines of JSON:                   0
Lines of Other:                  0
Identifiers:                 86832
Symbols:                     59349
Types:                         374
Instantiations:               1930
Memory used:               101820K
Assignability cache size:      223
Identity cache size:             0
Subtype cache size:              0
Strict subtype cache size:       0
I/O Read time:               0.03s
Parse time:                  0.15s
ResolveTypeReference time:   0.00s
ResolveModule time:          0.01s
ResolveLibrary time:         0.00s
Program time:                0.21s
Bind time:                   0.07s
transformTime time:          0.00s
commentTime time:            0.00s
printTime time:              0.01s
Emit time:                   0.01s
Check time:                  0.02s
I/O Write time:              0.00s
Total time:                  0.31s
```

`Check time` is back at 0.02s: `tsc` re-checked `file-040.ts` and reused the cache for the other 79. The `Emit time` line comes from `tsc` working out whether the file's exported shape changed, which tells it whether files importing it need a re-check too. On disk, `tsc` writes the `.tsbuildinfo` and nothing else.

Now restore the file:

```bash
git checkout -- generated/file-040.ts
```

## 6. Compare the four runs

Put the numbers side by side:

| Metric                   | No `incremental` (every run) | Cold (1st run) | Warm (nothing changed) | After editing 1 of 80 |
|--------------------------|-----------------------------:|---------------:|-----------------------:|----------------------:|
| Symbols                  | 76,097                       | 76,097         | 59,012                 | 59,349                |
| Types                    | 12,856                       | 12,856         | 89                     | 374                   |
| Instantiations           | 153,689                      | 153,689        | 0                      | 1,930                 |
| Assignability cache size | 17,524                       | 17,524         | 0                      | 223                   |
| Memory used              | 124,912K                     | 115,865K       | 95,124K                | 101,814K              |
| Check time               | 0.20s                        | 0.20s          | *(no line)*            | 0.02s                 |
| Total time               | 0.48s                        | 0.48s          | 0.28s                  | 0.31s                 |

Times and memory are the median of five runs; the counts came out the same in all five. The output blocks above are single runs, so their times and memory can differ slightly from these medians. Without `incremental`, editing 1 of 80 files costs what checking all 80 costs. With it, the edit costs about one file's worth of checking: **Instantiations 153,689 → 1,930**, **Check time 0.20s → 0.02s**. The cold run pays the full price once, and every run after it reuses the cache. `Total time` falls by less (0.48s → 0.31s) because reading and parsing the 232 files takes the same 0.21s in every run.

## 7. BONUS: Compare against the fixed reference config

> [!NOTE]
> This is a bonus exercise, you don't need to complete it.

[`tsconfig.fixed.json`](../../projects/test-lib-1/src/examples/01-incremental-builds/tsconfig.fixed.json) is the reference solution. It writes its cache to its own `tsconfig.fixed.tsbuildinfo`, so it starts without the cache your config wrote. Run it cold, then warm:

```bash
rm -f tsconfig.fixed.tsbuildinfo
npx tsc --noEmit -p tsconfig.fixed.json --extendedDiagnostics   # cold: Instantiations 153689
npx tsc --noEmit -p tsconfig.fixed.json --extendedDiagnostics   # warm: Instantiations 0, no Check time line
```

Both runs should match your cold and warm runs from steps 3 and 4. When you're done, delete both caches:

```bash
rm -f tsconfig.slow.tsbuildinfo tsconfig.fixed.tsbuildinfo
```
