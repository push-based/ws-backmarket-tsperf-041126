/**
 * SLOW: Recursive tuple construction
 *
 * Building tuples recursively creates one type instantiation per recursion level.
 * RequestedLength of 500 = 500 recursive steps.
 * RequestedLength of 900 = 900 recursive steps, right at the edge of what the
 * compiler can resolve before hitting its instantiation depth limit.
 *
 * This approach fundamentally doesn't scale beyond ~1,000 due to
 * TypeScript's instantiation depth limit.
 */

type BuildTuple<
  Length extends number,
  Result extends unknown[] = [],
> = Result["length"] extends Length
  ? Result
  : BuildTuple<Length, [...Result, unknown]>;

// These will cause slowdown or instantiation depth errors:
type T500 = BuildTuple<500>;
type T900 = BuildTuple<900>;
// type T1200 = BuildTuple<1200>;  // ← hits instantiation depth limit (TS2589)

export {};
