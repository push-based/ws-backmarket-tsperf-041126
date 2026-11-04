# Exercise: Replace an Intersection Chain With `interface extends`

In this exercise we will turn a 16-trait intersection, `WithIdentity & WithTimestamps & ...`, into an `interface` that extends those traits, and then do the same for the 250 entity types built on top of it. An intersection stays a compound type: every time the checker compares something against it, it walks the parts again. The checker resolves a named interface once into one object type and caches comparisons against it under that name.

## Goal

At the end of this exercise the `Assignability cache size` that `tsc --extendedDiagnostics` reports for `intersection-to-interface.slow.ts` drops from 5,150 to 779 and `Check time` drops from 0.14s to 0.10s, without changing what any entity type accepts.

## Prerequisites

Complete [Exercise 0: Setup](./0-setup.md) first: repo cloned, `npm install` done.
Start at the repository root: step 1 changes into `projects/test-lib-1/src/examples/11-intersection-to-interface`, and every command after that runs from there.

You edit the checked-in [`intersection-to-interface.slow.ts`](../../projects/test-lib-1/src/examples/11-intersection-to-interface/intersection-to-interface.slow.ts). [`generate-intersection-benchmark.mjs`](../../projects/test-lib-1/src/examples/11-intersection-to-interface/generate-intersection-benchmark.mjs) wrote it with 250 entities, and running the generator again gives the same file, so you don't need to run it.

> [!TIP]
> The metric that carries this example is **Assignability cache size**: one entry per source/target pair the checker has compared. **Types** moves in step 3. **Instantiations** stays at 3,778 throughout, because this fix changes how types are compared, not how many generics get instantiated.

The file is too large for a link, so the TS Playground gets [a smaller copy from the same generator][playground-slow]: 10 entities instead of 250, on TypeScript 5.9.3. Take the measurements in the repo: the playground has no `--extendedDiagnostics` output.

## 1. Measure the baseline

Before changing anything, get the number you're trying to beat:

```bash
cd projects/test-lib-1/src/examples/11-intersection-to-interface

npx tsc --noEmit -p tsconfig.slow.json --extendedDiagnostics
```

```
Files:                         137
Lines of Library:            51126
Lines of Definitions:        50308
Lines of TypeScript:          7674
Lines of JavaScript:             0
Lines of JSON:                   0
Lines of Other:                  0
Identifiers:                 96937
Symbols:                     64596
Types:                        4479
Instantiations:               3778
Memory used:               109752K
Assignability cache size:     5150
Identity cache size:             0
Subtype cache size:              0
Strict subtype cache size:       0
I/O Read time:               0.02s
Parse time:                  0.17s
ResolveTypeReference time:   0.00s
ResolveModule time:          0.01s
ResolveLibrary time:         0.01s
Program time:                0.22s
Bind time:                   0.09s
Check time:                  0.14s
printTime time:              0.00s
Emit time:                   0.00s
Total time:                  0.44s
```

Write down **Assignability cache size 5,150**, **Types 4,479** and **Check time 0.14s**. Each of the 250 entities is assigned to `EntityBase` and passed through `acceptEntity`, and every one of those checks runs against the 16-way intersection.

> [!WARNING]
> `interface extends` is stricter than `&` when property names collide. When two traits declare the same property, `extends` needs the two types to be **identical** (`TS2320: Interface 'X' cannot simultaneously extend types 'A' and 'B'`). When an entity redeclares a base property, its type must be **assignable** to the base one (`TS2430: Interface 'X' incorrectly extends interface 'Y'`). An intersection accepts both cases without an error at the declaration: it narrows the property to the overlap, or reduces the whole type to `never` and only errors where you use it. This file has no collisions, so both steps below compile without errors. When you apply this to your own code, treat each `TS2320`/`TS2430` the conversion reports as a collision the intersection was hiding, and fix the trait types instead of going back to `&`.

## 2. Turn `EntityBase` into an interface

`EntityBase` is the type every entity is compared against, so start there. Rewrite the `type EntityBase = ... & ...` alias as an `interface` that extends all 16 traits.

<details>
  <summary>Skeleton: EntityBase as an interface</summary>

```ts
// intersection-to-interface.slow.ts
/* trait interfaces and shared utilities above stay as they are */

interface EntityBase extends
  /* the 16 traits, separated by commas instead of & */
{}

/* type Entity1 = EntityBase & { ... } and the rest stay as they are for now */
```

</details>

Swap `type EntityBase =` for `interface EntityBase extends`, replace each `&` with a comma, and close the declaration with an empty body `{}`. Leave the entity types alone for now; we'll handle them in step 3.

