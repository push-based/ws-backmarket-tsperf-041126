# Exercise: Shrink a Shared Union to the Members You Use

In this exercise we will replace a 112-member union of HTML tag names with the five tags the app renders. Eight components each pass that union through two distributive conditional types, so the checker walks every member 16 times. Shrinking the union in one place cuts the cost for every consumer at once.

## Goal

At the end of this exercise the `Instantiations` count that `tsc --extendedDiagnostics` reports for `union-type-reduction.slow.ts` drops from 3,622 to 198, because the components distribute over a 5-member union instead of a 112-member one.

## Prerequisites

Complete [Exercise 0: Setup](./0-setup.md) first: repo cloned, `npm install` done.
Start at the repository root: step 1 changes into `projects/test-lib-1/src/examples/10-union-type-reduction`, and every command after that runs from there.

> [!TIP]
> This example is small: `Check time` is 0.04s, which is close to the resolution of `tsc`'s timer. Read **Types** and **Instantiations** instead; they come out identical on every run.

> [!NOTE]
> The example's README quotes different counts because it measures by hovering the types in the editor. This exercise uses the numbers `tsc --extendedDiagnostics` prints for the whole project.

To hover the types and try your edit in the browser, open [`union-type-reduction.slow.ts` in the TS Playground][playground-slow]. It runs TypeScript 5.9.3, the version the repo pins. Take the measurements in the repo: the playground has no `--extendedDiagnostics` output.

## 1. Measure the baseline

Before changing anything, get the number you're trying to beat:

```bash
cd projects/test-lib-1/src/examples/10-union-type-reduction

npx tsc --noEmit -p tsconfig.slow.json --extendedDiagnostics
```

```
Files:                         137
Lines of Library:            51126
Lines of Definitions:        50308
Lines of TypeScript:            83
Lines of JavaScript:             0
Lines of JSON:                   0
Lines of Other:                  0
Identifiers:                 86625
Symbols:                     59133
Types:                        2417
Instantiations:               3622
Memory used:               100517K
Assignability cache size:      249
Identity cache size:             0
Subtype cache size:              0
Strict subtype cache size:       0
I/O Read time:               0.02s
Parse time:                  0.15s
ResolveTypeReference time:   0.00s
ResolveModule time:          0.01s
ResolveLibrary time:         0.01s
Program time:                0.21s
Bind time:                   0.08s
Check time:                  0.04s
printTime time:              0.00s
Emit time:                   0.00s
Total time:                  0.33s
```

The times shown are the median of five runs. The counts come from the 16 aliases at the bottom of the file, 8 components times `ElementDefinition` and `RenderDefinition`, each distributing over all 112 members of `AllHtmlTags`: **Types 2,417, Instantiations 3,622**.

## 2. Audit the union

`AllHtmlTags` mirrors `keyof HTMLElementTagNameMap`, so it covers every tag any app could render. Auditing this app's templates turns up five tags: `div`, `span`, `button`, `input` and `a`. Declare a union of those five and use it everywhere `AllHtmlTags` appears: in `HtmlElementMap` and in all 16 component aliases.

> [!WARNING]
> The audited union is now a contract with your templates. When a component starts rendering a new tag, add that tag to `AppTag` in the same change. A tag outside the union makes `ElementDefinition` resolve to `never`, and the error shows up where the definition is used, as `Property 'create' does not exist on type 'never'`, far from the union that caused it.

> [!TIP]
> In VS Code, put the cursor on `AllHtmlTags` and press <kbd>F2</kbd> (Rename Symbol) to rename every reference to `AppTag` in one go. Then replace the 112-member body with the five tags.

<details>
  <summary>AppTag skeleton: every place the union is used</summary>

```ts
// union-type-reduction.slow.ts
type AppTag = /* only the tags this app renders */;

type HtmlElementMap = { [Tag in /* the audited union */]: { tagName: Tag } };

/* EventName, DataAttributes, ElementDefinition, RenderDefinition: unchanged */

type HeaderDefinitions = ElementDefinition<"Header", /* the audited union */>;
type HeaderRenderers = RenderDefinition<"Header", /* the audited union */>;
/* ...the same for the other 14 aliases */
```

