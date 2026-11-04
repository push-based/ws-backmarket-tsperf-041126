# TypeScript Performance

Back Market - 04.11.2026, Barcelona

## Installation Instructions

**System Requirements**

- `node >= 18`, with the npm that ships with it. Tested on Node 18, 20 and 22; use 22 if you can, 18 is end-of-life.
- Git
- an IDE - VS Code or a JetBrains IDE. In VS Code, accept the prompt to use the workspace TypeScript version, so the editor runs the same 5.9.3 as `npx tsc`.

**Network access** (check proxy / firewall settings beforehand)

- npm registry (`registry.npmjs.org`) - `npm install`, and `npx -p typescript@6.0` / `typescript@7.0` in exercise 13
- `github.com` - clone
- optional: `www.typescriptlang.org` - the TS Playground links in the exercises

**Clone and install**

```bash
git clone https://github.com/push-based/ws-backmarket-tsperf-041126.git

cd ws-backmarket-tsperf-041126
npm install
```

**Check it works**

```bash
npx tsc -v                     # Version 5.9.3
npx -p typescript@7.0 tsc -v   # Version 7.x, used in exercise 13
```

If `npx` asks to install a package called `tsc`, answer no: you are outside the repo or `npm install` didn't finish. [Exercise 0](./docs/exercises/0-setup.md) walks through every step.

## Workshop Information

- ws info doc: [Google Doc](https://docs.google.com/document/d/1avRQzt_OGDsGKtzJLLyEt7OscdG4jHs1DwSpsecyKbE/edit)
- slides: [Google Drive folder](https://drive.google.com/drive/folders/0ADNM_YD-ZqaYUk9PVA)

## Exercises

[0. Project Setup](./docs/exercises/0-setup.md)

Every exercise starts from the repo root and tells you which folder to `cd` into.

### Block 1: Foundations

- [Compiler Process](./docs/process.md)
- [Where TypeScript Runs](./docs/where-it-runs.md)
- [Performance Tools](./docs/tools.md)

### Block 2: Project and config performance

- [01. Incremental Builds](./docs/exercises/01-incremental-builds.md)
- [02. Skip Checking Library Declarations](./docs/exercises/02-skip-lib-check.md)
- [03. Consume a Workspace Package Through Its `.d.ts` Output](./docs/exercises/03-workspace-package-as-source.md)
- [04. Find Out Where an Import Resolves With `--traceResolution`](./docs/exercises/04-trace-resolution.md)
- [05. Compile an Enum Away With `const enum`](./docs/exercises/05-const-enum.md)

### Block 3: Type-level performance

- [06. Stop a Conditional Type From Distributing](./docs/exercises/06-distributive-conditional.md)
- [07. Stop Two Nested Conditionals From Building Every Pair](./docs/exercises/07-nested-distributive-conditionals.md)
- [08. Build a Tuple Type per Digit, Not per Element](./docs/exercises/08-recursive-tuple-construction.md) (bonus)
- [09. Put a Depth Limit on a Recursive Mapped Type](./docs/exercises/09-deep-recursive-object.md)
- [10. Shrink a Shared Union to the Members You Use](./docs/exercises/10-union-type-reduction.md)
- [11. Replace an Intersection Chain With `interface extends`](./docs/exercises/11-intersection-to-interface.md)
- [12. Keep a Test Helper Off `PartialDeep` with Overloads](./docs/exercises/12-deep-partial-overloads.md)

### Block 4: Audit flow and migration to TypeScript 7

- [Performance Audit Flow](./docs/performance-audit-flow.md)
- [13. Migrate a Project From TypeScript 5 to 7](./docs/exercises/13-ts5-to-ts7.md)

## Reference

- [TypeScript Performance - The Complete Guide](./docs/README.md): how the compiler works, the diagnostics flags, and the guides behind the exercises
- [tsconfig.json Performance Checklist](./docs/tsconfig-checklist.md)
- [TypeScript Code Performance Checklist](./docs/ts-code-checklist.md)
