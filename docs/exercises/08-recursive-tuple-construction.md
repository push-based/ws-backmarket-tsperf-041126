# Exercise: Build a Tuple Type per Digit, Not per Element

In this exercise we will rewrite a recursive `BuildTuple<Length>` so it recurses once per decimal digit of `Length` instead of once per element. The linear version adds one `unknown` per step and spreads the whole accumulator into a new tuple each time, so `BuildTuple<900>` creates 900 intermediate tuples and `BuildTuple<1200>` fails to compile. The digit version produces the same tuple type in three steps.

## Goal

At the end of this exercise `recursive-tuple-construction.slow.ts` still produces the same 500- and 900-element tuple types, and the `Instantiations` count that `tsc --extendedDiagnostics` reports drops from 416,991 to 278.

## Prerequisites

Complete [Exercise 0: Setup](./0-setup.md) first: repo cloned, `npm install` done.
Start at the repository root: step 1 changes into `projects/test-lib-1/src/examples/08-recursive-tuple-construction`, and every command after that runs from there.

The numbers in this exercise come from TypeScript 5.9.3, the version the repo pins.

To hover the types and try your edits in the browser, open [`recursive-tuple-construction.slow.ts` in the TS Playground][playground-slow]. It runs the same version and reports the same `TS2589` when you reach step 2. Take the measurements in the repo: the playground has no `--extendedDiagnostics` output.

## 1. Measure the baseline

Before changing anything, get the number you're trying to beat:

```bash
cd projects/test-lib-1/src/examples/08-recursive-tuple-construction

npx tsc --noEmit -p tsconfig.slow.json --extendedDiagnostics
```

```
Files:                         137
Lines of Library:            51126
Lines of Definitions:        50308
Lines of TypeScript:            26
Lines of JavaScript:             0
Lines of JSON:                   0
Lines of Other:                  0
Identifiers:                 86523
Symbols:                    903376
Types:                      412813
Instantiations:             416991
Memory used:               404943K
Assignability cache size:        7
Identity cache size:             0
Subtype cache size:              0
Strict subtype cache size:       0
I/O Read time:               0.02s
Parse time:                  0.13s
ResolveTypeReference time:   0.00s
ResolveModule time:          0.01s
ResolveLibrary time:         0.01s
Program time:                0.19s
Bind time:                   0.07s
Check time:                  0.34s
printTime time:              0.00s
Emit time:                   0.00s
Total time:                  0.60s
```

That's `BuildTuple<500>` and `BuildTuple<900>` walking up one element at a time: **Types 412,813, Instantiations 416,991, Symbols 903,376**. Your times will differ from these; the three counts should match.

## 2. Find the wall

The linear version has a hard ceiling as well as a cost. In `recursive-tuple-construction.slow.ts`, remove the `// ` in front of `type T1200 = BuildTuple<1200>;` and compile:

```bash
npx tsc --noEmit -p tsconfig.slow.json
```

```
recursive-tuple-construction.slow.ts(23,14): error TS2589: Type instantiation is excessively deep and possibly infinite.
```

1,200 steps is past TypeScript's instantiation depth limit. Comment the line out again before you move on, so the next measurement compares the same two tuples as step 1.

## 3. Recurse per digit

Every step of the linear `BuildTuple` adds a single element, so the depth of the recursion equals the length of the tuple. Rewrite `BuildTuple` so it reads `Length` one decimal digit at a time: three steps for `900`, four for `1200`.

> [!NOTE]
> Keep the result a tuple. Swapping it for `unknown[]` also drops the numbers, but it changes the type, so the before/after table would compare two different types.

<details>
  <summary>Skeleton: digit lookup, times-ten and the digit walk</summary>

```ts
// recursive-tuple-construction.slow.ts
type DigitTuple = {
  "0": [];
  "1": [unknown];
  /* "2" to "9": one more `unknown` each */
};

type Times10<T extends unknown[]> = /* T spread ten times into one tuple */;

type FromDigits<S extends string, Acc extends unknown[] = []> =
  S extends `${infer D extends keyof DigitTuple}${infer Rest}`
    ? /* recurse on Rest with the next accumulator */
    : Acc;

type BuildTuple<Length extends number> = /* turn Length into a string and start FromDigits */;

/* code after: T500, T900 and the commented T1200 stay as they are */
```

