/**
 * FIXED: the same project migrated so 5.9, 6 and 7 all compile it
 *
 * `tsconfig.fixed.json` replaces every removed option (`target: es2022`,
 * `moduleResolution: bundler`, no `baseUrl`, relative `paths`) and turns
 * `strict` on, which is the default from TypeScript 6. The only code change
 * is typing the parameters that `strict` no longer lets through as `any`.
 */

import { sum } from "@utils/math";
import data from "./data.json";

function describe(user: { name: string; age: number }): string {
  return `${user.name} is ${user.age}`;
}

console.log(sum(data.numbers), describe(data.user));
