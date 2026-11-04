# Exercise: Put a Depth Limit on a Recursive Mapped Type

In this exercise we will bound a recursive `DeepReadonly<T>` so it stops after five levels instead of walking a 66-level chain to the bottom. Every level is a different named type with 200 sibling fields, so TypeScript can't use its shortcut for self-referencing types and transforms each level in full. `tsc --extendedDiagnostics` reports that walk as 639,432 instantiations.

## Goal

At the end of this exercise the `Instantiations` count that `tsc --extendedDiagnostics` reports for `deep-recursive-object.slow.ts` drops from 639,432 to 54,681, because `DeepReadonly` counts its depth and stops at 0.

## Prerequisites

Complete [Exercise 0: Setup](./0-setup.md) first: repo cloned, `npm install` done.
Start at the repository root: step 1 changes into `projects/test-lib-1/src/examples/09-deep-recursive-object`, and every command after that runs from there.

> [!TIP]
> [`deep-recursive-object.slow.ts`](../../projects/test-lib-1/src/examples/09-deep-recursive-object/deep-recursive-object.slow.ts) is 2.3 MB of generated code: 66 `Node` types and 66 matching object literals. The only code you edit is `DeepReadonly`, at lines 31–36. The file is already generated, so you can leave `generate-deep-recursive-object.mjs` alone.

The file is too large for a link, so the TS Playground gets [a smaller copy from the same generator][playground-slow]: 66 levels with 2 sibling fields each instead of 200, on TypeScript 5.9.3. `DeepReadonly` sits at lines 31–36 there too, and the step 6 bonus reports the same errors. Take the measurements in the repo: the playground has no `--extendedDiagnostics` output.

## 1. Measure the baseline

Before changing anything, get the number you're trying to beat:

```bash
cd projects/test-lib-1/src/examples/09-deep-recursive-object

npx tsc --noEmit -p tsconfig.slow.json --extendedDiagnostics
```

```
Files:                         137
Lines of Library:            51126
Lines of Definitions:        50308
Lines of TypeScript:           178
Lines of JavaScript:             0
Lines of JSON:                   0
Lines of Other:                  0
Identifiers:                286246
Symbols:                    418509
Types:                       67667
Instantiations:             639432
Memory used:               344676K
Assignability cache size:    53402
Identity cache size:             0
Subtype cache size:              0
Strict subtype cache size:       0
I/O Read time:               0.02s
Parse time:                  0.26s
ResolveTypeReference time:   0.00s
ResolveModule time:          0.01s
ResolveLibrary time:         0.01s
Program time:                0.31s
Bind time:                   0.15s
Check time:                  0.68s
printTime time:              0.00s
Emit time:                   0.00s
Total time:                  1.15s
```

This block is one of five runs. Its `Check time` and `Total time` match the five-run medians, and `Types` and `Instantiations` came out identical on all five. The work is triggered at the bottom of the file:

```ts
// deep-recursive-object.slow.ts
type Result = DeepReadonly<Node0>; // walks all 66 levels, each with 200 extra sibling fields

/* const n65 = ... const n0 = ... */

const raw: Node0 = n0;
const result: Result = raw;
```

Assigning `raw` to `Result` makes the checker compare `Node0` with `DeepReadonly<Node0>`, then `Node1` with `DeepReadonly<Node1>`, and so on down to `Node65`: **Types 67,667, Instantiations 639,432**.

## 2. Stop at the leaves

A common first fix is terminal cases: return primitives, `Date` and `RegExp` untouched, and give arrays their own branch. Rewrite `DeepReadonly` with those cases and leave the rest of the file alone.

<details>
  <summary>Terminal cases skeleton: where each case goes</summary>

```ts
// deep-recursive-object.slow.ts
type Primitive = /* every primitive type, plus null and undefined */;
type DeepReadonly<T> =
  T extends /* primitives and built-ins to return untouched */ ? T :
  T extends readonly (infer Item)[]
    ? /* a readonly array of DeepReadonly<Item> */
    : T extends object
      ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
      : T;
```

</details>

The function branch from the original goes away. Its job of returning `T` untouched now belongs to the first test, which checks for primitives, `Date` and `RegExp`.

<details>
  <summary>DeepReadonly with terminal cases solution</summary>

```ts
// deep-recursive-object.slow.ts
type Primitive = string | number | boolean | bigint | symbol | null | undefined;
type DeepReadonly<T> =
  T extends Primitive | Date | RegExp ? T :
  T extends readonly (infer Item)[]
    ? ReadonlyArray<DeepReadonly<Item>>
    : T extends object
      ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
      : T;
```

</details>

Check that it still compiles, then measure:

```bash
npx tsc --noEmit -p tsconfig.slow.json                          # no output, exit code 0
npx tsc --noEmit -p tsconfig.slow.json --extendedDiagnostics
```

```
Types:                       67585
Instantiations:             691997
```

Instantiations went **up** by 8%, from 639,432 to 691,997, and `Check time` went from 0.68s to 0.77s (median of five runs). That's the expected checkpoint for this step. The 66 levels carry the cost, and this version still visits every one of them. Keep the terminal cases; step 3 builds on them.

## 3. Add a depth limit

