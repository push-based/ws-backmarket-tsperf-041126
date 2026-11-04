# Exercise: Migrate a Project From TypeScript 5 to 7

In this exercise we will carry a project that compiles cleanly on TypeScript 5.9 through 6 and onto 7, the native (Go) compiler. TypeScript 6 turns every option that 7 removes into an error you can still silence; 7 removes them for good. We will read what each version reports, fix the config and code until 7 is clean, and then measure what the native compiler buys us.

## Goal

At the end of this exercise `tsconfig.slow.json` compiles with exit code 0 on TypeScript 5.9, 6 and 7, and `--extendedDiagnostics` on 7 reports a `Total time` around 0.02s against about 0.33s on 5.9.

## Prerequisites

Complete [Exercise 0: Setup](./0-setup.md) first: repo cloned, `npm install` done.
Start at the repository root: step 1 changes into `projects/test-lib-1/src/examples/13-ts5-to-ts7`, and every command after that runs from there.

The repo pins TypeScript 5.9, so `npx tsc` runs 5.9. For the other versions we use `npx -p typescript@6.0 tsc` and `npx -p typescript@7.0 tsc`, which download that version for one run without changing any `package.json`. The first run of each asks to install the package; answer yes.

> [!TIP]
> Steps 1–3 are about reading, not fixing. Resist changing anything before step 4: the point is to see what each version reports for the same untouched project.

## 1. Confirm the baseline on 5.9

```bash
cd projects/test-lib-1/src/examples/13-ts5-to-ts7

npx tsc -p tsconfig.slow.json
echo $?
```

No output, exit code `0`. The project uses `target: es5`, `moduleResolution: node`, `baseUrl` with a non-relative `paths` entry, and `strict: false`, and 5.9 accepts all of it.

## 2. Run it on TypeScript 6

```bash
npx -p typescript@6.0 tsc -p tsconfig.slow.json
```

```
tsconfig.slow.json(3,15): error TS5107: Option 'target=ES5' is deprecated and will stop functioning in TypeScript 7.0. Specify compilerOption '"ignoreDeprecations": "6.0"' to silence this error.
tsconfig.slow.json(5,25): error TS5107: Option 'moduleResolution=node10' is deprecated and will stop functioning in TypeScript 7.0. Specify compilerOption '"ignoreDeprecations": "6.0"' to silence this error.
  Visit https://aka.ms/ts6 for migration information.
tsconfig.slow.json(13,5): error TS5101: Option 'baseUrl' is deprecated and will stop functioning in TypeScript 7.0. Specify compilerOption '"ignoreDeprecations": "6.0"' to silence this error.
  Visit https://aka.ms/ts6 for migration information.
```

Exit code `2`. TypeScript 6 reports errors here, and each one names its own escape hatch. Write down what every message asks you to change, then confirm the escape hatch works:

```bash
npx -p typescript@6.0 tsc -p tsconfig.slow.json --ignoreDeprecations 6.0   # exit 0
```

## 3. Run it on TypeScript 7

```bash
npx -p typescript@7.0 tsc -p tsconfig.slow.json
```

```
tsconfig.slow.json(3,15): error TS5108: Option 'target=ES5' has been removed. Please remove it from your configuration.
tsconfig.slow.json(5,25): error TS5108: Option 'moduleResolution=node10' has been removed. Please remove it from your configuration.
tsconfig.slow.json(13,5): error TS5102: Option 'baseUrl' has been removed. Please remove it from your configuration.
  Use '"paths": {"*": ["./*"]}' instead.
tsconfig.slow.json(14,29): error TS5090: Non-relative paths are not allowed. Did you forget a leading './'?
```

Exit code `1`. Compare with step 2:

- The three deprecations are now removals, and `--ignoreDeprecations 6.0` no longer silences them (try it).
- `TS5090` is new: 6 never mentioned it. With `baseUrl` gone, `paths` entries must be relative.

## 4. Migrate until 7 is clean

### 4a. Fix the config

Replace each removed option in `tsconfig.slow.json`, leaving `strict` alone for now.

