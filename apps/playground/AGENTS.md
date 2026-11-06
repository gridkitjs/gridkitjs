# playground

The Vite app GridKit is developed against, and the home of the Playwright
component tests for `@gridkitjs/react` and `@gridkitjs/dom`. Private, never
published, so it needs no changeset.

## Layout

| Path                      | What it holds                                                                |
| ------------------------- | ---------------------------------------------------------------------------- |
| `src/App.tsx`             | The demo page `pnpm dev` serves, built from the grids in `src/demos/`.       |
| `src/index.css`           | Tailwind plus `@gridkitjs/theme-tailwind/styles.css`, shared with the tests. |
| `tests-ct/`               | Playwright component tests, one spec file per area.                          |
| `tests-ct/support/`       | Test-only grids and harnesses the specs mount, plus coverage setup.          |
| `playwright/index.tsx`    | The component-test entry; it imports `src/index.css`.                        |
| `playwright-ct.config.ts` | The suite's config: Chromium, the Vite plugins, coverage instrumentation.    |

Packages resolve to source, so editing a package hot-reloads the app; run it
from the repo root with `pnpm dev` (see the root
[Development](../../AGENTS.md#development) section).

## Component tests

The suite in `tests-ct/` mounts `DataGrid` in isolation through
`@playwright/experimental-ct-react` rather than through the playground's own
demo (`App.tsx`), against the real `theme-tailwind` stylesheet so measured
widths and paddings are real ones. Chromium only — this is an internal
suite, not a cross-browser guarantee for a published package.

```bash
pnpm --filter playground test:e2e             # run the suite
pnpm --filter playground test:e2e:ui           # same, with Playwright's UI
pnpm --filter playground test:e2e:coverage     # instrumented; enforces 80% line/statement/function coverage over DataGrid/ and dom
```

`test:e2e` is not part of `pnpm test` and does not run under `pnpm -r test`,
by design — it's a separate, slower check, invoked explicitly rather than on
every `pnpm test` (CI runs it as its own job, see the root
[Standards](../../AGENTS.md#standards) section).

`tests-ct/` holds one spec file per area — `rendering`, `column-resize`,
`keyboard-navigation`, `selection`, `row-virtualization` and so on — so add
to whichever one already covers the area being changed.

### Stale styles after a stylesheet edit

Playwright caches the component-test build in `playwright/.cache`. After
editing `packages/theme-tailwind/src/styles.css`, delete that folder before
`test:e2e`, or the run tests the old styles. `test:e2e:coverage` deletes it
on its own.

## Other commands

```bash
pnpm --filter playground typecheck
pnpm --filter playground lint        # src, tests-ct and playwright
```

The root [Docs](../../AGENTS.md#docs) section checks a docs code sample with
these two.
