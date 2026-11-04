# Union Type Reduction (Auditing Large Unions)

## Problem

A distributive conditional instantiates once per member of the union it's given, and each derived type inside it (event names, data attributes, method signatures) multiplies that cost again. Worse, every component that imports the shared union re-triggers the same distribution with its own name baked in - the cost scales with union size **times** number of consumers, not just union size.

```typescript
type AllHtmlTags = /* ~110 members, mirroring keyof HTMLElementTagNameMap */;
type ElementDefinition<Component extends string, Tag> =
  Tag extends keyof HtmlElementMap ? { component: Component; tag: Tag; eventName: EventName<Component, Tag>; attributes: DataAttributes<Component, Tag>; /* ...create/update methods */ } : never;

type HeaderDefinitions = ElementDefinition<"Header", AllHtmlTags>;
type FooterDefinitions = ElementDefinition<"Footer", AllHtmlTags>;
// ...6 more components, each re-distributing over all ~110 tags
```

See [`union-type-reduction.slow.ts`](./union-type-reduction.slow.ts) for the full repro (8 components × ~110 tags).

## Solution

Ask "do we actually need every member?" and replace the union with the minimal set actually used - every consumer benefits at once:

```typescript
type AppTag = "div" | "span" | "button" | "input" | "a"; // audited down to 5
type HeaderDefinitions = ElementDefinition<"Header", AppTag>;
// ...same 8 components, now distributing over only 5 tags each
```

See [`union-type-reduction.fixed.ts`](./union-type-reduction.fixed.ts) for the full repro.

## Why It Works

- A distributive conditional's cost scales linearly with the union's member count, regardless of how many members are ever consumed
- Reference unions borrowed wholesale from a library (`keyof JSX.IntrinsicElements`, `keyof HTMLElementTagNameMap`) are sized for every possible caller, not for your app specifically
- Every component that distributes over the same oversized union pays the full cost again - the audit's payoff multiplies by the number of consumers, not just the union size
- Narrowing to an app-specific union is a one-time audit that pays off at every downstream usage of that union

## Common Pitfalls

- Reaching for a broad platform/library union (all HTML tags, all CSS properties) out of convenience instead of declaring the small set actually used
- Re-widening the union "just in case" future code needs more members, before that need actually exists
- Auditing the union in one place while other components keep importing the original oversized one

## Impact Measurement

Hover over any `*Definitions` type in each file and compare **Instantiations** (measured in isolation, with no other project files in scope):

- **slow.ts**: Types ≈ 5,395, Instantiations ≈ 4,695 - 8 components × ~110 tags, each with derived event/attribute types
- **fixed.ts**: Types ≈ 3,267, Instantiations ≈ 1,271 - same 8 components, 5-tag union

~3.7x fewer instantiations and ~1.65x fewer types, from auditing one shared union used by 8 components. The gap scales with both how oversized the original union was and how many components import it - real apps with dozens of consumers see a much bigger multiplier than this demo's 8.
