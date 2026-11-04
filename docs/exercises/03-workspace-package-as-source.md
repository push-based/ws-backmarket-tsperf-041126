# Exercise: Consume a Workspace Package Through Its `.d.ts` Output

In this exercise we will point a `paths` alias at a sibling package's built declaration files instead of its `.ts` source. While the alias targets `src/index.ts`, every consumer build type-checks the whole library implementation: function bodies, recursive `DeepMerge`/`DeepRequired`/`Paths` types, a 40-entry plugin catalog. A `.d.ts` file carries only signatures, so the consumer reads them and moves on.

## Goal

At the end of this exercise the consumer resolves `@workspace/config` to `package-lib/dist/index.d.ts`, and `tsc --extendedDiagnostics` on `tsconfig.slow.json` reports `Instantiations` dropping from 106,888 to 0 and `Check time` from 0.16s to 0.01s, with `consumer-example.ts` unchanged.

## Prerequisites

Complete [Exercise 0: Setup](./0-setup.md) first: repo cloned, `npm install` done.
Start at the repository root: step 1 changes into `projects/test-lib-1/src/examples/03-workspace-package-as-source`, and every command after that runs from there.

The folder holds two projects:

- [`package-lib/`](../../projects/test-lib-1/src/examples/03-workspace-package-as-source/package-lib/package.json): the library, published as `@workspace/config`. Its [`src/catalog.ts`](../../projects/test-lib-1/src/examples/03-workspace-package-as-source/package-lib/src/catalog.ts) is checked in, written by [`generate-plugin-catalog.mjs`](../../projects/test-lib-1/src/examples/03-workspace-package-as-source/generate-plugin-catalog.mjs) with 40 plugin kinds. You don't need to run the generator.
- [`consumer-example.ts`](../../projects/test-lib-1/src/examples/03-workspace-package-as-source/consumer-example.ts): one import from `@workspace/config` and one call to `normalizeConfig`. [`tsconfig.slow.json`](../../projects/test-lib-1/src/examples/03-workspace-package-as-source/tsconfig.slow.json) decides where that import resolves.

> [!TIP]
> The metrics that carry this example are **Types**, **Instantiations** and **Check time**. **Files** stays at 169 before and after: the consumer still loads ten library files, now as `.d.ts` instead of `.ts`.

## 1. Measure the baseline

Before changing anything, get the number you're trying to beat:

```bash
cd projects/test-lib-1/src/examples/03-workspace-package-as-source

npx tsc --noEmit -p tsconfig.slow.json --extendedDiagnostics
```

```
Files:                         169
Lines of Library:            50310
Lines of Definitions:        56016
Lines of TypeScript:          1385
Lines of JavaScript:             0
Lines of JSON:                   0
Lines of Other:                  0
Identifiers:                111662
Symbols:                     76964
Types:                       15813
Instantiations:             106888
Memory used:               144650K
Assignability cache size:      680
Identity cache size:             7
Subtype cache size:             25
Strict subtype cache size:       1
I/O Read time:               0.02s
Parse time:                  0.18s
ResolveModule time:          0.01s
ResolveTypeReference time:   0.00s
ResolveLibrary time:         0.01s
Program time:                0.24s
Bind time:                   0.09s
Check time:                  0.16s
printTime time:              0.00s
Emit time:                   0.00s
Total time:                  0.49s
```

`consumer-example.ts` is one import and one function call, yet the program holds **1,385 lines of TypeScript** and the checker does **106,888 instantiations**. All of that comes from `package-lib/src`, which the alias pulls in as source. The config already sets `skipLibCheck: true`, which skips `.d.ts` files only, and nothing from the library is one yet.

> [!WARNING]
> `package-lib/dist` is gitignored, so a fresh clone has no declaration files to point at. Until you build it in step 2, any config that targets `dist`, including `tsconfig.fixed.json`, fails with `TS2307: Cannot find module '@workspace/config' or its corresponding type declarations.` Build first, then switch the alias.

## 2. Build the library's declarations

The consumer can only read `.d.ts` files that exist. [`package-lib/tsconfig.json`](../../projects/test-lib-1/src/examples/03-workspace-package-as-source/package-lib/tsconfig.json) already has `declaration: true` and `outDir: ./dist`, so build it once:

```bash
npx tsc -p package-lib/tsconfig.json
```

No output and exit code `0`. Check that the entry point the alias will target is there:

```bash
ls package-lib/dist/index.d.ts
```

Next to it you'll find a `.d.ts`, a `.js` and a `.d.ts.map` for each of the ten source files. Open `package-lib/dist/normalize.d.ts`: the whole `normalizeConfig` implementation is reduced to one `export declare function` line.

## 3. Point the alias at the declarations

`consumer-example.ts` stays as it is. Only the alias target in `tsconfig.slow.json` changes.

