# Phase 02: `resolveGridView` and the width-free pipeline

> Part of [Portable core](MASTER.md). Status is tracked only in the master. When done, reply
> with the standard phase report (the delegator gives you the format).

## Goal

One pure core function answers "what is the user looking at": `resolveGridView` composes
filter → sort → group → aggregate → paginate and column ordering/sizing, with per-stage
memoisation, and `DataGrid.tsx` calls it instead of its own `useMemo` chain. The data stages
read columns without widths, so a resize or viewport change no longer re-runs them. This is the
function the controller (Phase 04) and, later, export/print/toolbar consume.

## Read first

- `DESIGN.md#1` (why), `DESIGN.md#4` (the shapes and decisions for this phase).
- `packages/react/src/DataGrid/DataGrid.tsx` lines 588-810: the pipeline being extracted
  (`rows`, `definedColumns`, `orderedColumns`, `resolved`, `shownRows`, `displayRows`,
  `aggregatedRows`, `grandTotal`, `paginatedRows`, `displayDataRows`) and its comments, which
  carry the invariants.
- `packages/core/src/util/rows.ts` (`resolveShownRows`), `sorting.ts` (`sortRows`),
  `filtering.ts` (`filterRows`), `grouping.ts` (`groupRows`), `aggregation.ts`
  (`computeAggregates`, `withGroupAggregates`), `paging.ts` (`paginateRows`), `sizing.ts`
  (`resolveColumnWidths`, `fitColumnsToWidth`), `ordering.ts` (`applyColumnOrder`): the stages.
- `packages/core/src/util/grid.test.ts` and `rows.test.ts`: the test style to match.

## Starting point

- Every data stage takes `columns: readonly ResolvedColumn<Row, unknown>[]` but reads only
  `.id` and `.column` (`.column.field`, `.column.type`). `ResolvedColumn` is produced by
  `resolveColumnWidths` and so changes identity whenever `sizing` or `viewportWidth` changes.
- `shownRows`'s `useMemo` lists `resolved` as a dependency (`DataGrid.tsx:658-661`); that is the
  resize-performance defect. `useColumnResize` commits sizing on every pointer move.
- Each stage already returns its input reference for a no-op (`sortRows`, `groupRows`,
  `withGroupAggregates`), and `NO_AGGREGATES` is a module-level constant for the same reason.
- `DataGridApi` exposes `getRows()` (= `shownRows`) and `getDisplayRows()` (= `aggregatedRows`)
  but not the current page.
- Phase 01 made core DOM-free; this phase adds nothing that needs DOM.

## Tasks

1. Introduce `DataColumn<Row, Node = string> = { readonly id: string; readonly column:
ColumnDefinition<Row, Node> }` in `types.ts` and widen the data stages (`filterRows`,
   `sortRows`, `resolveShownRows`, `groupRows`, `computeAggregates`, `withGroupAggregates`,
   `collapseAllGroups` if it reads columns) to accept `readonly DataColumn<Row, unknown>[]`.
   `ResolvedColumn` satisfies it structurally, so no caller breaks. Acceptance: typecheck passes
   with no call-site change; a test passes a bare `{ id, column }` array to `resolveShownRows`.
2. Add `resolveDataColumns(columns, order)` → ordered `DataColumn[]` (uses `applyColumnOrder`
   and `getColumnId`). Acceptance: tests for order applied, partial order, same reference when
   inputs unchanged is _not_ required here (memo is task 4).
3. Add `resolveGridView(input: GridViewInput<Row, Node>): GridView<Row, Node>` in
   `packages/core/src/util/view.ts` with exactly the fields in `DESIGN.md#4` (`GridState` for this
   phase is the subset that exists: sizing, order, sort, filter, groupBy, groupExpansion,
   pagination — define `GridState` in `types.ts` now with those fields; later phases add
   visibility and selection). Pipeline order and the page-never-splits-a-group rule are
   unchanged. `displayDataRows` keeps today's shortcut (`rows` itself when ungrouped and
   unpaginated). Acceptance: unit tests mirroring today's behaviour: grouped + paginated input
   gives the same `pageRows` as composing the stages by hand; `pageCount`/`pageIndex` report
   `1`/`0` when `paginated` is false; `grandTotal` ignores paging.