<details>
  <summary>EntityBase interface solution</summary>

```ts
// intersection-to-interface.slow.ts
interface EntityBase extends
  WithIdentity,
  WithTimestamps,
  WithOwnership,
  WithStatus,
  WithVersion,
  WithAudit,
  WithTags,
  WithMetadata,
  WithPermissions,
  WithTenant,
  WithLocalization,
  WithLifecycle,
  WithSearch,
  WithSource,
  WithSecurity,
  WithWorkflow
{}
```

</details>

Run the command from step 1 again. The lines that moved:

```
Types:                        4479
Assignability cache size:      781
Check time:                  0.10s
```

That is 4,369 fewer cache entries from one declaration. When the target of an assignment is an intersection, the checker relates the source to each of the 16 traits in turn and caches each of those 16 results. With an interface as the target, the checker relates each entity to `EntityBase` as a whole. `Types` hasn't moved yet: every `EntityN` is still an intersection.

## 3. Turn the 250 entities into interfaces

Each entity is still declared as `type EntityN = EntityBase & { ... }`, which creates an intersection type and an anonymous object type for every entity. Rewrite all 250 as `interface EntityN extends EntityBase { ... }`.

<details>
  <summary>Skeleton: one entity before and after</summary>

```ts
// intersection-to-interface.slow.ts
// before
type Entity1 = EntityBase & {
  entityKind: "entity-1";
  /* ... */
};

// after
interface Entity1 /* extends ... */ {
  entityKind: "entity-1";
  /* ... */
};
```

</details>

250 hand edits is a lot, so use your editor's find-and-replace with regular expressions turned on (`.*` in VS Code, `Regex` in WebStorm). Only the opening line of each entity changes: capture the entity name and put it back in the new header. The closing `};` can stay, because the extra `;` after an interface body is an empty statement.

<details>
  <summary>Find-and-replace pattern for all 250 entities</summary>

Find:

```
^type (Entity\d+) = EntityBase & \{$
```

Replace:

```
interface $1 extends EntityBase {
```

```ts
// intersection-to-interface.slow.ts
interface Entity1 extends EntityBase {

  entityKind: "entity-1";
  name: string;
  description: string;
  sequence: 1;
  attributes: {
    category: string;
    priority: "low" | "normal" | "high";
    enabled: boolean;
  };

};
```

The pattern leaves `type Entity1Response = ...`, `type Entity1Patch = ...` and the other derived aliases untouched: they reference `Entity1` by name and keep working. This matches [`intersection-to-interface.fixed.ts`](../../projects/test-lib-1/src/examples/11-intersection-to-interface/intersection-to-interface.fixed.ts) ([smaller copy in the TS Playground][playground-fixed]) apart from the trailing `;`.

</details>

Your editor should report **250** replacements. Run `npx tsc --noEmit -p tsconfig.slow.json` without the diagnostics flag: no output and exit code `0` means every entity still satisfies `EntityBase` and `acceptEntity`.

## 4. Measure again

Re-run the exact command from step 1:

```bash
npx tsc --noEmit -p tsconfig.slow.json --extendedDiagnostics
```

```
Files:                         137
Lines of Library:            51126
Lines of Definitions:        50308
Lines of TypeScript:          7675
Lines of JavaScript:             0
Lines of JSON:                   0
Lines of Other:                  0
Identifiers:                 96937
Symbols:                     64346
Types:                        4229
Instantiations:               3778
Memory used:               107910K
Assignability cache size:      779
Identity cache size:             0
Subtype cache size:              0
Strict subtype cache size:       0
I/O Read time:               0.02s
Parse time:                  0.17s
ResolveTypeReference time:   0.00s
ResolveModule time:          0.01s
ResolveLibrary time:         0.01s
Program time:                0.23s
Bind time:                   0.08s
Check time:                  0.10s
printTime time:              0.00s
Emit time:                   0.00s
Total time:                  0.42s
```

| Metric                   | Before (`&`) | After step 2 (`EntityBase` interface) | After step 3 (all interfaces) | Change |
|---------------------------|-------------:|--------------------------------------:|------------------------------:|:-------|
| Assignability cache size  | 5,150        | 781                                   | 779                           | -85%   |
| Types                     | 4,479        | 4,479                                 | 4,229                         | -6%    |
| Check time                | 0.14s        | 0.10s                                 | 0.10s                         | -29%   |

Times are the median of five runs; the counts were identical in all five. Step 2 brought the cache and `Check time` down. Step 3 removed 250 types and 250 symbols (`Symbols` 64,596 → 64,346), one per entity: each `EntityN` is now one named type instead of an intersection plus an anonymous object type.

