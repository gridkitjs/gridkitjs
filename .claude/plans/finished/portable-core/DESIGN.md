# Portable core: design notes

Shared design for every phase of [the portable-core plan](MASTER.md). Phase files point here
by section instead of repeating it. Decisions recorded here are settled; a phase that wants to
reopen one stops and reports instead.

## 1. Why

GridKit's rule is "framework-agnostic core first, renderer second", with the stated goal that
a future Angular (or Vue/Svelte) grid is, in simple terms, the React package with React's
methods swapped for the other framework's. That only holds if every _decision_ lives below the
renderer. Today `@gridkitjs/core` holds the pure transforms, but all state (11 `useState`s), the
whole derived pipeline (filter → sort → group → aggregate → paginate), and every browser
behaviour (gestures, observers, focus, announcements) live in `@gridkitjs/react`, mostly in the
1,443-line `packages/react/src/DataGrid/DataGrid.tsx`. By file size the React package is
≈ 30 % markup and ≈ 60–65 % logic and behaviour that can move.

Two concrete defects fall out of the same shape:

- Nothing outside React can ask "what is the user looking at" (needed by the toolbar, context
  menu, export and print work that follows this plan).
- Resizing a column re-runs the data pipeline on every pointer move: `shownRows` depends on
  `resolved` (sized columns), and `useColumnResize` calls `setSizing` per `"move"` event
  (`DataGrid.tsx:630-661`, `useColumnResize.ts:56-70`). Filtering/sorting only need each
  column's `field` and `type`, never its width. Measured core cost at 100k rows: sort 0.24–0.4 s,
  group 0.09 s, aggregates 0.04 s — so a resize on large data is visibly janky.

## 2. Layers

| Layer        | Package                                       | Holds                                                                                                                    | Framework | DOM |
| ------------ | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------- | --- |
| 1 Pure logic | `@gridkitjs/core` (exists)                    | transforms, reducers, formatting, filter-editor model                                                                    | no        | no  |
| 2 Controller | `@gridkitjs/core`                             | state container, derived view, actions, controlled-vs-uncontrolled resolution, `subscribe`/snapshots                     | no        | no  |
| 3 Behaviours | `@gridkitjs/dom` (new, vanilla TS, published) | pointer gestures, focus movement, observers, virtualizer measurement, overlay placement/dismissal, live-region announcer | no        | yes |
| 4 Renderer   | `@gridkitjs/react` (exists); Angular later    | markup, templates, lifecycle glue that attaches layer 3 and subscribes to layer 2                                        | yes       | yes |

Boundary test for any new code: assertable in Vitest without a DOM → core. Needs DOM but not
React → `dom`. Only drawing → renderer. The renderer never has an `if` that changes _what_ the
grid does, only _how it is drawn_.

How the contracts map onto frameworks (why this is "swap the methods"):

| Contract                                        | React                               | Angular                               | Vue / Svelte                  |
| ----------------------------------------------- | ----------------------------------- | ------------------------------------- | ----------------------------- |
| `subscribe(fn)` + stable snapshot getters       | `useSyncExternalStore`              | signal fed from `subscribe`, `OnPush` | `shallowRef` / store contract |
| behaviour `attach(element, options) → detach()` | ref callback / `useEffect`          | directive + `ngOnDestroy`             | `onMounted` / `use:` action   |
| controlled "value + change request"             | `columnSort` + `onColumnSortChange` | `model()` two-way input               | `v-model` / `bind:`           |
| render slot `(context) => Node`                 | function returning `ReactNode`      | `TemplateRef` with typed context      | slots / snippets              |

Each renderer uses its own idioms (React: `memo` rows, controlled props; Angular: signals,
`TemplateRef`, `model()`); none emulates another's API.

## 3. `GridOptions<Row>`: one options type, defined in core

Every non-render setting of the grid is one interface in core. `DataGridProps<Row>` becomes
`GridOptions<Row> & ReactRenderSlots<Row> & SelectionCallbacks<Row> & { ref }`, where the React
part holds only what names a React type (`cellTemplate` returning `ReactNode`, `pager.template`,
`infiniteScroll.loadingTemplate`, `ref`). An Angular component's inputs mirror `GridOptions`
1:1 by rule. Presets (later: `excelFilter`) are plain typed values of `GridOptions`, spreadable
in React and bindable in Angular.

Existing prop names are kept. New names follow the existing conventions: a boolean grid default
that a column overrides (`sortableColumns` / `column.sortable`), small objects for feature
details (`pager`, `selectable`, `infiniteScroll`), `defaultX` + `onXChange` for state.

## 4. `resolveGridView` and the width-free pipeline