</details>

Every alias passes the same union, so each one now distributes over 5 members instead of 112. `ElementDefinition` and `RenderDefinition` themselves stay as they are.

<details>
  <summary>Audited AppTag union solution</summary>

```ts
// union-type-reduction.slow.ts
type AppTag = "div" | "span" | "button" | "input" | "a"; // audited: only tags this app renders

type HtmlElementMap = { [Tag in AppTag]: { tagName: Tag } };

/* EventName, DataAttributes, ElementDefinition, RenderDefinition: unchanged */

type HeaderDefinitions = ElementDefinition<"Header", AppTag>;
type HeaderRenderers = RenderDefinition<"Header", AppTag>;
type FooterDefinitions = ElementDefinition<"Footer", AppTag>;
type FooterRenderers = RenderDefinition<"Footer", AppTag>;
type SidebarDefinitions = ElementDefinition<"Sidebar", AppTag>;
type SidebarRenderers = RenderDefinition<"Sidebar", AppTag>;
type ModalDefinitions = ElementDefinition<"Modal", AppTag>;
type ModalRenderers = RenderDefinition<"Modal", AppTag>;
type CardDefinitions = ElementDefinition<"Card", AppTag>;
type CardRenderers = RenderDefinition<"Card", AppTag>;
type NavDefinitions = ElementDefinition<"Nav", AppTag>;
type NavRenderers = RenderDefinition<"Nav", AppTag>;
type FormDefinitions = ElementDefinition<"Form", AppTag>;
type FormRenderers = RenderDefinition<"Form", AppTag>;
type ToolbarDefinitions = ElementDefinition<"Toolbar", AppTag>;
type ToolbarRenderers = RenderDefinition<"Toolbar", AppTag>;
```

The 112-member `AllHtmlTags` declaration is gone. This matches [`union-type-reduction.fixed.ts`](../../projects/test-lib-1/src/examples/10-union-type-reduction/union-type-reduction.fixed.ts) ([TS Playground][playground-fixed]) if you want to check your work.

</details>

Check that it still compiles:

```bash
npx tsc --noEmit -p tsconfig.slow.json
```

No output and exit code `0`.

## 3. Measure again

Re-run the exact command from step 1:

```bash
npx tsc --noEmit -p tsconfig.slow.json --extendedDiagnostics
```

```
Files:                        137
Lines of Library:           51126
Lines of Definitions:       50308
Lines of TypeScript:           71
Lines of JavaScript:            0
Lines of JSON:                  0
Lines of Other:                 0
Identifiers:                86625
Symbols:                    59026
Types:                        278
Instantiations:               198
Memory used:               98772K
Assignability cache size:      35
Identity cache size:            0
Subtype cache size:             0
Strict subtype cache size:      0
I/O Read time:              0.02s
Parse time:                 0.14s
ResolveTypeReference time:  0.00s
ResolveModule time:         0.01s
ResolveLibrary time:        0.01s
Program time:               0.20s
Bind time:                  0.07s
Check time:                 0.02s
printTime time:             0.00s
Emit time:                  0.00s
Total time:                 0.29s
```

| Metric         | Before (112 tags) | After (5 tags) | Change |
|----------------|------------------:|---------------:|:-------|
| Instantiations | 3,622             | 198            | -95%   |
| Types          | 2,417             | 278            | -88%   |

Both counts came out identical on all five runs. Your `Lines of TypeScript` depends on how much of the header comment you kept.

Well done! The union shrank 22× and instantiations dropped 18×; the rest is cost that doesn't depend on the union's size. `Check time` went from 0.04s to 0.02s (median of five runs), but at hundredths of a second, let the counts judge the change.

## 4. BONUS: Compare against the fixed reference file

> [!NOTE]
> This is a bonus exercise, you don't need to complete it.

`tsconfig.fixed.json` points at [`union-type-reduction.fixed.ts`](../../projects/test-lib-1/src/examples/10-union-type-reduction/union-type-reduction.fixed.ts), which already contains the solution. Run it side by side with your edited `slow.ts` to confirm both land on the same numbers:

