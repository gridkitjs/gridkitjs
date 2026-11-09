# @gridkitjs/dom

Framework-free browser behaviours a GridKit renderer attaches to its own
markup: pointer gestures, focus, observers, the row virtualizer, overlays,
menus, downloads, clipboard, printing and live announcements. Plain
TypeScript with the DOM, published. Read the root
[Structure](../../AGENTS.md#structure) section for how it fits with `core`
and `react`.

## What must not go in it

ESLint rejects any `react`, `react-dom` or `@gridkitjs/react` import from
`dom` (the `packages/dom/**` block of `eslint.config.mjs`). Each behaviour
owns its listeners and observers and reports through callbacks, so it names
no framework's types. Logic that does not need the DOM belongs in `core`.

## Public API

`src/index.ts` is the package's only entry point. A new export goes there,
and into the docs as described under [Docs](#docs).

## State and teardown

| Machine            | File                     | States                                     | Tests                                               |
| ------------------ | ------------------------ | ------------------------------------------ | --------------------------------------------------- |
| `DragPhase`        | `src/dragReorder.ts`     | `pressed`, `dragging`                      | `column-reorder.spec.tsx`, `group-by-drag.spec.tsx` |
| `LoadState`        | `src/infiniteScroll.ts`  | `idle`, `requested`, `loading`, `detached` | `infinite-scroll.spec.tsx`                          |
| `VirtualizerPhase` | `src/rowVirtualizer.ts`  | `ready`, `awaiting-row`, `destroyed`       | `row-virtualization.spec.tsx`                       |
| `Typeahead`        | `src/menu/attachMenu.ts` | `idle`, `typing`                           | `menu.spec.tsx`                                     |
| `Hover`            | `src/menu/attachMenu.ts` | `away`, `resting`, `rested`                | `menu.spec.tsx`                                     |

The specs are in `apps/playground/tests-ct/`. The convention is in the root
[State](../../AGENTS.md#state) section.

Every behaviour releases what it holds on every exit. One that returns a
handle ends with its `detach` or `destroy`; one whose return type is fixed
(`startDragReorder` and `startColumnResizeGesture` return whether they
started) takes an optional `signal: AbortSignal` in its handlers instead.
Aborting runs the cancel path (`onState` with no drag, or `onCancel`),
removes every listener and releases pointer capture, and an already-aborted
signal starts nothing.

## Commands

```bash
pnpm --filter @gridkitjs/dom test        # Vitest, pure helpers only
pnpm --filter @gridkitjs/dom typecheck
pnpm --filter @gridkitjs/dom lint
pnpm --filter @gridkitjs/dom build       # tsup, only for publishing
```

## Tests

`dom` still passes `--passWithNoTests`, for good: its behaviours need real
layout and are tested through Playwright, and Vitest there covers only pure
helpers such as overlay placement.

The Playwright suite lives in `apps/playground/tests-ct/`; see
[apps/playground/AGENTS.md](../../apps/playground/AGENTS.md). A new behaviour
needs a test there, and `packages/dom/src/` counts toward its coverage
threshold.

## Docs

`packages/dom/docs/` is split by kind of behaviour, and its overview's
"Exports by page" table names every export of `@gridkitjs/dom` with the
page that documents it. A new export goes into that table and into its
page's `## Types` table or a section of its own, so nothing the package
exports goes unnamed.

The writing rules are in [.claude/rules/docs.md](../../.claude/rules/docs.md).

## Releasing

Published, so a change to what it ships needs a changeset; tests,
docs and README edits do not. See
[.claude/rules/versioning.md](../../.claude/rules/versioning.md).
