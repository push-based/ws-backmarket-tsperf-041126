# Intersection-to-Interface Conversion (`A & B & C & D`)

## Problem

Intersection types are recursively processed when TypeScript compares or displays them. When a large intersection is reused through many derived types and structural comparisons, the checker repeatedly re-derives its constituents instead of reusing a cached result. A 16-trait mixin intersection reused across a handful of domain types is barely measurable - the effect only shows up at realistic scale, where the same base is reused across hundreds of entities that each flow through mapped types, generics, and assignability checks (repositories, events, API responses, patch/snapshot/validator DTOs).

```typescript
type EntityBase = WithIdentity & WithTimestamps & WithOwnership & /* …13 more traits */;

type Entity1 = EntityBase & { entityKind: "entity-1"; name: string; /* … */ }; // ❌ re-derives all 16 traits
type Entity2 = EntityBase & { entityKind: "entity-2"; name: string; /* … */ }; // ❌ re-derives all 16 traits again
// … repeated across 250 entities, each also run through EntityPatch<T>, EntitySnapshot<T>,
//   EntityValidator<T>, Repository<T>, and base<->derived assignability checks
```

See [`intersection-to-interface.slow.ts`](./intersection-to-interface.slow.ts) for the full repro.

## Solution

Convert the mixin chain to `interface ... extends`:

```typescript
interface EntityBase extends WithIdentity, WithTimestamps, WithOwnership, /* …13 more traits */ {}

interface Entity1 extends EntityBase { entityKind: "entity-1"; name: string; /* … */ } // ✅ extends by reference
interface Entity2 extends EntityBase { entityKind: "entity-2"; name: string; /* … */ } // ✅ extends by reference
```

See [`intersection-to-interface.fixed.ts`](./intersection-to-interface.fixed.ts) for the full repro.

## Why It Works

- A named interface builds its member list once into a single flattened object type; `A & B & C` stays a compound type that the checker keeps traversing on every comparison
- `interface extends` appends to that flattened list rather than recomputing the whole chain from scratch, and TypeScript caches relationships (assignability, subtype checks) involving that named type
- Usages refer back to the same named symbol, so the checker can compare/display types by name instead of structurally re-deriving them each time

## Common Pitfalls

- Reaching for `&` out of habit for anything that's actually a fixed, named shape - intersections are the right tool for combining two *existing* types on the fly, not for building a stable, reused base type
- Converting to `interface extends` but keeping incompatible member types across the mixins (interfaces require compatible, not just overlapping, member types where names collide)
- Benchmarking with too few aliases - a handful of intersections produces too little checker work to see a difference; the gap only becomes measurable at realistic scale (see below)

## Impact Measurement

Editor hover can show that an intersection displays as a compound type while an interface displays as its own name, but it does **not** report compiler-wide instantiation counts - that requires `--extendedDiagnostics`, not hover.

```typescript
type Entity1 = EntityBase & { entityKind: "entity-1"; name: string /* … */ };
```

See [`intersection-to-interface.slow.ts`](./intersection-to-interface.slow.ts) vs [`intersection-to-interface.fixed.ts`](./intersection-to-interface.fixed.ts) for the full 250-entity repro. Both `tsconfig.slow.json` / `tsconfig.fixed.json` are `files`-only configs scoped to one file each, so diagnostics measure only this example, not the whole `test-lib-1` project.

```bash
cd projects/test-lib-1

npx tsc --noEmit -p src/examples/11-intersection-to-interface/tsconfig.slow.json --extendedDiagnostics   # A & B & C & D
npx tsc --noEmit -p src/examples/11-intersection-to-interface/tsconfig.fixed.json --extendedDiagnostics  # interface extends
```

| Metric                      | `A & B & C` (intersection) | `interface extends` | Change |
|------------------------------|----------------------------:|----------------------:|:-------|
| Assignability cache size     |                       5,150 |                    779 | -85%   |
| Types                        |                       4,479 |                  4,229 | -6%    |
| Memory used                  |                    134,879K |               114,339K | -15%   |
| Instantiations               |                       3,778 |                  3,778 | unchanged - flattening reuses cached comparisons, it doesn't change how many generic instantiations happen |

`Assignability cache size` collapses the hardest - proof this fix is about reusing a cached, named type's relationships rather than doing less generic instantiation work (`Instantiations` is identical). The gap scales with both the width of the trait chain and the number of entities that reuse it - regenerate with more entities (below) to make it more pronounced.

## Regenerating the Benchmark

Both files are generated by [`generate-intersection-benchmark.mjs`](./generate-intersection-benchmark.mjs) from the same 16-trait model, so the slow and fixed versions stay semantically identical:

```bash
node generate-intersection-benchmark.mjs 250   # entity count, defaults to 250
```

Each generated entity gets a response/event/patch/snapshot/validator type, a `Repository<T>`, and base↔derived assignability checks - real-world usage patterns entities actually flow through, not just bare declarations.