```bash
npx tsc --noEmit -p tsconfig.slow.json --extendedDiagnostics   # your edit
npx tsc --noEmit -p tsconfig.fixed.json --extendedDiagnostics  # reference solution
```

Both should print `Types: 278` and `Instantiations: 198`.

## 5. BONUS: Price one consumer

> [!NOTE]
> This is a bonus exercise, you don't need to complete it.

Every component re-runs the distribution with its own name baked in, so the cost grows with the number of consumers as well as the union size. In your edited file, comment out the alias pairs from the bottom up, keeping the first 1, 2 and 4 components (`Header`, then `Footer`, then `Sidebar` and `Modal`), and re-run the measure command each time:

| Components kept | `Instantiations` with 112 tags | `Instantiations` with 5 tags |
|----------------:|-------------------------------:|-----------------------------:|
| 1               | 472                            | 44                           |
| 2               | 922                            | 66                           |
| 4               | 1,822                          | 110                          |
| 8               | 3,622                          | 198                          |

Your edited file reproduces the 5-tag column. Each extra component adds 450 instantiations with 112 tags and 22 with 5, about 4 per tag per component. Every component you add that shares the union adds the same amount again. To reproduce the 112-tag column, run `git stash push -- union-type-reduction.slow.ts` to bring back the original file, repeat the comment-out runs, then `git stash pop`. Uncomment the aliases when you're done.

