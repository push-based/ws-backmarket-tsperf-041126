/**
 * SLOW: Nested distributive conditionals
 *
 * Two independently distributed unions produce Cartesian-product work.
 * `Left` and `Right` are each generated from three-digit combinations,
 * giving 1,000 members per side. `Pair<Left, Right>` distributes both
 * conditionals, building all 1,000 × 1,000 = 1,000,000 pairs one by one:
 * `tsc --extendedDiagnostics` reports 4,002,001 instantiations.
 */

type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";

type Left = `l${Digit}${Digit}${Digit}`; // 1,000 members
type Right = `r${Digit}${Digit}${Digit}`; // 1,000 members

type Pair<A, B> =
  A extends unknown
    ? B extends unknown
      ? [A, B]
      : never
    : never;

type AllPairs = Pair<Left, Right>; // 1,000 × 1,000 pairs when Pair distributes

export {};
