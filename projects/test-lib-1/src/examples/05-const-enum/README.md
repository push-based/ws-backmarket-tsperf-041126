# Const Enums (`const enum`)

## Problem

A regular `enum` is not just a type: `tsc` emits it as a runtime object, built by an IIFE that maps every name to its value and every value back to its name. Every use site then reads a property off that object at runtime, and because the IIFE mutates a variable, bundlers can't tree-shake it.

```typescript
export enum LogLevel { Debug, Info, Warn, Error }
```

```javascript
// emitted
export var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["Debug"] = 0] = "Debug";
    LogLevel[LogLevel["Info"] = 1] = "Info";
    LogLevel[LogLevel["Warn"] = 2] = "Warn";
    LogLevel[LogLevel["Error"] = 3] = "Error";
})(LogLevel || (LogLevel = {}));
// ...
export const isNoisy = shouldLog(LogLevel.Debug, LogLevel.Warn);
```

See [`enum.ts`](./enum.ts) for the full repro.

## Solution

```typescript
export const enum LogLevel { Debug, Info, Warn, Error }
```

`const` tells `tsc` the enum exists only at compile time: it emits no object, and replaces every member access with its literal value.

```javascript
// emitted - no LogLevel object anywhere in the file
export const isNoisy = shouldLog(0 /* LogLevel.Debug */, 2 /* LogLevel.Warn */);
```

See [`const-enum.ts`](./const-enum.ts) for the full repro. It is the same source with one keyword added.

## Why It Works

- A `const enum` member is a compile-time constant, so `tsc` can substitute the value at each use site instead of keeping a lookup object around
- With nothing left to reference, the enum declaration itself is dropped from the output
- The type-level behaviour is identical: `LogLevel` is still a nominal type, and exhaustive `switch` checks still work

## Trade-off

The inlining is done by `tsc`'s own emitter, and only when it can see the enum's value while compiling the file that uses it. Any setup that compiles one file at a time can't do that, so a `const enum` stops being erased or stops being allowed:

