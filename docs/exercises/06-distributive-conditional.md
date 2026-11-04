# Exercise: Stop a Conditional Type From Distributing

In this exercise we will rewrite one conditional type so it stops distributing over a 65,536-member union. A conditional of the form `T extends string ? ... : ...` runs **once per member** of the union in `T`. The editor hides that, but `tsc --extendedDiagnostics` reports it as hundreds of thousands of instantiations. Here the branch builds template literals, which map over a union on their own, so the per-member run buys nothing.

## Goal

At the end of this exercise the `Instantiations` count that `tsc --extendedDiagnostics` reports for `distributive-conditional.slow.ts` drops from ~720,897 to ~23, by changing how one `extends` test is written.

## Prerequisites

Complete [Exercise 0: Setup](./0-setup.md) first: repo cloned, `npm install` done.
Start at the repository root: step 1 changes into `projects/test-lib-1/src/examples/06-distributive-conditional`, and every command after that runs from there.

To hover the types and try your edit in the browser, open [`distributive-conditional.slow.ts` in the TS Playground][playground-slow]. It runs TypeScript 5.9.3, the version the repo pins. Take the measurements in the repo: the playground has no `--extendedDiagnostics` output.

> [!TIP]
> The two metrics that carry this example are **Types** and **Instantiations**. `Check time` and `Total time` move too, because we scaled the union to 65,536 members to lift the cost above `tsc`'s measurement noise. Read Types and Instantiations first.

## 1. Measure the baseline

Before changing anything, get the number you're trying to beat:

```bash
cd projects/test-lib-1/src/examples/06-distributive-conditional

npx tsc --noEmit -p tsconfig.slow.json --extendedDiagnostics
```

```
Files:                         137
Lines of Library:            51126
Lines of Definitions:        50308
Lines of TypeScript:            23
Lines of JavaScript:             0
Lines of JSON:                   0
Lines of Other:                  0
Identifiers:                 86534
Symbols:                     58977
Types:                      528799
Instantiations:             720897
Memory used:               207204K
Assignability cache size:       23
Identity cache size:             0
Subtype cache size:              0
Strict subtype cache size:       0
I/O Read time:               0.01s
Parse time:                  0.13s
ResolveTypeReference time:   0.00s
ResolveModule time:          0.01s
ResolveLibrary time:         0.01s
Program time:                0.19s
Bind time:                   0.07s
Check time:                  0.39s
printTime time:              0.00s
Emit time:                   0.00s
Total time:                  0.65s
```

That's the `Accessors<T>` branch running once for each of `Item`'s 65,536 members: **Types 528,799, Instantiations 720,897**.

## 2. Turn off the distribution

The `Accessors<T>` conditional distributes because `T` sits bare on the left of `extends`. Wrap the checked type and its constraint so TypeScript compares the union as a single unit instead of member by member.

<details>
  <summary>Accessors skeleton: where the change goes</summary>

```ts
// distributive-conditional.slow.ts
type Accessors<T> =
  /* wrap both sides of the extends test so the union is checked as one unit */
    ? `${Capitalize<T>}` | `bet${Capitalize<T>}` | `get${Capitalize<T>}` | `set${Capitalize<T>}` | `ret${Capitalize<T>}` | `net${Capitalize<T>}`
    : never;
```

</details>

Wrap each side in a single-element tuple, `[T] extends [string]`, and the branch runs once on the whole union. The template literals then expand the union themselves, so `Result` stays the same 393,216 accessor names.

<details>
  <summary>Non-distributive Accessors solution</summary>

```ts
// distributive-conditional.slow.ts
type Accessors<T> =
  [T] extends [string]
    ? `${Capitalize<T>}` | `bet${Capitalize<T>}` | `get${Capitalize<T>}` | `set${Capitalize<T>}` | `ret${Capitalize<T>}` | `net${Capitalize<T>}`
    : never;
```

This matches [`distributive-conditional.fixed.ts`](../../projects/test-lib-1/src/examples/06-distributive-conditional/distributive-conditional.fixed.ts) ([TS Playground][playground-fixed]) if you want to check your work.

</details>

Check that the rewrite still compiles:

```bash
npx tsc --noEmit -p tsconfig.slow.json
```

No output and exit code `0`: `Result` still type-checks.

## 3. Measure again

Re-run the exact command from step 1:

```bash
npx tsc --noEmit -p tsconfig.slow.json --extendedDiagnostics
```

```
Files:                         137
Lines of Library:            51126
Lines of Definitions:        50308
Lines of TypeScript:            23
Lines of JavaScript:             0
Lines of JSON:                   0
Lines of Other:                  0
Identifiers:                 86534
Symbols:                     59055
Types:                      463286
Instantiations:                 23
Memory used:               193759K
Assignability cache size:       25
Identity cache size:             0
Subtype cache size:              0
Strict subtype cache size:       0
I/O Read time:               0.01s
Parse time:                  0.14s
ResolveTypeReference time:   0.00s
ResolveModule time:          0.01s
ResolveLibrary time:         0.01s
Program time:                0.18s
Bind time:                   0.07s
Check time:                  0.25s
printTime time:              0.00s
Emit time:                   0.00s
Total time:                  0.51s
```

| Metric         | Before (`T extends U`) | After (`[T] extends [U]`)  | Change  |
|-----------------|------------------------:|----------------------------:|:--------|
| Instantiations  | 720,897                 | 23                           | -99.99% |
| Types           | 528,799                 | 463,286                      | -12%    |
| Check time      | 0.39s                   | 0.24s                        | -38%    |
| Total time      | 0.65s                   | 0.49s                        | -25%    |

