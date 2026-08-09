# @gridkitjs/core

## 0.8.0

### Minor Changes

- 388def3: `moveGroupByBefore`/`movesGroupBy` — the group-by counterpart of
  `moveColumnBefore`/`movesColumn`, positioning a column within `GroupByState`
  in front of another, or inserting it fresh if it isn't grouped yet. Backs the
  new drag-a-header-into-the-group-by-bar and drag-a-chip-to-reorder
  interactions in `@gridkitjs/react`.

  `ColumnDefinition` gains `groupByDraggable` (whether a column's header may be
  dragged into the group-by bar) and `groupToggleIcon` (whether a groupable
  header shows its group-toggle icon), mirroring `sortable`/`reorderable`.
  `ColumnResolveOptions`/`ResolvedColumn` gain the matching `groupByDraggable`
  field.

- 388def3: Row grouping primitives: `groupRows` reshapes filtered/sorted rows into a flat, depth-first list of group headers and data rows, stacked outer-to-inner by a `GroupByState`. New exports: `groupRows`, `groupRowId`, `toggleGroupExpansion`, `expandAllGroups`, `collapseAllGroups`, and the types `GroupByState`/`GroupByEntry`/`GroupByEvent`/`GroupExpansionState`/`GroupExpansionEvent`/`ResolvedGroupRow`/`DisplayRow`. `ColumnDefinition` gains a `groupable` field, mirroring `sortable`.

  Breaking: `KeyShortcutCapabilities` (consumed by `buildKeyShortcuts`) gains a required `groupable: boolean` field.

## 0.7.0

### Minor Changes

- ac7695f: `DataGrid` accessibility fixes, closing gaps found auditing it against the
  WAI-ARIA grid pattern:

  - Selecting a cell now announces it (e.g. "name, row 2, selected") via the
    grid's existing live region. Previously a grid configured with only cell
    selection gave a screen-reader user no feedback at all when selecting a
    cell — unlike row and column selection, which already announced counts.
  - New keyboard shortcut: `Alt+Enter` on a focused, resizable column header
    sizes that column to its content — the keyboard equivalent of
    double-clicking its resize handle. Advertised via `aria-keyshortcuts`
    alongside the existing resize/reorder/sort shortcuts, so `buildKeyShortcuts`
    (`@gridkitjs/core`) now includes `Alt+Enter` in its output for a resizable
    column.
  - Header `<th>` cells now set `role="columnheader"` explicitly, matching the
    explicit `role="gridcell"`/`role="row"` already set on body cells and rows,
    rather than relying on `<th scope="col">`'s implicit role mapping inside a
    `role="grid"` table.
  - Body `<td>` cells now set `aria-keyshortcuts="Space Enter"` when cell
    selection is enabled, matching the shortcuts header cells already
    advertise.

- ac7695f: `@gridkitjs/core` now exports pure grid logic that previously lived only
  inside `@gridkitjs/react`'s `DataGrid` hooks, so a future non-React binding
  (or any consumer working directly against `core`) can reuse it instead of
  reimplementing it:

  - `clampFocus`, `nextFocusForKey`, `HEADER_ROW`, and the `GridFocus`/
    `NavigationModifiers` types — the header/body focus-navigation state
    machine.
  - `intentOf` and `applySelectionIntent`, plus the `SelectIntent` type —
    reading a click or key press's modifiers into an intent, and applying it
    to a `SelectionState`.
  - `resolveRows`, `resolveColumns`, and `resolveCell` — resolving selected
    ids back to the row/column/cell records behind them, dropping any id whose
    row or column no longer exists.
  - `resolveKeyboardDropTarget` — the `beforeId` a keyboard column-reorder
    nudge produces, matching the pointer-drag drop path already in
    `moveColumnBefore`.
  - `buildKeyShortcuts` (and the `KeyShortcutCapabilities` type) — the
    `aria-keyshortcuts` string for a column header.
  - `revertColumnSize` — the sizing-state merge a cancelled resize reverts to.

  `@gridkitjs/react`'s `DataGrid` hooks (`useGridNavigation`,
  `useGridSelection`, `useColumnDrag`, `useColumnResize`) and `GridHeader` now
  call these instead of defining them locally. No behavior change for a
  correct caller — this is the same logic, moved.

