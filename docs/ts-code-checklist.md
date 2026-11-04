# TypeScript Code Performance Checklist

Type-level and code patterns that can materially affect TypeScript
compile/type-check performance. Apply to hotspots identified in Phase 4 of
the [performance audit flow](./performance-audit-flow.md#phase-4-detailed-analysis--type-optimization)
- don't apply globally without profiling first.

## Best impact vs effort

Impact = potential reduction in overall check time, 1-5 (5 = largest); this is the primary driver of the score.
Effort = work to identify and safely apply the fix, 1-3 (1 = mechanical, 3 = needs redesign).
Notes = additional `--extendedDiagnostics` metric(s) affected beyond overall time - which count moves.
Sorted by impact, highest first.

| Pattern | Impact | Effort | Notes |
| --- | --- | --- | --- |
| Distributive conditionals, Nested distributive conditionals, Recursive tuple construction | 5 | 1-3 | Instantiations |
| Union type reduction | 4 | 2 | Types; Instantiations |
| Intersection-to-interface, Complex type extraction, Deep recursive object transforms | 3 | 1-3 | Instantiations; Memory used |
| Annotation review, Generic simplification | 2 | 1-2 | Instantiations |


## Recursive & conditional types

- [ ] **Distributive conditionals** - `T extends U ? X : Y` instantiates once per union member; wrap in a tuple (`[T] extends [U]`) to suppress distribution. ([example](../projects/test-lib-1/src/examples/06-distributive-conditional/README.md))
- [ ] **Nested distributive conditionals** - nested `extends unknown` checks multiply into a Cartesian product of instantiations; remove the conditional or defer the check to a function call site. ([example](../projects/test-lib-1/src/examples/07-nested-distributive-conditionals/README.md))
- [ ] **Recursive tuple construction** - one instantiation per recursion step, risking the ~500–1,000 depth limit; use bounded explicit cases or a plain array instead. ([example](../projects/test-lib-1/src/examples/08-recursive-tuple-construction/README.md))
- [ ] **Deep recursive object transforms** - unbounded recursive mapped types (`DeepReadonly<T>`-style) walk every nesting level; add a `Depth` counter and terminal cases for primitives/built-ins. ([example](../projects/test-lib-1/src/examples/09-deep-recursive-object/README.md))
- [ ] **Complex type extraction** - pull repeated conditional-type expressions into a named helper so the result is cached instead of recomputed at every use site.

## Union & intersection shape

- [ ] **Union type reduction** - audit large unions (e.g. `keyof JSX.IntrinsicElements`) and shrink to only what's needed. ([example](../projects/test-lib-1/src/examples/10-union-type-reduction/README.md))
- [ ] **Intersection-to-interface** - convert deep `A & B & C & D` intersections to `interface X extends A, B, C, D {}`. ([example](../projects/test-lib-1/src/examples/11-intersection-to-interface/README.md))
