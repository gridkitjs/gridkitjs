# Phase 04: `GridOptions` and `createGridController`

> Part of [Portable core](MASTER.md). Status is tracked only in the master. When done, reply
> with the standard phase report (the delegator gives you the format).

## Goal

The grid's state and actions live in a framework-free controller in core. `DataGrid.tsx`
creates one, feeds it props, subscribes, and draws. Every state slice becomes controllable from
outside (controlled prop or setter) while the existing `default*`/`on*Change` API keeps working
unchanged. A serialisable `GridState` can be read and restored. This is the centrepiece of the
plan: after it, a renderer owns no grid logic.

## Read first

- `DESIGN.md#3` (`GridOptions`), `#5` (`GridState`, controller contract, actions, snapshot
  rules), `#8` (strangler rules).
- `packages/react/src/DataGrid/DataGrid.tsx`: all of it; especially the `useState`s (562-586),
  the page-reset-on-change block (1086-1096), the subscriber effect (1138-1158) and the
  imperative handle (1166-1244).
- The state hooks being absorbed: `useColumnSort.ts`, `useRowGrouping.ts`, `usePagination.ts`,
  `useGridSelection.ts`, `commitIfChanged.ts`; and the DOM-coupled ones that will _call_ the
  controller: `useColumnResize.ts` (`commit`), `useColumnDrag.ts`/`DataGrid.tsx#handleDrop`.
- `packages/react/src/DataGrid/hooks/useGridSnapshot.ts` + one `use*State` hook: the public
  subscription contract to preserve.
- `apps/playground/tests-ct/reactive-hooks.spec.tsx`, `imperative-api.spec.tsx`,
  `selection.spec.tsx`: the behaviours most likely to catch a regression here.

## Starting point

- (From Phase 03) `locale` and column visibility now exist in React (`visibility` useState via
  `useColumnVisibility.ts`, `defaultColumnVisibility` / `onColumnVisibilityChange`); move both
  into `GridOptions` and the controller and add a controlled `columnVisibility` prop. Value
  formatting is opt-in (plain unless `format` or `locale` is set), confirmed by the user.
- (From Phase 02) Still in React and to move into the controller: column inference
  (`defineColumnsFromRows` when no `columns`), the page reset on filter/sort/group change (the
  `previous` state in `DataGrid.tsx`), and `activeAggregates`.
- After Phase 02, `DataGrid.tsx` derives everything from `resolveGridView`; after Phase 03,
  `GridState` has sizing, order, visibility, sort, filter, groupBy, expansion, pagination (plus
  selection to add here).
- State hooks follow one pattern: compute next with a core function → `commitIfChanged` → fire
  `on*Change`. `useColumnResize` bypasses the bail-out on purpose for the `"move"` phase.
- `filter` has no setter today (`const [filter] = useState(...)`).
- Page reset: when `filter`/`sort`/`groupBy` identity changes, `pageIndex` resets to 0 during
  render without firing `onPaginationChange` — keep that rule inside the controller.
- Announcements (`announce(...)`) wrap the `on*Change` handlers in `DataGrid.tsx`; they are
  renderer concerns and stay in React, driven by the same events.
- `useSyncExternalStore` needs stable snapshots; the current effect notifies only when a listed
  value changed, to avoid a re-render loop described in its comment (1116-1137). The controller
  notifies on action commit instead, which has no such loop because it is not tied to render.

## Tasks

### Part A: `GridOptions`, controller skeleton, first slices

1. Define `GridOptions<Row>` in `packages/core/src/options.ts` with every non-render prop of
   `DataGridProps` today (plus `locale` from Phase 03), each with its doc comment moved from
   `DataGrid.tsx`. `DataGridProps<Row>` becomes `GridOptions<Row> & ReactRenderSlots<Row> &
SelectionCallbacks<Row> & { ref? }` where `ReactRenderSlots` holds `columns` (React
   `ColumnDefinition`), `pager`, `infiniteScroll` (they name `ReactNode`). Acceptance: typecheck;
   no playground or test file changes.
2. `createGridController<Row, Node>(initial: GridControllerOptions)` in
   `packages/core/src/controller/` with `setOptions`, `getOptions`, `getState`, `getView`,
   `subscribe`, and a private `commit(slice, next, event)` implementing: bail if same reference;
   store when uncontrolled; fire the slice's `on*Change`; notify. Move the sort, grouping,
   expansion and pagination actions in (`toggleColumnSort`, `setColumnSort`, `toggleGroupBy`,
   `moveGroupBy`, `setGroupBy`, `toggleGroupExpansion`, `expandAllGroups`, `collapseAllGroups`,
   `setGroupExpansion`, `goToPage`/`nextPage`/`previousPage`/`setPageSize`/`setPagination`) and
   the page-reset rule. Acceptance: Vitest covering each action's event payload (identical to
   today's), the no-op bail, controlled-vs-uncontrolled for `columnSort` and `pagination`, the
   page reset firing no `onPaginationChange`, and subscriber notification count.
3. React: `useGridController(props)` hook creates the controller once, calls
   `controller.setOptions(props)` during render, subscribes with `useSyncExternalStore` on a
   version counter, and returns `{ controller, view, state }`. Replace the four absorbed hooks'
   state with controller actions; `useColumnSort`/`useRowGrouping`/`usePagination` become thin
   adapters or disappear. Acceptance: Playwright passes unchanged.
4. Controlled props for these slices: `columnSort`, `groupBy`, `groupExpansion`, `pagination`
   (+ dev-time error if both controlled and `default*` given). CT tests: a controlled `columnSort`
   grid ignores a header click until the parent applies the event; `pagination` likewise.
   Changesets: `core` minor, `react` minor. Docs: `data-grid.mdx` props, a new
   `packages/react/docs/state.mdx` ("Controlled and uncontrolled state") with `_meta.json` entry.

