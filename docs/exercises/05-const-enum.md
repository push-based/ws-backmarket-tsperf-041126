# Exercise: Compile an Enum Away With `const enum`

In this exercise we will turn a regular `enum` into a `const enum` and read what `tsc` emits for each. A regular `enum` is more than a type: `tsc` emits it as a runtime object built by an IIFE, and every use site reads a property off that object. A `const enum` asks `tsc` to write the literal values into the use sites and drop the object, but only when `tsc` can see the whole program while emitting.

## Goal

At the end of this exercise `dist/enum/enum.js` contains no `LogLevel` object and every use site is a literal like `0 /* LogLevel.Debug */`. The file goes from 31 lines and 1,047 bytes to 24 lines and 834 bytes, while `--extendedDiagnostics` reports `Types: 108` for both versions.

## Prerequisites

Complete [Exercise 0: Setup](./0-setup.md) first: repo cloned, `npm install` done.
Start at the repository root: step 1 changes into `projects/test-lib-1/src/examples/05-const-enum`, and every command after that runs from there.

You edit [`enum.ts`](../../projects/test-lib-1/src/examples/05-const-enum/enum.ts) and compile it with [`tsconfig.enum.json`](../../projects/test-lib-1/src/examples/05-const-enum/tsconfig.enum.json), which emits to `dist/enum/`. [`const-enum.ts`](../../projects/test-lib-1/src/examples/05-const-enum/const-enum.ts) and [`as-const.ts`](../../projects/test-lib-1/src/examples/05-const-enum/as-const.ts) are the reference solutions for the bonus.

> [!TIP]
> This exercise changes the emitted JavaScript and leaves type-check cost alone. The checkpoints are the `.js` files in `dist/` and their size. Read `Types` and `Instantiations` to confirm the checker's work stays the same.

To read the emitted JavaScript in the browser, open [`enum.ts` in the TS Playground][playground-enum] and pick the **.JS** tab on the right. It runs TypeScript 5.9.3, the version the repo pins, and prints the same output `tsc` writes to `dist/`.

## 1. Emit the baseline

Compile the regular enum into its own folder, so you can diff against it later:

```bash
cd projects/test-lib-1/src/examples/05-const-enum

npx tsc -p tsconfig.enum.json --outDir dist/before --extendedDiagnostics \
  | grep -E "^(Types|Instantiations|Check time|Emit time|Total time):"
```

```
Types:                         108
Instantiations:                  0
Check time:                  0.01s
Emit time:                   0.01s
Total time:                  0.28s
```

Now read what it wrote:

```bash
cat dist/before/enum.js
wc -lc dist/before/enum.js
```

Below the header comment you'll find:

```js
// dist/before/enum.js
export var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["Debug"] = 0] = "Debug";
    LogLevel[LogLevel["Info"] = 1] = "Info";
    LogLevel[LogLevel["Warn"] = 2] = "Warn";
    LogLevel[LogLevel["Error"] = 3] = "Error";
})(LogLevel || (LogLevel = {}));
export function shouldLog(level, min) {
    return level >= min;
}
export function label(level) {
    switch (level) {
        case LogLevel.Debug:
            return "debug";
        case LogLevel.Info:
            return "info";
        case LogLevel.Warn:
            return "warn";
        case LogLevel.Error:
            return "error";
    }
}
export const isNoisy = shouldLog(LogLevel.Debug, LogLevel.Warn);
```

```
      31    1047 dist/before/enum.js
```

That's the IIFE building a two-way lookup (`LogLevel.Debug === 0` and `LogLevel[0] === "Debug"`), and six property reads off it at runtime, one per use site: **31 lines, 1,047 bytes**.

## 2. Turn it into a `const enum`

None of our code iterates over `LogLevel` or looks a name up by its number, so the object exists only to hold four numbers. Make `LogLevel` in `enum.ts` a `const enum`.

> [!WARNING]
> Check the emitted output of your real build before you rely on `const enum`. The inlining only happens when `tsc` itself emits with `isolatedModules` off. Under `isolatedModules`, and in esbuild, swc and Vite, which compile one file at a time, the full enum object comes back. With `erasableSyntaxOnly` on, `tsc` rejects `enum` and `const enum` alike. Step 3 shows both.

<details>
  <summary>const enum LogLevel solution</summary>

```ts
// projects/test-lib-1/src/examples/05-const-enum/enum.ts
/* header comment */

export const enum LogLevel {
  Debug,
  Info,
  Warn,
  Error,
}

/* shouldLog, label and isNoisy unchanged */
```

