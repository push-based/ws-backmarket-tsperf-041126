# Exercise: Stop Two Nested Conditionals From Building Every Pair

In this exercise we will replace a `Pair<A, B>` that distributes twice with a plain tuple type. Two nested `extends unknown` checks make TypeScript build one tuple for every combination of two 1,000-member unions, so a single type alias costs four million instantiations. Neither branch reads which member matched, so a tuple of the two unions describes the same pairs.

## Goal

At the end of this exercise the `Instantiations` count that `tsc --extendedDiagnostics` reports for `nested-distributive-conditionals.slow.ts` drops from 4,002,001 to 1, and `Check time` from 1.39s to 0.01s, by rewriting one type alias.

## Prerequisites

Complete [Exercise 0: Setup](./0-setup.md) first: repo cloned, `npm install` done.
Start at the repository root: step 1 changes into `projects/test-lib-1/src/examples/07-nested-distributive-conditionals`, and every command after that runs from there.

The numbers in this exercise come from TypeScript 5.9.3, the version the repo pins.

To hover the types and try your edit in the browser, open [`nested-distributive-conditionals.slow.ts` in the TS Playground][playground-slow], which runs the same version. Each edit there takes about a second to re-check, because the playground rebuilds all 1,000,000 pairs. Take the measurements in the repo: the playground has no `--extendedDiagnostics` output.

## 1. Measure the baseline

Before changing anything, get the number you're trying to beat:

```bash
cd projects/test-lib-1/src/examples/07-nested-distributive-conditionals

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
Identifiers:                 86530
Symbols:                     58968
Types:                     1003344
Instantiations:            4002001
Memory used:               740484K
Assignability cache size:       11
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
Check time:                  1.39s
printTime time:              0.00s
Emit time:                   0.00s
Total time:                  1.65s
```

That's `Pair<Left, Right>` building all 1,000 × 1,000 pairs: **Types 1,003,344, Instantiations 4,002,001**, about four instantiations per pair. Your times will differ from these; the two counts should match.

## 2. Drop the distribution

`A extends unknown` runs the inner conditional once for each member of `Left`, and `B extends unknown` runs `[A, B]` once for each member of `Right` inside every one of those. Rewrite `Pair` so it returns the tuple itself, with no `extends` test.

<details>
  <summary>Skeleton: where the change goes</summary>

```ts
// nested-distributive-conditionals.slow.ts
/* code before: Digit, Left and Right stay as they are */

type Pair<A, B> = /* the tuple itself, no conditional */;

type AllPairs = Pair<Left, Right>;
```

</details>

A tuple with a union in each slot accepts every combination: `[Left, Right]` takes `["l001", "r002"]` and every other pair of one `Left` and one `Right`. The reference solution also marks the tuple `readonly`.

> [!WARNING]
> Keep `readonly` when nothing writes to a `Pair`, as in this file. If your code assigns `p[0] = "l002"`, or passes a `Pair` where a mutable `[Left, Right]` is expected, write `[A, B]` instead: `readonly` turns those into `TS2540` and `TS4104` errors that the distributive version never raised. Both forms measure the same, 2,342 Types and 1 Instantiation.

<details>
  <summary>Non-distributive Pair solution</summary>

```ts
// nested-distributive-conditionals.slow.ts
/* code before: Digit, Left and Right stay as they are */

type Pair<A, B> = readonly [A, B];

type AllPairs = Pair<Left, Right>;
```

The `Pair` line matches [`nested-distributive-conditionals.fixed.ts`](../../projects/test-lib-1/src/examples/07-nested-distributive-conditionals/nested-distributive-conditionals.fixed.ts) ([TS Playground][playground-fixed]) if you want to check your work.

</details>

## 3. Measure again

Re-run the exact command from step 1:

```bash
npx tsc --noEmit -p tsconfig.slow.json --extendedDiagnostics
```

```
Files:                        137
Lines of Library:           51126
Lines of Definitions:       50308
Lines of TypeScript:           21
Lines of JavaScript:            0
Lines of JSON:                  0
Lines of Other:                 0
Identifiers:                86528
Symbols:                    58968
Types:                       2342
Instantiations:                 1
Memory used:               97871K
Assignability cache size:      11
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
Check time:                 0.01s
printTime time:             0.00s
Emit time:                  0.00s
Total time:                 0.27s
```

| Metric         | Before (nested `extends unknown`) | After (`readonly [A, B]`) | Change  |
|----------------|----------------------------------:|--------------------------:|:--------|
| Instantiations | 4,002,001                         | 1                         | -99.99% |
| Types          | 1,003,344                         | 2,342                     | -99.8%  |
| Memory used    | 740,484K                          | 97,871K                   | -87%    |
| Check time     | 1.39s                             | 0.01s                     | -99%    |
| Total time     | 1.65s                             | 0.27s                     | -84%    |

Times and memory are the median of five runs; the step 3 output block is one of those runs. Types and Instantiations were identical in all five. `Files` stays at 137, so the drop comes from the type alone. Well done!

`Total time` falls less than `Check time` because most of the remaining 0.27s is `Program time` and `Bind time`: reading and binding the 137 files in the program, which `Pair` doesn't touch.

## 4. BONUS: Compare against the fixed reference file

