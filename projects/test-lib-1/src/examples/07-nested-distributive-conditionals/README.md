# Nested Distributive Conditionals (`A extends unknown ? B extends unknown ? ... : never : never`)

## Problem

A conditional type `T extends U ? X : Y` distributes over unions in `T`, instantiating once per union member. Nesting two independently distributed conditionals - one per generic parameter - multiplies that work into a Cartesian product, and the cost grows quadratically as either union grows.

```typescript
// nested-distributive-conditionals.slow.ts - two independent `extends unknown` distributions
type Pair<A, B> = A extends unknown ? (B extends unknown ? [A, B] : never) : never;
type AllPairs = Pair<Left, Right>; // 1,000 members × 1,000 members = 1,000,000 instantiations
```

See [`nested-distributive-conditionals.slow.ts`](./nested-distributive-conditionals.slow.ts) for the full repro.

## Solution

```typescript
type Pair<A, B> = readonly [A, B]; // no distribution
```

Neither branch of `Pair` actually depends on which union member matched, so dropping the `extends unknown` conditional removes the distribution entirely - the 1,000 × 1,000 combinations are represented by one tuple type instead of being instantiated individually.

See [`nested-distributive-conditionals.fixed.ts`](./nested-distributive-conditionals.fixed.ts) for the full repro - it also shows deferring validation to a function call site as an alternative.

## Why It Works

- `T extends U ? X : Y` distributes over unions in `T` - nesting two of these multiplies the work, one instantiation per combination of members from both unions
- Since neither branch of `Pair` depends on which member matched, the distribution buys nothing - it's pure Cartesian-product cost with no behavioral difference from a plain tuple
- The effect compounds with union size: this doubly-distributive shape scales quadratically, so it gets worse fast as either side's union grows

## Common Pitfalls

- Adding `extends unknown` "just to be safe" when no conditional branching is actually needed - it's pure distribution cost with no benefit
- Nesting a second distributive conditional inside the first without noticing it turns a linear cost into a quadratic one

## Impact Measurement

Two independently distributed unions instantiate every combination:

```typescript
type Pair<A, B> = A extends unknown ? (B extends unknown ? [A, B] : never) : never;
```

See [`nested-distributive-conditionals.slow.ts`](./nested-distributive-conditionals.slow.ts) for the full repro. `Left` and `Right` are each 1,000-member string-literal unions, so `Pair<Left, Right>` forces TypeScript to instantiate all 1,000 × 1,000 = 1,000,000 combinations individually instead of representing the pair once.

Run the same source through both project configs and compare the full diagnostics:

```bash
cd projects/test-lib-1

npx tsc --noEmit -p src/examples/07-nested-distributive-conditionals/tsconfig.slow.json --extendedDiagnostics   # nested distribution
npx tsc --noEmit -p src/examples/07-nested-distributive-conditionals/tsconfig.fixed.json --extendedDiagnostics  # no distribution
```

| Metric         | Nested distribution | No distribution | Change          |
|----------------|---------------------:|-----------------:|:-----------------|
| Files          |                   148 |               148 | unchanged - same lib/program, only the type changes |
| Types          |             1,003,344 |             2,387 | -99.8%           |
| Instantiations |             4,002,001 |                39 | -99.999% (~100,000x) |
| Memory used     |               787,791K |           118,971K | -85%             |
| Check time      |                 1.68s |               0.02s | -99% (~84x)      |
| Total time      |                 1.93s |               0.26s | -87% (~7x)       |

Same file count both times confirms the drop comes from the type alone, not from a smaller program. At this scale the effect finally shows up as wall-clock time too: `Check time` drops from 1.68s to 0.02s - at the original 100-member-per-side size the same fix was real but only a few milliseconds, too small to separate from run-to-run noise. `Total time` doesn't drop by the same factor because ~0.2s of it is fixed lib-loading overhead unrelated to `Pair`; `Check time` isolates the actual cost of the type itself. (You can also just hover `AllPairs` in each file in your editor and compare the reported instantiation count directly.)
