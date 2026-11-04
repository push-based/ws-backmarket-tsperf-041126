/**
 * SLOW: a TypeScript 5 project that TypeScript 7 refuses to compile
 *
 * Compiles cleanly on 5.9 with `tsconfig.slow.json`, which leans on options
 * TypeScript 6 deprecates and TypeScript 7 removes: `target: es5`,
 * `moduleResolution: node` and `baseUrl` (with a non-relative `paths`
 * entry). It also sets `strict: false`, and the untyped parameters below
 * only compile because of that.
 */

import { sum } from "@utils/math";
import data from "./data.json";

function describe(user) {
  return user.name + " is " + user.age;
}

console.log(sum(data.numbers), describe(data.user));