## 0.6.0

### Minor Changes

- 26adc6f: Added filtering infrastructure: `FilterState`/`FilterEntry` — a discriminated
  union of a `%`-wildcard text query, a typed exact-value match (type-scoped:
  a number never matches a string column), a custom predicate, or a nested
  `GroupFilterEntry` for AND/OR composition — ANDed together across top-level
  entries. Added the core `filterRows` / `setColumnFilter` / `clearAllFilters`
  / `filterQueryFor` / `matchesQuery` functions, and `resolveShownRows`, which
  composes filtering and sorting. Seed a grid's filter with `defaultFilter` on
  `DataGridComponent`. No header or toolbar UI ships yet — pre-filter
  `dataSource` yourself with the exported functions, or seed `defaultFilter`,
  until it does.
- 26adc6f: Added multi-column stacked sorting. A header's sort toggle cycles a column
  through ascending, descending, and off; Shift-click adds or updates a column
  in the stack instead of replacing it, sorted in priority order. Configure
  with `sortableColumns` / `column.sortable`, seed with `defaultColumnSort`,
  and listen with `onColumnSortChange`.

## 0.5.0

### Minor Changes

- f92198e: Selection primitives, ahead of the grid wiring them up. `toggleSelection`,
  `selectOnly`, `selectRange`, `selectAll` and `clearSelection` transform an
  ordered `SelectionState` of ids under a `SelectionMode` of `false | "single" |
"multiple"`; `selectCell` and `toggleCellSelection` do the same for the single
  `CellSelectionState`. Each returns its input by reference when nothing changed,
  as `moveColumnBefore` does, so a caller can skip a render and an event on that
  alone. `diffSelection` reports what one transition added and removed.

  `resolveRowId(row, index, getRowId?)` settles a row's identity, the counterpart
  to `getColumnId` — falling back to the row's position when no `getRowId` is
  given, which is enough for a static grid but ties row state to where a row sits
  rather than to the row.

  `CellTemplateContext` gains `rowId` and `selected`, so a template can key off
  its row or style itself to match the selection:

  ```ts
  cellTemplate: ({ value, rowId, selected }) =>
    selected ? <strong id={rowId}>{value}</strong> : value;
  ```

## 0.4.0

### Minor Changes

- 375c736: `fitColumnsToWidth` now shrinks unsized columns toward their `minWidth` when
  they exceed the available width, instead of leaving them at their full size
  and relying on the viewport to scroll. A `resizeMode="fit"` grid now fills a
  narrow container in both directions; it still scrolls if every column is
  already at its `minWidth` (or user-resized) and the total still doesn't fit.

## 0.3.0

### Minor Changes

- 1e112a6: Columns take a `wrap` option — `{ header?: boolean; cells?: boolean }` — and
  two escape-hatch class fields, `headerClassName` and `cellClassName`.

  `wrap` lets a column's header and/or cell text wrap onto multiple lines
  instead of the grid's default single line with an ellipsis; it's off by
  default, so existing grids render unchanged. `headerClassName`/
  `cellClassName` are appended to a column's `th`/`td` as-is — nothing in this
  package reads them — for styling a single column that no other prop covers.

## 0.2.0

### Minor Changes

- 7f0645b: Column ordering, as the framework-agnostic half of drag-and-drop reordering.
  `applyColumnOrder(columns, order)` permutes a column list by a
  `ColumnOrderState` — an array of column ids that need not name every column,
  so one it omits keeps its position among the definitions and follows those it
  lists. `moveColumnBefore(order, movedId, beforeId)` produces the new order,
  returning the array it was given when the move changes nothing, and
  `resolveDropBefore(order, targetId, side)` turns a `"before"`/`"after"` hit
  into the id to move in front of, and `movesColumn(order, movedId, beforeId)`
  answers whether such a move would rearrange anything — the two gaps either
  side of a column are drops that change nothing, so an adapter asks this before
  offering one as a target.

  Columns also take a `reorderable` flag, resolved by `resolveColumnWidths` from
  the new `reorderable` option in the same way as `resizable` and surfaced on
  `ResolvedColumn`.