<details>
  <summary>Skeleton: where the alias points</summary>

```jsonc
// tsconfig.slow.json
"paths": {
  "@workspace/config": [/* the built entry point instead of src/index.ts */]
}
```

</details>

Replace `./package-lib/src/index.ts` with the declaration file you just built. It sits at the same place in `dist`, with `.d.ts` in place of `.ts`.

<details>
  <summary>paths alias pointing at dist/index.d.ts</summary>

```jsonc
// tsconfig.slow.json
"paths": {
  "@workspace/config": ["./package-lib/dist/index.d.ts"]
}
```

This matches [`tsconfig.fixed.json`](../../projects/test-lib-1/src/examples/03-workspace-package-as-source/tsconfig.fixed.json).

</details>

Confirm where the import resolves now with `--traceResolution`:

```bash
npx tsc --noEmit -p tsconfig.slow.json --traceResolution | grep "'@workspace/config' was successfully"
```

```
======== Module name '@workspace/config' was successfully resolved to '.../03-workspace-package-as-source/package-lib/dist/index.d.ts'. ========
```

Before your edit, the same line ended in `package-lib/src/index.ts`.

> [!WARNING]
> From here on, the consumer sees whatever was last built into `dist`. After you change anything in `package-lib/src`, run `npx tsc -p package-lib/tsconfig.json` again before checking the consumer. In a real monorepo, `composite: true` with project references and `tsc -b` handles this rebuild for you.

## 4. Measure again

Re-run the exact command from step 1:

```bash
npx tsc --noEmit -p tsconfig.slow.json --extendedDiagnostics
```

```
Files:                         169
Lines of Library:            50310
Lines of Definitions:        57552
Lines of TypeScript:            16
Lines of JavaScript:             0
Lines of JSON:                   0
Lines of Other:                  0
Identifiers:                110472
Symbols:                     68839
Types:                          99
Instantiations:                  0
Memory used:               114757K
Assignability cache size:        0
Identity cache size:             0
Subtype cache size:              0
Strict subtype cache size:       0
I/O Read time:               0.03s
Parse time:                  0.18s
ResolveModule time:          0.01s
ResolveTypeReference time:   0.00s
ResolveLibrary time:         0.01s
Program time:                0.25s
Bind time:                   0.09s
Check time:                  0.01s
printTime time:              0.00s
Emit time:                   0.00s
Total time:                  0.35s
```

| Metric                   | Before (`src/index.ts`) | After (`dist/index.d.ts`) | Change |
|---------------------------|------------------------:|--------------------------:|:-------|
| Lines of TypeScript       | 1,385                   | 16                        | -99%   |
| Types                     | 15,813                  | 99                        | -99%   |
| Instantiations            | 106,888                 | 0                         | -100%  |
| Assignability cache size  | 680                     | 0                         | -100%  |
| Memory used               | 144,650K                | 114,790K                  | -21%   |
| Check time                | 0.16s                   | 0.01s                     | -94%   |
| Total time                | 0.49s                   | 0.35s                     | -29%   |

Times and memory are the median of five runs. The output blocks above are single runs, so their times and memory can differ slightly from these medians. The counts were identical in all five runs; `Memory used` was not, and ranged from 131,038K to 144,871K for the baseline.

`Instantiations` drops to 0 because the declaration files carry only signatures: the checker instantiates `DeepMerge`, `DeepRequired` and `Paths` when you build the library, and the consumer reads the results. `Lines of Definitions` goes up by 1,536 at the same time: `tsc` now counts the library's declaration output as definitions instead of TypeScript. `Total time` shrinks less than `Check time` because parsing and binding the 169 files costs about the same either way.

> [!NOTE]
> `paths` only changes how `tsc` resolves types. If a bundler or test runner reuses the same aliases (`vite-tsconfig-paths`, `tsconfig-paths`, Jest's `moduleNameMapper`), it would load `dist/index.d.ts` at runtime, a file with no code in it. In those setups, remove the `paths` override and let the workspace symlink plus the `exports` map in [`package-lib/package.json`](../../projects/test-lib-1/src/examples/03-workspace-package-as-source/package-lib/package.json) do the resolving: TypeScript picks the `types` entry, the runtime picks `import`.

## 5. BONUS: Compare against the fixed reference config

> [!NOTE]
> This is a bonus exercise, you don't need to complete it.

[`tsconfig.fixed.json`](../../projects/test-lib-1/src/examples/03-workspace-package-as-source/tsconfig.fixed.json) is the reference solution: the same config with the alias already pointing at `dist`. It needs the build from step 2. Run it next to your edited config:

```bash
npx tsc --noEmit -p tsconfig.slow.json --extendedDiagnostics   # your edit
npx tsc --noEmit -p tsconfig.fixed.json --extendedDiagnostics  # reference solution
```

Both should print `Types: 99` and `Instantiations: 0`.