[playground-slow]: https://www.typescriptlang.org/play/?ts=5.9.3&target=9#code/PQKhCgAIUhlAZA8gdQFyQCIEsDOAXAJywCMBXPLANwFNIBjAewDsATLC5gQwBtIGaCkagICekALbVxxaoIYAzSJ0jdOBAObUANBIb5uIgLSkmpHNRaQTWZlAjRIAAwCC3bgAk847gBVO6nEcVXDwcIVFIfE5WNUt3HwBZeCFuKWomPEgACgA-AEY8gAYJKRkCHB1xLAICBiImdTsnAGtqEQVIeKSAUVTJDL91ADlOSQTOAAdHAEodMky8AAtcJQmJviYDcNlIAnSWWTDlReiWeVJuJo6lqQA6J160jIxqeSwmdhsmINOnACV9rIXm8PhxvkJOHRFpA2PgiPNaPxZE0bpBzm4rB9mDpftRIdDiARolDIOxzNxFGQsNwWGFzAIeDDZFQLJA8CIJtQcE0so5ujQMiNJI4dI4MJw8JxnHhCCRyFyRSUlgxLDgsOomBLSHscNN7s5dnjeJN1iwGFymAByPBNA4g2hLFbMOi0QAoBNsCGJGOIJsx0plee48QcCIrHAAxBgMPCyMOwLAHYhqRW3VPTFEnTJYH11UJsxa0HAnPaWSXqTFfQ2GWXqTTlfOF0a0fJFQwAd04IltIXh5ErbfY0LJfDbTHoDBzTH9kE1kkgSdalneOhwDAb4-wEguFAm3CwXKaxDEqNM0h2HW9vqnGQqM+jkAAVmYFgWK8xIlgAF7UW52YDgcB2U5SBXA8LxfH8MIAF4oEgAAfSAACJOEQ+CkM4YhCVQhDkJYFgdRwbD0L2FC0OQggKDoVIiOQtUDhozhSDYBgaOIVjOHMVi2EQ2CcOIM1WO4Bg6GaABHUho2oViVREViCFY8g8GYGi6GiSgOJUyYwRU9gpLIxh6P0hhuB4yAjO4dRalICYaJYCVSJwuzJT3fBbJYWzqBMsiDklalCO8+QmFsrAeAYdRgsoWyTN4pCWDwGipASs93LIt5PNpah4tS9VVImbTsvUbU9Jw+QoxjeTUrqcQaMWPIaoAJlMsjFgAZhqgAWGqAFYaoANhq4MBs4EMasshhrJqiqcMWcCaKwJqcKweQiUkObxHCsj3gmcg5qYfycOafiaNUGQvJw1JNFYY75rIvcmGaGjxE4d4FqQp6bLIp6CAez70lIR7Moct7MtkGjNUisimD0OgiDymiGGIB9qDoLKcOM+G8rGiaYsQhg8q+eHyG21GkI+nCJjUUYaImLAUaK6m9gZsKCJo0SaIIMmkIo17EIIUgjxo-akJwUZOcQnAYawOGyPMFGCZlzzkZJ8WhOVnAnrcQXxoIF1BYpoKcbhZgNpw-ARGomX+cF0hxC+2TLbFyViAtnC8GIGSaLwFLXakXcJWKpCYwAD0lEiebwUro09xZo8GsiKFW+P2BdwOptTyEfpw-6yIuGj1PknHKATagWLItssIAbkgYBgEgFtikkM9ygAmu4ElVhDHeNE6icLp4Eefo8EGIVqHGKZIjXR0wjeVJIBOMIoeCYhbjNcQmU5Vh0joLsgNoTxvAH-0x8gKDIAAb0gABtQZSTHUD94ggIAF10AvssR-QG+AF9IC-iuAN3pAfk-oR4AB4ADCE4rzTmoCHfYdJZQNB0DfWBMZWAIPqOoAAfCfJwAASM+kDJz+i-ogJgBDwGTHYDwL81BQGDCwV-cBe4RKOH-oBDktBxSSmlLKBEOAIFQL9BkIQcD0GREQeoZB-hRFoNpBIzBODT5n1gpfAA0m0W+sEzIIUcE5TghgKFCOvHgL+hiz6DDMQmRw2i0J6PsuYoh0CMhmIIZYwwUQYw2LMjopw+jHHGJIeY9x+cQoZEcE-AA-OgOE7x1D-z-gAzhQC+j+mBO8T4zBBHEJEag+BCi4nSOwSfWCKCxHyNaO0RQD9D4ZDHrYyJ59bE+PHDkvA6AnHCLwP-FpLSyyf38D03pZlFaD3QDU1JdTJjX38E-IZwzhAgKbOgYBgomzZOcXgIpWD5m9IlHw+UOB0DcKlDKXsMYBGdJMds3ZLSYZ4hjFkaY4zwK1LwGPGZ6g5nNJ8dZJy1Asg-JaaM-0LyD6TPedMwYT8tBAp8fs85XJ0AAAU1AUB4KAiZTxIUTE+U-LBsLhlmWeZASgDAEy3N-rY9AU4BDsMAQCTeBB0mgi+Bsrpsj8mxKQZABhJSzJlLkWESpHQsWD3qS0xpKiiWGiZVkO0GSwQrIhSyzJTB2XXN5f4LBJKxVHyhbMylX9qUzkWQQdhrdgGelaZsqsNY6xhFROiXg9d2ydhhD2OUYIOHASDMNIErxFVfGgik7FqqwSgMQn6kaOh77gUGDgHZPq97BlkIykMhxcHpoDSCNVkbo2g1jW4B+Cak2AMjJJZlgbWXMBDW88NbLEIVvKohItYFvClv-uWsqabAR7HrKfbNVbc0RqbT2+SbaS2QTLck+MiY1ANtrbg+t1a82ITndQJME6QLFvjdOrts7i5bqHZmwdfbF3qvXUetQrad3tsfomg9wEEgqh4BeutKrV2jpfXZEyk690BBnc+193AT0DsgEOi9kaf08FvXGjt+7k2QEoQQFg77l2fpHY2lD7l-0IcA0+2gOGwMhsg1+7DsQ4O7vw4+pDIxKDodPiurDWTEL0ao-eztdHOCUBI1m895HWPsbww+oDtBIwEHEIx0Ng8oNjskxxqdBGkMSfEHxs9TK5OqcUwB2jgCfBRm4Fu6TzGg2sYM8ZLdOmaNid5YZ49fbT0QYEyxy9FmjM3pE1x8AsDfQUXPokoAA
[playground-fixed]: https://www.typescriptlang.org/play/?ts=5.9.3&target=9#code/PQKhCgAIUgxBJAGgUQCIC5ICUCmATAVwGMdIAXAC1IIDsBLAexvIciYBsBPcqyAWxx8ARjgBOAZ0gBDImQJT2XSAXH4oEaJAAqvKQAc9bGkpwA3MZFE4aeMZIAGeOqfsAaSPfF6pNNx6EEZGRMfvZ0NHqBfj54HlL2AHTqkACCBE5k4QDmPNT0TJB4DADuzME8DKqQAKz8giISkESBkmZi3E7iZKJ0AZnmyeFdPplSmQWAKAQeyOyC1mSoOABm4XTjvu72uDZiiyv069E2uXSihWLOappknHo4klNLogx8kAB+AIwfAAyQQqI+IhUSTlaruJYMM5tUTcJikBhLXKQAAcTReejhNDIkhE7BKrmSxTWFEgdFsWLoRAUlnuBHY2MgEKh5hh5CkOUoY2ksnkim4fDGZDsSWgwHA4Bud1SBi07MgAF5IAAiJymJWQAA+yq8PnVWqVfWCND1yvCkTIJqVUiVAG5IMBgNJ0mt8JgONwyOyQRQ6JJ9IYrDsJOKHZAAMqemwAWnCjMhHgAEloALIAGRmcyxsqyADkpAJk-p7JBxKxKL7GXRZpAKFJJDRWOxegkiq9bHcdjQiJwJbdSAmyHx2BmBFjC4ZFQBvSAAbWzpOYKRl7IAuphp57c-mcJh5wBfSB7m3iyWkZDmLF5gQAHgAwujMWRIDgAB5CmySLo9GhZdzz1-vngn7dNkAB8CoeAAJJO958BiNDzHuADyNDQbe+hrAodAAF44Ne2agXut5NkQADW9jHr2UqoGMUgpEEPR9Pcd4PghWLPm+1hASWIE-n+coAVxwHflk4FTlAs4ANI4Nw4QSZAmoeHgtFRmhrGIapk7ZnuMZ4PY8mKY4KlqXBj46dB2lRsMQr6QpClakZnqabB8EaRZ7I6aYUg9CM9grgA-JgX7ZMeR4nn2kAjvMeyrOsLGmWxT6CR+PEifxokKhJ-6cSlpEyQikADkOUVjvoBn+ZAk4GXZaIJfMmAuY+x41TVm67uyzUtQpOCzKOZCYEVw69fM45zqunVdW0l7bpg57zFeeGNYl6WgRNLWCoxgT3JgNGevRIFMeI8WuViK1rTVRBWGMOAABQAJQDYOQ2ZmQo3Ziu512QQejKUKN3VS1PUvY9xXDaVehjVkK4El1NUbb0W3iJgAAK3mjOw16DSVr36JDK6gTDsMPZApgMGSn17gZmAISylGntgXG7MssWMDQx2PhxgHCdkK2ZQp2Vc5AeWcAVWNgzjejlZVAMKYGtiiDdtj7GsrOzeLMUHKz7PLdo7KgcTYsvW940A5TNXU9ClGhmG24orVJ3Yu4fSFL6B2BNkbAski1RRgIwgWFIzpCrEtCs1R-Y4FI8sayrTCSIq2Mx3FSoJpH8tKu4S56ARx706nUdiNs8t2BBRdM8ryf5+nmfLqJucRbADAMEKohJ6z8eRerzOa0w15Ko3zdiBn0rZ3r9dSgPLdl1YjSKtPbe9-3Tct8PWc5+H4ZkjgQjeQvNAd4n3ex2zSphlvO+iKvterRvZ+2Bf08l3PjOt0fyd39v3lX6Pdcb8mDDKXYHvA+XcK5ayVP-QB391700gQoR+s8GZBj3n3OB7BoFjw3uhUQeBgEQUPmAxe2C8AYN-vTYhCCO7zzfuA4hpCb70zzKYPBCdQEs0Xkw+h49SBMMoaXF+KClScJrj-BhDdIR8BYZ3F6gjG6iD4Fwjeci+B8Ofsgmhi9lGKPploJu7AL5SIIewk+uiGD6K-iImBEVTHmNEKopB0cNEmL0RfRR4BXwYlEE+ScYUgA