### Part B: filter, selection, sizing, order, visibility

1. Move `filter` into the controller with `setFilter`; controlled `filter` + `onFilterChange`
   (`FilterChangeEvent { filter }`), `defaultFilter` unchanged. `DataGridApi.setFilter`,
   `getFilter`; `useFilterState` hook. Acceptance: CT test in `filtering.spec.tsx`: `setFilter`
   via ref changes rendered rows and resets to page 0; `onFilterChange` fires once.
2. Move selection (`rowSelection`, `columnSelection`, `cellSelection`) in: actions per
   `DESIGN.md#5`, the thirteen callbacks fanned out from one diff exactly as `useGridSelection`
   does today (move the diff logic to core, keep `announce` in React). Controlled props
   `rowSelection`/`columnSelection`/`cellSelection`. `DataGridApi.selectRows(ids)`,
   `getSelectedRows()` (resolved rows). Acceptance: `selection.spec.tsx` passes unchanged; new
   tests for `selectRows` via ref and for a controlled `rowSelection`.
3. Move sizing, order, visibility in: `setColumnSizing`, `resizeColumn(id, width, phase)` (the
   `"move"` phase does not bail on equal width, matching today), `setColumnOrder`,
   `moveColumn`, `setColumnVisibility`, `showColumns`, `hideColumns`. `useColumnResize` and
   `handleDrop` call the controller. Controlled props `columnSizing`, `columnOrder`,
   `columnVisibility`. Acceptance: `column-resize.spec.tsx`, `column-reorder.spec.tsx`,
   `group-by-drag.spec.tsx` pass unchanged; new tests for controlled `columnOrder`.
4. `DataGrid.tsx` ends this part with **no `useState` for grid state** (transient gesture state
   and `announcement` may remain). Acceptance: grep.

### Part C: `GridState` in and out, API completeness

1. `getState()`, `restoreState(partial)` (one notify, fires each changed slice's event),
   `serializeGridState(state)` (`DESIGN.md#5`) in core and on `DataGridApi`. Acceptance: tests:
   round trip through `JSON.parse(JSON.stringify(serializeGridState(s)))` restores sort, group,
   filter (operator/text/value entries), sizing, order, visibility, pagination, selection; a
   predicate entry is dropped with one `console.error`.
2. Fill the remaining `DataGridApi` gaps from `DESIGN.md#5`: `getDataColumns`, `getFilter`,
   `setColumnSort`, `setGroupBy`, `autoFitColumn(columnId)` (React-side, uses
   `measureColumnContent`; moves to `dom` in Phase 07). Keep every existing member. Acceptance:
   `imperative-api.spec.tsx` covers `restoreState` + `autoFitColumn`.
3. Docs: `imperative-handle.mdx` (every new member), `state.mdx` (saving and restoring a
   layout, with the predicate caveat), `events.mdx`. Changesets.

## Done when

- [ ] `GridOptions` is the single options type; `DataGridProps` is composed from it.
- [ ] All state lives in `createGridController`; `DataGrid.tsx` holds no grid `useState`.
- [ ] Every slice is controlled-or-uncontrolled; existing `default*`/`on*Change` unchanged.
- [ ] `DataGridApi` has the setters and getters listed; `getState`/`restoreState` round-trip.
- [ ] Core tests cover the controller without a DOM; Playwright passes unchanged plus new tests.
- [ ] Changesets and docs (`state.mdx`, `imperative-handle.mdx`, `data-grid.mdx`, `events.mdx`).
- [ ] Code follows the master's quality bar (`AGENTS.md`).

## Verify

- `pnpm test`: controller tests under `packages/core/src/controller/*.test.ts`.
- `pnpm --filter playground test:e2e`: every pre-existing test unchanged and green; list new ones.
- `grep -n "useState" packages/react/src/DataGrid/DataGrid.tsx` shows only transient/announce
  state (or nothing).

## Decisions already made

- Per-slice controlled props, names and semantics: `DESIGN.md#5` and pre-flight 3.
- Notification is synchronous on commit; snapshots are reference-stable (`DESIGN.md#5`).
- Announcements stay in React. Gesture transients stay out of the controller.

## Open choices

- Whether `useColumnSort`/`useRowGrouping`/`usePagination` files survive as adapters: default
  delete them and call the controller directly from components.
- `GridControllerOptions` vs reusing `GridOptions` + `columns`/`rows` directly: default a thin
  wrapper type `{ options: GridOptions; columns; rows; getRowId; viewportWidth }`.

## Out of scope

- Operator filter entries and the filter-editor model (Phase 05). Row hooks and messages
  (Phase 06). Moving gestures/observers (Phase 07). Any new UI.

## Suggested commits

- `feat(core): define GridOptions`: Part A 1 + changeset.
- `feat(core): add createGridController with sort, grouping and pagination`: A 2.
- `refactor(react): drive sort, grouping and pagination through the controller`: A 3.
- `feat(react): add controlled columnSort, groupBy, groupExpansion and pagination`: A 4 + docs.
- `feat(core): move filter, selection, sizing, order and visibility into the controller`: B 1-3
  core side; `refactor(react): …` for the React side; `feat(react): add setFilter, selectRows,
getSelectedRows and controlled props` + docs.
- `feat(core): add getState, restoreState and serializeGridState`: C 1; `feat(react): complete
DataGridApi setters` C 2-3 + docs.

## Docs to update

- `packages/react/docs/state.mdx` (new), `data-grid.mdx`, `imperative-handle.mdx`,
  `events.mdx`, `columns/column-filtering.mdx` (now there is a setter);
  `packages/core/docs/overview.mdx` (controller paragraph) or a new `controller.mdx`.
