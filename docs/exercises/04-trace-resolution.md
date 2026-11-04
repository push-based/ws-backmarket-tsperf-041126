# Exercise: Find Out Where an Import Resolves With `--traceResolution`

In this exercise we will use `tsc --traceResolution` to see which file `import { Calculator } from "test-lib-2"` loads, then remove the `paths` override that sends it to the wrong one. The import reads the same whether it lands on the package's built `.d.ts` or on its raw `.ts` source, and a normal `tsc` run doesn't tell you which. When it lands on the source, `tsc` type-checks the whole library as part of your program.

## Goal

At the end of this exercise the `--traceResolution` line for `test-lib-2` ends in `test-lib-2/dist/index.d.ts` instead of `test-lib-2/src/index.ts`, and `--extendedDiagnostics` reports `Types: 98` instead of `Types: 64963`.

## Prerequisites

Complete [Exercise 0: Setup](./0-setup.md) first: repo cloned, `npm install` done.
Start at the repository root: step 0 changes into `projects/test-lib-1/src/examples/04-trace-resolution`, and every command after that runs from there.

The example has two configs that compile the same [`consumer-example.ts`](../../projects/test-lib-1/src/examples/04-trace-resolution/consumer-example.ts). You edit [`tsconfig.slow.json`](../../projects/test-lib-1/src/examples/04-trace-resolution/tsconfig.slow.json); [`tsconfig.fixed.json`](../../projects/test-lib-1/src/examples/04-trace-resolution/tsconfig.fixed.json) is the reference for the bonus.

## 0. Build `test-lib-2`

> [!WARNING]
> Build `test-lib-2` once before you start. Its `dist/` folder is gitignored, so a fresh clone doesn't have it. Without `dist/index.d.ts`, both configs stop with `error TS2307: Cannot find module 'test-lib-2' or its corresponding type declarations.` as soon as the `paths` override is gone.

```bash
cd projects/test-lib-1/src/examples/04-trace-resolution

npx tsc -p ../../../../test-lib-2/tsconfig.json
ls ../../../../test-lib-2/dist
```

The build prints nothing, and `ls` lists `index.d.ts`, `index.d.ts.map`, `index.js` and `index.js.map`. `npm install` already linked `node_modules/test-lib-2` to `projects/test-lib-2`, so the package is now resolvable the normal way.

## 1. Measure the baseline

Before changing anything, get the numbers you're trying to beat:

```bash
npx tsc --noEmit -p tsconfig.slow.json --extendedDiagnostics
```

```
Files:                         160
Lines of Library:            50310
Lines of Definitions:        56016
Lines of TypeScript:           307
Lines of JavaScript:             0
Lines of JSON:                   0
Lines of Other:                  0
Identifiers:                109600
Symbols:                    200466
Types:                       64963
Instantiations:              77131
Memory used:               166151K
Assignability cache size:      273
Identity cache size:             8
Subtype cache size:             18
Strict subtype cache size:      12
I/O Read time:               0.02s
Parse time:                  0.16s
ResolveModule time:          0.01s
ResolveTypeReference time:   0.00s
ResolveLibrary time:         0.01s
Program time:                0.21s
Bind time:                   0.09s
Check time:                  0.14s
printTime time:              0.00s
Emit time:                   0.00s
Total time:                  0.44s
```

Look at `Lines of TypeScript: 307`. `consumer-example.ts` is 12 lines long, so 295 lines of `.ts` source came from somewhere else. The checker builds **64,963 types** and **77,131 instantiations** for a file that calls `calculator.add(2, 3)`.

## 2. Ask the resolver where `test-lib-2` went

`--traceResolution` logs every step the resolver takes for every import in the program, plus every `@types` package: 4,778 lines for this one small file. Print only the block for the import you care about:

```bash
npx tsc --noEmit -p tsconfig.slow.json --traceResolution \
  | sed -n "/Resolving module 'test-lib-2'/,/Module name 'test-lib-2' was/p"
```