</details>

Walk the digits left to right. For each digit `D`, multiply what you have so far by ten with `Times10<Acc>` and append `DigitTuple[D]`. For `900` the accumulator grows `[]` → 9 elements → 90 → 900. The template literal `` `${Length}` `` turns the number literal `900` into the string `"900"` that `FromDigits` walks.

> [!WARNING]
> Feed the digit version non-negative integer literals like `500` and `900`, which is all this file asks for. For those it returns the same tuple as the linear version. For an input like `1.5` or `-3`, the linear version stops with `TS2589`, but the digit version stops at the first character that isn't a digit and returns a tuple of length 1 or 0 without any error.

<details>
  <summary>Digit-based BuildTuple solution</summary>

```ts
// recursive-tuple-construction.slow.ts
type DigitTuple = {
  "0": [];
  "1": [unknown];
  "2": [unknown, unknown];
  "3": [unknown, unknown, unknown];
  "4": [unknown, unknown, unknown, unknown];
  "5": [unknown, unknown, unknown, unknown, unknown];
  "6": [unknown, unknown, unknown, unknown, unknown, unknown];
  "7": [unknown, unknown, unknown, unknown, unknown, unknown, unknown];
  "8": [unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown];
  "9": [unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown];
};

type Times10<T extends unknown[]> = [...T, ...T, ...T, ...T, ...T, ...T, ...T, ...T, ...T, ...T];

type FromDigits<S extends string, Acc extends unknown[] = []> =
  S extends `${infer D extends keyof DigitTuple}${infer Rest}`
    ? FromDigits<Rest, [...Times10<Acc>, ...DigitTuple[D]]>
    : Acc;

type BuildTuple<Length extends number> = FromDigits<`${Length}`>;

/* code after: T500, T900 and the commented T1200 stay as they are */
```

This matches [`recursive-tuple-construction.fixed.ts`](../../projects/test-lib-1/src/examples/08-recursive-tuple-construction/recursive-tuple-construction.fixed.ts) ([TS Playground][playground-fixed]) if you want to check your work.

</details>

## 4. Measure again

Re-run the exact command from step 1:

```bash
npx tsc --noEmit -p tsconfig.slow.json --extendedDiagnostics
```

```
Files:                        137
Lines of Library:           51126
Lines of Definitions:       50308
Lines of TypeScript:           41
Lines of JavaScript:            0
Lines of JSON:                  0
Lines of Other:                 0
Identifiers:                86545
Symbols:                    61163
Types:                       1888
Instantiations:               278
Memory used:               96573K
Assignability cache size:      35
Identity cache size:            0
Subtype cache size:             0
Strict subtype cache size:      0
I/O Read time:              0.02s
Parse time:                 0.14s
ResolveTypeReference time:  0.00s
ResolveModule time:         0.01s
ResolveLibrary time:        0.01s
Program time:               0.19s
Bind time:                  0.07s
Check time:                 0.02s
printTime time:             0.00s
Emit time:                  0.00s
Total time:                 0.27s
```

| Metric         | Before (one step per element) | After (one step per digit) | Change  |
|----------------|------------------------------:|---------------------------:|:--------|
| Instantiations | 416,991                       | 278                        | -99.93% |
| Types          | 412,813                       | 1,888                      | -99.5%  |
| Symbols        | 903,376                       | 61,163                     | -93%    |
| Memory used    | 404,754K                      | 96,573K                    | -76%    |
| Check time     | 0.34s                         | 0.01s                      | -97%    |
| Total time     | 0.60s                         | 0.28s                      | -53%    |

Times and memory are the median of five runs; the output blocks in steps 1 and 4 are each one of those runs, so their times and memory can differ slightly from the table. Types, Instantiations and Symbols were identical in all five. `Files` stays at 137, so the drop comes from how the tuple is built. Great job!

> [!TIP]
> Leave `["length"]` reads out of the file while you measure. Adding `const len900: T900["length"] = 900;` takes `Instantiations` from 278 to 1,183, because reading `length` off the tuple resolves all 900 elements.

## 5. Go past the wall

Remove the `// ` in front of `type T1200 = BuildTuple<1200>;` again and compile:

```bash
npx tsc --noEmit -p tsconfig.slow.json
```

