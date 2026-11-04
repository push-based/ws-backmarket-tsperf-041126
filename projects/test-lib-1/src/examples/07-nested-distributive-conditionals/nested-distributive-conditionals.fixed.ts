/**
 * FIXED: Avoid materializing every pair
 *
 * Option 1: Defer validation until a concrete pair is supplied via a function.
 * The type relationship is declared but not eagerly materialized.
 *
 * Option 2: Use a simple generic without distribution.
 *
 * Same 1,000 × 1,000 member domain as the slow version, but neither option
 * distributes, so the Cartesian product is never materialized.
 */

type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";

type Left = `l${Digit}${Digit}${Digit}`; // 1,000 members
type Right = `r${Digit}${Digit}${Digit}`; // 1,000 members

// Option 1: Simple type without distribution
type Pair<A, B> = readonly [A, B];
type AllPairs = Pair<Left, Right>;

// Option 2: Defer validation to runtime with a function
function pair<A extends Left, B extends Right>(
  left: A,
  right: B,
): readonly [A, B] {
  return [left, right];
}

// Usage:
const example1 = pair("l001", "r001"); // ✓ type-safe, no Cartesian product
const example2: Pair<Left, Right> = ["l001", "r002"]; // ✓ inferred, no Cartesian product

export {};
