# @gridkitjs/core

Framework-agnostic grid logic: the grid's options and controller, column
definitions and sizing, sorting, filtering, row grouping, aggregates,
pagination, keyboard navigation, and the commands and menu model every menu
and toolbar is drawn from. Plain TypeScript, published. Read the root
[Structure](../../AGENTS.md#structure) section for how it fits with `dom` and
`react`.

## What must not go in it

`core` compiles without the DOM `lib` and ESLint rejects any `react`,
`react-dom`, `@gridkitjs/react` or `@gridkitjs/dom` import from it.

The two halves of that rule live in `tsconfig.json` (`lib` is `ES2025` only)
and in the `packages/core/**` block of `eslint.config.mjs`. Fix the code
rather than widening either.

## Public API

The package has two entry points, and anything exported from neither is
internal. `src/index.ts` (`@gridkitjs/core`) holds what an app uses: the
grid's data, options and state, the controller, commands, menu and toolbar
options, data functions, messages, formatting and export. `src/renderer.ts`
(`@gridkitjs/core/renderer`) holds what only someone writing a renderer
needs, and may change in a minor release.

A name is exported from exactly one of them, and the renderer entry does not
re-export the root. A new export goes in the renderer entry when an app using
a ready-made renderer such as `DataGrid` would never call it: it models how a
widget is driven or measured, not the grid's data, options or state. A new
public function or type needs a doc page either way (see [Docs](#docs)).

## State

| Machine               | File                                     | States                                                          | Tests                                                                     |
| --------------------- | ---------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `ControllerMode`      | `src/controller/createGridController.ts` | `idle`, `transaction` (commits held and reported as one change) | `src/controller/createGridController.test.ts`, `selectionActions.test.ts` |
| `filterEditorReducer` | `src/util/filterEditor.ts`               | a `FilterEditorDraft`: `values` or `conditions`, by its `kind`  | `src/util/filterEditor.test.ts`                                           |

The convention is in the root [State](../../AGENTS.md#state) section.

## Commands

```bash
pnpm --filter @gridkitjs/core test        # Vitest
pnpm --filter @gridkitjs/core typecheck
pnpm --filter @gridkitjs/core lint
pnpm --filter @gridkitjs/core build       # tsup, only for publishing
```

## Tests

Vitest only. Test files sit next to the code as `*.test.ts`. Logic that can
be tested here, without a DOM, should be: see
[.claude/rules/testing.md](../../.claude/rules/testing.md).

## Docs

`packages/core/docs/`, page order in its `_meta.json`. The writing rules are
in [.claude/rules/docs.md](../../.claude/rules/docs.md).

## Releasing

Published, so a change to what it ships needs a changeset; tests,
docs and README edits do not. See
[.claude/rules/versioning.md](../../.claude/rules/versioning.md).
