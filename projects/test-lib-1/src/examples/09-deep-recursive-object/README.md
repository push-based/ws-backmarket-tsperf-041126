# Deep Recursive Object Transformation (`DeepReadonly<T>` without depth limit)

## Problem

A recursive mapped type with no terminal case and no depth limit repeats its transformation at every nesting level, however deep the structure goes.

```typescript
type DeepReadonly<T> = T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } : T;
type Result = DeepReadonly<Node0>; // Node0 is a 66-level chain - walks every level
```

See [`deep-recursive-object.slow.ts`](./deep-recursive-object.slow.ts) for the full repro.

## Solution

```typescript
type DeepReadonly<T, Depth extends number = 5> =
  Depth extends 0 ? T :
  T extends Primitive | Date | RegExp ? T :
  /* ...recurse with Depth - 1, array case handled explicitly */;
```

Add terminal cases for primitives/known types and a depth counter that stops recursion once it reaches 0.

See [`deep-recursive-object.fixed.ts`](./deep-recursive-object.fixed.ts) for the full repro.

## Why It Works

- The `Depth` parameter stops recursion at a preset level (default 5) instead of walking to the bottom of the structure
- Primitives and known built-ins (`Date`, `RegExp`) return immediately instead of being recursed into
- Arrays are handled explicitly rather than falling through to open-ended recursion
- Callers can still override depth per use (`DeepReadonly<Node, 1>` for shallow, `DeepReadonly<Node, 5>` for deep)

## Common Pitfalls

- Assuming TypeScript's recursive-type shortcut always kicks in - it only applies when the same type recurses into itself; a chain of distinct named types (`Node0 -> Node1 -> ... -> Node65`) forces a full structural walk instead
- Assuming depth alone can be pushed arbitrarily far to make the cost show up - this chain shape hits TypeScript's "excessive stack depth" (`TS2321`) error once the chain crosses roughly 95-100 levels, well below the 500-1,000+ levels a simpler, uniform recursive shape can reach before hitting the same limit. Making the *per-level* cost bigger (more sibling fields), not the chain longer, is what gets check time to move here.
- Widening each level a little (say, 10-20 sibling fields) and expecting `Check time` to visibly move - the per-level cost has to be large enough that walking 61 unnecessary extra levels dominates the run; too small a per-level cost stays buried in fixed overhead (parsing, binding, checking the rest of the program) that both versions pay equally

## Impact Measurement

`DeepReadonly<Node0>` is the whole repro - one reference to a 66-level chain, where every level also carries 200 sibling fields (`field0`..`field199`) to give the recursion enough per-level weight to show up clearly in wall-clock time:

```typescript
type Result = DeepReadonly<Node0>; // Node0 -> Node1 -> ... -> Node65, no depth limit, 200 fields/level
```

See [`deep-recursive-object.slow.ts`](./deep-recursive-object.slow.ts) for the full repro (regenerate both files with `node generate-deep-recursive-object.mjs [fieldCount] [nodeCount]`). Each `NodeN` is a distinct named type, so TypeScript can't shortcut the recursion - it walks all 66 levels individually, redoing the same 200-field transformation at each one.

Run the same source through both project configs and compare the full diagnostics:

```bash
cd projects/test-lib-1

npx tsc --noEmit -p src/examples/09-deep-recursive-object/tsconfig.slow.json --extendedDiagnostics   # unbounded recursion
npx tsc --noEmit -p src/examples/09-deep-recursive-object/tsconfig.fixed.json --extendedDiagnostics  # Depth = 5
```

| Metric         | Unbounded recursion | `Depth` = 5 | Change              |
|----------------|---------------------:|-------------:|:---------------------|
| Instantiations |               639,432 |        54,681 | -91% (~11.7x fewer)  |
| Types          |                67,667 |        42,511 | -37%                  |
| Memory used     |               422,634K |       325,984K | -23%                  |
| Check time      |                 0.72s |         0.44s | -39% (~1.6x)          |
| Total time      |                 1.16s |         0.88s | -24%                  |
| Files          |                   148 |          148 | unchanged - same lib/program, only the type changes |

`Instantiations` drops by ~11.7x from bounding the recursion, and with 200 fields carried at every level the effect is heavy enough per level that it shows up unmistakably as wall-clock time too: `Check time` drops ~1.6x (0.72s → 0.44s), well over a quarter-second saved on a single compile - a gap that reads clearly above normal run-to-run noise, unlike the few tens of milliseconds a narrower per-level shape produces. The time ratio is smaller than the `Instantiations` ratio because the fixed version still walks all 200 fields at each of its first 5 levels - bounding depth removes the extra 61 levels of work, not the per-level cost itself. (You can also just hover `Result` in each file in your editor and compare the reported instantiation count directly.)
