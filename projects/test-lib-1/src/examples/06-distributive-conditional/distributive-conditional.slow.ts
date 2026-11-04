/**
 * SLOW: Distributive conditional whose branch already maps over the union
 *
 * `T extends string` distributes, so the branch is instantiated once per
 * member of `Item` - 65,536 times. But the branch only builds template
 * literals, and template literals and `Capitalize` already map over a union
 * on their own. The per-member distribution is pure overhead: it produces
 * exactly the same `Result` as evaluating the branch once on the whole union.
 */

type Hex = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "a" | "b" | "c" | "d" | "e" | "f";

type Item = `item-${Hex}${Hex}${Hex}${Hex}`; // 65,536 members

type Accessors<T> =
  T extends string
    ? `${Capitalize<T>}` | `bet${Capitalize<T>}` | `get${Capitalize<T>}` | `set${Capitalize<T>}` | `ret${Capitalize<T>}` | `net${Capitalize<T>}`
    : never;

type Result = Accessors<Item>; // 393,216 accessor names (6 × 65,536)

export {};
