# TypeScript Performance Tools

## Essential Commands

### tsc --diagnostics

**Purpose:** Quick overview of compilation time and file count

**Usage:**
```bash
tsc --diagnostics
```

**Sample Output:**
```txt
Files:             165
Lines:           68264
Identifiers:     74310
Symbols:         44550
Types:           38420
Instantiations: 182000
Memory used:   155648K
I/O read:        0.01s
Parse time:      0.30s
Bind time:       0.19s
Check time:      1.84s
Emit time:       0.21s
I/O write:       0.04s
Total time:      2.71s
```

**Metric Reference:**

*Program shape - size of what got compiled*

| Metric | Meaning |
| --- | --- |
| `Files` | Total files in the program, including `.d.ts` and lib files pulled in transitively - not just your own source files |
| `Lines` | Total lines across every file in the program (source + declarations + lib) |
| `Identifiers` | Total identifier tokens scanned across the program during parsing |
| `Symbols` | Semantic entities the binder created (variables, functions, classes, type aliases, …) - roughly the program's "vocabulary" size |
| `Types` | `Type` objects the checker has constructed - grows with generics, unions, and mapped/conditional types |
| `Instantiations` | Number of generic type instantiations performed - the classic runaway-complexity signal for slow checks |
| `Memory used` | Heap memory used by the `tsc` process at the point diagnostics are printed |

*Phase timings - where the wall-clock time went*

| Metric | Meaning |
| --- | --- |
| `I/O read` | Time spent reading source/declaration files from disk |
| `Parse time` | Time tokenizing and parsing source into ASTs |
| `Bind time` | Time running the binder - building the symbol table and scope tree from the parsed AST |
| `Check time` | Time running the type checker - semantic analysis, inference, and assignability checks. **Usually the dominant cost and the first place to optimize** |
| `Emit time` | Time transforming and printing output (source maps, comments, `.js`/`.d.ts` output) |
| `I/O write` | Time writing emitted output files to disk |
| `Total time` | End-to-end wall time for the whole compile - `Parse time` + `Bind time` + `Check time` + `Emit time` + `I/O write` (plus module/file resolution, not broken out separately here - see `--extendedDiagnostics` below) |

**Key Metrics to Watch:**
- **Check time** ← Most important
- Number of files
- Instantiations
- Types

**What to Look For:**
- High check time = type checker doing lots of work
- Unexpected file count = include/exclude settings probably wrong (node_modules, generated files, build output, nested monorepo configs)

### tsc --extendedDiagnostics

**Purpose:** Detailed overview of compilation time and file count

**Usage:**
```bash
tsc --extendedDiagnostics
```

**Sample Output:**
```txt
Files:                        165
Lines of Library:            9894
Lines of Definitions:       58345
Lines of TypeScript:           25
Lines of JavaScript:            0
Lines of JSON:                  0
Lines of Other:                 0
Identifiers:                74310
Symbols:                    44550
Types:                      38420
Instantiations:            182000
Memory used:              155648K
Assignability cache size:   12480
Identity cache size:         4820
Subtype cache size:          6215
Strict subtype cache size:   1380
I/O Read time:              0.01s
Parse time:                 0.30s
ResolveModule time:         0.08s
ResolveTypeReference time:  0.00s
ResolveLibrary time:        0.04s
Program time:               0.43s
Bind time:                  0.19s
Check time:                 1.84s
transformTime time:         0.10s
printTime time:             0.08s
commentTime time:           0.01s
Source Map time:            0.02s
I/O Write time:             0.04s
Emit time:                  0.25s
Total time:                 2.71s
```

**Metric Reference:** extends the basic `tsc --diagnostics` metrics above with a per-file-type breakdown of `Lines`, checker cache sizes, and finer-grained phase timings. `Files`, `Identifiers`, `Symbols`, `Types`, `Instantiations`, `Memory used`, `Bind time`, and `Check time` mean exactly what they mean above.

*Program shape - the `Lines` breakdown*

| Metric | Meaning |
| --- | --- |
| `Lines of Library` | Lines contributed by the built-in `lib.*.d.ts` files (`lib.dom.d.ts`, `lib.es2020.d.ts`, etc.) |
| `Lines of Definitions` | Lines from non-lib `.d.ts` declaration files - mostly `node_modules/@types` and shipped package types |
| `Lines of TypeScript` | Lines in your own `.ts`/`.tsx` source |
| `Lines of JavaScript` | Lines in `.js`/`.jsx` files (only non-zero with `allowJs`) |
| `Lines of JSON` | Lines in `.json` files (only non-zero with `resolveJsonModule`) |
| `Lines of Other` | Lines in any other included file type not covered above |

*Checker caches - how much structural comparison work got memoized (new in extended mode)*