- **`isolatedModules: true`** (the default recommendation for esbuild, swc, Babel, Vite and most bundler setups): `tsc` emits the full enum object for `const enum` too and no longer inlines its uses. You get exactly the regular-enum output.
- **`erasableSyntaxOnly: true`** (TS 5.8+, for Node's built-in type stripping): both `enum` and `const enum` are errors (`TS1294`), because neither is plain type syntax that can be deleted.
- **Libraries:** a `const enum` exported from a `.d.ts` forces every consumer to inline values from your current version. Consumers using `isolatedModules` can't reference it at all (`TS2748`).

If any of those apply, use a plain object `as const` instead. It is a real runtime object, but a normal one: tree-shakeable, safe with every transpiler and with `erasableSyntaxOnly`:

```typescript
export const LogLevel = { Debug: 0, Info: 1, Warn: 2, Error: 3 } as const;
export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];
```

See [`as-const.ts`](./as-const.ts) for the same repro written this way. Use sites (`LogLevel.Debug`, `switch` cases, `LogLevel` as a parameter type) stay unchanged.

## Common Pitfalls

- Expecting `const enum` to be erased in a Vite/esbuild/swc project. Those tools transpile per file, so they emit it like a regular enum; check the actual output, not the source
- Turning on `isolatedModules` in an existing project and assuming the emitted output is unchanged - every `const enum` silently grows back into a runtime object
- Iterating over an enum (`Object.values(LogLevel)`) or using reverse lookup (`LogLevel[0]`) - neither works on a `const enum`, because there is no object to iterate

## Impact Measurement

This example changes the emitted JavaScript, not type-check cost. Each variant has its own config, and all three are identical apart from the file they compile. They emit to `dist/`, so compile them and compare the output files:

```bash
cd projects/test-lib-1/src/examples/05-const-enum

npx tsc -p tsconfig.enum.json         # regular enum
npx tsc -p tsconfig.const-enum.json   # const enum
npx tsc -p tsconfig.as-const.json     # plain object as const

cat dist/enum/enum.js
cat dist/const-enum/const-enum.js
cat dist/as-const/as-const.js
```

| Emitted output                     | `enum`                   | `const enum`             | `as const` object        |
|-------------------------------------|--------------------------|--------------------------|--------------------------|
| `LogLevel` value                    | IIFE, 7 lines            | none                     | plain object, 6 lines    |
| Reverse mapping (`LogLevel[0]`)     | yes                      | no                       | no                       |
| Use sites (`case`, call arguments)  | `LogLevel.Debug` lookup  | inlined literal `0`      | `LogLevel.Debug` lookup  |
| Tree-shakeable                      | no                       | nothing to shake         | yes                      |

Now see the trade-off for yourself: compile the `const enum` version with `isolatedModules` on, and the enum object comes back.

```bash
npx tsc -p tsconfig.const-enum.json --isolatedModules --outDir dist/isolated
cat dist/isolated/const-enum.js   # same IIFE and LogLevel.X lookups as dist/enum/enum.js
```

Type-check cost doesn't move: `--extendedDiagnostics` reports the same 108 types, 0 instantiations and 0.01s check time for `enum` and `const enum`, and 114 types / 0.01s for `as const`. The gain is runtime and bundle size, and for `const enum` it only exists when `tsc` does the emitting with `isolatedModules` off.

### Scaled up: 2,000 members

The repro above is too small for any `--extendedDiagnostics` line to move. [`generate-files.sh`](./generate-files.sh) writes a scaled copy to `generated/` (gitignored): one enum with 2,000 members, each used once, as `generated/enum.ts`, `generated/const-enum.ts` and `generated/as-const.ts`. Pass a different count as the first argument to change the size.

Emit time only shows up when `tsc` actually emits, so leave out `--noEmit` here:

```bash
cd projects/test-lib-1/src/examples/05-const-enum

./generate-files.sh

npx tsc generated/enum.ts       --strict --skipLibCheck --target ES2022 --module ESNext --outDir dist/scaled --extendedDiagnostics
npx tsc generated/const-enum.ts --strict --skipLibCheck --target ES2022 --module ESNext --outDir dist/scaled --extendedDiagnostics
npx tsc generated/as-const.ts   --strict --skipLibCheck --target ES2022 --module ESNext --outDir dist/scaled --extendedDiagnostics

wc -lc dist/scaled/*.js
```

| Metric (average of 5 runs)  | `enum`              | `const enum`        | `as const` object   |
|-----------------------------|---------------------:|---------------------:|---------------------:|
| Emit time                   | 0.058s               | 0.020s               | 0.030s               |
| Check time                  | 0.120s               | 0.118s               | 0.070s               |
| Total time                  | 0.458s               | 0.416s               | 0.388s               |
| Emitted JS                  | 112 KB, 4,005 lines  | 52 KB, 2,002 lines   | 63 KB, 4,004 lines   |
| Types                       | 6,101                | 6,101                | 8,103                |
| Symbols                     | 61,000               | 61,000               | 63,001               |

Measured with TypeScript 5.9.3, five runs per variant with the three run in rotation. Run-to-run spread was 0.01–0.03s, the same order as the differences between `enum` and `const enum`.

- **`enum` vs `const enum`:** every counter except the timings is identical. The type checker does exactly the same work, and only the emitter skips the 2,000-line enum object and writes literals instead of `Code.C0` lookups.
- **`as const` object:** about 2,000 more types and symbols (one literal type per property), yet the lowest check and total time of the three. It emits more than `const enum`, since the object stays in the output, but much less than `enum`, because there is no reverse mapping.

Even at 2,000 members every difference is a few hundredths of a second. Choose between the three for output size and for compatibility with your build tooling (see Trade-off), not for compile time.