```ts
// core — pure; a stage recomputes only when one of its own inputs changed identity
interface GridViewInput<Row, Node> {
  rows: readonly Row[];
  getRowId?: (row: Row, index: number) => string;
  columns: readonly ColumnDefinition<Row, Node>[];
  state: GridState<Row>; // see §5
  options: GridViewOptions<Row>; // paginated, aggregates, groupAggregateDisplay,
  // columnSizeDefaults, resizable/reorderable/groupByDraggable
  // defaults, resizeMode, viewportWidth: number | null
}
interface GridView<Row, Node> {
  dataColumns: readonly DataColumn<Row, Node>[]; // every column incl. hidden: { id, column }
  columns: readonly ResolvedColumn<Row, Node>[]; // visible, ordered, sized — what renders
  rows: readonly ResolvedRow<Row>[]; // filtered + sorted (today's `shownRows`)
  displayRows: readonly DisplayRow<Row>[]; // grouped + aggregated (today's `aggregatedRows`)
  pageRows: readonly DisplayRow<Row>[]; // the current page (today's `paginatedRows.rows`)
  displayDataRows: readonly ResolvedRow<Row>[]; // pageRows narrowed to data rows (selection anchors)
  pageCount: number;
  pageIndex: number;
  grandTotal: AggregateResults;
}
```

Decisions:

- Filter/sort/group/aggregate read columns as `DataColumn` (`{ id, column }`, no width). Sizing
  and fit are a separate stage keyed on `columnOrder`, `columnVisibility`, `columnSizing`,
  `viewportWidth`. A sizing or viewport change must leave `rows`, `displayRows`, `pageRows` and
  `grandTotal` **reference-equal** (that is the test).
- Hidden columns stay in `dataColumns`, so a stored sort or filter on a hidden column still
  applies (as spreadsheets do). They are removed from `columns` after ordering, so their order
  slot survives being hidden and shown again.
- Pipeline order is unchanged: filter → sort → group → aggregate → paginate. A page never
  splits a top-level group; aggregates are computed before paging.
- The stage memo is hand-written in core (a `createGridViewResolver()` holding the last inputs
  and outputs per stage). No React.

## 5. `GridState` and the controller

```ts
interface GridState<Row> {
  columnSizing: ColumnSizingState;
  columnOrder: ColumnOrderState;
  columnVisibility: ColumnVisibilityState; // Readonly<Record<string, boolean>>; absent = visible
  columnSort: ColumnSortState;
  filter: FilterState<Row>;
  groupBy: GroupByState;
  groupExpansion: GroupExpansionState;
  pagination: PaginationState;
  rowSelection: SelectionState;
  columnSelection: SelectionState;
  cellSelection: CellSelectionState;
}
```

- Each slice is **controlled or uncontrolled per slice**, React-input style: `columnSort` +
  `onColumnSortChange` (controlled) or `defaultColumnSort` (uncontrolled). Passing both the
  controlled value and the default logs a dev-time `console.error` once; the controlled value
  wins. Existing `default*`/`on*Change` props and event payload types are unchanged.
- `createGridController<Row>(options)` holds the uncontrolled slices, resolves each slice against
  `options` (controlled value when given), derives the view through `resolveGridView`, exposes
  `getState()`, `getView()`, `getOptions()`, `setOptions(next)` (the renderer calls it with its
  current props every render; idempotent), `subscribe(listener)` and the actions below. Every
  action: compute next → bail if reference-equal → store (uncontrolled) → fire the slice's
  `on*Change` with today's payload → notify subscribers synchronously. Transient gesture state
  (drag ghost, drop target, active resize column) is **not** controller state.
- Actions (all return `void`): `setColumnSort`, `toggleColumnSort(columnId, { stack })`,
  `setFilter`, `setGroupBy`, `toggleGroupBy`, `moveGroupBy`, `setGroupExpansion`,
  `toggleGroupExpansion`, `expandAllGroups`, `collapseAllGroups`, `setPagination`, `goToPage`,
  `nextPage`, `previousPage`, `setPageSize`, `setRowSelection`, `selectRows(ids, intent?)`,
  `selectRow(rowId, intent)`, `selectAllRows`, `clearSelection`, `setColumnSelection`,
  `selectColumn`, `setCellSelection`, `selectCell`, `setColumnSizing`,
  `resizeColumn(columnId, width, phase)`, `setColumnOrder`, `moveColumn(columnId, beforeId)`,
  `setColumnVisibility`, `showColumns(ids)`, `hideColumns(ids)`, `restoreState(partial)`.
