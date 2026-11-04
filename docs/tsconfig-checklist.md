# tsconfig.json Performance Checklist

`tsconfig.json` options that can materially affect TypeScript compile/type-check
performance, grouped by how they improve performance.


## Best impact vs effort

Impact = potential reduction in overall compile/type-check time, 1-5 (5 = largest); this is the primary driver of the score.
Effort = work to identify and safely apply the fix, 1-3 (1 = flip a flag, 3 = needs restructuring).
Notes = additional `--extendedDiagnostics` metric(s) affected beyond overall time - which stage or count moves.
Sorted by impact, highest first.

| Options | Impact | Effort | Notes |
| --- | --- | --- | --- |
| `skipLibCheck`, `incremental` | 5 | 1 | Types, Instantiations skipped (skipLibCheck); rebuild Total time (incremental) |
| `include`, `exclude`, `composite` + `references` | 4 | 1-3 | Files, Parse time, Bind time |
| `disableReferencedProjectLoad`, `disableSolutionSearching`, `disableSourceOfProjectReferenceRedirect`, `allowJs`, `checkJs`, `jsx`, `moduleResolution`, `baseUrl`/`paths`, `verbatimModuleSyntax` | 3 | 1-2 | Editor/language-service responsiveness; ResolveModule time |
| `tsBuildInfoFile`, `noEmit`, `declaration`, `declarationMap`, `emitDeclarationOnly`, `files`, `types`, `typeRoots`, `resolvePackageJsonExports`, `resolvePackageJsonImports`, `preserveSymlinks`, `isolatedDeclarations` | 2 | 1-2 | ResolveModule/ResolveTypeReference time; Emit time |
| `outDir`, `rootDir`, `stripInternal`, `removeComments`, `sourceMap`, `inlineSourceMap`, `inlineSources`, `resolveJsonModule`, `rootDirs`, `isolatedModules` | 1 | 1-2 | Emit time; I/O read time |


## Project references & monorepos

- [ ] `references` - Split a large project into smaller buildable units.
- [ ] `composite` - Required for project references.
- [ ] `declaration` - Required for referenced projects.
- [ ] `declarationMap` - Improves navigation across project references.
- [ ] `rootDir` - Helps keep project boundaries clean.
- [ ] `outDir` - Separate build output from source.

## Reduce files TypeScript has to check

- [ ] `include` - Narrow to only source files.
- [ ] `exclude` - Remove tests, generated files, fixtures, benchmarks, etc.
- [ ] `files` - Explicit list of files for very small projects.
- [ ] `types` - Load only required ambient type packages.
- [ ] `typeRoots` - Limit where ambient typings are searched.
- [ ] `rootDirs` - Avoid unnecessary virtual directory merging if not needed.

## Module resolution

- [ ] `moduleResolution` - Use the correct resolver (`bundler`, `node16`, `nodenext`) to avoid unnecessary lookup work.
- [ ] `baseUrl` - Avoid unnecessary path mappings.
- [ ] `paths` - Keep mappings simple and avoid pointing at another package's `src`.
- [ ] `resolvePackageJsonExports` - Prefer package exports over custom path hacks.
- [ ] `resolvePackageJsonImports` - Same for internal package imports.
- [ ] `preserveSymlinks` - Can significantly affect monorepo resolution behavior.

## Declaration generation

- [ ] `declaration` - Generate `.d.ts` files.
- [ ] `emitDeclarationOnly` - Skip JavaScript emit when publishing type packages.
- [ ] `stripInternal` - Remove internal APIs from emitted declarations.

## Emit optimizations

- [ ] `noEmit` - Skip JavaScript output entirely.
- [ ] `isolatedDeclarations` - Makes declaration emit more efficient and enforces declaration-friendly code.
- [ ] `removeComments` - Slightly smaller output.
- [ ] `sourceMap` - Disable if not needed.
- [ ] `inlineSourceMap` - Disable unless required.
- [ ] `inlineSources` - Disable unless required.

## Reduce language service work (VS Code)

- [ ] `disableReferencedProjectLoad`
- [ ] `disableSolutionSearching`
- [ ] `disableSourceOfProjectReferenceRedirect` - Force editor to use built `.d.ts` instead of referenced source projects.

## Options that may improve performance by reducing work (with trade-offs)

- [ ] `allowJs` - Turn off unless JavaScript files are required.
- [ ] `checkJs` - Turn off unless type-checking JavaScript.
- [ ] `resolveJsonModule` - Turn off if JSON imports aren't needed.
- [ ] `jsx` - Use the appropriate JSX mode; avoid unnecessary JSX processing in non-React projects.
- [ ] `verbatimModuleSyntax` - Can simplify emit and module analysis.
- [ ] `isolatedModules` - Helps compatibility with transpilers and can surface issues earlier, though it is primarily about correctness rather than raw performance.
