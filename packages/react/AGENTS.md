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
renders semantic class names — `gridkit-data-grid`, `gridkit-header-cell`, `gridkit-grid-row` —
and the theme's stylesheet targets them. Keep it that way: a Tailwind utility
written in a component would oblige every consumer to scan our source for it,
which is what `@source` used to paper over.

Every rendered class starts with `gridkit-`; a state is an `is-*` class on an
element that also has one. Class names and `data-gridkit-*` attributes are
public API, listed on `packages/theme-tailwind/docs/class-names.mdx`, whose
test fails until a new or renamed one is listed there.

## State

| Machine                | File                                            | States                                                | Tests                                       |
| ---------------------- | ----------------------------------------------- | ----------------------------------------------------- | ------------------------------------------- |
| `GridOverlayState`     | `src/DataGrid/overlay/useGridOverlay.ts`        | `closed`, `contextMenu`, `panel`                      | `overlay.spec.tsx`, `context-menu.spec.tsx` |
| `MenuButtonState`      | `src/DataGrid/menu/useMenuButton.ts`            | `closed`, `open`                                      | `toolbar.spec.tsx`, `filter-menu.spec.tsx`  |
| `SubmenuState`         | `src/DataGrid/menu/GridMenu.tsx`                | `closed`, `open`, `entryGone`                         | `context-menu.spec.tsx`, `toolbar.spec.tsx` |
| `simpleEditorReducer`  | `src/DataGrid/filterMenu/simpleEditorState.ts`  | `{ opened, draft: ConditionRowsDraft, invalid }`      | `filter-menu.spec.tsx`                      |
| `excelEditorReducer`   | `src/DataGrid/filterMenu/excelEditorState.ts`   | `{ opened, draft: ValuesDraft }`                      | `filter-menu.spec.tsx`                      |
| `ExcelEditorMode`      | `src/DataGrid/filterMenu/ExcelFilterEditor.tsx` | `values`, `condition`                                 | `filter-menu.spec.tsx`                      |
| `useAnnounceWhenDrawn` | `src/DataGrid/useAnnounceWhenDrawn.ts`          | one announcement waiting for the render that draws it | `filter-menu.spec.tsx`, `toolbar.spec.tsx`  |
| `useCopyToClipboard`   | `src/DataGrid/clipboard/useCopyToClipboard.ts`  | the latest copy, the only one announced               | `clipboard.spec.tsx`                        |
| `Subscription`         | `src/DataGrid/hooks/useGridSnapshot.ts`         | `waiting`, `subscribed`                               | `reactive-hooks.spec.tsx`                   |
| `SaveState`            | `src/DataGrid/export/useSaveFile.ts`            | `idle`, `writing`                                     | `export.spec.tsx`                           |
| `RowWindow`            | `src/DataGrid/useRowVirtualizer.ts`             | `allRows`, `range`                                    | `row-virtualization.spec.tsx`               |

The specs are in `apps/playground/tests-ct/`. The convention is in the root
[State](../../AGENTS.md#state) section. A gesture started from React goes
through `useGestureSignal`, which hands the dom starter a `signal` and aborts
it on unmount or when the gesture's element is removed; a new menu button
uses `useMenuButton`.

### Known debt

Logic that belongs lower, left here for now:

- `src/DataGrid/contextMenu/contextMenuPlaces.ts`: where a context menu opens
  for a cell or header is geometry, a `dom` concern.
- `src/DataGrid/panels/useGridPanels.ts`: a panel's placement reads the grid's
  bounding box, also geometry for `dom`.
- `holdsUnreadable` in `src/DataGrid/filterMenu/SimpleFilterEditor.tsx`: the
  browser's `validity.badInput` check on a row's inputs.
- `scrollToColumn` in `src/DataGrid/DataGrid.tsx`: finds a column's element
  and scrolls it into view, as `scrollToRow` does through the virtualizer.

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
A new `DataGrid` prop or component needs a page or a section there in the same
PR, and so does changed behaviour.

## Releasing

Published, so a change to what it ships needs a changeset; tests,
docs and README edits do not. See
[.claude/rules/versioning.md](../../.claude/rules/versioning.md).