No output this time: `1200` takes four steps, well inside the depth limit. Add `type T9999 = BuildTuple<9999>;` underneath and measure with `--extendedDiagnostics`. With all four tuples in the file, `Instantiations` is 396 and `Check time` is 0.02s.

The next ceiling is TypeScript's 10,000-element limit on tuples. Add `type T10000 = BuildTuple<10000>;` and `tsc` reports `TS2799: Type produces a tuple type that is too large to represent.` That cap applies to any tuple, however you build it.

Remove `T9999` and `T10000` and comment `T1200` out again, so the file is back to the state you measured in step 4.

## 6. BONUS: Prove it's the same type

> [!NOTE]
> This is a bonus exercise, you don't need to complete it.

A fair before/after comparison needs both versions to build the same type. Put the old version back next to the new one under a different name, and let the type checker compare them:

<details>
  <summary>Equality check between the linear and digit-based tuples</summary>

```ts
// recursive-tuple-construction.slow.ts
/* code before: the digit-based BuildTuple, T500, T900 */

type BuildTupleLinear<
  Length extends number,
  Result extends unknown[] = [],
> = Result["length"] extends Length
  ? Result
  : BuildTupleLinear<Length, [...Result, unknown]>;

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

const same: Equal<BuildTupleLinear<900>, BuildTuple<900>> = true;
const off: Equal<BuildTupleLinear<899>, BuildTuple<900>> = false;

/* code after: export {}; */
```

</details>

Run `npx tsc --noEmit -p tsconfig.slow.json`: no output, so both checks hold. `off` is the negative control. Change its value to `true` and `tsc` reports `error TS2322: Type 'true' is not assignable to type 'false'.`, which shows `Equal` tells a 899-element tuple from a 900-element one.

Delete the added lines when you're done; `BuildTupleLinear<900>` brings the linear cost back into the measurement.

## 7. BONUS: Compare against the fixed reference file

> [!NOTE]
> This is a bonus exercise, you don't need to complete it.

`tsconfig.fixed.json` points at [`recursive-tuple-construction.fixed.ts`](../../projects/test-lib-1/src/examples/08-recursive-tuple-construction/recursive-tuple-construction.fixed.ts), which contains the solution. Run it side by side with your edited `slow.ts`:

```bash
npx tsc --noEmit -p tsconfig.slow.json --extendedDiagnostics   # your edit
npx tsc --noEmit -p tsconfig.fixed.json --extendedDiagnostics  # reference solution
```

Both should print `Types: 1888`, `Instantiations: 278` and `Symbols: 61163`.