```
======== Resolving module 'test-lib-2' from '<repo>/projects/test-lib-1/src/examples/04-trace-resolution/consumer-example.ts'. ========
Explicitly specified module resolution kind: 'Node10'.
'baseUrl' option is set to '<repo>/projects/test-lib-1/src/examples/04-trace-resolution', using this value to resolve non-relative module name 'test-lib-2'.
'paths' option is specified, looking for a pattern to match module name 'test-lib-2'.
Module name 'test-lib-2', matched pattern 'test-lib-2'.
Trying substitution '../../../../test-lib-2/src/index.ts', candidate module location: '../../../../test-lib-2/src/index.ts'.
File '<repo>/projects/test-lib-2/src/index.ts' exists - use it as a name resolution result.
======== Module name 'test-lib-2' was successfully resolved to '<repo>/projects/test-lib-2/src/index.ts'. ========
```

`<repo>` stands for the absolute path of your clone. Read the last line first: `test-lib-2` resolved to **`src/index.ts`**, the library's source. The lines above it say why. The `paths` pattern matched, the substituted file exists, and the resolver stopped there. It never opened `node_modules`, and it never read `test-lib-2/package.json`, whose `types` field points at `dist/index.d.ts`.

That source file is where the 295 extra lines come from. Besides `add`, `multiply`, `Calculator` and `describe`, it holds unexported internals: recursive helper types, a template-literal permission type and tuple-length arithmetic. `tsc` checks every file in the program, including code your import never touches.

## 3. Remove the `paths` override

Let's send the import back through the package's own `package.json`. Edit `tsconfig.slow.json` so nothing redirects `test-lib-2`.

> [!WARNING]
> Remove both `baseUrl` and `paths`. `paths` is the override; `baseUrl` only anchors it. If you delete `baseUrl` alone, `paths` resolves relative to the tsconfig file instead and the trace still ends in `test-lib-2/src/index.ts`.

<details>
  <summary>Skeleton: which lines to touch</summary>

```jsonc
// projects/test-lib-1/src/examples/04-trace-resolution/tsconfig.slow.json
{
  "compilerOptions": {
    /* target, module, moduleResolution, strict, ... unchanged */
    "incremental": false
    /* the two options that redirect "test-lib-2" go here today; remove them */
  },
  "files": ["./consumer-example.ts"]
}
```

</details>

With no override, `moduleResolution: "node"` walks up the `node_modules` folders, finds `test-lib-2/package.json` and follows its `types` field.

<details>
  <summary>tsconfig.slow.json without the paths override</summary>

```json
// projects/test-lib-1/src/examples/04-trace-resolution/tsconfig.slow.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "noEmit": true,
    "skipLibCheck": true,
    "incremental": false
  },
  "files": ["./consumer-example.ts"]
}
```

</details>

Run the same trace again:

```bash
npx tsc --noEmit -p tsconfig.slow.json --traceResolution \
  | sed -n "/Resolving module 'test-lib-2'/,/Module name 'test-lib-2' was/p"
```

```
======== Resolving module 'test-lib-2' from '<repo>/projects/test-lib-1/src/examples/04-trace-resolution/consumer-example.ts'. ========
Explicitly specified module resolution kind: 'Node10'.
Loading module 'test-lib-2' from 'node_modules' folder, target file types: TypeScript, Declaration.
Searching all ancestor node_modules directories for preferred extensions: TypeScript, Declaration.
Directory '<repo>/projects/test-lib-1/src/examples/04-trace-resolution/node_modules' does not exist, skipping all lookups in it.
Directory '<repo>/projects/test-lib-1/src/examples/node_modules' does not exist, skipping all lookups in it.
Directory '<repo>/projects/test-lib-1/src/node_modules' does not exist, skipping all lookups in it.
Directory '<repo>/projects/test-lib-1/node_modules' does not exist, skipping all lookups in it.
Directory '<repo>/projects/node_modules' does not exist, skipping all lookups in it.
Found 'package.json' at '<repo>/node_modules/test-lib-2/package.json'.
File '<repo>/node_modules/test-lib-2.ts' does not exist.
File '<repo>/node_modules/test-lib-2.tsx' does not exist.
File '<repo>/node_modules/test-lib-2.d.ts' does not exist.
'package.json' does not have a 'typesVersions' field.
'package.json' does not have a 'typings' field.
'package.json' has 'types' field 'dist/index.d.ts' that references '<repo>/node_modules/test-lib-2/dist/index.d.ts'.
File '<repo>/node_modules/test-lib-2/dist/index.d.ts' exists - use it as a name resolution result.
'package.json' does not have a 'peerDependencies' field.
Resolving real path for '<repo>/node_modules/test-lib-2/dist/index.d.ts', result '<repo>/projects/test-lib-2/dist/index.d.ts'.
======== Module name 'test-lib-2' was successfully resolved to '<repo>/projects/test-lib-2/dist/index.d.ts' with Package ID 'test-lib-2/dist/index.d.ts@1.0.0'. ========
```