One keyword, nothing else. Below the header comment it matches [`const-enum.ts`](../../projects/test-lib-1/src/examples/05-const-enum/const-enum.ts) ([TS Playground][playground-const-enum]).

</details>

Emit again, this time into the config's own `dist/enum/`:

```bash
npx tsc -p tsconfig.enum.json --extendedDiagnostics \
  | grep -E "^(Types|Instantiations|Check time|Emit time|Total time):"
cat dist/enum/enum.js
wc -lc dist/enum/enum.js
```

```
Types:                         108
Instantiations:                  0
Check time:                  0.01s
Emit time:                   0.01s
Total time:                  0.28s
```

```js
// dist/enum/enum.js (below the header comment)
export function shouldLog(level, min) {
    return level >= min;
}
export function label(level) {
    switch (level) {
        case 0 /* LogLevel.Debug */:
            return "debug";
        case 1 /* LogLevel.Info */:
            return "info";
        case 2 /* LogLevel.Warn */:
            return "warn";
        case 3 /* LogLevel.Error */:
            return "error";
    }
}
export const isNoisy = shouldLog(0 /* LogLevel.Debug */, 2 /* LogLevel.Warn */);
```

```
      24     834 dist/enum/enum.js
```

Great job! There's no `LogLevel` anywhere outside the comments, and every use site holds the literal value: **31 → 24 lines, 1,047 → 834 bytes**.

| Metric (median of five runs) | `enum` | `const enum` |
|------------------------------|-------:|-------------:|
| Types                        | 108    | 108          |
| Instantiations               | 0      | 0            |
| Check time                   | 0.01s  | 0.01s        |
| Emit time                    | 0.01s  | 0.01s        |
| Total time                   | 0.28s  | 0.28s        |
| Emitted JS                   | 31 lines, 1,047 bytes | 24 lines, 834 bytes |

`Types`, `Instantiations` and every timing match, so the checker does the same work for both. The 213 bytes you saved come from the emitter.

## 3. Turn on `isolatedModules`

Projects built with Vite, esbuild or swc tend to set `isolatedModules: true`, because those tools compile each file without seeing the others. Let's emit your `const enum` the way those setups would, into a third folder:

```bash
npx tsc -p tsconfig.enum.json --isolatedModules --outDir dist/isolated
diff dist/before/enum.js dist/isolated/enum.js
wc -lc dist/isolated/enum.js
```

```
      31    1047 dist/isolated/enum.js
```

`tsc` reports no error, and `diff` prints nothing: the output is byte-for-byte the regular-enum output from step 1. The IIFE is back, and every use site reads `LogLevel.X` again. The `const` keyword now changes nothing in the output. [`const-enum.ts` with `isolatedModules` on][playground-isolated] shows the same IIFE in the TS Playground's **.JS** tab.

Now try the setting that Node's built-in type stripping relies on:

```bash
npx tsc -p tsconfig.enum.json --erasableSyntaxOnly --noEmit
```

```
enum.ts(10,19): error TS1294: This syntax is not allowed when 'erasableSyntaxOnly' is enabled.
```

Exit code `2`. Neither `enum` form is plain type syntax that can be deleted, so both are rejected. The regular enum from step 1 fails the same way, at `enum.ts(10,13)`.

> [!NOTE]
> Under `isolatedModules`, a `const enum` imported from another `.ts` file compiles without an error; it stops being inlined, like here. The error case is a `const enum` declared in a `.d.ts`, such as a library's published types: there `tsc` reports `TS2748: Cannot access ambient const enums when 'isolatedModules' is enabled.`

## 4. Rewrite it as an `as const` object

When your build uses `isolatedModules` or `erasableSyntaxOnly`, a plain object gives you what `const enum` can't: the same output in every tool. Replace the `const enum` in `enum.ts` with an object plus a type of the same name, so every use site compiles unchanged.

<details>
  <summary>Skeleton: object and derived type</summary>

```ts
// projects/test-lib-1/src/examples/05-const-enum/enum.ts
/* header comment */

export const LogLevel = {
  /* the four members, each with its number */
} as const;

export type LogLevel = /* the union of LogLevel's values */;

/* shouldLog, label and isNoisy unchanged */
```

</details>

`as const` keeps each property's literal type (`0`, `1`, …) instead of widening it to `number`. `typeof LogLevel` is the object's type, `keyof typeof LogLevel` is `"Debug" | "Info" | "Warn" | "Error"`, and indexing one with the other gives the union of the values. Because the value and the type share the name `LogLevel`, `level: LogLevel`, `case LogLevel.Info:` and `shouldLog(LogLevel.Debug, …)` all keep working.