| Metric | Meaning |
| --- | --- |
| `Assignability cache size` | Cached results of "is type A assignable to type B" checks |
| `Identity cache size` | Cached results of exact type-identity comparisons |
| `Subtype cache size` | Cached results of subtype relationship checks |
| `Strict subtype cache size` | Cached results of variance-sensitive strict subtype checks |

*Phase timings - the finer-grained breakdown of `Program time`/`Emit time`*

| Metric | Meaning |
| --- | --- |
| `I/O Read time` | Same as `I/O read` above |
| `ResolveModule time` | Time resolving `import`/`require` specifiers to actual files on disk |
| `ResolveTypeReference time` | Time resolving `/// <reference types="..." />` directives and ambient `@types` packages |
| `ResolveLibrary time` | Time resolving library/project references |
| `Program time` | Total time to assemble the `Program` - `I/O Read time` + `Parse time` + the three `Resolve*` steps above combined |
| `transformTime time` | Time running AST transforms before emit (e.g. downleveling syntax, decorators) |
| `printTime time` | Time in the printer converting the transformed AST back into source text |
| `commentTime time` | Time processing/re-emitting comments into output files |
| `Source Map time` | Time generating `.map` source map output |
| `I/O Write time` | Same as `I/O write` above |
| `Emit time` | Total emit cost - `transformTime` + `printTime` + `commentTime` + `Source Map time` + `I/O Write time` combined |
| `Total time` | End-to-end wall time for the whole compile - `Program time` + `Bind time` + `Check time` + `Emit time` |

**Key Metrics to Watch:**
- **Check time** ← Most important
- Number of files
- Instantiations
- Types

**What to Look For:**
- High check time = type checker doing lots of work
- Unexpected file count = include/exclude settings probably wrong (node_modules, generated files, build output, nested monorepo configs)

---

### tsc --generateTrace

**Purpose:** Detailed trace of compiler phases for in-depth analysis

**Usage:**
```bash
tsc --generateTrace ts-diagnostics
```

**Output:**
```txt
ts-diagnostics/
  ├── trace.json
  └── types.json
```

**Expected Sections:**
- CreateProgram (usually fast, ignore unless enormous)
- Bind (usually fast, ignore unless enormous)
- Check (nearly all optimization effort goes here)
  - CheckSourceFile (main hotspot location)

---

#### typescript-analyze-trace

**Purpose:** Automatically identify hotspots from trace data

**Installation:** the npm package is scoped - `typescript-analyze-trace` (unscoped) does not exist:
```bash
npm install --save-dev @typescript/analyze-trace
```

**Usage:**
```bash
npx analyze-trace ts-diagnostics
```

**Output Example:** a `Hot Spots` tree (`Check file <path> (Xms)` for whole-file checks, `Compare types A and B (Xms)` for individual comparisons - nested under their parent when they qualify as a hotspot), followed by a duplicate-packages report:
```
Hot Spots
├─ Check file /path/to/node_modules/@babel/types/lib/index.d.ts (436ms)
├─ Check file /path/to/node_modules/typescript/lib/lib.dom.d.ts (265ms)
└─ Check file /path/to/node_modules/@types/babel__traverse/index.d.ts (248ms)
   ├─ Compare types 126691 and 61894 (83ms)
   └─ Compare types 126687 and 61894 (54ms)
      └─ Compare types 127049 and 61894 (40ms)

No duplicate packages found
```

With `--expandTypes` (the default), each `Compare types A and B` line is followed by the full type trees for A and B. With `--json`, the same data comes back as `{ results: [{ project, highlights: { hotSpots, duplicatePackages } }] }`.

**Why Use It:** Saves hours of manual Chrome DevTools trace browsing

**Commands:** the package installs 3 binaries (`analyze-trace`, `print-trace-types`, `simplify-trace-types`).

##### `analyze-trace <traceDir>` - the main command

```bash
npx analyze-trace <traceDir> [options]
```

`traceDir` is the directory passed to `tsc --generateTrace` - it auto-discovers `trace*.json` (and matching `types*.json`), or reads `legend.json` if present (multi-project/project-references traces). Runs one worker per trace in parallel (capped at `cpus - 1`).

| Option | Alias | Type | Default | Meaning |
| --- | --- | --- | --- | --- |
| `--forceMillis` | `--forcemillis`, `--force-millis` | number | `500` | events ≥ this duration (ms) are always reported |
| `--skipMillis` | `--skipmillis`, `--skip-millis` | number | `100` | events < this duration (ms) are always suppressed |
| `--expandTypes` | `--expandtypes`, `--expand-types` | boolean | `true` | expand/print full type trees under each hotspot |
| `--json` | - | boolean | `false` | machine-readable JSON output (EXPERIMENTAL) |
| `-h`, `--help` | - | - | - | show help |