> [!NOTE]
> This is a bonus exercise, you don't need to complete it.

`tsconfig.fixed.json` points at [`nested-distributive-conditionals.fixed.ts`](../../projects/test-lib-1/src/examples/07-nested-distributive-conditionals/nested-distributive-conditionals.fixed.ts). It uses the same `readonly [A, B]`, and adds a `pair()` function that checks one concrete pair at its call site, plus two example values. Run both:

```bash
npx tsc --noEmit -p tsconfig.slow.json --extendedDiagnostics   # your edit
npx tsc --noEmit -p tsconfig.fixed.json --extendedDiagnostics  # reference solution
```

| Metric         | Your edit | Reference |
|----------------|----------:|----------:|
| Types          | 2,342     | 2,387     |
| Instantiations | 1         | 39        |

The reference counts are higher: the extra 45 Types and 38 Instantiations come from `pair()` and its two example values. Neither file builds the 1,000,000 pairs.

[playground-slow]: https://www.typescriptlang.org/play/?ts=5.9.3&target=9#code/PQKhCgAIUhlAZA8gdQFyQHIFMDOAXLAE0kIEt8AnUgIwFc9SA3LSAYwHsA7MhrgQwA2OKBGiQAKgHd2kUtywAHLPM54BATxLk8VOgWK1OpLjkgKK7QrVYsAwnwoEcpPpwC05y9byRpFANYAdCKQAAbwWABmeKGQrsShAEqkAOYAFjFxFCxYfKxpkCnKWBR8+pCRFgC2kHhp2VhuZCmkPhxV1HJlxpw4ADQhLYxyKZAAjH0ADNOQVVgdJaZKFJDOhFiBYQAKfKQUADwR0X2Qyel4AHyxZJQ09LiQ1Ox1IRzcrT2C-Y+0pAJknFGggE4ymMwA66DppNIABeKHTMEwhS7CimLgsaiaDGoEKhPA4ViQNxuLAADwI8kIABEXClOOx8KRWDhYtkFOxHKYACxggBMYLGsl6eFcDG6JmC0GA4HAeHUSkgtJaPnhACJJmrIAAfSBqsZa3VqvmGvUAZlNau5loArJaAGyWgDsloAHJaAJxqgDcsvliqOqrCAgAJABvZWtAC+4cjeBjEdS0dC3sgwGACJhcwWaLlCpYZwycLCFFjSfjZZVCbjUZTaYzE2hs3m1EWfvzkB2e32AEETgAhC5wqCQHuQcmUwimQz+BmSTgjyCQAD8kH744pyinkBnc4XS4PK8gAG0+2uALqLg-oThYZgUK83u8lX15xU9gQCLto4vfw5RPATkLS5U3TTNIEhRsZhRPZTEkNJlE7VEtFuPRcFlckOUcSAwyjX0gA
[playground-fixed]: https://www.typescriptlang.org/play/?ts=5.9.3&target=9#code/PQKhCgAIUgxBJAGgUQCIC5IEEBuB7ASwBNIBbAQwBcBTAJwPIBsCAvAgOwHNJqc6BPSAAdyBWlAjRIAeSGUCedpACMmVNQBmdSDibEqCpQFd28xpHKQAxoqu1qNYaNqQCAZ0hujQoc2okcBgtIDRMreUUAOglIABUAC2pISn4hJPtGA0U3eIIhVw8iaitM+xIAIyNKSHY8aupyTjpGQQoaej0Wf2joGNkIpQAmTABVNyTLNwJSXySm9joCK0gAdwJKeLwqyCJ3SnpKgZ7JGABlclIk5QAaAAZ7yAB1lTuHy9Jy7SI8Cg4LDw2STcjDwKx0dCmimukEONWo60SLjwckMMV2bn2BEO1Dc0LceGSiUgAGFyLQaFNyEohLQ8EQjOECnC+C42otOt0JMBwOAUmlIKgCJx1pAALyQABEtwlkAAPpLlDL5RLBkrJQBmNUSgAsWoArFqAGxagDsWoAHFqAJwSgDcPL5SQAMppquKAAaMAAkAG9BcLKABfX3+9bBv1CsPu22QYDAF73W5kagfCG81JJABKQvibsg7toIcjQaLAfDoaD0dj8ZuieTqdobh5cZkKMUKkwp2ms2SGdWCK21XRmMOqMdkAACs4ADxYaEAIQAfGLIPZyN92C1IABtOeQecAXXt46wjEYU7EHnFF9o05dGko0OznFzi-t4Bb-UMkGGAs02l0ZgiCyJRKAJWgTHkS5+w2YJQnYcJUXgxD2xEMRZx4AAPGh2CIDx70ffcsJwvDIGfV8AAooEgRhXUwOdqPoF9KEwedrnAABKTA1w3LddwXA9IB9RiHCMWglG3WiH2hJjcyPcBA2beMxkaah0HAGx2AxLCLlmZQVzQ2gKIlRh7kVaEJVoMyJQ4mMW0AZHJezSABaNxyC0aFahJMkKQYalaXpcINOyepMN02jfxvO9XSfHNKGXcVtxM6yLKs25VSPatIEcjgtFoMpPIJUlyRxPzhAChlKB5ahMKEPBySEwN7SAA