- Snapshots handed to subscribers are referentially stable when nothing changed (required by
  `useSyncExternalStore`); the existing `DataGridApi.subscribe` contract ("may fire after any
  change") is preserved, so the seven public `use*State` hooks keep working.
- `serializeGridState(state)` returns JSON-safe state; a `PredicateFilterEntry` cannot be
  serialised and is dropped with a dev-time `console.error` naming its `columnId`.
- `DataGridApi` gains setters mirroring the actions plus `getSelectedRows()`, `getPageRows()`,
  `getState()`, `restoreState()`, `autoFitColumn(columnId)` (needs DOM, so it stays a React-side
  method until `@gridkitjs/dom` exists), `getDataColumns()`.

## 6. Column model additions (all optional, additive)

- `header?: string`: plain-text header, used for the rendered label when no `headerTemplate`,
  for announcements, and later for export. Fixes the README example that already uses it.
- `format?: Intl.NumberFormatOptions | Intl.DateTimeFormatOptions`, `valueFormatter?: (value,
row) => string`, and a grid-level `locale?: string | readonly string[]` in `GridOptions`.
- `formatCellValue(value, column, locale): string` in core is the default cell rendering when
  no `cellTemplate` is given, and the fallback for aggregate/footer values (replacing
  `packages/react/src/DataGrid/components/formatAggregateValue.ts`). Rules: `null`/`undefined`
  → `""`; `Date` by `type` (`date` → date only, `time` → time only, otherwise date+time) via
  `Intl.DateTimeFormat(locale, format)`; number-like types via `Intl.NumberFormat` with
  `currency` needing `format.currency` (fallback: 2 fraction digits), `percent` using Intl's
  fraction semantics (`0.25` → `25 %`); `boolean` → `"true"`/`"false"` (overridable; a
  `messages` entry may route it later); everything else `String(value)`. A `cellTemplate`
  stays the escape hatch and still receives the raw `value`.
- `hidden?: boolean` on a column (the definition's default) plus `ColumnVisibilityState` in
  `GridState` (user changes), the same "defaults in the definition, exceptions in state" split
  `width`/`ColumnSizingState` uses.

## 7. Serialisable filters and the headless filter-editor model

Add a fifth entry kind, additive to the existing four (`query`, `value`, `predicate`, group):

```ts
type FilterOperator =
  | "eq"
  | "ne"
  | "contains"
  | "notContains"
  | "startsWith"
  | "endsWith"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "between"
  | "in"
  | "isEmpty"
  | "isNotEmpty";
interface OperatorFilterEntry<Row> {
  columnId: FieldPath<Row> | (string & {});
  operator: FilterOperator;
  value?:
    | FilterScalar
    | readonly FilterScalar[] /* `in` */
    | readonly [FilterScalar, FilterScalar] /* `between` */;
}
type FilterScalar = string | number | boolean | Date | null;
```

- Null semantics, fixed: `isEmpty` matches `null`/`undefined`/`""`; `isNotEmpty` the inverse;
  every other operator is `false` for an empty cell value **except** `ne` and `notContains`,
  which are `true` for empty (a "not" filter must not silently drop blanks). Text operators are
  case-insensitive, like `TextFilterEntry`. `in` compares with `bucketKey` from `grouping.ts`,
  so "same value" means the same thing as grouping does. Comparisons use `compareValues` with
  the column's `type`.
- Filter editors (a later plan) are UIs over this one state. The model they share lives in
  core: `describeColumnFilter(filter, columnId)` → `none | values (in + blanks) | conditions
(one or two operator entries joined and/or) | custom`; `columnValueOptions(rows, dataColumns,
filter, columnId, { search?, limit? })` → distinct values with counts, **cascaded** over the
  rows that pass every _other_ column's filter, sorted with `compareValues`, labelled with
  `formatCellValue`; `filterEditorReducer` → draft state (checked set, search, blanks,
  tri-state select-all over the search-visible subset, apply/cancel/clear) with "everything
  checked" normalised to "no filter" and a partial pick stored as `in`. Measured prototype
  cost at 100k rows: distinct+counts 26–113 ms, `in` of 50k values 37 ms — compute lazily,
  cache per `(rows identity, other-column filter, columnId)`.

## 8. Rules the migration follows

- Strangler approach: `DataGrid.tsx` instantiates the controller once and moves one slice at a
  time; `@gridkitjs/dom` takes one behaviour at a time. The Playwright suite tests behaviour
  through the DOM and must pass **unchanged** at every step; a test that has to change is a
  signal the extraction changed behaviour, and goes in the report.
- `@gridkitjs/dom` behaviours are `attach(element, options): () => void` functions that own
  their listeners/observers and report through callbacks; no framework types in their
  signatures. React wraps each in a small hook.
- Core: `"lib": ["ES2025"]`, no `react` import, later no `@gridkitjs/dom` import, enforced by
  tsconfig and ESLint. Core must keep running in Node (server-side export and tests).
- Renderer performance idioms are preserved deliberately: `GridRow` stays `memo`-ised with
  scalar props, body events stay delegated.