`Total time` moves by 0.02s (0.44s → 0.42s): parsing and binding the 137 files takes most of this run, and your edit leaves both alone. `Memory used` stayed within about 2% (109,752K → 107,910K). The cache and `Types` gaps grow with the number of entities that reuse the base and with the number of traits in it.

## 5. BONUS: Compare against the fixed reference file

> [!NOTE]
> This is a bonus exercise, you don't need to complete it.

`tsconfig.fixed.json` points at [`intersection-to-interface.fixed.ts`](../../projects/test-lib-1/src/examples/11-intersection-to-interface/intersection-to-interface.fixed.ts), which the generator wrote with interfaces from the start. Run it next to your edited `slow.ts`:

```bash
npx tsc --noEmit -p tsconfig.slow.json --extendedDiagnostics   # your edit
npx tsc --noEmit -p tsconfig.fixed.json --extendedDiagnostics  # reference solution
```

Both should print `Types: 4229`, `Instantiations: 3778` and `Assignability cache size: 779`.

[playground-slow]: https://www.typescriptlang.org/play/?ts=5.9.3&target=9#code/PQKhCgAIUhlAZA8gdQFyQCIFMsAdICWAdgC5YBOAzlgMYkED2RkDAZpALYEAexlANJHJYAtKwA2AQxJkiWACaRpkLADcKAT0gBXSpIDmWKBGiQABgFFSBEhoBCk6mcKUlkAIwA2EQHdJW4jIqWnomADpIC3VyLXkGDkliFWtbSAAjLHEGH2NCUgpqOlcbJX1E5h8bAAtCElds5lYCTPkBSEoGSBIqrEgaHpoAawohUQlpWUpc7t69Dl6vTh4+PJJOyUhWYUoaySImDQ4GXRY0gCsQro1cXuUsSX6Wdhnc9wAGHT1DdpssV0AUAiUREU90ebC6VQY1CBByOJ1sN2KrhmRFyuF0PUU3XIx30NQSuBuWOuf0gAApcNJ+sBKERJLgdgwSMBVJJxAR5NIGOQAJSCDaGOTkAg0XLCXBQmzcjT84HpRxYAA8IgAfPIKAR1IpHJQCPo6WkCOzUv1aINKGFjLkAOJYIXSBTpLSCigOkSBAohRhEEQZIj9BLkQZhDhnVzvYzAcDgBG9Kz0WywEjSE4AXkgACJ5ORJKwSBnIAAfTMPejqAvFjOUXQ3YEKCsl8j9TX1gDcMZJkAAChQuJRdUxIOmM8JJPIGxmfMKyBP1eIsDOiyX5FwiBn2+APeRWA9eshqgBJdUpLQAbyghHk6EoJGFRH07cgKm4QTp4iP19vxH0S6I2nE4jtgAvtGW47jQe7VAAKgQ8w3pIHAMpA55PjQo5kPIACCJDoBgDqPjouCchh2G4fhF5zguCikZgDq-v+gHgCBm75Nuu6QPu3SID4Qo7AQ+AoSwPEUB+7RfveBHcmURAEAAXtI3qiTed4PheZAIUp4k-sWf4AcBoGseBkHdEmKauIJ8EkLo6DxjYGimVZlAEZZugAMJVHshhYThtFkM5yaOQASvcHREJ+Kn0XpTEGUERkcdUABqBTeshF7RAOYWQH+HAZOQBHCKoBAZeg2W5QRC4GOF376SxsXsZxVSYdo8glIJaH3BhdgaFVEkXtoREOvIXU9apT70rgOJasNYkRTpDE1WB9XQQY5lqSt6CjnERDiFoynfgA2gAugRUgZOIlDoMFY5MDtirBTQ3LyIqe33oIL36CqKoLYZS3dAAshVxEbIJ8zJkDl33Ftt33Y9z1aYI2hEIM+w8Z9BE0LoawcAAYs04itBD13bRod20LD71vVp9E5SMxZpAwDDznsaPRbVFBxQ1PbkH2GWrU+Nzc0VvMbZDN1aFzPPekdBFFV22hpOyNDoPTjP3EQ311RB8XdFBdp7CQqVPrI+uaSpBHG6QwX6N66AZlg2gTroE70g866s4tWsNfADA0GyckKYOglZL784jebsFYLJTBYGH7s-Z71TwAQrC0BoNDzobkDogrRWYjReFkJFjFPlg3C4AQ2z53Rc1RWNTZVC23lkYXNeMcxHvGVUsD3PXmfUJI9e6y+sdPv39cANJYBoPiPRdoxEztM0Hcdcea53sDHE2vQWZvEGwBoN5YBwI-tLvWDBSnwj+jHS-3kXMuIdyJE+QXvStxr7O-V3tDaNOZ4XunHUycRQB0yhmbOisJxbjfBOB6RAmjHnoGyN2Jd-QxFwKEIgk8NCm2-PfVen8E7dGQNyQYEhsiZxnkGchPhcF33fheKhZCsg+CTHgEq2gaZ5UYaQmhDkb7gLtC1e8E5yCIxkiIpcGYHqIXnIuSsO4jRtlZh2G4kBMLl2CpQCURBqCKigiqIcmdwaQCgvlLAABHbQfwSB0NGqMCCjcq5+SYhuWMmB4jlCiHaEg+jDHpkEmoHxdjyrqFIFBEk6AzAABJTzvSAmEdqg1nDFhiXErSCT+rEQUGYAiBh9DCDKGQEJF5KQaCyGOdAZiLw+wxuQYQTdfJYGAm4zstlbBdipFUPxRjBL7XHnkSAwwNDgigodAA-FU-pK8gKtLUe0+ydIGSQl8QY3pF5Npi0gP0wZwzRmHSmePGZcy4wngSn7Yi3IekBIvDspIez2BjJEJM8krJxDWMOYdHkQ5DEqyZurVxMVCG9GChKXUawYj6OfLIVoyFLwjUgEBQxgkmjAi6keMkHIRo8nQF2HEfYlRQSLl9C8qL5B-T2BoTFBN55Q12lpI6OLuz4qKkqTZxNTFHRJahdCWAyRvI+aYpleL4isr8QRLJDpqUjUEJSEg-QbInk6fK7pBjhUsr0QY5ykh1AUqIFSgVfwRYLy0FBRluKNVstFhys1h0SXMXVIA4QmxEZ0BSg8CCGCFlQtLjCvm8Lb72IaCJK8gbJLkGkv7TBJTR4BWspEE8DldAEXSjbLKnCyoXlBmOaQkhCZ0tJg9cgT0KY6CRijIgLMkVkh8XZKpTLqnRncQshw0JUwXgakeWtqQABkHboIR3gohVwfanwNW4rxBu+BR3ay7nGkd-buhJSoClGdDUmotQNmu5a+gF1juqADMGubIDbu6BLIW3o92zt1nSUgJ7F1VG9iHKNq6H1JxTjQNOGdT3fwHo8H9G9f5awAz-P+9793EN4SwjcqjTkJg0O4IxLaFQntShebtGhx7EFDXbE8Ih3AoKyghG+70CLqkoGhfimCT7UCsXaCC6B3B5JkMKNI2gyBz0EqhB0+hpQn35sKbkdbMwsInPsbmyCpENzxIR1BkgFYKGVgzf5BFZnRjU7BhN8H3BaJ0W29Rmi-h6aVAs9wJLm0nncN4u96YMCeOINZ3xpnzNtMs8qx46YFnue6c59sFntOwCWYyA2nnE1BZWYqXzmnTPnPZJc8gSGzkXK5OQSLlmSXgEdVIZ1cCbzJG04q7T7YssD16Llg24pJQQoQxDMFUpIVRfAOVpQNBPUYUQ+mD1eASALJrZZnk7ZmtAP1O4PNWm7Ktt6OmDDTGmtMDy8Nog7g0iFbsh1lrbWFCzaba5+DAAmRL8HJuofPOhk8WHgS2wwyIPbhG6TzBPuRyjGC02kYvLR6x190B7eY1+NjHH0Bcb6DxvjYaLwCcYH-W2ompHiYSOICc0mqiyeSPJ+coa-lq1UxuDT-m7J7d0-NqbBmCCE90SZk8e2XPzMp45oxdmEgObCU5yn1O4P4+84duy3m0v7bZ+N2we3Av0mC1zxM4WmS8-x-zhZe3YschS2LjQ8v4tS8FxlkrOX5sGww3t1bgviu0Gy2V7Xow6vVb15AUFVXpRq40FTjcQ3WvdYUAdzrzuvUnj6-tgbc3dEG0W3tsbyH9O68G6bwPK2Bf26MV1jBruYN49sAAZiV8dntaHUHwYuzh67ye7vEce38Z71Gwej0sZ9hjkBk+-dY+xo1mduNkF4zEfjWdBNQ5E9kMT3J4eI71MjgicmFMY+U1ji8Gnce7bssnsn+mNGk6M0Tu3yeZcnmT3T2z9miCOZX2v+DyfOehfgzzhZq+-PT5T8L5ZTIlfX+C3vi-NOD8q8V8fuyr+IWP+jJrk3-v8sz764aA16ZZG6lZ9Cm6VbgrSjJ61Y24Nbr4ZZO6bbyCp7u5ta9YYbJ6+5Db9h6hEDJ7B4njHbTbr7h7-6LbJ5R5n6x4e4YQgE7bP52QAAsaeKGGep2WedkOeV2eGzBBeD2ZekAT2woL2TANGFe9GN8zBteBA-2DeQOvszeoOb2T4EOQmtg0O3esOvekmlYSOKOesI+Smqsew2O6mJy0ezBc+xOC+NhduzB++LBm+HijOO+zODhThtgzBR+0ep+J4jhT+7O3h9+Kyd+EuLO8GgR0WARn+3ISucRqWCy0RoBTqf+eWGGzBQBMhqRxuEB-+UB9WGgWRVueA8BJMyRSBEedBCgrB6B3WmBAROBEeeB+ozBRBR2KGpBUR5BC2rRRAzB1BARtBKBORjBwRGgAArGwdCBwdGFwbYDwZmNdpMQISRlpGRsXqIaXqoe0JIV9pAJMbIfIZxuDsDsoa3kIeoZ3hmDDpWHDnoZmAYUPqjsYekGPmYRPjjpYQspMTYUYnYUvuTnbpMV4VMS4Qzl4h4b8WCZMb4V5l0iCbCaEbfu-uLiLhFjCUEdHpMYkQkcll-liT-mAVrv-hhpMUAUcbkeAc1oUdVhSaUebrbkSX7gtjUfINMfUZ7vBt7nZJMc0RQf0ZMR0RNl0QAbYFSbgbqPqJMUMfBpyRti7hyYnpfhoJ4DMb0HMWdtnthrwfBiIJ4GsUXhRtsa9hse9vsVXp4McfXqcWoecVgC3t1Fce3pDsJrcdofcboQjlJgPoYQaOjiYSpl8RYeMdHp4P8emICdosvgsp4GCZ4BCdvrvnGQmfCUqoiamdiXGSiSFtHrmXbvGdmSeJ4HiWicrgSVclmcSWkfkRkSWUAdadSaSXlnSdKJ4HAdAQgfBkWdGMgUqeqVyT1l7hhp4AKX0dKUQJ4CKbYCQeKWqb0QHv0Z4HKXZIOYqfHvIE2WGQsgAOwaknbzHzlLG4b6m7lGlCEiFUZmlmwWl0YHG7k2kA6N4OlOlt4TRumaFd4+A94SY+n6F+kvFGGBnvGmEApPiT4-Eni7mRkk72F7lgm7lJluEpnQWIXpkn6ZloXFnwa7m5nhEYmS4IU4V2S7llnR6JF267ka4knpE67QVAGPnNl0Vm7lG7mdlFFUVVEUHsn7lDmNG4XjlLmTm7kzn2BikYZMVSn4G7mrm2B8UbkYRMU7kngAAcB5WpCxmGupyxeGqlF5uxV5YhmUuxH2Uh6AqlT5ChZxShjpKh5p9pH5GhzpHpP5Ohf5-eMmQFAZimoFwZEF3xKl8GqlsF0ZxmduqlYJqlyFUJPiEVUVGF3OWFwVUV+F5ZBZCykVJFtgql5FCylFmVNFtZzWGGqlQBllzFdZFWZRXZGgZVjJ5R8Vju1RKB6l-FI5alQlSg-RqlYlc5pVi53Vk5qlcldVIxSpFVQVdkAAnBpZnseTpaeXZCINNQZQ5cIVsdeeIUIWZQcdNVZXaWobZW+S6U5TcXcZmA8f+U8YBWccBb5Zjp8QFaGTEfBtNaFYZjGcCQstNWCdNTFUznFT9X9YlR0slTNX9WlfmREXbr9dlRoNNXlUlnFilrDUVXkSVSeNNUAftZVbSTVUUdjQ1bVWjc1TxSgbNe1TyRhtNV1YttNX1RJVjYNfTaNZTYpQoLjVNbYO8HNZwQtZdrpfqe8GtbeU+EZTsetbtVXu8AdYDjZSDpcbsdce6RdRmFdZ5YPndT5aPmBeYYCq9Wtm8B9Yvl9XoqZm8GCe8ADe4UDZZpbfDe8KDRoP4dpg7YbTzW8FDQshlfbVbW8EjfBgVX7RuL-lVfOe8EAbLXjZAQTdVpHcTZxRbdxWySgbzVTXZLyZ7XTf0e8IzaHvbSzbnW8KNenRzfINHdGKXBKOQAbM2tEBoAskOBeKZkWC3ZTm3U+DQYWO3VEZ3Tif3XGYPdBcPcFaPTNePZ7RuNXU-FcPMg3ZGb3Wtv8T3V3ZTivUvSnhvWvVEdvTiXvXGQfdBUfcFSfTNWfZ7TYdPWXLPaeGpkAA
[playground-fixed]: https://www.typescriptlang.org/play/?ts=5.9.3&target=9#code/PQKhCgAIUgxBJAGgUQCIC5LwHYBcCmATgGYCGAxvpPgB4HYAmAzgDSTEA2pu9+DkAe2yVIpRpEL4Arkz6QARgE9I2UgFt8UCNEgADZHgCWuRQCFSs3ZENNIDfOS6T+QkQDdDpPbXrMrgFAJrXFsNNXkiSA4bXGtbeSlDDlwtUUgmQ2wAcw4qXEMNUXFyCgALOSlGCNwS7hV1fAA6SGQ3ImUGATVSDOs8IjIRcI4BAHcUn3xGW30jE3NLBWVJYiJJkQymAlIXYgl8AFpObnoMzKDbAEYANhS1QxoNtjF+aqoLgAZIGVJMqnSCWwABxkJUgrzS9TqGgYKQyBBIFHwtmqhAEUkyoK6gMBchMONYqV+2CIhnIe0BAn+AkIiiejBS8gs+AAPPsAHz2QiGVr8CzpTKqeSJYzKchlcgAayYDS0KQA4pMiNw5EpIESlQR9nCiLJyHkhPtwsISl1CBKGmoAFaXd5aYDgcB4qgGPImADKuG4MkgAF5IAAiBiEUjEXD+yAAHwDFDyrXDUf9TBkOMqDHj0cIYu5fH9AG5HYocZAAApEO5MdJCX0ByTbdP+kZcgj1+w5ZuR6MMO7YPMO7UIkQAdWMJXg9lmygA3lBrAxMJsuVl85BqHQiKoOGP57hF2co9gpBwOPmAL59voDqjD6oAFXySM9akBtmnK-ItYIDAAgrhMKhlcuXyAgwyrfr+kD-gQgGtvgn4-n+yodgeR6nue8IDFeI4APIjMShBMCUhiApAr6CLhRBbmkO6nIB1KZGIhgAF7cIYQiUQuNEzlsajsdRWRIYex7gGe4D9hhkDXiUHpei+M6bDJmAuiK0m4DIgHyapTAAMI1FkfDwRBAFyZ6mkAEr4BYQjbruAkocJaH9IiEkjgAajqrHYCRM6tPhHmYAeYREIBkgeJW2D+VIgWEIBsE-NZnEiWJTmSV+UgMMYXlvh+fCmIo8VLjOUjAaBuX5ZkgGkNiqI8qVVE2fugmoaJF7iZJN4-LJK6epkTCYLWHTYBwygcVkADaAC6gFcEMvWQOZ2xCENzLmeQ1IMMyI2ZGwm1smyTVJUOI4ALKxSBnqZZAGiemdpCYPNA1LSta0bXxW1fNgErYKM2C7YB5AyLgnSwIY+AcMwd0WQ9ijLQ4z2bdtr0CVFHbyAIAg5GIv32c16HJSOpaEOWYWdZAOKEzYxN9ZDi3KATRMeRNgE2MWUjyFE5CYKj6MWdg+0tXjt6TGIMSkfQwu8bugFi3g5mZH5AbSPWMj1pVFC9ol-OHdUAAyAjFFEzH6p5pHDPr+BlVL96MUI5t1QlDmXs5OuGCs5CKI4VCkcCbM2GUYEIQQtlCSutCAoYkhMAZkFUA1dkrqQmaETyUeIbHQka7jWtSRZicXbICdijePgW3JOdigA0vgigjGts39TTdtjZN2MHZh1Rumimae3JneUG6iibPgaglyuTC9-g5krJIwi25tQdM0+1JweB0fzy3mtt9n-1NlOM6OHyLukixVkBt77P1v2G71qt2DEIY455KQHC9iHwg0oCRuV4oEunGvGeOVnQc1IJScFGBdGuZpQEjB-vxNOgEIEgOGCMD0+BAQRSivA4BUCVK239CmdKWR6yEAqNgU419OiAjbPgesZBEg5iagWIsX4w7mSYBSbAshmQ3jZNWUiN1MA3mCvgAAjlIB8MDyozkkJQbM-tDJQWEvmRhVBUCdG6NgFokxcBcJ4X6Ui+BWh4AkTFQxuAbyFltroAAJJOTaJ4Gjvgsp+KwUZrG2NevYoqZ0+C6AqpkTIkh6IEGMTOQEpBFDDG2AI2i5Bt7OBTgok8SinTNAnMWbgYodG8JnKNcuvRIASirgIXYN5xoAH4BG5Obkkh0KSlLulUM+EoAhtHcOySueug1lC5PyYUxQxTIClMqeXapySLGpNdIoFyT977cGpFkvROS8k9D6QM0p+wKmQAABRuCfmI4Z40ACUvoeFcwxrzRRDtxLmQpFSGkXDVy+BfLOMqkATw8NInfRguUxxbPvmVQ5mBiyonLCyG8Qc9ozi+QwI6YhFB-PBnsBaXTG6ZAmoCksIKbAsk6UNQZE1IVZScfgHZezbY3gxcCzo2KdGAS8cqBFZU2BhNwGKRSaSMklB0ZSrFnDuHqVIK0WF2B4W7I4GIuu1MUU3nRUC3lOKpV4pleNSFIl7D70kOwCoeoPKiFiag3A9TobgomFMC6-zUW0XIoQEJK46IMUNh5W1VEFITOUiZNS3l3InwCuEaKM4rrbG4LdOairoZPUIOteG71PrfSxu8rZWiRQCIxYIh0OMAHOgnPMKgprmAzkkmOJNJgWAFpHHeDQ8knysDLdUHCeECJEVLSuSSKkZDNqdiUNyvkhAdpSmlYwfby0dSHdUE611g2jpKHTCmHka0tvLULPAU7db6yYsfbAK6XYOHdjkKdboy4lH3ePfdDgpA7ynUAyBSDwCThEhmx2RqLiPMmMwN1cwmReRnMWxQ5cMhzgVhOfYFwX5Qlnq9aCSJ3xESNiPNIIixEz0wBcCqPAuTxABJgUib5lSZGpHlS1M4VyAi5NSZNAYkH1i+oTJ+9ZCIYlA6-UgbM+CczRucwCNTsZ1InBcVh7DZDVmYYYfjQhOFPshTxyZFxNF4GrKoroGRZPaIk-mKTIoLjpNZaCP0RqtOZNU8o99igLhukaQRFp1YjVmcqhZlTvHJPjKfdMqIZ1qRWYnC52ZgNCDMkM+AdVTgqA302NQXj7LpP5kCwnYLYmYiSFucYfDFwIaJZ89DfzIWYgUEoB-Pgz6-Q5YNUaxNvHDn5iy6ICshgBQXBDUanN1Yf0ofAJVg+tX5ARY09WIreWGAtauU5I1AAmF9ZqGufunN+icf7GCYH9D+-Yw3QOqA0HB+wTBoMf3lptdSCG1i22G6h6iGGkRYaI5AYoBA8M0jg8R0jO95uUY7P6ajXRn4vfoyURjYXmM5AA2cnmnGlEiXUyYYbomOFUD9MJyH4mJzDcc0WEbyn5NqKU6YvzCOkdZsmcN-TOnjME6x3jnHxnhs2aaZZ3TE5Kd2ZJyKRHamnMI6825wgHnJls7mb5kbkKAsOCC5duLYW8ddfB1FwXMXhccPi6gykSWaTDdSwr9LDPwf87a-qvro3Cva8NROUrePyutZF+17Aw36vZs-X6H9R3Tey6q-yC3nXyc9f13we3g2RBGoAMxjbfRNwTU3X6TNmwBhbQHfcrfqOtqDXJtsn126XURB3MC++O+hqQmGLo4eu-hu7pMHvkf9M9hMb3aOfZq99wCTGWMA-Y0DmcXHQcs8mb7uH0PICw6RAJlkfuyd+9R36BT6jlPq8UL7wfE5fcE85yKYnA-mfI5n3T5pMQaeTLXy0ifU-l+45FL77nPn58mGP-MpfDpouasqz+334vJ+S41bFx3CXVf4fv6GtL+Hd+a7Nx7hgf3PXXLA3SZI3Q-E3NrarAUX3K3SZRrW3GfCrM3aA7AX3V3P3d3EAvgDPdNVuYzAAFgD1sCD27mmzD3-Xm0WwIJjzW0IxXA2y21g3oPg1TyQ0gAIMz0MFO1mmw0u1wwLxYPu1Ykewo1GCo2pHezo2rx+yFnrzY25jEGBwdFbxX0mQIM7yExYV7zE37wnAIOn3UOHwgnRw0UxyNQMP30ILn03wX05Qn0sKMwsO3w32MxcIcMMJFAIPPw51sLPxmXZw8KUWvxf1Cx-QIIf04IF2fxl1CzfzuUUAiK-3f3uQsL-0d160-CIOAOK0N3CMgJQOdwILgJFAQNFy8OQIyNQIIIwP0KwINT4CiO9wPxMAAFZiDjNGsQ9yiTBw8qCgNWjaDwNJYZxGCE9mDk9R59t2DWiuCeDzsVw898AbsCNJjFiSMRCS8y8AwK8PsEwvtZDBR-sFCONm8Qdak28RRWjNCYdtC2FdCJ9WjPC2jjDR8MctFHjnjFBWibCid7CjUnirCASXDT9FB3CASvjWifDQSfDPjgipcb8Rcf1WiH9ZjoihdKt4jFdviVcEi4SHQtdsCGB2iciP4StkSCiqjndWiSiP1BNEDJk0SoDqTajGT6i+s0TmjjMrgOjSCv1Q8RQ+jANJl9grghi49NtxidsIMU9ENKBMArg5js8ztc9+D89bshCi9NiTAntxCXtdjpCGNa9ft5CFBG8lCziVCLi1CRQrgbju87i+8J8rgvirhXjTDx8jUXSgSJwrhfi9N-jfTXSQS-CwTzN19nTXToTQzYSvT+cQjYiYgf0rgH9FT0TpdMT5cEiUzki8S4ylFCSGiGAeTSTQCRRwCTArhKTQtzcrhaSzAbcejFA0zmSatsArhWTbT2TPw0yuSjUAB2Xk63YPB0AU3oyg4UkUfYfs8UlgsYmDaUkYqYtg+UyAfspUnPPgq7ZYwQtY4QsjHUsQkYCQmjPYgMA440uQ44s0xQi5FcFva0loxQfs+0nve4qHCffsr4-s90xTMwj4gc78-0jlbTT878kMtw8MnfQCn0yZfs6M4zWMicL8+EmI2-ZCh-dc9MxE1-LM7E-s3E7EsCgs--Ikwc0s8k5C6s7LVA-s+sson9LC1sgUfszskwcivVMipRB9cSI1AADiHPgMm1HKbKFMjxFL4tnLWPnMT3ChYNkBXNtj4o3JVK3IEI1L3K1IPII1Lz1PL0kMr32JkMvKONYxvNOPvPOKcInD4tfMdIeP4q+L4t-LH3MJsqcuAsmUX3ctgpFD4ogusygvs0mT4qcoQqNSQpCvjIRNCKTJsof2UuwtivJBSMUD4sIrV0cpIoyIAIEooryJsuoqdzbL4vosbJ-USuYuwD4rYrSu7L4ESr7InAAE5BLSjhLyDBSJzxKpzmqpKZSGD48Fyk8BrWC5TbZmqVLeCLttyVjC8NjtLdTjz9SDKzz-QLyLsryzLAcLTLKrTrLJlmq7KRMdCPyjVmqvjmqXL3i8AJ8LrfKTBmrPK7DQLzrLqAracgq7rLrwrPMAiedvrUKMSkSWqH9JqkrEyUqEjmqMqf83rsqayADWr8qwCf1mqirzdmqyr6SmzwaqrmrarkbOKizwamrpNPg80SDhyyCxzf1urFsPh+qly7AhrZK4MFLxrkN3gpqFjFjZrdzRr9zRDdLlr9LTzDSa9NrTKG9bzlDuNLiTAPhjrO8J8PgviPhrr-zbqn13h1b3hnqTBvLya9aPqt8vqda9bfqud-qfNVbdagaMyQbyaH8Pgn9gbcLv8aQPhYbUjeN7aCTSKiyPhuzKLyaMbUCPhsau9mtuaHcayI73harg7Sz8tY6HRQ4l4wQnMfJFAjVfQZwn1IwC6Eci6VxMCIxi71DS7jN2iK6y7fTq6BzG6bLm7DrW6NM06M7CAYg6kc6bjK6NNNC67ych6B6TAO9TrBNh6LDR767GTZ7uSF6Byl6bKV7Dq16O7O8lEu6RYakgA
