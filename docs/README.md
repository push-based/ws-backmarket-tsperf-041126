# TypeScript Performance-The Complete Guide

### TOC

- [Compiler Process](./process.md) - how `tsc` turns source files into output, phase by phase
  - [File Discovery](./process.md#1-file-discovery)
  - [Module Resolution](./process.md#2-module-resolution)
  - [Parsing](./process.md#3-parsing)
  - [Binding](./process.md#4-binding)
  - [Type Checking](./process.md#5-type-checking)
  - [Transforming](./process.md#6-transforming)
  - [Emitting](./process.md#7-emitting)

- [Where TypeScript Runs: CLI, IDE, CI](./where-it-runs.md) - how the CLI, `tsserver`, and CI each drive the same pipeline
  - [The three entry points](./where-it-runs.md#the-three-entry-points)
  - [What connects them](./where-it-runs.md#what-connects-them)
  - [Why this matters for performance work](./where-it-runs.md#why-this-matters-for-performance-work)
  - [Table](./where-it-runs.md#table)

- [Performance Tools](./tools.md) - `tsc` diagnostics flags and analysis tooling
  - [Essential Commands](./tools.md#essential-commands)
    - [`tsc --diagnostics`](./tools.md#tsc---diagnostics)
    - [`tsc --extendedDiagnostics`](./tools.md#tsc---extendeddiagnostics)
    - [`tsc --generateTrace`](./tools.md#tsc---generatetrace)
      - [`typescript-analyze-trace`](./tools.md#typescript-analyze-trace)
    - [`tsc --generateCpuProfile`](./tools.md#tsc---generatecpuprofile)
    - [`tsc --listFiles`](./tools.md#tsc---listfiles)
  - [Supporting Tools](./tools.md#supporting-tools)
    - [Chrome DevTools Trace Viewer](./tools.md#chrome-devtools-trace-viewer)
  - [Usage Table](./tools.md#usage-table)

- [Performance Audit Flow](./performance-audit-flow.md) - step-by-step measurement and optimization workflow
  - [Phase 0: Optional Overview Measurement](./performance-audit-flow.md#phase-0-optional-overview-measurement)
  - [Phase 1: Base Measurement](./performance-audit-flow.md#phase-1-base-measurement)
  - [Phase 2: Quick Wins](./performance-audit-flow.md#phase-2-quick-wins)
  - [Phase 3: Measure Impact](./performance-audit-flow.md#phase-3-measure-impact)
  - [Phase 4: Detailed Analysis & Type Optimization](./performance-audit-flow.md#phase-4-detailed-analysis--type-optimization)
  - [Phase 5: Measure Impact](./performance-audit-flow.md#phase-5-measure-impact)

- [tsconfig.json Performance Checklist](./tsconfig-checklist.md) - config options grouped by performance impact
  - [Best impact vs effort](./tsconfig-checklist.md#best-impact-vs-effort)
  - [Project references & monorepos](./tsconfig-checklist.md#project-references--monorepos)
  - [Reduce files TypeScript has to check](./tsconfig-checklist.md#reduce-files-typescript-has-to-check)
  - [Module resolution](./tsconfig-checklist.md#module-resolution)
  - [Declaration generation](./tsconfig-checklist.md#declaration-generation)
  - [Emit optimizations](./tsconfig-checklist.md#emit-optimizations)
  - [Reduce language service work (VS Code)](./tsconfig-checklist.md#reduce-language-service-work-vs-code)
  - [Options that may improve performance by reducing work (with trade-offs)](./tsconfig-checklist.md#options-that-may-improve-performance-by-reducing-work-with-trade-offs)

- [TypeScript Code Performance Checklist](./ts-code-checklist.md) - type-level and code patterns affecting compile time
  - [Best impact vs effort](./ts-code-checklist.md#best-impact-vs-effort)
  - [Distributive Conditional Over a Large Union](../projects/test-lib-1/src/examples/06-distributive-conditional/README.md)
  - [Nested Distributive Conditionals](../projects/test-lib-1/src/examples/07-nested-distributive-conditionals/README.md)
  - [Recursive Tuple Construction](../projects/test-lib-1/src/examples/08-recursive-tuple-construction/README.md)
  - [Deep Recursive Object Transformation](../projects/test-lib-1/src/examples/09-deep-recursive-object/README.md)
  - [Union Type Reduction](../projects/test-lib-1/src/examples/10-union-type-reduction/README.md)
  - [Intersection-to-Interface Conversion](../projects/test-lib-1/src/examples/11-intersection-to-interface/README.md)
  - [Deep-Partial Test Helper](../projects/test-lib-1/src/examples/12-deep-partial-overloads/README.md)