[playground-slow]: https://www.typescriptlang.org/play/?ts=5.9.3&target=9#code/PQKhCgAIUhlAZA8gdQFyQEoFMDGBXAJwGcBLANy0gBc8AHAG0pwHsA7IqgvHKktqCNEgAhPCXoATEqwDm1OoyKQCuQqQr0AnpBwqAhlSxK2lKptqVpHPa14G+rSBYLLVxB5EYaAdAMxYARzwjQwl4LFkqAAtIZgAzSABWAAZkyABeJNTXfHcKSA4sWiJfIWwgkKwwiJlo2ISATmzMprSVXPVKQuKAGmUSGSiqSANqKMoqmUp4yAB3KNHorD8WAFtacSwXHBtXImZ6fIAjLDjmFUgokipeWUhrpSsqGzteNkgJIrr6ElXr0sEMAAKlclHpaLQCMw9DgYnE8KwJHpVhFnvQtB9mEZWAByYZEHaMSAnTRsCSQAB+AEYeqk0hJgtRmH4geYsLBdCRaFQcY92M9bCR7O9PtyYj8-lQAcBwOAzBYRGJJECFFgADxQSDhSIxLAAD0MiKUrDwqxOBB6muwRDw9GG+sNEiUCIA1qxmLNWABtAC6GUgvstAD5-dbbVQvQAiRg6yN+h0RJ1amrRTUAfn8NrtmvQonEEhVDHV2tqUT6Xu8lbDdr6rvdnp9QYA3LLgMBICCjJRZuJ6Do9HgiF16B6JB7HOd7vyXkK3o5RXUtlDiKg5WyOyk0pk88rVWrN821wqga1-TuC3vWoe29R10CqQAmZqK-OFxhqx+pZuQSA3wAJhJcDxTtYgrCvOXzir81yQAAFECsAPokAAcDQAJSyvqtDnMMADeAC+LZAA
[playground-fixed]: https://www.typescriptlang.org/play/?ts=5.9.3&target=9#code/PQKhCgAIUgxBJAGgUQCIC5ICECuBLAGwBNIAXACwFMycAHA6gMwCcB7AWzKsiLwHM8pAM6RWjLtQYA7PhSgRokAApsiOAMaURFaiEoAPAIbrSkIYfbVSAT1qUYh7dyEFWAd0gA3SsyF5WUpCAKASQhjT01G7krEKU8pAABgDaAETSsuQpALoJkHhO1MyUAI44WqSUJFI47ABGPsGQtTimReo4vlqiUpqQdsw8lOp47IYEPPyC8XhSQhWGJGLdvf2QlAyWUqQAdJDIxuRmFbSQ7DgEpHj0eF06oertZwSGpKwDtdZklFLxABQVgSEtCKCyEAEpQlISIZaHYoQUJgJSABybR0BgAGjMrESuEIRAAKujKAAeACcAAYKQA+XKkQwAay08QAzEdKLQRDM5pQFqJxJSKZCSOoQRURAA-AByaw231MLlYwjygVe9PG3Pmi3E0oATcAAEzbeTxADK6jGtxxZIxZLtjTuUgMpjcYw1IgJtko5uYVxRInIhmYJAAjBSMVSKQBadaUTamUjE+IEEaCSC-Ammg0AdjtYKxUTw6kOUhx6gCc2YGkuAS+xakeFK1AtgVojiExug8Xg4ju6QoPFYWikyNMxkTbs+TsqZBxKe8KokZC9WKIAVHTXwxFC8UTEVCY4IBEwYXohhmiQJSRykEDIlLkDaHT8tcMUMgD5T7EEuwJgdMxZvnwtxULuK5cKwOB8OQWJCDiaZvkIbg+CIYS8IwjA+PKkBNnM-iqoGBH5JAjCENQa5aJ2IDAOA4A2HYkCoJMpBEvuAC8kAAN5QJAKQUikmDXgA3DxKQhgJkBJDgUgMqWbhSFkImQLxBoSVJMlyVIWLSbJ7gKUpvEsmpOmadpGl6WZunyYpokACzGeZ8mWaZkAmRZrmOfpokAKwOVZWkef5znuW5TmBZpNnKSkABsfkuaFAUJcFYVJeFemRbx2ZxSFnnJYluVpSlBUJRlKQABzZUVQWFfl1WpfVxWeaVZKVbV8WNXVHXtZ1PURSJAC+Il0V6kAEiMWhhiSBJrPoAJECICXXtSkAcUk2zrQSWLrdsm2QNtu37VtG1HTtJ0Hcde0XftNnDQxsBsOwTFIkIJKmjNc0iJWMx8FiACCDzvd8801deK2SVky1sTxb3OkDIgJAAJJxMyYQMqCA-CkBMtYSxPYIrEMP1SMow0ABK5T9QkPHKQA-HAD148IJLk3MWJrRt41CJN-3qNSJ2MwTlBJKgWQQ9TkCYDzQ30dQeLEILJIADLfBkGPA9UdQ+JD9McIzL2I5xysyBQlPUkNwDAJApoWJEbwMq4fKOEuioeKRDCNOYliPlo5yXDIy52EIWJsk+vj4eynJrAc6C3dQBLeVSYNy4SxIkgnNIiTLo2CknW4pxE5JUmbtEW6N3D9ocxF4UekAWswvozhedwy1iBjjgQnxO03ziuB43hhwExql78ADSHJjqhtccPGmAgrw-vJGkKsUNkuRiOIYSCjGcpbOE7tFHBBDeEI4Cl26kA55Ymu+MKoREMDEo55qb6XC8+FB5AhbFp-kHbkITIeB0KfS25Z2Btl9HBQIhg+DnlmAmHu7gSJkQLFQIoH4cRCA0IcOet4YRwg7GCYBU84GQGkIKTABJBSpArtkMGgpzaWyNhkBEKYnRBi8ChcOLZSytF5N-DMWZvJlTJBCA+rAj5MBmNQVBlAY6lyzgSEMBpE4cWTgrJRRcRLyJGpQu0ZJc74gVnoskxdwAGFoG8UwnFBrgCAA