> [!WARNING]
> When `baseUrl` goes, every `paths` target needs a leading `./`, or 7 reports `TS5090` again. Rewrite the `@utils/*` entry in the same edit.

<details>
  <summary>tsconfig skeleton: which options to touch</summary>

```jsonc
// tsconfig.slow.json
"target": /* a target 7 still supports */,
"module": /* an ES module format */,
"moduleResolution": /* "bundler" or "nodenext" */,
"lib": [/* match the new target */, "dom"],
/* "baseUrl": remove */
"paths": { "@utils/*": [/* relative to this file */] }
```

</details>

<details>
  <summary>Migrated tsconfig solution</summary>

```jsonc
// tsconfig.slow.json
"target": "es2022",
"module": "esnext",
"moduleResolution": "bundler",
"lib": ["es2022", "dom"],
"paths": { "@utils/*": ["./utils/*.slow.ts"] }
```

`esModuleInterop` can go too; nothing in this project needs it. Prefer `bundler` over `nodenext` here: with `nodenext` the JSON import would also need `with { type: "json" }` (`TS1543`), and the `@utils` alias would need a runtime resolver.

</details>

```bash
npx -p typescript@7.0 tsc -p tsconfig.slow.json   # exit 0
```

Clean, because `strict: false` is still set explicitly.

### 4b. Drop `strict: false`

`strict` defaults to `true` from TypeScript 6. Remove the `"strict": false` line and run all three versions:

```bash
npx tsc -p tsconfig.slow.json                       # 5.9: exit 0
npx -p typescript@6.0 tsc -p tsconfig.slow.json     # 6:   exit 2
npx -p typescript@7.0 tsc -p tsconfig.slow.json     # 7:   exit 1
```

```
index.slow.ts(14,19): error TS7006: Parameter 'user' implicitly has an 'any' type.
utils/math.slow.ts(1,21): error TS7006: Parameter 'values' implicitly has an 'any' type.
```

5.9 still defaults to non-strict, so the same config passes there. 6 and 7 report the two untyped parameters. Neither version warned about them in advance: the errors appear when the default changes.

### 4c. Type the parameters

<details>
  <summary>Typed parameters solution</summary>

```ts
// index.slow.ts
function describe(user: { name: string; age: number }): string {
  return user.name + " is " + user.age;
}
```

```ts
// utils/math.slow.ts
export function sum(values: number[]): number {
  /* ... */
}
```

This matches [`index.fixed.ts`](../../projects/test-lib-1/src/examples/13-ts5-to-ts7/index.fixed.ts) and [`utils/math.fixed.ts`](../../projects/test-lib-1/src/examples/13-ts5-to-ts7/utils/math.fixed.ts).

</details>

Run the three commands from 4b again: all three versions now exit `0`. Well done, the project is on TypeScript 7.

## 5. Measure the native compiler

Run the migrated project on each version:

```bash
npx tsc -p tsconfig.slow.json --extendedDiagnostics
npx -p typescript@6.0 tsc -p tsconfig.slow.json --extendedDiagnostics
npx -p typescript@7.0 tsc -p tsconfig.slow.json --extendedDiagnostics
```

| Metric (average of 5 runs) | 5.9.3     | 6.0.3     | 7.0.2     |
|-----------------------------|----------:|----------:|----------:|
| Files                       | 168       | 61        | 61        |
| Memory used                 | 118,741K  | 60,825K   | 24,538K   |
| Total time                  | 0.326s    | 0.170s    | 0.021s    |

Two different effects are mixed in this table:

- **5.9 → 6:** the program shrinks from 168 to 61 files because 6 stops including every `@types` package in `node_modules` (`types` now defaults to `[]`). The compiler didn't get faster; it does less work.
- **6 → 7:** the same 61 files, about 8× faster, with 40% of the memory. That is the native compiler.

7 prints a shorter `--extendedDiagnostics` block, and its `Types` count (413) isn't comparable with 6's (154) for the same program. Compare time and memory across compilers, not type counts.

## 6. BONUS: `isolatedModules` and `const enum`

> [!NOTE]
> This is a bonus exercise, you don't need to complete it. It connects to [example 05](../../projects/test-lib-1/src/examples/05-const-enum/README.md).