<details>
  <summary>LogLevel as const object solution</summary>

```ts
// projects/test-lib-1/src/examples/05-const-enum/enum.ts
/* header comment */

export const LogLevel = {
  Debug: 0,
  Info: 1,
  Warn: 2,
  Error: 3,
} as const;

export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

/* shouldLog, label and isNoisy unchanged */
```

Below the header comment it matches [`as-const.ts`](../../projects/test-lib-1/src/examples/05-const-enum/as-const.ts) ([TS Playground][playground-as-const]).

</details>

Emit it both ways and check it against `erasableSyntaxOnly`:

```bash
npx tsc -p tsconfig.enum.json --extendedDiagnostics \
  | grep -E "^(Types|Instantiations|Check time|Emit time|Total time):"
npx tsc -p tsconfig.enum.json --isolatedModules --outDir dist/isolated
diff dist/enum/enum.js dist/isolated/enum.js
npx tsc -p tsconfig.enum.json --erasableSyntaxOnly --noEmit
wc -lc dist/enum/enum.js
```

```
Types:                         114
Instantiations:                  0
Check time:                  0.01s
Emit time:                   0.01s
Total time:                  0.28s
```

```js
// dist/enum/enum.js (below the header comment)
export const LogLevel = {
    Debug: 0,
    Info: 1,
    Warn: 2,
    Error: 3,
};
/* shouldLog, label and isNoisy as in step 1, reading LogLevel.X */
```

```
      30     869 dist/enum/enum.js
```

`diff` prints nothing and `--erasableSyntaxOnly` exits `0`: the output is the same with and without `isolatedModules`. It's a plain object with no IIFE and no reverse mapping, **30 lines and 869 bytes**, between the regular enum's 1,047 and the `const enum`'s 834. `Types` goes from 108 to 114, one literal type per property plus the derived union, with `Check time` still at 0.01s.

## 5. Measure at scale

Four members are too few for any timing to move. [`generate-files.sh`](../../projects/test-lib-1/src/examples/05-const-enum/generate-files.sh) writes a 2,000-member version of each form into `generated/` (gitignored), every member used once. `tsc` only reports a real `Emit time` when it writes files, so leave out `--noEmit`:

```bash
./generate-files.sh

npx tsc generated/enum.ts       --strict --skipLibCheck --target ES2022 --module ESNext --outDir dist/scaled --extendedDiagnostics
npx tsc generated/const-enum.ts --strict --skipLibCheck --target ES2022 --module ESNext --outDir dist/scaled --extendedDiagnostics
npx tsc generated/as-const.ts   --strict --skipLibCheck --target ES2022 --module ESNext --outDir dist/scaled --extendedDiagnostics
npx tsc generated/const-enum.ts --strict --skipLibCheck --target ES2022 --module ESNext --outDir dist/scaled-isolated --isolatedModules --extendedDiagnostics

wc -lc dist/scaled/*.js dist/scaled-isolated/*.js
```

```
    4004   62724 dist/scaled/as-const.js
    2002   51809 dist/scaled/const-enum.js
    4005  111650 dist/scaled/enum.js
    4005  111650 dist/scaled-isolated/const-enum.js
   14016  337833 total
```

| Metric                | `enum`        | `const enum`  | `const enum` + `isolatedModules` | `as const` object |
|-----------------------|--------------:|--------------:|---------------------------------:|------------------:|
| Emitted JS            | 111,650 bytes | 51,809 bytes  | 111,650 bytes                    | 62,724 bytes      |
| Emitted lines         | 4,005         | 2,002         | 4,005                            | 4,004             |
| Emit time             | 0.05s         | 0.02s         | 0.05s                            | 0.03s             |
| Check time            | 0.11s         | 0.12s         | 0.12s                            | 0.07s             |
| Total time            | 0.46s         | 0.42s         | 0.46s                            | 0.38s             |
| Types                 | 6,101         | 6,101         | 6,101                            | 8,103             |
| Symbols               | 61,000        | 61,000        | 61,000                           | 63,001            |

Times are the median of five runs, with the variants run in rotation.

- **`const enum`** emits 54% less JavaScript than `enum` and cuts `Emit time` from 0.05s to 0.02s. `Types` and `Symbols` are identical, so the checker does the same work.
- **`const enum` + `isolatedModules`** emits the `enum` output byte for byte and loses the `Emit time` gain with it.
- **`as const`** emits 44% less than `enum`, since it has no reverse mapping, and stays the same under `isolatedModules`. It adds about 2,000 types and symbols, one literal type per property, yet reports the lowest `Check time` of the three.

