# Distributive Conditional Over a Large Union (`T extends U ? X : Y`)

## Problem

A conditional of the form `T extends ...` **distributes** over every member of a union, instantiating the branch once per member - linear work that gets worse as the union grows. When the branch only builds template literals, that work is pure overhead: template literals and `Capitalize` already map over a union on their own.

```typescript
type Accessors<T> =
  T extends string
    ? `${Capitalize<T>}` | `bet${Capitalize<T>}` | `get${Capitalize<T>}` | `set${Capitalize<T>}` | `ret${Capitalize<T>}` | `net${Capitalize<T>}`
    : never;
type Result = Accessors<Item>; // Item has 65,536 members → the branch runs 65,536 times
```

See [`distributive-conditional.slow.ts`](./distributive-conditional.slow.ts) for the full repro.

## Solution

Wrap the type parameter in a tuple to prevent distribution:

```typescript
type Accessors<T> =
  [T] extends [string]
    ? `${Capitalize<T>}` | `bet${Capitalize<T>}` | `get${Capitalize<T>}` | `set${Capitalize<T>}` | `ret${Capitalize<T>}` | `net${Capitalize<T>}`
    : never;
```

The conditional now runs once on the entire union, and the template literals expand the union themselves. `Result` is the same 393,216 accessor names (6 × 65,536) either way.

See [`distributive-conditional.fixed.ts`](./distributive-conditional.fixed.ts) for the full repro.

## Why It Works

- `T extends string` distributes: `"a" | "b"` → check `"a"`, then check `"b"`, ...
- `[T] extends [string]` does not distribute: check `["a" | "b"]` once
- `` `get${Capitalize<"a" | "b">}` `` is already `"getA" | "getB"`, so running the branch per member adds nothing

This is only safe when the branch has no per-member correlation to lose. A union of strings has none. An object-typed branch like `{ value: T; upper: Uppercase<T> }` does: without distribution, `value` and `upper` each become an independent union, and `{ value: "item-0000", upper: "ITEM-FFFF" }` type-checks.

## Impact Measurement

Open either file and hover over `Result` to watch the **Instantiations** counter live in your editor, or run both configs through `tsc --extendedDiagnostics` for the same numbers on the CLI:

```bash
cd projects/test-lib-1/src/examples/06-distributive-conditional

npx tsc --noEmit -p tsconfig.slow.json --extendedDiagnostics   # T extends U - distributes
npx tsc --noEmit -p tsconfig.fixed.json --extendedDiagnostics  # [T] extends [U] - doesn't
```

| Metric         | `T extends U` (distributive) | `[T] extends [U]` (non-distributive) | Change |
|-----------------|-------------------------------:|----------------------------------------:|:-------|
| Instantiations  | 720,897                        | 23                                       | -99.99% |
| Types           | 528,799                        | 463,286                                  | -12%    |
| Check time      | 0.39s                          | 0.24s                                    | -38%    |
| Total time      | 0.65s                          | 0.49s                                    | -25%    |

Times are the median of five runs. `Item` is scaled up to 65,536 members (`item-0000`..`item-ffff`, a 4-digit hex range) so the cost clears `tsc`'s measurement noise floor and shows up in `Check time`/`Total time` too, not just the type-system counters. `Types` drops less than `Instantiations` because both versions still have to build the same 393,216 result strings. The gap only widens as the union grows or the pattern repeats across more call sites.