Vite, esbuild and swc compile one file at a time, and `isolatedModules: true` makes `tsc` check that your code is safe for that. Add a `const enum` in its own file and use it from `index.slow.ts`:

```ts
// utils/levels.slow.ts
export const enum Level {
  Low,
  High,
}
```

```ts
// index.slow.ts (append)
import { Level } from "@utils/levels";
console.log(Level.High);
```

Emit both ways with 7 and compare the output:

```bash
npx -p typescript@7.0 tsc -p tsconfig.slow.json --noEmit false --outDir out/whole
npx -p typescript@7.0 tsc -p tsconfig.slow.json --noEmit false --outDir out/isolated --isolatedModules

grep -n Level out/whole/index.slow.js      # console.log(1 /* Level.High */);
grep -n Level out/isolated/index.slow.js   # import { Level } from "@utils/levels"; console.log(Level.High);
```

Both compile without errors. Without `isolatedModules`, `tsc` inlines the value `1`. With it, `tsc` keeps the import and the runtime lookup, and `utils/levels.slow.js` keeps the full enum object: the `const` no longer removes anything.

It only becomes an error when the enum is *ambient*, i.e. declared in a `.d.ts` file such as a library's published types: then 7 reports `TS2748: Cannot access ambient const enums when 'isolatedModules' is enabled.` That is why libraries should export a plain `as const` object or a string-literal union instead.

Delete `utils/levels.slow.ts`, the appended lines and `out/` when you're done.

## Discussion

1. Why did the `TS7006` errors in step 4b appear without any warning in step 2?
2. Which fixes were config changes and which were code changes?
3. What does `strict` defaulting to `true` mean for a large legacy codebase?
4. Is `"ignoreDeprecations": "6.0"` or `"strict": false` a migration?

<details>
  <summary>Discussion answers</summary>

1. They aren't deprecations. `strict` flipped from `false` to `true` by default in 6.0; 6 reports options that are going away, not every line the new default will reject. In this project they stay hidden until `strict: false` is removed, and then 6 and 7 report them identically.
2. Config: `target`, `module`, `moduleResolution`, `lib`, `baseUrl`, relative `paths`, removing `strict: false`. Code: only the two parameter types, and those only because `strict` changed.
3. Either keep `strict: false` explicitly, which is still allowed, or turn the strict flags on one at a time (`noImplicitAny` first) and fix incrementally.
4. No, both are postponements. 7 still accepts `ignoreDeprecations` but silences nothing with it, and `strict: false` keeps every implicit `any` in the codebase.

</details>

## Facilitator notes

<details>
  <summary>Timing and common stumbles</summary>

**Timing (~35 min, plus ~10 min for the bonus)**

- 5 min: set the scene: 6 is the last JavaScript-based compiler and exists to flag what 7 removes; 7 is the native compiler and has no opt-out. Skipping 6 means skipping the messages that tell you what to change.
- 15 min: participants run steps 1–3 and take notes. Don't let them fix anything before step 3; the point is to see the same project fail differently.
- 10 min: step 4. Walk the room: most will miss that `paths` must become relative once `baseUrl` is gone (`TS5090`), and many won't think to remove `strict: false` until prompted.
- 5 min: step 5 and the discussion questions.
- Bonus, ~10 min: step 6, for groups that finish early.

**Common stumbles**

- Setting `"ignoreDeprecations": "6.0"` in step 2 and declaring 6 done. Allowed, but ask: is that a migration or a postponement? Then show that 7 ignores it.
- Keeping `strict: false` and declaring victory after 4a. Same question.
- Reaching for `module: nodenext`. Valid, but the JSON import then needs `with { type: "json" }` (`TS1543`) and the `@utils` alias needs a runtime resolver; `bundler` is the easier classroom choice.
- Reading the step 5 table as "6 is twice as fast as 5.9". It isn't: it checks fewer files because `types` defaults to `[]`.
- Expecting `TS2748` in the bonus. It only fires for ambient (`.d.ts`) const enums; with a `.ts` file the effect is in the emitted output, not an error.

</details>
