# Recursive Tuple Construction (`BuildTuple<Length>`)

## Problem

Building a tuple recursively creates one type instantiation per recursion level - and TypeScript has a hard instantiation depth limit (typically ~500–1,000).

```typescript
type BuildTuple<L extends number, R extends unknown[] = []> =
  R["length"] extends L ? R : BuildTuple<L, [...R, unknown]>;

type T900 = BuildTuple<900>; // 900 recursive steps, near the depth limit
```

The cost is worse than linear: every step spreads the previous accumulator into a new tuple, so building a 900-element tuple creates tuples of length 1, 2, 3 … 900 along the way - roughly N²/2 element slots in total.

See [`recursive-tuple-construction.slow.ts`](./recursive-tuple-construction.slow.ts) for the full repro.

## Solution

Keep the type, change the recursion: build the tuple from the decimal digits of the length.

```typescript
// DigitTuple maps "0" → [], "1" → [unknown], … "9" → [unknown × 9]
type Times10<T extends unknown[]> = [...T, ...T, ...T, ...T, ...T, ...T, ...T, ...T, ...T, ...T];

type FromDigits<S extends string, Acc extends unknown[] = []> =
  S extends `${infer D extends keyof DigitTuple}${infer Rest}`
    ? FromDigits<Rest, [...Times10<Acc>, ...DigitTuple[D]]>
    : Acc;

type BuildTuple<Length extends number> = FromDigits<`${Length}`>;
```

This yields the **exact same type** as the slow version - a tuple whose `["length"]` is the requested number - but recurses once per decimal digit instead of once per element: `BuildTuple<900>` is 3 steps, not 900.

If the length doesn't actually need to live in the type, the cheapest fix is to not build a tuple at all - a plain `T[]` has no recursion and no limit. That changes the type, though, so it answers a different question than the one measured here.

See [`recursive-tuple-construction.fixed.ts`](./recursive-tuple-construction.fixed.ts) for the full repro.

## Why It Works

- Digit-based construction turns N recursion steps into ⌈log₁₀ N⌉ - each step multiplies the accumulator by ten with ten spreads, so the total element slots created is ~N instead of ~N²/2
- Spreading a tuple is a single instantiation however long the tuple is; the linear version pays one instantiation *and* one new tuple type per element
- The result never approaches the recursion-depth wall (`TS2589`); its only limit is TypeScript's hard 10,000-element tuple cap (`TS2799`), which no construction technique can pass

The equivalence to the original is checkable in the type system (rename the two `BuildTuple`s to put them side by side):

```typescript
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

const same: Equal<BuildTupleLinear<900>, BuildTupleDigits<900>> = true;  // ✓ compiles
const off: Equal<BuildTupleLinear<899>, BuildTupleDigits<900>> = false;  // ✓ compiles (negative control)
```

## Common Pitfalls

- Encoding an arbitrary numeric length as a recursive tuple instead of asking "does this really need to be a fixed-length tuple, or would `T[]` do?"
- Treating the depth limit as a distant edge case - cost rises well before the hard `TS2589` error, so a type that "only" reaches 500–900 steps is already slow, not just close to failing
- Swapping the tuple for `T[]` or a handful of hard-coded cases and reading the delta as an optimization - that measures "not building the tuple", not "building it faster"; only an equivalent type is an apples-to-apples comparison
- Reading `["length"]` off a large tuple resolves every member: a single `const n: T900["length"] = 900` adds ~900 instantiations on top of building the tuple

## Impact Measurement

Both files declare the same workload - `BuildTuple<500>` and `BuildTuple<900>` - and produce the same two types. Run them through both configs and compare the full diagnostics:

```bash
cd projects/test-lib-1

npx tsc --noEmit -p src/examples/08-recursive-tuple-construction/tsconfig.slow.json --extendedDiagnostics   # linear BuildTuple<500 | 900>
npx tsc --noEmit -p src/examples/08-recursive-tuple-construction/tsconfig.fixed.json --extendedDiagnostics  # digit-based BuildTuple<500 | 900>
```

| Metric         | Linear `BuildTuple` | Digit-based `BuildTuple` | Change              |
|----------------|--------------------:|-------------------------:|:--------------------|
| Instantiations |             416,991 |                      278 | -99.93% (~1,500x)   |
| Types          |             412,813 |                    1,888 | -99.5%              |
| Symbols        |             903,376 |                   61,163 | -93%                |
| Memory used    |            412,478K |                  99,200K | -76%                |
| Check time     |               0.35s |                    0.02s | -94% (~17x)         |
| Total time     |               0.65s |                    0.30s | -54%                |
| Files          |                 137 |                      137 | unchanged - same lib/program, only the type shape changes |

`Instantiations` collapses by more than three orders of magnitude and `Check time` drops to the measurement floor, while the resulting types are identical - the remaining ~280 instantiations and ~1,900 `Types` are the two tuples themselves (their 1,400 element types), which any correct implementation has to produce. Same file count both times confirms the drop comes from the type shape alone, not from a smaller program.

The digit-based version also keeps going where the linear one fails: `BuildTuple<1200>` plus `BuildTuple<9999>` together measure 302 instantiations and 0.02s `Check time`, while the linear version hits `TS2589` at `1200`.