> [!WARNING]
> A depth limit makes `DeepReadonly` shallower on purpose. Pick a default that covers the deepest level your code reads through `Result`: with a limit of 5, `Node0` to `Node4` become readonly and `Node5` onward come back as the original, writable types. [Step 6](#6-bonus-find-where-readonly-stops) shows where the line falls.

TypeScript has no arithmetic on number types, so we count down with a lookup tuple: `PreviousDepth[5]` is `4`, `PreviousDepth[1]` is `0`. Add a `Depth` parameter that defaults to `5`, return `T` untouched once it reaches `0`, and pass `PreviousDepth[Depth]` to every recursive call.

<details>
  <summary>Depth counter skeleton: where the counter goes</summary>

```ts
// deep-recursive-object.slow.ts
type Primitive = string | number | boolean | bigint | symbol | null | undefined;
type PreviousDepth = /* a tuple where PreviousDepth[N] is N - 1, for N from 1 to 5 */;
type DeepReadonly<T, Depth extends number = 5> =
  /* stop here when Depth is 0 */
  T extends Primitive | Date | RegExp ? T :
  T extends readonly (infer Item)[]
    ? ReadonlyArray<DeepReadonly<Item, /* one level less */>>
    : T extends object
      ? { readonly [K in keyof T]: DeepReadonly<T[K], /* one level less */> }
      : T;
```

</details>

TypeScript never reads index `0` of the tuple, because the `Depth extends 0` test returns first, so `never` only holds the slot. `type Result = DeepReadonly<Node0>;` stays as it is and picks up the default of 5.

<details>
  <summary>Depth-limited DeepReadonly solution</summary>

```ts
// deep-recursive-object.slow.ts
type Primitive = string | number | boolean | bigint | symbol | null | undefined;
type PreviousDepth = [never, 0, 1, 2, 3, 4, 5];
type DeepReadonly<T, Depth extends number = 5> =
  Depth extends 0 ? T :
  T extends Primitive | Date | RegExp ? T :
  T extends readonly (infer Item)[]
    ? ReadonlyArray<DeepReadonly<Item, PreviousDepth[Depth]>>
    : T extends object
      ? { readonly [K in keyof T]: DeepReadonly<T[K], PreviousDepth[Depth]> }
      : T;
```

This matches [`deep-recursive-object.fixed.ts`](../../projects/test-lib-1/src/examples/09-deep-recursive-object/deep-recursive-object.fixed.ts) ([smaller copy in the TS Playground][playground-fixed]) if you want to check your work.

</details>

Check that it still compiles:

```bash
npx tsc --noEmit -p tsconfig.slow.json
```

No output and exit code `0`: `raw` is still assignable to `Result`.

## 4. Measure again

Re-run the exact command from step 1:

```bash
npx tsc --noEmit -p tsconfig.slow.json --extendedDiagnostics
```

```
Files:                         137
Lines of Library:            51126
Lines of Definitions:        50308
Lines of TypeScript:           182
Lines of JavaScript:             0
Lines of JSON:                   0
Lines of Other:                  0
Identifiers:                286261
Symbols:                    343722
Types:                       42511
Instantiations:              54681
Memory used:               302505K
Assignability cache size:    30727
Identity cache size:             0
Subtype cache size:              0
Strict subtype cache size:       0
I/O Read time:               0.02s
Parse time:                  0.26s
ResolveTypeReference time:   0.00s
ResolveModule time:          0.01s
ResolveLibrary time:         0.01s
Program time:                0.32s
Bind time:                   0.15s
Check time:                  0.42s
printTime time:              0.00s
Emit time:                   0.00s
Total time:                  0.89s
```

| Metric         | Before (unbounded) | Step 2 (terminal cases) | After (`Depth` = 5) | Change vs. before |
|----------------|-------------------:|------------------------:|--------------------:|:------------------|
| Instantiations | 639,432            | 691,997                 | 54,681              | -91%              |
| Types          | 67,667             | 67,585                  | 42,511              | -37%              |
| Memory used    | 344,105K           | 367,040K                | 302,387K            | -12%              |
| Check time     | 0.68s              | 0.77s                   | 0.42s               | -38%              |
| Total time     | 1.15s              | 1.24s                   | 0.89s               | -23%              |

Times and memory in the table are the median of five runs; the block above is one of those five, with `Check time` and `Total time` equal to the medians. Types and Instantiations came out identical on all five. Your `Lines of TypeScript` may differ by a line or two, depending on how you formatted the edit.

Great job! The depth limit accounts for the whole drop: step 2 on its own pushed the count up. `Check time` drops by less than `Instantiations` because the bounded version still transforms all 200 fields on each of its first five levels: the limit removes 61 levels of work and leaves the cost of each remaining level as it was.

## 5. BONUS: Compare against the fixed reference file

> [!NOTE]
> This is a bonus exercise, you don't need to complete it.

`tsconfig.fixed.json` points at [`deep-recursive-object.fixed.ts`](../../projects/test-lib-1/src/examples/09-deep-recursive-object/deep-recursive-object.fixed.ts), which already contains the solution. Run it side by side with your edited `slow.ts` to confirm both land on the same numbers:

```bash
npx tsc --noEmit -p tsconfig.slow.json --extendedDiagnostics   # your edit
npx tsc --noEmit -p tsconfig.fixed.json --extendedDiagnostics  # reference solution
```

Both should print `Types: 42511` and `Instantiations: 54681`.

## 6. BONUS: Find where readonly stops

> [!NOTE]
> This is a bonus exercise, you don't need to complete it.

Let's see the trade-off from step 3 in the compiler output. Add three assignments right after `const result: Result = raw;`, one blank line below it:

```ts
// deep-recursive-object.slow.ts
const result: Result = raw;

result.id = "changed";                          // Node0
result.next.next.next.next.id = "changed";      // Node4
result.next.next.next.next.next.id = "changed"; // Node5

export {};
```

```bash
npx tsc --noEmit -p tsconfig.slow.json
```

```
deep-recursive-object.slow.ts(181,8): error TS2540: Cannot assign to 'id' because it is a read-only property.
deep-recursive-object.slow.ts(182,28): error TS2540: Cannot assign to 'id' because it is a read-only property.
```

Two errors for three assignments (your line numbers depend on your edit). `Node5` is past the limit, so its `id` is writable. Swap in the unbounded `DeepReadonly` from step 1 and you get a third `TS2540` on the `Node5` line. Restore your step 3 version and remove the three lines when you're done.

[playground-slow]: https://www.typescriptlang.org/play/?ts=5.9.3&target=9#code/PQKhCgAIUhlAZA8gdQFyQCIFMsAdIBOWAxgK4EDOAlgG5aQD2ARgFYkAuk7BAhgHYUAZgwIBbHuyoM+kABSk+TBgoAmWFQEooEaJABKJctTqRxuXOq4BPCxTnY8ABR4FJPADYAaTDlwGeKtLuVt4UxAAWWOJcvALCYliUWrpEFhLqwZAqBLT03PxCIuKS0nYSkFg8EZB8WBSSfADmkO5YdO6QAO5U7OE1DFyJolR8HtqQxDwU9Pwq-Vl4vS1Uw+wAdNrjAAYAcgxqAAxbkFRlE+E8I4yCkABst1mnDcTs3nzSALQKVPGiLW1Ydx2WR7Q6QD4APnGoKwAEZwRDIGtkQjIDDbgBWDRrSAAUSqfVa7ROZ0aWD4pBGgKsj0EgkS5PY41Goks7BsWDeDE4PEg1CarT5gMEHyI9KIfDcHXZFlCA169AiJAA1okJvx3pxSNNxj07NrSB5CIZKLkPjL6BRwiJ2GROLIphRSMMmlxIsb3BIpDJre4VGU+CpxkriMqRs1pPQiYCNJBACgEJ04Fzs7AGnQ8yrd9EZVCI50ufBxABULpx0+5M6dxvFiJYmDTHVRGnxw1nTBIIq2tnwjst2IkjanIFsDE73Owtt5OuEqBFxkQAI6UohnQSkdwdeoEUgvchG4gMUS4FynaSQHiNAv1NsKJSqdTbBx+SqBPjBAA8MIOEK2G2g43xapow6DwKAGSYCByOpIAAJnPFQVB6b0jWoJh3FbQQqEBf1xlkLZMOwo5kXwrC-VhScKgJc8ZBGdDam2ABvSAaA8UhOQmZRJW8QRPUabxiCIdIVG8Y92H7AgZAAX2OZg2BeWMmCwKxpDmBUOKIbYqBULZgC2T1FPcHStlZdgAgkHgjNqAAPCc+QuCxiw5WABKoXB2AAcjsAAiLArNrChjEtUzQ3GNQ3PCLzllWSB4jdU5IDDQNrj5bgd3YPcOiIMhTTPMNQzsK5OkBDpFPiLBxlhABOAAOf52goOUFnC893EjdU+HczhcG1Po1IPa8RlTcZWSmPc0Poct3A+YhWtDLgVnoBNujUFtXQBAgaWAk4BH7AJTHXSRcHQ6CFXGCwCA+Lb+s4XpyiyoxvUgY8rDse55tZOxIjzJhSE4IIaQxcZJA+7a20wqzLDoHK+CnGdqni6dykw0YNxpcRVTsABhSIQt0YGsGAItuUHBbTAYOg-x0GAAHFyQHfs5nrSAyVqXh+w+NQ8FFE1Ao+WSODWUQWDsOD7m0YBwHAC0fDwfxXw-ItEQAXigSAiwqGzyX9ORkTWFxGgodB+CsABtABdWMlcRY3VcgSAAH41dtyB0HV3z+0DOx+ZeZ27cdpjBPlmkTYAaVB1VlJuIszfQJ85f+98i1Ds3EUk32XbVgBuSXpfRDFICVyAmK09At3DTOWh4AzS+4cuOIUdh0ApURFIICuqkkOh0CUBhWn4CvTINmuciac2K5MszTPQJiBMqBnY-SCvSFwFQhIX-tIEkiuCL9A5p+Y1isGHuuDwbpvnVb7feO7hhe8qPgK9ntfMEXp6JHEvh0AMRpcSs-At5iqRFQsJ94sXcGxY+TRH6cUbjUC+iQr4XhvnffuExBLzxfv2CuokP5fywD-P+m8K7WVgRSDcRCpYcjRPsLAtwAAsBci4nBUJAxoFd9KAlYdAs+cCW4IPPC8XIyC+4Py4BeQ2KUR6NDHqYLAplV5TyYU-DBGBX7LwUeode9AAE7xUHvJhYCIGSJPjA8+fC24xWvpAHuIjH7oM0ZgrA2D36JE-vofBv9-7byASAgxh8uH10lGYy+likHWNvrYtBc8HGqKwW-MSri8EEK8TUd26A84UNzjQ24ABmRhxcWHGKgZXauRS2GBNIfAixHchHhJQaIweEiy6jzNuPORk8eD72UTEtRK9n6xO0d4wioD-FlO4UE3hISeJhJsffOx0TCkDOcQkiSSTPFEMAdhXxTFDFHzGRU4J-DpmNGEXMqJ-TX44MSe45JGySHpOyQwrelCLDULULcOChcCkBI4e4AJp8JnNxCTUrudTImNNYTIieCjOlKPsYs3pGiEUbx0UA-ROzRnNPKQCyp5jEEnLBWc7pyKnHxNwTc9ZqKtkjPAXsrF4zcVTKsbM1BxKtHLPJd-SlxC0lvNoXk55WT3nwi+cwn5VdOH7JxYc6pgjQUsoaeIyFrTZHyPMl0+F7LIDqIuSioZu8aVGPpQcyZRzmURKJZqxxHLrlcsIVSsihq6W12KdK01FjjmnNZVapZZLbUePtTymyDz3lwUFVQ9EBx8liv2b8-5pj3XtzlXshVA8lVlKhe0mFGqFlap1So9IGzdHooPrS+NPCgVmpmRa71ubrV+tWRSwNmzHV+LLVKhNlaPXmvqfM3VpKrmNrtSk+5fLbjwnDa8mEGJKrRpLrGiVfyO0VqqUmzuKaa2KqHhmlV0L1Vwrrb6-NPS9Utr0U68tgLV2hIJam85Ba4mDrccOotPiL3LqvXim9XrRFsvrU+tZzbR2RsyRGmhGJaqivncauNH7GX8JBRu3tYjt1YszWqxRM8fWIv7a+4ZbajUuuxZ269nrCW1v7TaodAaUm6O2aWwjUiGUyvxT+vtD6B0uOo7cgBwHwOzsnfQadAB2OdhSYOLsvfB2V662MoaaUR9DHSc2Ue1X0jjeGDUEedUxk1XbWPkd-dhx9XHn00c08A99xq3X6e-YZ9jJ7OMrLMzxoNsDp21UE3yjEDwoPiaI+wyTcGWMCNk-Z+Tyq2kYdhVhw9OGNMOvPdpqTIWyN3r-b6gDTbaNvuS8FxNdn0vGac5y8zvHeUidA1O8D+c-PitKdZkjX7ENyYhTuqLymD2qePSSizJbdkpYK2lzdDmSVUZc9ys99GBv5ds8N5DGXLmmcAyOir4GHheenQwurC6GsBb09elr4W2tod3Vm-dsXuvqcc31qz+2bOkZ7ZExbJnnMrYs9NzF92mtMurQt4r433vleDd5-Om3wN5J2xJvbumHvNeTa19Np2OvZq6xxpe13euJf6192HP2q23pG-exzgPssfbu3jldX75vPYBw2ibQG1tqAxE87OQqsAYk+Uw6D+3YONap8ChHx2keKbO9FlT6O1NIq0bdvL-PP2-cJ-9uLr3SuuamxTkxAuCdyZeyV-16u+PM4FWzsDzORXc-87pvn33tcydqXek7ouUcXeJ2NqXuHsea9dfj7tf3acq-19xybdHvfEbtwZorgfScvuB+58DYbTfVeZ1GqHvOgvy+k2uh3ROndSKU6jy7kuesy693L23Cudfhb1zHsr+rLPl8p5Xv3SuA+qay7HtzIaOcTqT0JmhdDZ1p+txnivWfQs5+Q3n8MBfXc149wl+vOP22Z9S09y10f6dA-r59lfY+1-+43+35bZO4-d4xFG8Hag6GQct-VyVq+CtHcdyL-PYvOtF5Jwvm7ZeMV76b+PjTkfpLh3nXhro3lrs3pHkTvPqAYbkzlgIPlVv3tfqJsPnXDbgASFs-rnq-jPu-oXm7nmpjqXkvmHsxkNuvhRiASfp3uAX-oxpAYAVQUZpvnAZNkbogZ5n3nynQr5nfrtg-vvk-kLi-qhs7qqh-kQfWiXo4rLgwTpkwQfq3sAV-uwc2qHhAT7hHoVjAXTuoatiDjCHQqJlfogbVgIdDkIVgSIWFmIQpm-i7phtIUeiQXIb-gxoodoVAbocrsfm9qfjvuQQdtTiwaNlqgYXcggXwcgbwdtpYenjDkobYZPuCngS0k4TFi4fFj-mQVoeHj4UAdQWobQWAZoQoYNnNmEdkargbhwdEWDjwcYZDgkSPkkd4ePjgVPukdIgQXPnTrIQMvIZ4ZUY9ofsUe7pEYlrvowR0cobrvoaUfAUYQPqzi8igYgVzt8oIUuo-rZl0WkeIY4ZIYQfPoMYWh4TNnsWMSoRMREUsSHrlhUbNjcQsWwQ8YzisdfibusbwRbtsVYbscIfsaIbgUcfgZkRLl-ucaesWsEXDorm8f4Wro8dSvkRQVUeMawciXUZ8fHtfonr8cYanq0RgaPjYSCXYWCQ4RCScf0ZvjCYMmesvrMQUcwVieEf+h8Tlmic8dcaERyTUUHgzoYfiYgb3kSTQjkkPqScUpgckZSakWctPhkXSc4WcW4UMZcbjgqa8dXosQEXQeUSMS8QKbcdiTQYaWAZwXQpfk0VKbfgCYkdYbqfDlSd0eCaqXuuqQMZqRcXkXycCXqVHjicHhoU8SafyYifqe8VacsWKdKbETCDkmgbKeUvKXMSkfKtSZFmqVkRqdLu4QGZGUGWaUiZaSieGbySWRScGXobGZWaKd3jktwZKWoDkvwU6W0S6ZmYqdmR6TSV6edj6QyX6bCWivCb7tAX4RWbiTya2oGbWWWTGaGSKVEV8VgCmUmVKRYV2WSe0WydgaCQObmd6fmb6YWVqcWVcaWdGSGbOWGfOQ3oua6XefWaudvqkhuR2due2fEXuXKeSa+QhseYcYOb0ZCWjtCWOUyXCeiSEW+TOSUXGaiQuTWcBS3uWchY2euQmY0W2ZuS0QBemUBb2YdqBcqT0bPiOVdpef6cyZOToUURadhXOeTvBQiVXveaxY+bhc2WsezjklsTGoCaMW6UqagiqRBXmVCe7oycMTeUuYhW3g+WudMYxYUdUbAdyXxXyjkj8YJf8SJc6UCUpSBe6WBaecOeeaOXReOfhi+WRcudxZMTpepRxVOb4SpTxWpV3npYSYJSScRYFgeRieRRZZRZ6dJWebJcQXZbBROR5UxVpQaThe5Y5YeZQYKdpShXic2RKezjBDKcFSUj2ZlX2UhpZe1jJVBXJTBQpTqU5cpaoa5blU+TMV4eVXWUha1WlX5cmXaQRTBI6cZd2aZRhdnv2VVcjjVZ-nVfFQ1f-hNV5S1fcW1exRlWFc5e+apZ+ZwUVb+VgDBKmSVRmV1eJVNZFeBdRTZbRZ7teY1edc1XcVyetelehU1VxTtT5XtQgcNYdTBJ2aNfuWVVtYLhFZJVRX0TRcXvVdqUtZ9ZhSubtYEfQR9U9V9T1WtX1V+WKcdQDbucDYBaFQheZRJVutddDbdbDQtfDayWDZjd5b1Wxe9YpctcxZyZlm5f1TQoDQDf+UTSRSTZxfbpdZDVFTdbFTIXDQ9QjRjUjS5djSzUEUlZpdlalcrbjd3jBPhYVURYLSFaDaTaLZVVdVZeLrVXFfdQxareyeaZzUtm9SrZtcbdOUzUrbxWfnyjBAJWbkdcJTzmNWJeDeTWmhLVTVLa4bTbLfTa7StS9VzU7WjWzYjW7ata9TjftQZX7TBEZYHSDeNanRPmLRTebVIQWdbXBS7SLWnQnY7TjcaSnfLbXSxczZ7TzWoDBAFTnUFQbaVYXc3cXabeLZTZBXNVbYvjbdXZ5RzUKbXuro3Y9QzQrd9W3b5Vrd7QVX7VVGJvfgPcvZNcPaXdVTFZbdLdHVPejQffHa3R7evYvXLdfbPTlZnX9YNezrCCNfncTUbTXUPYjuHWPXPd-ljjHZ1U-SlQ2ZrQ-bHX-c-Rre3RvTCDvWYbCCdX3WddfQcWbSfdZZHTkaA5fU3RA+rVA4gzA+A3HfA2Q+vZwZ-YdbCEDd-ULb-Z5dgyPWXacReZXYldPclaQx+ajRQ8HYzenYna-RuWgww4Tcw4bfvXHew8fTNafePefTww5VfVQ5A4I0aRGcQ1owIyjXQXQxtvaWoLCALbI-3SIybQA6PbNcA-JXTZQ3A9o0Y2UXo0vQY-bcA1MR3XCLrdvfrVY5gwoxRRw7gxbao1Heo1pnw2rT4y-dA544-d41hWvb9ZI77cnnCAHVbgXTY4fXY5w-SXdZPVXZo644Yz9UIyk7AzPW4zU8YwgbCNnTk7CHnfkz-fI3-Yo2HfYyo44zLUQ141U4kwg-fXUy4w09Uxk6jXQ93e073SE6RYPX0xFpE+Xdw+U7w5UzM+MzQ5+cI6ac9bfRnZrXQ1vTk8VRg6s1g+E0oxIYMxXTsxo-o2M+k3fUc1M4UzfQ7bUYg3Q+-X7V-V0ywz02ww8-0yUzDdBRfRU+8-s58+c+Qz8yc6I3XQC7QwgQJmY1gOgys8LZCxDY88cc89s7kSM6kx88jU0x49WYi-wwczo9aQga2ezkw2C3I78+s1JZLWfTE683E3s0y8i+I8kwy6M0i7S3M80xuaYXizI1y9Y+i7Y8LoAw4y85Swi1K6KzK187U5K9S9K4rSi9ixuaYwRZY8q6E701Cxs8o3gwKwQ6QVS-U3q6a+K6i0a+6wk2K-XRcwgYEzk8Eza3c2EyS9C5s1w7ZbE0lvE3bf61i98z69Mx66vQa3K2KdkxsXk3vTy-a3yxHc63Ek42A789QyywvWi1GRi2c16+awmQw7vTsQW5Gw608069Ey60WW62m36-q2aym2hYywO56wG4C39Ydcs2G0Szoby1DUA1q4Qzq8a+m1jUO4ayO7q2Oxm5u1m93hKb8aOAdIwnHC+AnF+BCBXMAMAF0BmGUOQm9MBA1JRNUN0EsHBO7LwHyFQGhBhEAhQJLAeDtDUJiC215HwJiF5N4LBpBzQh8NB-xAmpiN4EdqlOxG1ibF5DwDB5AF5EwF5GbN4OS3WrUJ0I4rIBoN4LIeR5R7GJJNxLszNl5FZHh26rCNxFYhh-xFanRwMlRyJCfsAFZHe4x8naMqx+xwmpx3Zjx9Ifx+kIJ1vpACJ2J28LymQh0M8iB9eFB9a+gJB-Qnh3B+8GoIh3QtJzwvQmh0LvJ1hzh3hwR0RyR12wp1gBRwJ9RyA03B5-R5vEx285J2x8hzwrJ2RvJ3+op-2Mp1lmpwFxJ+2lJ6FxMuF9x9uOxFF35150JwEfF+J6OlB-hbp5wFB6G4Z2VyZ0FvB+Z7klZxMrkrZ2FvZ+mth7h94M58R5q3x9l0p957R71zFwx4F8KyxyFyaml2EpFz155317l+SvlyN8+SaclxN1x1Nxl7x2R4N1gLF8J6Jwl4V-QhQiV2B3m-h1BzBFV6UjV1gIh1dyl7Ah8k17Ui19um1054R116R8-NF7t-124X91Rwl6u0Yqtxx+twStN9t7N0N-N9cot4l2D+NxD3J5t+57D-9-D42oj0dz8ad1B50xV+Otd5Krd4h7CPV097J+h+jw5+1-h19651Exj-RzR4Dzt8D+J6D3suDzJ5D+gND795z953Fwd9z2i3z2FwLzEGxFt8L5j3t3l+LxpyDpdyd6UKV7cDO8TwcKT0uuT9r1T+gNry96Cm9xIh9x10z91zD2zz56kor8N324Zyj-z2j3L6zzlyp4j8c1L6lzL0LxgkD6L-t+pxvYTxr6B3wDOhBzH5VPrxVwhzOsb5ADOmb3shb+gFb4zy57bwr-bwN07yD8x8F6n5N1D+j1l079j24r75L279Lx75lzN-b2L+H0d4NQTxBnHxBonxd8n9VKnxBhn4L3T61459b3nz98HyL+z4WSHyX0F0l43wH83-L7PzXz7yr0j7z6v7AhX2P579X232H4d5p7Hzp5rzUBiAS4UpB7f-3+T4-49+gLf6P7L5hxPwz518z1s3b97yL7+cJey-ZHuX0D5V9W+3vdvkv23Yr9wB6-L3nN234d8L+rZbvpywq4+Yn+ZnO7tgNf5p9bgH-LPpABz6-98+m-Qvhz2L4gDRuZfAgYf0-4b8HEIfWvugHr6ptXeCAiLpAIAHICYBBXC-gq3ADd8lWWAjEDgOT4SCCBGIDEMQPH7vdJ+ufb7m5xP6ADqBwApbiyT37cD0ux-KAfwLP60DluY3XQRt30F8C4eKA8-mrx8xR89OLOXvpZ1g7VdcBHwFnMPzoTyDPe9PT7tP1UEGCrBQArzrAPjYrd9+6ARgUHxYFz9rBxgjqlwIYEQCLBBfaAUYNV6kJZB9g0rhiHK4Xdchkg8zgUJkE5JvBX-RQT-xt4z8YhW-YIX11CHaDEha3RAWoMMHK9w+fvCIZACiG8DUhbQhbjv0K6OCr+0fTnL3we4qtn+Ewt1JzjKHeBfBU-FQSz1aFBCNBIQ4wY0Pw5dCehKQygWkPaGhCEhWwswZX12E1DT+BwwQbYPx7X8Y+RPfIZTxcE3c3BGIR4SaleFzCNmZAqoQEMsFY8Hei-DYe+n94H9khLfP4UrwGEdCG+Jwo-uCL6FWCBBGQpuGMJGEOCde+QvXk8LJ4vCsR7wg4J8IWHKC-+MbBEf8LqFDcGhwI7YWCOYGFJWBcQpbkcJBGRDaRSAxEekIj6vDshNQJAjtkg6D5Chd3QUQQMHyEjv+fgpYf-zJHKcKR-3KkXlhZHdC2RKw-4UiN35NDUePAs4fSNiHqihhXfW4Tfjj434hRHwU0aKOqjiiKhkokkaUz2HIC5RXPLQdSNhFMD2RaozkZ0LdHRDdRW-fUZpyQJojSuJhE0cJjNEmFU+Jha0ZbyUHkDqhfoqgQvxF4KjniSonYfCIdEcjLhTI10UkJaGBDPROYiPsaODG8jMBF3PghGNuBRiiB-9d0USPjG-CZRAPZMTQJdGKiaRBYiEaH2LHej8x2ozMecP2FQibBpCUMWWL4B0IxBlY6QZMLcHTioxcg+sSQO+H+DlhhY2UWsPqFAjOxPo3oVmKLGjj4heY5oYOLpG+d-RnIwrjEUnF0IDOlY5wfOIQ73ioxXglcQoNjGVD1x0ow8VuLbGaCXexwgcXoKHGJiRxCPHfv2LPGgSLxjvC4ceORG8jiuRovIQKJyQRiMJoo0oR+J8ESjFhdo2FuBMdHbjKRu4tMV2PPEejIRkE6EZwOAkwTzBYEy8QhNoljim494nkVOPO4CiJhpnF8dMITR0IYIMY7PnGJ+Ebiex8-FsamPCH7idRLEiCTjygkwiQJTEuCQyIDFq86ENw6PnQnuECi3h-E8zvpKjE087On4sSd+KlGki-xrYmSeRLklqTThzE+CUpLr4qT6J6YlUZuN7GISSxhJAnraRNF4jjJwovEW6ltKiTSB4kn8bZOHEkSAJ6wjsRRPkmuTNJXo1SYxJckaS9R14wMRKQJ6Jl+RfAaUmaLKkEDpS0UtcTZPtEJTVhSUncSlKcnZS4RuUq8X2KylajYJ1EvyWxKuHjjDR0fFsnHxbLlSh+lUq0bhPKFfjbRFA+qeSNInyjHJpg5yW1N6lsDVOnkuAWALWnujVRNE5SagLV6JlJxW5EqSmXKnhjKpwmaqbFNqlETFJiUhyc1NWmtT9pvkzaRwJ2k6C9pvop6dmP8mFcRpZ0isZBw7LlSaxlUusbTzwk2iCJ804iQ1JelATvJ3YlsV9O2kmD6B70-6W5P6H9SkJpU4QUVJnHgy5xYUj4DkjnFupqZd06yYROpoLT-xKMnnpqPd5USDpfUo6YcNPHdT1JG0xkRHx-JnSHx4Mp8ZTJyRPjaZ742GTNKslzSExAMxaY1LImvScZ-MnKYLPVHQTNZ60rmZjOOmkJqZXE-SqNKwnPjzO+lVPvpXpmKzmxdk6SXZNklvS9ZH0qSULN1kcyepBsoWcDLWJFSeJpUvia4IQ5CUbZIk6afMPwnEjEZyslmc7JWkazvZAs32TrK6kpytZac-KSdN0l6cckBk0qUZNDlWy3htM8yc10skxSGZcc-GcjMTnqz4Bf0g8czO5keS6JP09mU305mfS-ZmnISqbIxHgzQpJcu7jkgikJpx5dshGUrLrkqzWZpfJubjJblIyjxhMjUQxLdl4yMpxY4GYVNuEHUSpRVM0cfIIFFVp5sc2eQyKdHO82Zm8zOfrN7npyvJlEn2U-JznGyhpenf6kfImmWy7uw1VPsNQvlNjJJGMgESmKTlLyt5K8+OW3PYFYzmRr81Oe-N3macDqk4-GkfOun-yPgx1IBbdKjlfD7pjMqWtfKWnOjUZyCrOagv8lezu5b8j2VpNIT-VMFYMvgIDRPlQyTUgNEBRJN-GtynZrcl2cnIYUoKmFmUl+WlPamsSeZA0puPjUwVkyOFFM0eXgppkJodafCuKXVNXkJzhFUC3acvIUlzzDp7c3mXuObkmKd5QM9BZawJ4+04+PtE+dLM0WyyLJcM2aTPIdmCKIF7YqhdIu1mSLO598sRTQokVoK1eOtLiTBDQkcKLZlM2JUApwlyzo58My+T4r0X2SG5ASqxelLymdSpFeSmRe5IQVGyFFAcg+UHK7onzBJPCLutooelMyslQirJSIugUPz3Z4C5+SErRk9yIltiqJXnNK650nFxc54Qh1zpAKK5r3KuTVNIVn1yFqs5aY3KMUwLrFBSuhRnLCWPyBl68wrl3RiVDyOFI8iZeZxggTz6lBIohY2P4XxSWlfiwCXfL6WMLulwS7GR0p2VdLHZfcqJfvOj470SpVUM0cCoYGVRGlCy1RksoXmgDfpxi-JR1K2VFL4VJSgmXIqJkXKuJ9DIFX-Mpmf1y+U01JcQprlXzYhN89pWss6XbzNl68+hWv36VvLIlpCFBtnAJ5SMgVOCvFTgo46EKiVtynRY9NMXZKDFqyuFesoRWyLzFJ4yxSiqCVMqm49DScYwzj6MMQV3CjjjDI8Xyzq59ssBT8vJWGKxVVK2BUKsNkWLUpxSuVYMuZUkzbhsIZRfapBUaKwuy4vlTHNAUCKHlBq0VV3PpWvKflPSj5ZSq+XUrEV+yzTsqqVViy+AFjEFa4rC7uLK5nihWd4r1W+LvVuS2VdnMKW9LqFuyxldaoVUoSAVcS1piCotkccUlWqtJV4oyVpqvVFC2+YvODV+rxFBa2ldstbXhL216KiPhYyxVBzYQIcs5XdyHXl9I5bq9JR6vuVwLWlcCilUapDUmqbFHa5FeKtRWAzw1avVplisLkdMQVZcmTjMvN5zKSFtc6FTkueV5rvlviwNUgsCXZrC1NQIdViuOWwhTlOIhDu+vL7XLJ1ta6dbotnWPLkpma9dVatXW5qH1tCrdcyv+V6cbm86SDgn2xEG83ByGk1OCpuXuq7lgG01cBqamgbjVGysNb2rpWgj0ZAaj+Qqq-mldQWFXXFWor-lupCV1a4lbqs9VAaM1V6qDXstI2dryNDKyjfKpqC4sRBtwu-hV05VqLuVCaXlaxv5VNKyFZKxtQut9UCb-Vt695festWPqYNTcdAbcPYXcLKZ6qlDhCvPXKblllC7jTpug18a11RGiVaUq2nlKagtq0Yb3zNHOqJkrq+TdhoFXNLONKmw1WptZEUbNNOaoNYuq7X5qhNT6qDlxOjUSy1F8aiZImtmXJqdVqajjXhq43Nrot6mttXFog1RbQtyo8LQ8uYUojTZo08qTbPM2krahwWn1aEpi03rKtWmvmY5o3Vrze1N4mJU4pPlAKGtmSoLVZqbWwqytGYnrWYrKXmqWpYG3TX1v7lYqVVIKhAX+pTV1qctF6kVYRqXXEbJVc26VRaqzV2apVGKricco-WoaEOlyiZL+r81TqcNgq3bW0pC2tbCt3a4rfZsg22beNF2vtRQjE2gdeAnQbvCSR7Csrr+K4A6HgjHCcBC4YO7OOAF8i4AbQRcZ5EAA
[playground-fixed]: https://www.typescriptlang.org/play/?ts=5.9.3&target=9#code/PQKhCgAIUgxBJAGgUQCIC5IEEAmPICmAHgA4A2AlgMYUAuktBATgLYUB2AhmZFZwM4F+kTu3ydIOAiVoALSJTa0oEaJAC0kAMq0A9iRH0A1u10B3dpBJMKSigDchkABT9aN9gHMANJHYBXFgAjZl9UTkZfACUCT2RSXwJaKgA6AEoVDW09AwiRSCDdfzECfCkZeWcABkBkAgBWDLVNAAlRHDICESYmTgBPYTbIXSCAKwIqWmFicmo6Ml6VTK1OFk6ANjX1DsceAAMAOV0pKpSUw6k1ut3eWU4OXzlO-hWCTIAmQiJ3CX4KIMovJAAGYUAhkHDCEjMBQEHa+QaPSDPVaQXbsKrXSiMHpkTICBiyJ5kcyQRxMX66di+IG6JhUUoEphFTzyRHIzq7GL8fxkWjXAS-TzsVbseiAFAICv5lGoQnx-IJUagCNIYpwcJT5tc3PphExxv5yRxPEN2PTFdI5Nc9ZwqIThFVfBregTXmoQeT6HUYTthM4EYSKExIB9fv8jcDQeD+Gkup1YcxMt92PwaaxSilIAAVQmQPUsO7scNrACM3rBAz1uaSBvYDIE6go-G8mX4uhdvF0LBInBsrcsjeBPZuBE4UKYKUWagA4gRaz1GPggs7PLPmBECOopNJ1HqqAbfo51MMxhMUiwRsIPhsVMBwOBaL0oZAAAo2OyOSAAXiR7nDAB8-ECEIgwAwpdA6URIFAihPA4egAP4XpgnAqDALIHgAOKKQQVrHAAG570fTpX1hCgin4JUKi-SAAG1azJXwHUgYtfDeXwAGZfAAFl8OoAF0CIfJ8lRVEd1XYeYAB5MzCC15GIRgxGEAJgmhb86gAPi-KBIEouRPkUiFICqSAAH4s0gdAdMzAzZyM19bDoBxOgA8JGFQmI4lIMyLKsyALIUuzdTEp0XA4IFoXgRgWDSGi+J0-zzNVcT5iwbo+kkkSSGSp1JKiggWF8Ej7DI+U9NkGjyr4jSNISyyAq+IKhlGcZpX89rzIAbyrNVQpogBpSAOEgIwCF6XQgSzPjMCynKJN6aSBr4oq9RK8jysquTqsgABfOr-MwTMCMIp9zgIS5qO6igcEwNwPE8PCFE4EIyFu38vEeqgilFTAVOAx6bVoZzMDAiD2Ee2hOE8fg3vuuLHtWSGcAiThMG6qhrQXGb10e-wSGRrHdPXXbHpBMEcCqNHSW4fwCFho1Pu+2hfqA5hSbIKGQd0cCR3B3hMdKbHGEe7taGxdhME8+IDB20nIxwYsqfsGm6Z-e7GeKZnANUph2c5gpubBz6BZuonhasCJxcl2JpZJvwFJZ9CSZOzozrWLjLqG027oZp6Xvpj6O01lmdYBiZgYNnnRAhqGYbVo14cgRG1RRqmMZHQm3IIXH8fXU2s7tsnwUpyBuuVshaYDh6g5+7X-uBDnPC5qO+fTvOhezi2xeYCXICl7zZYjcnFdL6mK9Vn3A6+4O67Zhv9dB3njYzwWzc70Wrb7m2B8e2svkwN2vVll3IDd9jPeuqvHo5-346npmQ-rwGI8X6OGFjqvE+TgnUdHtvM5xpAPGBNV4F0HkXCmSsVZXxrlrP6c8gSN2bkbfmK986AI3j3a2XkZZy2HlA8eMDp613gbreeTdI4oP-qAjBlssFbxwXbPeWs3Ye2PkJV2RxzofG-Fdb271q43zBEQh+s8yHP0cMgpe79oafwEknJIKdIZpxNh3HOID0HuXAfLEuZdoF32rsQuBrMyGIIXobaR1DNHrzoUwXu-dcFD3BCPPRhCDEaxISYvWFDX6t1UWvEWtj7Hb0ccwg+XC1jn3YURU+ETSy8K9jAoRr13GwMfnPCRqtfEx1kQYr+iif4qLQWooBucAFaLwcXAhldUlGPSaYpBlDLH+KzoE7udjsG220fg0e5camT0MaI0h3ipFvysSUzBHSGFdN3g7WJFwPjRNOhEkyCTL6pOSSImewyRDh0kU0t+kNckDPyUjVOf8WmAOAe3NehcdHVIngIjxxjQ7kNGX44pASu6bwcXcnprj+lPLSWIkZByPk3Nad8+hvzB5hPmedUsSzOFSDqAATgvvw9WfthG1KGV43ZQN9nZJkXHE58jv7nPRpc821zymdG6VU3p+iBnPPqaC4l4yvmTOCYwhlCsHlbM8a8sxPiLFjOpTY9pPKZn233vCtYJkkXwrqAADgxUk56OKWXAp2Zk95OTSUCNOUo3+VLPmQtpTQipTjIFMrcdqupIK3lguXhC2hUrOk7xtS4segKsWOp2SK-VqC3Xm25Z60Jcyzpoudhw5VAB2dVGzNUpIdXi15eqXUkrkQjAplKQ10vUaG+llTbUAsef69N9cg1Zs5ZC8N0yvUQJ9X0itvsA34prRyiVbSfkhKYVGrhqrY0xOjWsJN2rNm4u2fizNxKjmGrhuSvNyiLnmquWUq1JabW6N9W2++M7hWNO7eusNQSI1-OcQK6dQrq3HrFeCwtUKpkwtmXK6NialXRq9GszFvsp1psPU-PZWSH0GpzQos5q6zXFqLXSy9Za92CpeXe8xLdXVPoba+7117AO3oQfe9DBat29uhf22Fg6UXjq-UOj2v6NW3zwyhjJIHg0LogxS6DxHrFwa3Qh3drbkNsudSe2Dz7pVNvli25lQKO1HrQ1Qnt4mL0UffUOo+glR1DvPvR5NjHZNVpY4S0DRH2N5OXVB013GSmWusfx3DBmgMEYU8009kq+28tLdJ+1jn8MNJc+KtzpGX3kbfSw2jI7lkop4aPdZk6U1CadXOsD2bzO5ss0UsTtmO72btX69thn-OiqI3W91HmZXNoc5WpzRXg2lbPR6xtka1MoqiZpqLBA6jxNi3+wOAHfPMfEaxrNZmyXpZNZlp92Xbl8oEzJ6rfn2Upfq+5sjnmcN5f3YMmrS2StKaw6F2V4XouReRZ11ZPWGNaoG8J5LpmP5pcgxNtdWXN12dm1VgrO2RPLf2+eprCHvP5YPYtn7e2gvKYB6p47nXEXtbO1xdFun4v6YW4NsOxm2MPbG09wpL2ptvZyx9zbiXA2EcUxDg763Ksk5vejsHFOxNU5lXC6Nir4fwq4mq5HQL+to9u8N+d2OjUWeezBgnGiielrmz5-nTqu2-cp-97DNPy2k87eT1zTPleHdZ1wxHp3OeJp51ivnX3Qd3ZQaNkX428fi5I6UyXM3pefZB-ThX4PteNZV1J1323Qce8Z5hnX629dSC54bs6XFx0m--QlunAvMcjeF0u23+aVu8fey72nTHhOB618H73h3VdIYT-LzXgWvfla9WHggXFP0c6jz+y7enrty91YLlL1vU+4-T0p6bYDs9q7L2TgLj6HfM8k-80vufy9j4wxPkPLPKN1+o43-XdGW8o7b+b+nlvpHd4TqLu31mvkD+JsT4fs-R-FaD4vov1Pfc55u3P2-Bf7-V+azDriGmT5R501vrzvHtfrOp3vdscjbr3lxhno7sWrllfi-jfnVn9g-hVk-gge3hrvPqfvWkvjXivlxGwuvuHjFnwldqmogaAUnkLhAT3pxlZjAeftahAjLsDv7u7hXuPjxpDj7tPoJiPlgW-pXoXp-gOi1nXm1n-vrt1mQa3hQZgRmmAVbinkfmntAf3oTs7jun7qyq-sgUrqgVPles-goahkIVwRMngV-uEiQZHvrhdrIdvvIbvoni-F3ioV4MaifowZoYPtoSYS4XobWigaIXykDltroUgcEQYaEWFjYXXnDlIVIOxEjoAabsAZQYodQe4bQaoVAQwRoU7n4SwToTqoIfoVXmtmgXwfNoEVEaJiIVUfgeIVxOzkkQQOxNzmkXHqjnUVQW4eAYunkfQZNg7kwduiUQEW7nnpwQvtwZPo4iXvwSAfJuYXMZYYYdYfCikXYckcbt0X1hkaYUZgMcobkZ4cfn3hDuMfATPpkWYRUY0SFo-jUbLn0asY8R-k0VsWdJ0bsR0THgcYIkce8cBtkYMRxiugUdcb4RfkPncccbVtEZUc8dUcYRgaCc5msTgWVt8WITDuxA3u0exM3o4UAb0dMUlkoQfh4Z4F4Vca9kUXCf4RiZSfUYriiRJosegQiZiUiQ0V8aic0QSWvsSZvmSekRSewa4USjkUMRcWodCYyXAZfryWyeUciU8VyYDqUXJg8ZqYKdqdDvESSf8exAARKT0TvuqVkacTSecXSZceoTCUycwfclMdKUEQKfMVYTqR6ZERqd6RsbEUdiaUQcSaQYknIerrabKRCY9iMfjmMbCW6eTKwREWUR8QaT6ZsX6ayZ6eyZ7lqSpnEdsZIXGr8TIVGU4TGWCXaYcrSfSc6cqfBqqcsfcViZ8TmSGUsbUTafqUGVyr6cadsYssQR0Q4dWeSdaQWf0XGWcfKY6YqaMdwTcW2X2bOVmYObgbmWEbqYVrtnft2XiSOZWf8W8KkZaYcVKQGbGSZguZCRlkmauSmRMe6fmbeQORycWVDl5vud9vnsIYaSWaGdsW0RWVwm8F0VecCTeZmXWfOfaYuU2UqRLiqfCe2YiYee-seUKdya8WwZ+Z2dmcGSeaWWdBeeefsTBdfCCf2ScYhQ2Q6ShSuTZq+bcZhXydhUBbhUaX+f6fBcRdubiXhfifEVBeeYCTRdis4fRUNuCQ+QmVCaxWfuxeuW8XJdxRYUObufxR+YJfyd+cBb+aBRRUSRBVIG8KSVOZKTOURfJfWXzIfgqfkSpRampRhRufZVpesTpT2TyZxZpQzjhaRaJaeZBaKRZQQG8OKTZVabJZuQhfeUhY+WLjiTSh5SyWqYlUJUZbxSBb2RpTlYZUWcZdhrXlZeeRaXFdeXZQZRjo5eBkpU+fbi+a6W+Wmf+QHrMelatmFXpdld5cFTxaFXxaZZBeGVFW8JGXFtOQlUNfvkxchU6ahcme1RxV5fVcNdpTuf5QRRmXqblaVflSZRVeWVppZVWbNbZfNVtYtU5Y2StW5RuutepYRVtYBTtSJWNYVe9YdSVUeaNSBRVWOe0W8JOddfFbWQxclUtald4YUehVlYFcVT5b1cFj9QFZtf9WjTAQsWJfCm8IkVFcWJeTVbBXVTjQSo1aljjoma1Wxa9Z5UVUNZ9b5btWRRtvpVTWzejTwbrivuDf8cWNBeTbRXBVTfdU1XTcpc+YzUjZMdzQedtezd9QVVjSzR9T1XjcOeRVwqTcLdRWLTJdDQ5YxQ9cxU9XLapUzcjdjcrbzTrbpVzYNVrdgU7SGbXiLcLVJcbWbkFVLbTZAfTXzWuczX9Q7drSEZzb9QdZHe7dHf1eNVIMWOZRdQQMWNZZDbVbdZLdSXDc1WlT4bbYra7TzVHTETHRrRHQBRXZycDSvsWJFencWLFdnRTbncrYHc5Uua5dbe5SXe+WXfHdiR7VXftabbjYnWNV7b-iTdVe3eLZTV3fnRbctcuf3S9QrUPSjazXXT+bweicPbXQnZXUnV7ZNS3TNb1h3ZPdTebdLcHbLQzTbdvZ1QJeXaffXSZbHXfY7dPQ3eIcWOdR1sWFdTfUvZ3d9t3Y9RvS-QPW-YykrSfaPQAz-dXXHSg12UDadY3aDSTRDRAybQIXeVjpbXA6HZlaXbvW7ag2fZjRPSQ1+cdTg+VY3cTenWTYvcQysUlWQ+vX3fA1va2eHZg91V-QfcXhg3-fvWVQLUA+BenaLdw-7ajffbDWvfDQyWhSI3bZrZ-XQ9-Yffyh-SPdg35ZzbXuijRlIEbSo3RWozA+Q4I5Q4Pe-cg+I4Y5Iy8UfTQwY+YxzefSvmqjY+dBOnNXfU4wIyHcXYg4hn42YyRRY0nb-Uw0dYDckzPSvmnR1lnUQ6owtavY-XQc-a43E+mTIxI3Iz4yYx4xwVUydWw+Ic3R1m3fkw44UwpSlYXQjS6eU11fU149U2ibU8fZ4wE2rbg+IXPenQve0xLSvV0wXTLS1WU7o9Q-bVg0k4Eww745s+M9s5M009-ueeEzdZE0U0HSU6s7E+szvfs4MxMw1ntXs-o4k8Jc85YyviA2duA+QRc0s5oz09o2tf06Y1sx831bs6MwkxC3law-IzDvg+nYQ-82k2bRo8U8MaU7c3xm9WI484c58yk9I+i1PfQ4AzDokSfFyDyPQN+LNCFPNJJGdFUBpI9MAMACaPMPCicGcPri4OVNRA0LGAwD0MmKmKsDgHeF9MmPQOwBdLpgAEQKt1BKu+BToqtcLqCXDqvAqXDwjDbuC0wPAPY0RKucB6tKtBBKvLQuOcq1hmBrzOBpC+DTaOvOsxg7TUj3NuJKtEB6uOosTOrGsEC+AOsEBOtZwuu+ANrABEBcvesu38H+uBuiLBs1qhvhv+IevRuuuQ7xuJu+BwoBBOzHyytuB+DuxJoqvux6uaumBSA6tcRpszzuyGtJ5ZupbmuWu+DWu2u+AxM5uRuetuuaG5vrguu7Q+vuOl6pvhvpvUiNJdsRtRuTv5txsJvTvJv6LzvAoZvLtMAmun4TuMAxsFtbtJslsXTluUiVsKtzOYC1vsT1vx5atNuRKtu1yRIdsRxdtmY9tWs2t2tDufKnsEDnvusjt5vbsbN+sBsLszwHv6wrvDtrtnsbv-aFuwekt7tBtLsodHthsnvQfruxtYeXvFtzIKvhkVvytrDX1PsKtvCvu3zvsbgMdftawMe-v7L-tmsWtAcDv2toejuwGEzgdTtJtwc1J4eLshtEfZtgekcYfkeNbYfSe4cIf7sEcUKofKfocQeYfqeUegUPvOx0dVt-OQC1vFisc4rsc6t2eIffvBuZr8e5KAd9vAeDs4uid5tjtO6SdesztINzvaf4cKfHurtiebtFs7vwdceYDId6eKckeGfntxfbvXug2WcKuos2f5f2cpKOcKpJeQAKq8eqwedxxec2c+cicGdidQcZchd6OycRfyeZtpcxcBcXvxepNydIe6eYD6c3LBdqebwadUdyoKuJF5cxrKvsBorFdMfasrcudaxopVejdpcAeCfefCegfjcqdGeBcnetc4ezspudfDdRfEe9dkf9dXevMdflcpe7fRf+dPdZdXvUcKoWd3vyvDpLeqqreFfrcqrleqo7divHv7e9v1dHd+dNd9cteesvfxO7u3e1wfdw8PffeqfPeaeMNDe48jf49KcXexcUfxclsxq3tyt+B1B2Omwqss-g+Occ+beYAs+w81eYB1f9sgco-U9o-jundSehdY+Jc8-MQU9jcSeS-GdTemeDc49ax4+K+rwTfE8zdwLDqM-3t1C+3rLs9rCc+Nsbgm-Q9rD897cCeI-C++c3OE9nfic6-K+Y8VM2ca-JcK89du+Ze0+Y-hFPt+-y-3dU9K+teTf0LTdmcs+A9M-Ld5NMd1BqsatvtW-qAZ-Q91D2-w+O9Cci+u+o9Pfo8wck9hc3fvcB9ffl9E+-fS9h++919R-pc08md0-Ucm-J-G9tPp8ttZ9sc591DD-Arj+F-EcI8l8u9F1B-5uV-rve-Xpk+a-18E+N-u-N8Jdvdy9a+B-b-B-d-Ze9+-4LePuFd1Avsj8Odj+3+T+cTqOfcz-F+Hel8L-H9L8S+XfV8y-78dOHfR7k3xD7-9W+6-f3sAMX5x8pkCfenrRyB7M9GO1-FjnfxK5j80Bk-NiC-0p7dsDuSPT-r0zF4V9f+GPf-j70gGR9uuDfEgaANP7gC1+EfQ-rQJj5d9VePfWbjf377A9rO7PZzsQy54CDHUXWafqa084EDnejXOge72X4YdV+tOKgSwK34yCT+HA0PkwPb40CVBbAvrrv3p65ckBy3AruzyqCW91uZguXnUCYjucHeEgp3g12O66DSBQXL3hQM0EH9N+0fT3rHz1579VYSgrwZ3z0FgD9ev0LrDwL8AG4luiOcwU21iFy9EcYg-AQ4OR5l9VBP-VwX-2l6UDmBQQkATv1CH+Dw+Wgw9qwJ8HsD4+pnenm0Ty4R4YhUPdAWt3iGNDgUXOZIbPw-7z9iBzgonnIKM4KDh8gQ6Ad-1gG9wE+6vUoYR3KGmxde+g6jgbiN7yt68NbdgPXjiEbh1hiQ+NB0Pf6EDuhILWYcr3O69CBh7gxQXkJGEZCxhmACYVpymGpcZhv0Y4X4JLYR4lhUQ03mzzWEW8mhEPeIb8LaF29cBAvWiJIMcGi9ThkHMgVXxyEeCgB2g7wUcN8G79Jhngq4VCJV5VDOBcCFYR8LWFp9CuP+DYeoGJGJCC+IIuwbV3BFpCv+1wj3siPIFwiLhDw1-kiOeEoiihaIhEWUJ0EVCQhDAsIZ8MiFrDB+RIifg221aEFyuhBXYfYLn7SDMRJw-kSv3OFDDLhiI4IT9y5H3D0RmogoWoOxFn9ZuP+EUVxCv4qtzRJIq0YkOf62Ci+8oroYqJVF9CYRqo5keqNZF4CDRWIuAWr11E8jphfIxkQKPUF-cTRiAlPlxBQGWisBko+IVgMdTRi5R1I1IUQMOEcjmubo+QWqPC5ejteIY7UYKOKFt89RvI9kfbE5HFi3hkhOoXwLWECD4xmw4QaIi4hucjWVIwXjSPTHNklRDIzMbCPa4BCNR5YrUfQLDEt94RkXfUTANeELDDBUYkwWsMsGCCc+rRGUTYI7EOjUxCopwS6NkHZizhHovMWWKDEVi5hOo0niOLPFjjCh1YhYfNyME7EluKREka+Ll4pEUxXYtMQcN7H7joRWQpkUOJKGnjHhwYgcUWInEljhhM40YXOJNG1Cnxyjb4Z0TfGtDHUnRL8WCJ-HOjCxrowCYOJk7Dj8xR-ekaiIDHTjRxPom4ZAHgHUcdi+IwkqsMJJvj405XQklhKF4Qj0hfY-oVL2AmljAxYE88S8PIlXiSJTwysZUL9E4jfofxRiV8KY7sRARTY9QMpPYnAj7Rb-R0fsNwkQT8JGQwYSeKElsjbxhomSRoJZGgTTJ1E+CXAiYmMTCRKrEkm+Mz7AoSSnE7sb+NWp4SDxBE90QJJglUTZxYk17sROsneiQpRQktspJFHsQxRzkiUdn21bxT2JPESkduO-G7jIR-4zIYZNzG18IpBY-SXeKgncjKJN42yfMNm6mlGJFo9gOaTfGP8MJdorcdpJ3FOi9xvkgCflOPGFSTJkUuCaFJhbY8JJ4EqSaGKNHhj7JkY+9uxBjENS4xyUptvNPYk4CtJ4gjqbpK6klSepmIoyf1IqnCSzJvo8Yf6PElFTSJfY6qfZNrFPj6x7ERsctI3CPT2J7Yztp2OwnZSeJuU5Ud1La5ESQJA04qRNMglTTJxVk4GVdN+l2S5JC4uaUuPYgrjVJSM9iZuI+mZSvpnUnKf9L+m7SAZvrQAUdJslRTix5UrrsFKGnRT6Jj4lPpRSW4XkSRjMuXheU8k4SdpoMgyftIKmjTLpkki8WTIokUzKppMqCTFMQl0zkJTHKCkzPQmiIoKbM76XSN4mHj+JgMwScTMGlkTLxYUoGZrJBkCyxZ1HSiviLeCs9pZbEv4Y5zNnlczZis7GT9Nxn9jOZR4wKdeOOlVSdZI02XlDP5miTqZs3CSqbMUmFc3gKk56eoDDm2zNJbUzaVlIdnKyYZfEgmdd15m+zxphs8GdBPdkkyqZ94wOUSTy6VUGZbk1SVZVtkUiNpKQpWT0KTmqyU5NfNOfrOhlOzhpEAnOVrOukBy4EYckUTFVWExUmZE-R1DFXtnbScZ+MvGS7LVmEzwp6ckSVWLKlCy7usE7WfnJ7kX8jBbweqdvKZnNT5ZrUjGe1PjnjzHZk852cFwOlNzhZHs0WVnPJkrzKZa8o2YHNmnytpqA8paaP21bTVbZ602OdXITm1ynZycq+T7Obl+zF5985eeTwxEwybpv0beX3PrFE0mZLYmeETTHlSCOZuvUBTzPAU3zc5z86BRdPnknSaJdEwOfDPflLjwaTMlcSPPRl-tPpXE2kcAvPl4K+p18x+SLLzlLzSFECjOf7PXmILaZ97A2kt1JokipFB-VFFgu4mJyQF9csBUTMIWdz4FXs9uWNIXnSSzpskvwELXxHe1JFrQ1SSLXe4qp5FbCjMdPLyncyuFBCnhbfL4UkLdZGstRQbOEUvy4EBtIxebMK6p1pFls-djsIynHysZp8xRRwuUX4LVFTiohV3MFkCKPFLc8+Qgr8De0jFIclVk3WkWAig2Mco+XHIiXYKJ5tiqeZfNiVzzBFOiyaRZMYGQyal5C2GRksLlGDM6qwzOtIrclBtK5ACzoZEvYXlKL5bghxXEtgWrzEl-CtxUFN4XEL6lQo9gE3RFGt1OlSU7+U21brvd0pVcgZaUrPnDLOFbs7Rc0rblTiUlkC3RbcOqHUcOlRi+qcA2kX7ykOh85hZjNYU9ifJ0S-yTmLGXVKLlQiqBQsuzknLPZIijJW-IyULTiwX8+-tqxhXvd-5RSwBYMpsW4KYlfyvWQCtqVgzgVD8iZU-KmVZyS2wDFZfWLAbSL0FuPd6W8vCUfLvJKldFT8tdnqzZlzi+ZXossmei+ZgKq5bRJuWzcYVKypccWGRkRzRV73JhXxxYVeS9JhyjFccp5U4rxxri72eMo35wLW53c36GAxFFcNvhqKEkYarl5yKwlxS+lXKqZW9TFVZCsFdMrVX-L4l6irVeCqWUSz72UswrqYojlyyZ4lis1Siv2VRL5VzKmeanMcUEq5lRKvFTAo1WTKNFrq6xgRDy7+KVWwS1ScEsdShLdlewoNUMqtX2KbVTSu1aqq0VKrTl2qvwCE2TVGDslCrEkfktESFLaV5q2VTgpeFHLWVHczxUCs5UNLuVtqu+cCpLZtKU+Tk5biSJ6WiI+lyKvZQovzUdqFVXa0FUOr7UQyB1xa1ddcv0UKszRqw9ZXCviEyirFnyxlYutDUNyABjqyNeyujVrqQV5aktcOt75xTmJb49iSeoZXW0C1uUlRderjWEqE19qstYOpcXPqTRfcgeUzNtmfrLV5661cusfVbr+VA3WNVAPjUurvFcklZZ0ukXt8c1OkvNWivg2FrENoGjlduq5XGTN1YG+9SW2oV+AlxYqjZRuAYWiIpV1XGVezLKU-r-pf6rFU6p7V8q7hySwTakuGXpKllzscAJZx6BmB4iF2dEDWqZ56huQvIa2Gpvpa5hOAZgY6NMFpD0BOox8IAA
