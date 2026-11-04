# Exercise: Get the Repo Running

In this exercise we will clone the workspace, install its dependencies, and point your editor at the same TypeScript. Every later exercise measures with `npx tsc`, which runs the TypeScript version the repo pins, so do this once before you start.

## Goal

At the end of this exercise `npx tsc -v` prints `Version 5.9.3` from the repo root and your editor runs that same version, so you're ready to measure.

## 0. Check your toolchain

The workspace needs **Node.js 18+** and the **npm** that ships with it. We tested it on Node 18, 20 and 22. Node 18 is out of support, so if you're installing Node fresh, take 22. Check what you have:

```bash
node -v   # v18 or newer
npm -v
```

If `node -v` prints v18 or higher, you're good to go.

## 1. Clone the repo

Grab the workspace and step into it. Every exercise starts from this directory, the repo root.

```bash
git clone https://github.com/push-based/ws-backmarket-tsperf-041126.git
cd ws-backmarket-tsperf-041126
```

> [!TIP]
> Prefer SSH? `git clone git@github.com:push-based/ws-backmarket-tsperf-041126.git` works the same.

You're in the right place when `ls` shows `docs/` and `projects/` side by side.

## 2. Install dependencies

This is an npm-workspaces monorepo, so a single install from the root wires up every workspace under `projects/*` at once.

```bash
# repo root
npm install
```

`npm install` finishes without errors and a top-level `node_modules/` now exists.

## 3. Confirm it runs

Ask the repo's TypeScript for its version. This is the checkpoint the later exercises depend on.

```bash
# repo root
npx tsc -v
```

You should see:

```
Version 5.9.3
```

> [!WARNING]
> If `npx` asks to install a package called `tsc`, answer no: that package is not TypeScript. It means `npx` can't find the repo's `node_modules/`, so you're outside the repo or `npm install` didn't finish. `cd` back to the repo root and run step 2 again.

## 4. Point your editor at the repo's TypeScript

Your editor ships its own TypeScript. Some exercises read numbers off editor hovers, and those only match `npx tsc` when the editor runs the repo's 5.9.3.

**VS Code:** open the repo root as the folder, then open any `.ts` file. VS Code asks whether to use the workspace TypeScript version; choose **Allow**. If the prompt doesn't show, open the Command Palette and run **TypeScript: Select TypeScript Version**.

The picker lists **Use Workspace Version** with `5.9.3`. Select it.

**JetBrains IDEs:** open **Settings → Languages & Frameworks → TypeScript**. The TypeScript field points at the repo's `node_modules/typescript` and shows `5.9.3`.

## 5. Check you can download other TypeScript versions

Exercise 13 runs TypeScript 6 and 7 next to the pinned 5.9.3, and downloads them from the npm registry on first use. Do that download now, so a blocked company network shows up before the workshop rather than during it.

```bash
# repo root
npx -p typescript@7.0 tsc -v
```

The first run asks to install `typescript@7.0`; answer yes. You should see a 7.x version:

```
Version 7.0.2
```

> [!TIP]
> If the command stops with a network error, your network blocks `registry.npmjs.org`. Tell your trainer before the workshop so we can sort it out in time.

That's the setup done. Head to [Exercise 01](./01-incremental-builds.md) to run your first measurement.
