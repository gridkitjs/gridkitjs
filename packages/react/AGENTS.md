# @gridkitjs/react

React components built on `@gridkitjs/core` and `@gridkitjs/dom`, chiefly
`DataGrid`. React 19 is a peer dependency. Published. This package only
draws: logic goes in `core` and browser behaviours in `dom` (see the root
[Structure](../../AGENTS.md#structure) section).

## Adding a component

To add a component: write it in `packages/react/src/`, export it from
`packages/react/src/index.ts`, use it in the playground.

`src/DataGrid/` holds `DataGrid` with its hooks and sub-components.
`src/index.ts` is the only entry point and also re-exports the `core` types a
consumer needs alongside `DataGrid`.

## Styling

Styling lives in `theme-tailwind`, not in the components. `packages/react`
renders semantic class names — `gridkit-data-grid`, `header-cell`, `grid-row` —
and the theme's stylesheet targets them. Keep it that way: a Tailwind utility
written in a component would oblige every consumer to scan our source for it,
which is what `@source` used to paper over.

## Commands

```bash
pnpm --filter @gridkitjs/react test        # Vitest: SSR and hydration
pnpm --filter @gridkitjs/react typecheck
pnpm --filter @gridkitjs/react lint
pnpm --filter @gridkitjs/react build       # tsup, only for publishing
```

## Tests

`react` has Vitest tests of its own, next to the code as `*.test.tsx`: an
SSR `renderToString` test and a jsdom hydration test.

Everything else about `DataGrid` (pointer drags, keyboard navigation, real
layout) is tested with Playwright in `apps/playground/tests-ct/`; see
[apps/playground/AGENTS.md](../../apps/playground/AGENTS.md). A new
`DataGrid` behaviour needs a test there, and `packages/react/src/DataGrid/`
counts toward its coverage threshold.

## Docs

`packages/react/docs/`, with nested topics in `cells/`, `columns/` and
`rows/`, each with its own `_meta.json`. The writing rules, the page template
and the glossary are in [.claude/rules/docs.md](../../.claude/rules/docs.md).

## Releasing

Published, so a change to what it ships needs a changeset; tests,
docs and README edits do not. See
[.claude/rules/versioning.md](../../.claude/rules/versioning.md).
