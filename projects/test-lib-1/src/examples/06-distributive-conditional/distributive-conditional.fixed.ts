/**
 * FIXED: Disable distribution where the branch does not need it
 *
 * Wrap the type parameter in a tuple `[T]` to prevent distribution. The
 * branch runs once on the entire 65,536-member union, and the template
 * literals and `Capitalize` map over the union themselves.
 *
 * `Result` is identical to the distributive version - the same 393,216
 * string literals - because a union of strings has no per-member correlation
 * to lose. (This is only safe for branches like this one: an object-typed
 * branch would lose the correlation between its properties.)
 */

type Hex = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "a" | "b" | "c" | "d" | "e" | "f";

type Item = `item-${Hex}${Hex}${Hex}${Hex}`; // 65,536 members

type Accessors<T> =
  [T] extends [string]
    ? `${Capitalize<T>}` | `bet${Capitalize<T>}` | `get${Capitalize<T>}` | `set${Capitalize<T>}` | `ret${Capitalize<T>}` | `net${Capitalize<T>}`
    : never;

type Result = Accessors<Item>; // 393,216 accessor names (6 × 65,536)

export {};