## 0.1.0

### Minor Changes

- e0f5b59: Columns take `headerTemplate` in place of `header`, and a new `cellTemplate`
  renders a column's cells.

  `{ field: "Id", header: "#" }` becomes `{ field: "Id", headerTemplate: "#" }`.

  `cellTemplate` receives `{ value, row, rowIndex }` and returns whatever the
  adapter renders — in React, `cellTemplate: ({ value }) => <b>{value}</b>`.
  `value` is the cell's own value read off the field path, so a template that
  only formats it never repeats the path. A column without one renders the raw
  value as before.

- 401a2cc: Address nested fields with `"Parent.Child"` paths, and derive columns from data

  `ColumnDefinition["field"]` now autocompletes one level of nesting via the new
  `FieldPath<Row>` type, while still accepting any string so a path the type
  cannot see is never a hard error. `defineColumnsFromRows` derives a column per
  field across a set of rows, in first-seen order and without duplicates.

  `ColumnDefinition` takes a second type parameter for what a header renders to.
  It defaults to `string` in `@gridkitjs/core`, which stays framework-agnostic;
  `@gridkitjs/react` exports a `ColumnDefinition<Row>` alias bound to `ReactNode`,
  so a header callback can return JSX. This replaces the untyped `Function`.

- a3db97e: Resolve a column's label, resizability and alignment in core

  `ResolvedColumn` gains `label`, `resizable` and `alignment`, so it now describes
  a column completely rather than only its width. `resolveColumnWidths` decides
  all three: a header is resolved eagerly or by calling it, falling back to a
  label read off the field path; `resizable` takes the column's own setting over
  the grid's; alignment falls back to the column's type. A second framework
  adapter renders identically without repeating any of it.

  `resolveColumnWidths` takes a `ColumnResolveOptions` object as its third
  argument in place of the size defaults — `{ sizes: { width: 60 } }` where it was
  `{ width: 60 }` — since the grid-level defaults are no longer only sizes.
  `resolveColumnLabel`, `alignmentForType` and `KEYBOARD_STEP` are exported for
  adapters that resolve columns themselves.

  Columns that set a numeric `type` without an explicit `alignment` now align
  right, matching columns inferred from data — previously only the inferred ones
  did. Numeric alignment covers `decimal`, `currency` and `percent` alongside
  `number`. A column with `header: ""` now renders an empty header instead of
  falling back to its field name.

- 45e492c: Size, resize and auto-fit columns

  `ColumnDefinition` gains `width`, `minWidth`, `maxWidth` and `resizable`, plus an
  optional `id` that state is keyed by and that defaults to `field`. Every width
  calculation lives in `@gridkitjs/core` — `resolveColumnWidths` applies the
  precedence (sizing state, then the column, then the default) and clamps;
  `beginColumnResize`/`applyColumnResize` turn a pointer position into a width;
  `fitColumnsToWidth` distributes a container's width across columns. A future
  adapter for another framework inherits all of it.

  `DataGridComponent` takes `resizableColumns`, `resizeMode`, `onColumnResize` and
  two sizing props that read alike but differ: `defaultColumnSizing` sets the
  starting width of specific columns, keyed by id, while `columnSizeDefaults` sets
  the width and bounds used for any column that does not size itself. Columns can
  be dragged by their right edge, resized with the arrow keys, and sized to their
  content by double-clicking the handle.

  `resizeMode` chooses what a resize does to the other columns. Under the default
  `"fit"`, columns fill the grid: auto-fit leaves those the user has sized alone
  and shares the remaining width between the rest, so a column giving up space
  hands it to its neighbours. Under `"fixed"`, every column keeps its own width —
  a resize moves one column and nothing else, and the grid scrolls or leaves a gap
  to suit.

  The grid now renders inside a scrolling wrapper and sizes its columns through a
  `<colgroup>` with `table-layout: fixed`, which is what makes a width exact.
  Cell content that does not fit its column is truncated with an ellipsis instead
  of wrapping.