Even at 2,000 members, every timing difference is a few hundredths of a second. Pick between the three for output size and for what your build tooling can handle.

## 6. BONUS: Compare against the reference files

> [!NOTE]
> This is a bonus exercise, you don't need to complete it.

[`const-enum.ts`](../../projects/test-lib-1/src/examples/05-const-enum/const-enum.ts) and [`as-const.ts`](../../projects/test-lib-1/src/examples/05-const-enum/as-const.ts) hold the solutions to steps 2 and 4, each with its own config. Emit them next to your file:

```bash
npx tsc -p tsconfig.const-enum.json
npx tsc -p tsconfig.as-const.json
diff dist/enum/enum.js dist/as-const/as-const.js
cat dist/const-enum/const-enum.js
```

Your `enum.ts` holds the `as const` version now, so `diff` should only report the header comment lines; the code below them is identical. Compare `dist/const-enum/const-enum.js` with the output you got in step 2: below the header comment it's the same 16 lines of inlined literals.

When you're done, delete `dist/` and `generated/`, and `git checkout enum.ts` to restore the regular enum.

[playground-enum]: https://www.typescriptlang.org/play/?ts=5.9.3&target=9#code/PQKhCgAIUgDBTAdgVwLawFyQIaQE7wDmyANtnpEmpAJYDOO+yiALjavJAG7YnLwAaSIgD2LSACtkdcbhYBPAA7woEaHBZ0AxrEqoamyl3h55+IqXKUUqHA2yJIASScAxAKKQWAC2ziARsg0JAAm9l4A7iIAtBHYZiQiIgDWyIqqkCL+EvBa4gAUiNgckNEAfNy8-DiIIZV8nOXCxfAAlEIOdfDGppDSnHQGnATYYTgZingiyngKmQBm816+4lk5eTjieMxsHAB0kAByIoicIksGkFoOkP6cLATw0XS+yUhYPirqLh6QqMgsPzwcI8PA0bD+EiCSB0ES3ZghKF4Bi+YxeOHYOh0NCcS6+BiDEKceCLXKaPaqYDgcDwAAeihEs2s1AAMiJCCzuvASJAAN5QSAAEXggUIAgFTkQ8xE4sgkAA6uRELLIO48FM8OKAL7UukMpnzZh5GgnGHeESkEJswj5KHGEhYa2c+1CfSIR3s53c1pYfxJKE3flyggsZB4Rx27mQMoAXj+NEQAG5wDqafTGeJDYhjaayHcSLauQ7IE6iz6YQ8E4Q+QK6BEDFpvJBC-bWjW5XLrnROKX7XthaKMAKO+ZQ+HIAAiImiifJkddnueot7SXSocj4PwMeOCcJ6Wz4dXTGLjnLxXh9cbkNhndxcMH+fHktLvtqjWXkfX8cTkwah+QHVUz1DMrhOGRaDoY56DMOMXgtUJrXyXtuX7EVkDFZ9Tz7c9EFaZMgA
[playground-const-enum]: https://www.typescriptlang.org/play/?ts=5.9.3&target=9#code/PQKhCgAIUgDBjA9gOwM4BdIFNkFcC2sAXJEvgA4CWANlgCaQCGA7owJ5QTSQDKj+WSKkS4ATvEHNK6ABaQUggNZY2zRKIaM6degDo46VPFjZ801JGSJsefPIBGAKyzxMjN9WpFO2AG5ZRNjgAGUQAc2Csf2pdAA0TSgtRLHJqRgkGeyDzSGppAMZqSF9C3EEAClhQiKisGIARLHtcMJMAWgA+OAAGWABKABofYUhZQRwCUkQMCytZSmQwpkxRXGR0SgF9ABUZRPlkaiCZRGo6C2YZHAMjBMM6gDMfLDNDSClZOETT93oAWUQdFwtFQJkQDwekEAKARCLCCMaQABKAFEAIL1P7IgDkFio6AehWoqF0nGA4HAWAAHuR1JgkGhMBM7NVItFIABvKCQRrNMJDSCQACSyAeiH5kAA6oxRMhxcjRKJ1EMAL7kqk00SYB5rVyUFBCE7AujVcq0aIkFm1agDSBmZAW8Ksup9Ej2RCnLCMZAcrnJdBib1muqQDoAXltCwA3OBVRTqbTINrkLr9Wl7HVTVaHTVoi6hOhRAslpyBagPvA5Jncz6BQL4IxUIJLdFdDyWt5a7W-QHIAAiHS83vRzv1xuQZt1XTC0UdzuQbsyvsLUVDrl1htNx1W3RSmWzzsL7291gy1cjjfjrct+WK0T7rtYf2L3sBW9nyCq2PqhP0jCQRIAHKIIkQThqghpnCaE4NE0LQ2tBO7SsgfTRkAA
[playground-isolated]: https://www.typescriptlang.org/play/?ts=5.9.3&target=9&isolatedModules=true&preserveConstEnums=true#code/PQKhCgAIUgDBjA9gOwM4BdIFNkFcC2sAXJEvgA4CWANlgCaQCGA7owJ5QTSQDKj+WSKkS4ATvEHNK6ABaQUggNZY2zRKIaM6degDo46VPFjZ801JGSJsefPIBGAKyzxMjN9WpFO2AG5ZRNjgAGUQAc2Csf2pdAA0TSgtRLHJqRgkGeyDzSGppAMZqSF9C3EEAClhQiKisGIARLHtcMJMAWgA+OAAGWABKABofYUhZQRwCUkQMCytZSmQwpkxRXGR0SgF9ABUZRPlkaiCZRGo6C2YZHAMjBMM6gDMfLDNDSClZOETT93oAWUQdFwtFQJkQDwekEAKARCLCCMaQABKAFEAIL1P7IgDkFio6AehWoqF0nGA4HAWAAHuR1JgkGhMBM7NVItFIABvKCQRrNMJDSCQACSyAeiH5kAA6oxRMhxcjRKJ1EMAL7kqk00SYB5rVyUFBCE7AujVcq0aIkFm1agDSBmZAW8Ksup9Ej2RCnLCMZAcrnJdBib1muqQDoAXltCwA3OBVRTqbTINrkLr9Wl7HVTVaHTVoi6hOhRAslpyBagPvA5Jncz6BQL4IxUIJLdFdDyWt5a7W-QHIAAiHS83vRzv1xuQZt1XTC0UdzuQbsyvsLUVDrl1htNx1W3RSmWzzsL7291gy1cjjfjrct+WK0T7rtYf2L3sBW9nyCq2PqhP0jCQRIAHKIIkQThqghpnCaE4NE0LQ2tBO7SsgfTRkAA
[playground-as-const]: https://www.typescriptlang.org/play/?ts=5.9.3&target=9#code/PQKhCgAIUgDBDAzpAxgewHaIC6wFyTyQAOANvAJYaRoBGAVgKYrYmkCuyRAJowE4UAbo26R2GCpkjYAnsUZQI0SAFUMpCgGtGcdFlaMM7ALawANNIAWFZDcKQ+jeKQfjsFYzrpMWkQCgEkLTsrPDUaHzcVPB8MjQYjHiK9ohUAOakOrB6OLCQvCjkfPDuUgDuFNiWkBhokACSdQBiAKKEGKI1DozCfIg6xvDExGkWiGhJQe0Zvaih0o6MALSIlvDakBUAdPWsdmSU1ABS8ILwAMooAsSs5ZXScjqhNdjFklhmSWMbrOjGwxnISo6RDwTxidr8OA2NDkbAiACyaG47AB5kgjEQQQopG4wEQpRQwAAQvBaIwXKFuElYPwkKSMmcZBgXgAPADy6hksE2imA4HAjBZxHCP0wOEgABk0KkJd1yZAALyQADeUEgABFGEFUgQAAwfSD1DAAMzQBAAjAbIAB1aIYAgAJitzT4fHCBAAzB8AL6EZDZbAAbn5guFfFYsnkkulsuELiVAApI4w0MbozK5aQAJQAbW0MlT93khalGbjAF1gwKhSLIMbxCw3pAVmgUdxSwmMnGCKXY+SLMYqD2Y5mswRaGgYU5qKrDY5sOw+NQu-KAHxKwcYYPekM18N1hslZek8mdzPDsvksfN7ACDCpFVq-EVFBVM9xrOPw2GlBIHS9zNNk1bVEm-b950XagACJeG1KDgzA38+nTPtSE2OoTTNNUwIgpdICgqhTXg7DZmQgC402W0l1AsCugXPCoNKO1iMQv8UMAl03T4GicMYejoP4LiWMgHcd2rMNRX0DZEAAOTQGxYiVFs2w7cjySArV2FSCw1LQqiMCzYMgA