4. Add `createGridViewResolver()` returning a memoised `resolveGridView`: each stage caches its
   last inputs by identity and returns its last output when none changed. Acceptance (the key
   test): with the same `rows`, `columns`, `state.filter/sort/groupBy/expansion/pagination` and a
   _different_ `state.columnSizing` or `options.viewportWidth`, the returned `rows`,
   `displayRows`, `pageRows`, `displayDataRows` and `grandTotal` are `toBe` the previous call's;
   `columns` is new. And: changing `filter` recomputes `rows` but not `dataColumns`.
5. Replace `DataGrid.tsx`'s `useMemo` chain with one resolver held in a `useRef`/`useMemo(() =>
createGridViewResolver(), [])` and a single `const view = resolver({...})` per render. Keep
   every downstream name working (`shownRows` → `view.rows`, etc.) with minimal edits; keep the
   comments that explain invariants by moving them to `view.ts`. Acceptance: Playwright suite
   passes unchanged.
6. Add `getPageRows()` to `DataGridApi` (returns `view.pageRows`) and list it in
   `packages/react/docs/imperative-handle.mdx`. Acceptance: a CT test in
   `imperative-api.spec.tsx` reads it on a paginated grid and gets the page's rows only.
7. Export the new names from `packages/core/src/index.ts`; changesets: `core` minor (new
   `resolveGridView`, `createGridViewResolver`, `DataColumn`, `GridState`), `react` minor
   (`getPageRows`).

## Done when

- [ ] `resolveGridView` and the resolver exist in core with tests for memo stability and parity.
- [ ] `DataGrid.tsx` no longer composes the pipeline itself.
- [ ] Sizing/viewport changes leave every data-stage output reference-equal (test proves it).
- [ ] `getPageRows()` documented and tested.
- [ ] Changesets present; docs updated.
- [ ] Full CI sequence green; Playwright suite passes unchanged.
- [ ] Code follows the master's quality bar (`AGENTS.md`).

## Verify

- `pnpm --filter @gridkitjs/core test`: new tests in `view.test.ts` pass; count rises from 327.
- `pnpm --filter playground test:e2e`: same pass count as after Phase 01, no spec edited except
  `imperative-api.spec.tsx` (addition only).
- Manual sanity (optional): playground `VirtualizedGrid`/large dataset demo, drag a column edge;
  no stutter.

## Decisions already made

- Field names and shapes of `GridViewInput`/`GridView`: `DESIGN.md#4`. Hidden columns are not
  in this phase (Phase 03) but `dataColumns` vs `columns` already exist as separate fields.
- Memo is hand-written in core; no React, no third-party memo library.

## Open choices

- File layout: one `util/view.ts` or `view.ts` + `viewResolver.ts`; default one file unless it
  passes ~300 lines.
- Whether `resolveGridView` takes `getRowId` or pre-resolved `ResolvedRow[]`: default `rows` +
  `getRowId`, resolving ids inside (that stage memoises on `rows`/`getRowId`).

## Out of scope

- Column visibility, `header`, formatting (Phase 03). The controller and controlled props
  (Phase 04). Any change to how sizing or fit works.

## Suggested commits

- `refactor(core): read data-stage columns as DataColumn`: task 1-2 + changeset.
- `feat(core): add resolveGridView and a memoised resolver`: tasks 3-4 + tests + docs.
- `refactor(react): derive the grid from resolveGridView`: task 5.
- `feat(react): expose getPageRows on DataGridApi`: task 6 + changeset + doc.

## Docs to update

- `packages/core/docs/overview.mdx`: a short "The view pipeline" section naming
  `resolveGridView` and the stage order. Add a `view.mdx` page (and `_meta.json` entry) if the
  section grows past a screen.
- `packages/react/docs/imperative-handle.mdx`: `getPageRows()` row.