Well done! The last line now ends in **`dist/index.d.ts`**, and the `with Package ID 'test-lib-2/dist/index.d.ts@1.0.0'` suffix tells you the resolver went through the package's `package.json`. The `paths` hit in step 2 had no such suffix.

## 4. Measure again

Re-run the exact command from step 1:

```bash
npx tsc --noEmit -p tsconfig.slow.json --extendedDiagnostics
```

```
Files:                         160
Lines of Library:            50310
Lines of Definitions:        56028
Lines of TypeScript:            12
Lines of JavaScript:             0
Lines of JSON:                   0
Lines of Other:                  0
Identifiers:                109077
Symbols:                     67300
Types:                          98
Instantiations:                  0
Memory used:               118471K
Assignability cache size:        0
Identity cache size:             0
Subtype cache size:              0
Strict subtype cache size:       0
I/O Read time:               0.02s
Parse time:                  0.17s
ResolveModule time:          0.01s
ResolveTypeReference time:   0.00s
ResolveLibrary time:         0.01s
Program time:                0.23s
Bind time:                   0.08s
Check time:                  0.01s
printTime time:              0.00s
Emit time:                   0.00s
Total time:                  0.32s
```

| Metric              | Before (`paths` → `src/index.ts`) | After (`package.json` → `dist/index.d.ts`) | Change |
|---------------------|----------------------------------:|-------------------------------------------:|:-------|
| Lines of TypeScript | 307                               | 12                                         | -96%   |
| Symbols             | 200,466                           | 67,300                                     | -66%   |
| Types               | 64,963                            | 98                                         | -99.8% |
| Instantiations      | 77,131                            | 0                                          | -100%  |
| Memory used         | 166,151K                          | 118,356K                                   | -29%   |
| Check time          | 0.14s                             | 0.01s                                      | -93%   |
| Total time          | 0.44s                             | 0.32s                                      | -27%   |

The output block above is one of the five runs; the table shows the median of five runs for times and memory, so the two can differ slightly. `Files` stays at 160 because the program swaps one file for another: `src/index.ts` out, `dist/index.d.ts` in. `Lines of Definitions` grows by the 12 lines of that `.d.ts`, which declares the four exports and none of the internals. `Instantiations` drops to 0 because the generic helper types no longer exist anywhere in the program.

> [!TIP]
> When `Lines of TypeScript` is larger than the files you wrote, run `--traceResolution` on the imports you suspect and look for a `Trying substitution` line. That line means a `paths` entry picked the file before `tsc` looked at the package's `package.json`.

## 5. BONUS: Compare against the fixed reference config

> [!NOTE]
> This is a bonus exercise, you don't need to complete it.

[`tsconfig.fixed.json`](../../projects/test-lib-1/src/examples/04-trace-resolution/tsconfig.fixed.json) is the reference solution. Confirm your edit landed on the same config and the same numbers:

```bash
diff tsconfig.slow.json tsconfig.fixed.json                       # prints nothing
npx tsc --noEmit -p tsconfig.slow.json --extendedDiagnostics      # your edit
npx tsc --noEmit -p tsconfig.fixed.json --extendedDiagnostics     # reference solution
```

`diff` prints nothing, and both runs report `Types: 98` and `Instantiations: 0`.