Times are the median of five runs. The output blocks above are single runs, so their times and memory can differ slightly from these medians. One structural change, and the per-member cost is gone. `Types` drops less than `Instantiations` because both versions still build the same 393,216 strings.

> [!WARNING]
> This rewrite is safe because the branch returns a union of strings, which has no per-member correlation to lose. With an object-typed branch like `{ value: T; upper: Uppercase<T> }`, `[T] extends [string]` turns each property into an independent union, and `{ value: "item-0000", upper: "ITEM-FFFF" }` would type-check.

## 4. BONUS: Compare against the fixed reference file

> [!NOTE]
> This is a bonus exercise, you don't need to complete it.

`tsconfig.fixed.json` points at [`distributive-conditional.fixed.ts`](../../projects/test-lib-1/src/examples/06-distributive-conditional/distributive-conditional.fixed.ts), which already contains the solution. Run it side by side with your edited `slow.ts` to confirm both land on the same numbers:

```bash
npx tsc --noEmit -p tsconfig.slow.json --extendedDiagnostics   # your edit
npx tsc --noEmit -p tsconfig.fixed.json --extendedDiagnostics  # reference solution
```

Both should print `Types: 463286` and `Instantiations: 23`.

[playground-slow]: https://www.typescriptlang.org/play/?ts=5.9.3&target=9#code/PQKhCgAIUhlAZA8gdQFyQCIEsDOAXAJywCMBXPLANwFNIBjAewDsATLC5gQwBtIB3ABYMctYgU5M6AyDwLVOLAJ6QAtpwAOOSAxoFIeAbVJMszKBGiQABgBVI1AB55qrLfiJMA5lcht3JcmocABpIHAZ9Q0gxCSlIXHimfAkKTmcWbUladWoCc1VqFWJc7QAzawBJZxUfQBQCSAA2AFZgpoBmBv0sFSCAOkgAIXJI0XFJaWZuZTIsbhYtavVuNOp87nZcnhCZVn1CpZXIdedxbi0JDKsAYQ12HiwAL2ofWXklVQ1tXRlIY1MmfLMEZYPQMPhMfo2KI5AgAWh6RRKfkIAQ4THiWnUpDkX1yhgU6HYkHUBAYLFIdCC+UcnDoeCmIzCnB61gASkFSNw8C8tNRKDxSGksF5GTFxplKZlGYIGNwjCZmL1zMBwOA8IocpAABKOSAAXkgACIAAyGyAAHyNAEYzZbDQAmW1GtpOw0AFldTVdDVdAHZXQAOV0ATldnFdxFddFdLFd1FdpUNAG5VerNVVCvrrBsVLCACQAbx1DgAvoXi2Wi45KxWrEnIMBgI0Wu1OgjigQcKmNbQAIJ0Sk4cKdgA8NgAfPqoJA7I5nK4wiivNPIJAAPzWQs3dR3dZPMfjks+S1WYp4Le3PD3fcTo8W6yeajngvb3ePagHu8nkTP19Xvcfrex7WHIv6XtegGHsBVhME+F47v+76flYK6QOgsG6Cmao9pA7I4JyeBZv2g7DjgI4Zio471o2kBtMGbTBPaVqdLSJEMHoTDMkEkAABSdAA682rQdAAlKqjjqOxhEFiWKZAA
[playground-fixed]: https://www.typescriptlang.org/play/?ts=5.9.3&target=9#code/PQKhCgAIUgxBJAGgUQCIC5KoJYGcCGARgDYCmkAJngC4BO2hArtdgPYB2kA7gBam3lqfSIVr52AYx6VWpXJHatqC0qQqRs1KBGiQA6mIAOkIYICeh8ofxiAtqWr8NnfCcaGykAAYBtACoAul4mrJCGAgBupOzKVLh0DMxs7AB0kH582iJiktK0jOzyHBLkHCbC0SwCkABsAKwANHUAzDUAtPa2hE4FyQ2Q4uqmJqS2HviOWcSa-PjE8oPeAML4hppz2ABepMG2q5CsUbTl5L1lpra4pMRRuCnaWV4ASnKMxNTBeBoUldgScyETpQaPQmCwopAjrhkpBACgEQII9kgzQAnM0GgAmACMNSy8Xo7AA5pBpo4xPM4SJSP9GFcBpAzpxWAAzSD47BE+Q8fDyRRhfgdUbdY4SVi0ATECbJLLUULEVhXNIACgyXy+HGIZjZ+GZ5GZYuy4ikchJ2AA1oIeOr2KRMOIDoQAFbU6htagWNRZURG6RcVhvdTyunDUXi65SsrdahcVScTTycKsSy0FhyFIASm0wHA4HdlkgAAlSAAPSAAXkgACIAAyVyAAHyrWLrjcrGJbVeaHcrABZu3VuzVuwB2bsADm7KO7+G7hG7Em7FG7pG7zMrAG4c3nyPBHLZy94ZrY2gASADeReLAF9z5ebxeS-e71515BgMBao0WjVIJ1hbgtw9SAAEEJBKXBcDFXAAB4-AAPnLKBIH8AJIBLRx2AoeQfHZIkAiQyBIAAfm8c8VjWagNm2WC4KvYJGy8KMyNWdZpmo+C6IbbxCQcZiKKo0gaM4hirmoPjWK2QSOPo7wBDEs9yIk9jaJkrwbXkxTKLYqSVIIyBMBtI5N1zICXlwN5lArUDwMg2gYN3UY4Nfd9kTRTEcQGMC5FshR8HseQlR-AB1z8mlaTNwBLQwxWUM8r03IA