Errors if `--forceMillis` < `--skipMillis`. Exit codes: `0` = highlights found, `1` = none found, `2` = internal error - but in practice **exit 1 is overloaded**: an invalid `traceDir` (not a directory) or a `--forceMillis` < `--skipMillis` violation both fail arg-parsing and also exit `1`, indistinguishable from "ran fine, no hotspots." Exit `2` is reserved for a runtime exception during actual trace analysis (e.g. a malformed/corrupt `trace.json`), confirmed by feeding it invalid JSON.

##### `print-trace-types <types.json> <id> [id...]`

No flags - plain positional args. Pretty-prints the full type tree for one or more numeric type IDs from a `types*.json` dump, once `analyze-trace` has pointed you at a specific type ID worth inspecting.

##### `simplify-trace-types <input> <output>`

```bash
npx simplify-trace-types <input.json[.gz|.br]> <output.json[.gz|.br]> [-m]
```

Preprocesses/shrinks a raw `types*.json` dump (streams, gzip/brotli-aware).

| Option | Alias | Type | Meaning |
| --- | --- | --- | --- |
| `-m` | `--multiline` | boolean | parse as one JSON document instead of newline-delimited JSON-per-line |

**What counts as a "hotspot":** not one fixed duration - a trace span is
flagged if it's **≥500ms**, *or* if it takes up **≥60% of its parent span's
duration** (so a 10ms span can still be flagged if its parent only took
15ms). Spans under **100ms** are dropped before analysis even runs. The
500ms/100ms defaults are CLI-tunable (`--forceMillis`, `--skipMillis`); the
60% rule is not exposed as a flag. Separately, a `.d.ts` file that emits
**≥10** inline import-type expressions is flagged on its own as bloated
declaration emit.

Source, [microsoft/typescript-analyze-trace](https://github.com/microsoft/typescript-analyze-trace):
- [`src/analyze-trace-options.ts#L5-L18`](https://github.com/microsoft/typescript-analyze-trace/blob/main/src/analyze-trace-options.ts#L5-L18) - `forceMillis` (500) / `skipMillis` (100) defaults
- [`src/analyze-trace-utilities.ts#L13-L40`](https://github.com/microsoft/typescript-analyze-trace/blob/main/src/analyze-trace-utilities.ts#L13-L40) - `buildHotPathsTree`, the actual hotspot test (`duration >= thresholdDuration || duration >= minPercentage * parentDuration`)
- [`src/analyze-trace-dir.ts#L18-L19`](https://github.com/microsoft/typescript-analyze-trace/blob/main/src/analyze-trace-dir.ts#L18-L19) - hardcoded `minPercentage = 0.6` and `importExpressionThreshold = 10`

---

### tsc --generateCpuProfile

**Purpose:** CPU hotspot profiling for compiler implementation costs

**Usage:**
```bash
tsc --generateCpuProfile profile.cpuprofile
```

**Analysis:**
- Open Chrome DevTools
- DevTools → Performance → Load profile
- Inspect CPU usage patterns

**When to Use:** Investigating compiler implementation costs rather than just expensive types

---

### tsc --listFiles

**Usage:**
```bash
tsc --listFiles
```

**Purpose:** List all compiled files (useful for debugging include/exclude issues)

---

## Supporting Tools

### Chrome DevTools Trace Viewer

Used for manually inspecting `trace.json` files:
1. Open `chrome://tracing`
2. Load `trace/trace.json`
3. Inspect flame graphs

*Less recommended than `typescript-analyze-trace`*

## Usage Table


| Tool                                                  | View                                          | File Discovery | Module Resolution | Parsing | Binding | Type Checking | Transforming | Emitting |
| ----------------------------------------------------- | ---------------------------------------------- | :------------: | :----------------: | :-----: | :-----: | :------------: | :----------: | :------: |
| `tsc --listFiles`                                      | Console                                        |       ✅        |         -          |    -    |    -    |       -        |      -       |    -     |
| `tsc --diagnostics`                                    | Console                                        |       ✅        |         -          |    ✅    |    ✅    |       ✅        |      -       |    ✅     |
| `tsc --extendedDiagnostics`                            | Console                                        |       ✅        |         ✅          |    ✅    |    ✅    |       ✅        |      ✅       |    ✅     |
| `tsc --generateTrace` + `typescript-analyze-trace`     | Console (analyze-trace) / Browser DevTools (`chrome://tracing`, `trace.json`) |       ✅        |         ✅          |    ✅    |    ✅    |       ✅        |      -       |    -     |
| `tsc --generateCpuProfile`                             | Browser DevTools (Performance panel, `.cpuprofile`) |       ✅        |         ✅          |    ✅    |    ✅    |       ✅        |      ✅       |    ✅     |

