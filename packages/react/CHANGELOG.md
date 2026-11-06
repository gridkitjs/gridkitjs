# @gridkitjs/react

## 0.13.0

### Minor Changes

- 6a4c6c2: The built-in pager is redrawn as one connected bar, `« ‹ pages › »`, that no longer shifts as the user pages through it, followed by the page-size `<select>` with its label to its right.

  - New First and Last buttons, named by the new `firstPage` and `lastPage` messages.
  - Previous and Next show chevron icons instead of their text; `previousPage` and `nextPage` are now their accessible names and tooltips. A test that found them by text, such as `locator(".grid-pager-button", { hasText: "Next" })`, should find them by role: `getByRole("button", { name: "Next" })`.
  - The arrows and pages sit inside a new `.grid-pager-bar`. Arrow buttons carry `grid-pager-nav` plus `grid-pager-first`, `grid-pager-previous`, `grid-pager-next` or `grid-pager-last`; page-number buttons carry `grid-pager-page`. All of them keep `grid-pager-button`.
  - The compact status is wrapped in `.grid-pager-status-slot` beside a hidden `.grid-pager-status-sizer` holding its widest text, so it keeps one width; `.grid-pager-status` still holds the visible text.
  - The page-size label text follows the `<select>` inside `.grid-pager-page-size`, in a `.grid-pager-page-size-label` span, where it came before it.

- 6a4c6c2: `DataGrid`'s header, body and footer `<table>` elements are now `role="presentation"`, and their `<thead>`, `<tbody>` and `<tfoot>` carry `role="rowgroup"`, so every row and cell belongs to the `grid` or `treegrid` element instead of to a native table. A grouped grid's group rows keep `aria-level`, `aria-expanded`, `aria-posinset` and `aria-setsize`, which are now valid there; screen readers stop announcing a table inside the grid, and the axe `aria-required-children` and `aria-conditional-attr` violations are gone. Class names and keyboard behaviour are unchanged.

  A test that found the grid's markup by the `table` role no longer matches. Query the grid instead, or a class name:

  ```ts
  // Before
  page.getByRole("table");
  // After
  page.getByRole("grid"); // or "treegrid" while grouped
  page.locator(".gridkit-data-grid-header"); // one table, by class
  ```

### Patch Changes

- 2ac1c45: `DataGrid` formats the counts in its default messages with its `locale` prop.
- 6a4c6c2: `DataGrid` now renders on the server: a Next.js App Router page that prerenders a grid no longer fails with "Missing getServerSnapshot", and the grid hydrates on the client without a mismatch, so it no longer needs a client-only wrapper. The `use*State` hooks such as `usePaginationState` render their pre-mount values on the server too.
- Updated dependencies [2ac1c45]
- Updated dependencies [6a4c6c2]
- Updated dependencies [6a4c6c2]
  - @gridkitjs/core@0.14.0
  - @gridkitjs/dom@0.3.1

## 0.12.0

### Minor Changes

- 1026158: Applying a column's filter menu is announced: once the grid has drawn the rows
  the filter keeps, the live region reads how many of all the rows they are —
  "2 of 3 rows", the `filterResults` message. A controlled `filter` that doesn't
  take the change announces nothing.
- 610d28a: `filterMenu.ui: "excel"` — the grid's or a column's — now opens the excel
  editor in place of the simple one: a search box, a tri-state "Select all"
  checkbox and a checklist of the column's values, in its sort order and
  labelled as its cells print, with "(Blanks)" last and, under
  `filterMenu.showCounts`, how many rows hold each. The values cascade from the
  other columns' filters. The search narrows the list and "Select all" acts on
  what it shows; past `filterMenu.valueLimit` values (10,000 by default) the
  list waits for a search, then lists the first matches and how many more there
  are. The list is windowed, one `listbox` stop for Tab, moved through with the
  arrow keys, Home, End, PageUp and PageDown, Space checking a value.

  OK, or Enter anywhere but on a button, applies the checked values: every value
  checked removes the column's filter, anything less sets one `in` entry, OR-ed
  with `isEmpty` while "(Blanks)" stays checked. Conditions or a custom filter
  open with every value checked under a note, and stay until a value is changed
  and applied. Reopening a column's menu reuses the values it counted until the
  rows, the columns or another column's filter change.

- 1026158: A filterable header shows a filter button beside its sort toggle, which opens
  the column's filter menu and closes it pressed again, and
  `Alt+Shift+ArrowDown` on a focused header opens it too, listed in the
  header's `aria-keyshortcuts`. While the column is filtered the button carries
  `is-filtered` and the header `aria-description="Filtered"` (the
  `columnFiltered` message), whatever set the filter. A column without a filter
  menu shows neither, however it is filtered.

  `Alt+Shift+ArrowDown` on a groupable header no longer groups it: grouping
  takes `Alt+ArrowDown` alone, as its `aria-keyshortcuts` always said.

- 098fd6e: `excelFilter` is exported from `@gridkitjs/react`, so the Excel-style filter
  popup turns on with `<DataGrid {...excelFilter} />`. A prop written after the
  spread overrides it, e.g. `filterMenu={{ ui: "simple" }}`.
- 1026158: `DataGridApi` gains `openFilterMenu(columnId)`, which opens a shown column's
  filter menu below its header and returns whether it did — `false` for a
  column with no filter menu — and `closeFilterMenu()`, which closes it and
  leaves the column chooser open.
- 1026158: A column with a filter menu — every column under `filterableColumns`, or one
  whose own `filterable` is `true` — opens it from "Filter…" in its header's
  context menu: a dialog below the header, named after its column ("Name
  filter"), with the column's sort entries while it sorts, then "Clear filter",
  Cancel and OK. Tab stays inside it; Escape or a click outside closes it,
  giving focus back to the header. Its sort entries and "Clear filter" run the
  `sort.*` and `filter.clear` commands, so `onCommand` hears them with the
  source `"filterMenu"`.
- 1026158: The column filter menu has an editor: one condition — an operator and a value
  — and an optional second, joined by And or Or. The operators are the column
  type's, or its own `filterMenu.operators`, and the value box suits the type: a
  number box, a date picker on a `"date"` column, a date-and-time picker on a
  `"dateTime"` or `"time"` one, a true/false choice on a `"boolean"` one, text
  otherwise. OK, or Enter, applies the conditions in place of the column's
  filter; reopened, the menu shows them, however they were set. A value missing
  or not reading keeps the menu open, its box marked `aria-invalid` and
  focused; a filter the editor can't show reads "Custom filter" until
  conditions replace it.

  Focus now starts on the first condition's value box rather than the menu's
  first button.

- 610d28a: The excel filter editor has an operator submenu: a "Text filters" button —
  "Number filters", "Date filters" or "Boolean filters", by the column's type —
  above its search box opens a menu of the conditions the column offers,
  beside the filter menu. Choosing one shows the simple editor's conditions in
  place of the checklist, the first at the operator chosen, under a "Back to
  values" button that brings the checklist back as it was left; OK there
  applies the conditions in place of the column's checked values. While the
  column is filtered by conditions, the button is ticked and the operators in
  use are checked in its menu; choosing one opens the conditions as applied.
  The button follows the menu button pattern (Enter, Space or ArrowDown opens
  the menu on its first item, ArrowUp on its last), and Escape or Tab in the
  menu closes it alone. A column whose `filterMenu.operators` is empty offers
  no menu.

  Switching `filterMenu.ui` at runtime keeps every filter: conditions show in
  the simple editor or through this menu, checked values in the excel editor.

- ebac1dd: The grid copies to the clipboard, as tab-separated text and an HTML table, so
  a paste into a spreadsheet keeps the columns. With `contextMenu` on, the cell
  menu now starts with Copy cell, Copy row and Copy selection. Ctrl+C (Cmd+C on
  a Mac) in the grid copies the selection, else the focused cell — but not in a
  text field inside a cell or while text is highlighted on the page, which stay
  the browser's. `runCommand("copy.selection")` copies from code. A screen reader
  hears what was copied ("3 rows copied") or "Copy failed".
- 812d0b6: The grid exports. The toolbar's `"export"` entry draws an Export dropdown, and
  the export commands — `export.csv`, `export.json`, `exportSelection.csv` and
  the rest — download their file from the toolbar, a context menu or
  `runCommand`; none is shown by default, so list them where you want them:

  ```tsx
  <DataGrid toolbar={{ items: ["search", "spacer", "export"] }} />
  ```

  One export downloads at a time — one asked for while an asynchronous writer
  is still writing is dropped and logged — and a writer that fails is logged
  and announced as `messages.exportFailed`.

  The ref gains `exportData(format, options?)`, which resolves to a `Blob` of
  the export instead of downloading it, under the grid's `export` option with
  `options` over it. It rejects for a format no writer is registered for.
  `ExportFile`, `ExportOptions`, `ExportWriter` and `GridExportOptions` are
  re-exported from `@gridkitjs/react`.

- 0119cd3: The grid prints. `"print"` in the toolbar's items is a Print button, `print`
  in a context menu area a Print item, and `ref.current.print(options?)` prints
  from code, resolving once the print dialog has closed. Each prints every row
  the filter leaves — across every page and inside collapsed groups, not only
  the rows drawn — through a hidden frame, titled with the grid's `label`, with
  the header row repeated on every page and page numbers where the browser
  supports them. A new `print` prop, a `PrintOptions`, sets the title, subtitle,
  footer, timestamp, page and extra `styles`; a call's options go over it.
  `PrintOptions` is re-exported. Print stays opt-in: `toolbar` alone does not
  show the button.

### Patch Changes

- 7fc1b14: `formatGroupValue(value, column, locale, messages)` is exported from
  `@gridkitjs/core`: the text a group's own value reads as, as the grouped
  column's cells read it, with a missing value reading
  `messages.blankGroupValue`. The React grid's group headers now use it, so a
  header and an export name a group the same way; nothing changes on screen.
- bd78d43: The package manifests and READMEs now point at the repository's current home, `github.com/gridkitjs/gridkitjs`.
- Updated dependencies [7fc1b14]
- Updated dependencies [7fc1b14]
- Updated dependencies [ebac1dd]
- Updated dependencies [7fc1b14]
- Updated dependencies [812d0b6]
- Updated dependencies [812d0b6]
- Updated dependencies [812d0b6]
- Updated dependencies [7fc1b14]
- Updated dependencies [0119cd3]
- Updated dependencies [812d0b6]
- Updated dependencies [ebac1dd]
- Updated dependencies [7fc1b14]
- Updated dependencies [7fc1b14]
- Updated dependencies [0119cd3]
- Updated dependencies [0119cd3]
- Updated dependencies [ae1edc7]
- Updated dependencies [812d0b6]
- Updated dependencies [0119cd3]
- Updated dependencies [ebac1dd]
- Updated dependencies [610d28a]
- Updated dependencies [a5ace0c]
- Updated dependencies [a5ace0c]
- Updated dependencies [a5ace0c]
- Updated dependencies [1026158]
- Updated dependencies [1026158]
- Updated dependencies [a5ace0c]
- Updated dependencies [098fd6e]
- Updated dependencies [610d28a]
- Updated dependencies [a5ace0c]
- Updated dependencies [a5ace0c]
- Updated dependencies [ae1edc7]
- Updated dependencies [bd78d43]
  - @gridkitjs/core@0.13.0
  - @gridkitjs/dom@0.3.0

## 0.11.1

### Patch Changes

- 0cf56d4: The `expandAllGroups` doc comment no longer says the grid has no control for it: it does what the `group.expandAll` command does.
- 0cf56d4: The `useFilterState` doc comment no longer says the grid has no filter UI of its own: it sees the toolbar's search box too.
- Updated dependencies [0cf56d4]
- Updated dependencies [0cf56d4]
  - @gridkitjs/core@0.12.1
  - @gridkitjs/dom@0.2.1

## 0.11.0

### Minor Changes

- 22cf630: `DataGrid` has a column chooser: a dialog listing every data column, hidden
  ones included, with a checkbox each, a search box and a tri-state "Show all"
  over what the search lists. Each change applies at once through `showColumns`
  and `hideColumns`; a column with `hideable: false` and the last column shown
  cannot be unchecked. It opens from the toolbar's new "Choose columns" button —
  `toolbar` alone now lists it after "Clear filters" — and from the header
  context menu's new last item, below the header, and from the ref's new
  `openColumnChooser()` at the grid's top-end corner. Escape or a click outside
  closes it, giving focus back to where it opened from.

  Hiding or showing several columns in one change — "Show all", or
  `hideColumns` given a list — now announces how many: "3 columns hidden".

- 183babc: `DataGrid`'s `contextMenu` takes a function for an area, asked each time its
  menu opens with the place it opens on, the area's defaults and the grid's
  state — to add items, drop or reorder defaults, or give one column or row no
  grid menu (`null`). Inline items, submenus and checkable items in a context
  menu work as in any grid menu: a submenu opens with ArrowRight, Enter or the
  pointer resting on its item, and a checkable item is a `menuitemcheckbox`.
- 183babc: `DataGrid` takes `onContextMenuOpenChange`, called as its context menu opens
  or closes with `{ open, target }`, and `DataGridApi` has four new members:

  - `openContextMenu(target, anchor?)` opens the menu a header, cell, group row
    or the body's empty space has, as a right-click there would — selecting and
    focusing the cell first — beside a point or an element, or else below the
    cell. It returns whether it opened.
  - `closeContextMenu()` closes it.
  - `runCommand(commandId, target?)` runs a built-in or app command on a
    target, `{ area: "grid" }` by default, when it is visible and enabled there,
    firing `onCommand` with `source: "api"`, and returns whether it ran.
  - `autoFitColumns(columnIds?)` sizes the columns given, or every column
    shown, to their content.

  `openContextMenu` renders nothing synchronously, so it is safe to call from an
  effect. `GridCommandTarget`, `GridContextMenuTarget` and
  `ContextMenuOpenChangeEvent` are re-exported from `@gridkitjs/core`.

- 5f9a5da: `DataGrid` takes a `toolbar` prop: a toolbar above the grid, sticky to its
  start edge, written in the context menu's vocabulary. `toolbar` alone shows a
  search box, "Clear filters" and "Choose columns"; `toolbar={{ items, label }}` lists command
  buttons (a checkable one is a toggle), inline items, dropdowns opening a menu,
  separators, a spacer, the search box and custom entries, which the new
  `renderToolbarItem(id)` prop draws. Buttons follow the grid's state —
  disabled or hidden as their commands say — and fire `onCommand` with
  `source: "toolbar"` and the target `{ area: "toolbar", itemId }`.

  The search box writes the filter's global text entry once typing rests, or at
  once on Enter, empties on Escape, reads its text back from the filter, and
  announces how many rows it found. The toolbar is one tab stop the arrow keys
  move within, following the WAI-ARIA toolbar pattern. Off by default.

  The grid element now carries an `id`, which the toolbar's `aria-controls`
  names. `GridToolbarOptions` and `ToolbarEntry` are re-exported from
  `@gridkitjs/core`.

- 183babc: `DataGrid` takes `commands`, the app's own commands for its menus to list by
  id — one with a built-in's id replaces that built-in in every menu listing
  it, the defaults included — and `onCommand`, called after a command or an
  inline menu item runs from a context menu with `{ commandId, target, source }`.
  An item that did not run, being disabled, is not reported. `GridCommand`,
  `GridCommandEvent` and `GridContextMenuRequest` are re-exported from
  `@gridkitjs/core`.
- 183babc: `DataGrid` takes a `contextMenu` prop: the grid's own menu on a column header,
  opened by a right-click, Shift+F10 or the ContextMenu key, in place of the
  browser's. `contextMenu` alone shows the defaults — sort ascending or
  descending, clear the sort, group by the column or stop, autofit it or every
  column, hide it, choose the columns shown — each only where the column allows
  it; `contextMenu={{
header: [...] }}` lists the items. Opening it moves focus to the header, which
  gets focus back when the menu closes, and under `selectable.columns` selects
  the column first unless it is selected already. Off by default.

  While a header opens a menu, its `aria-keyshortcuts` lists `Shift+F10`.

  Hiding or showing one column — from the menu, or through the ref's
  `hideColumns` and `showColumns` — is now announced in the live region:
  "Name, column hidden".

  `GridContextMenuOptions` and `MenuEntry` are re-exported from
  `@gridkitjs/core`.

- 183babc: `contextMenu` now opens on data cells and group rows as well as headers.
  A cell's menu ("Row menu") selects every row or clears the selection, and in a
  grouped grid expands or collapses every group; a group row's ("Group menu")
  expands or collapses every group and stops grouping by its column. Opening
  one on a row or cell that is not selected selects it first, where rows or
  cells are selectable — opening it inside the selection keeps the selection —
  and focus moves to the cell, which gets it back when the menu closes. List an
  area's items with `contextMenu={{ cell: [...], group: [...] }}`, or `[]` for
  the browser's menu there. The body's empty space opens a menu once
  `contextMenu.body` lists one; a group's summary row, the footer and the pager
  keep the browser's menu.

  While cells or group rows open a menu, their `aria-keyshortcuts` lists
  `Shift+F10`.

- 66c2815: ArrowUp on a toolbar dropdown or "More" opens its menu with focus on the last
  item, as the WAI-ARIA menu button pattern has it; ArrowDown, Enter and Space
  still open it on the first.
- 5f9a5da: A toolbar too narrow for its items moves the ones that do not fit into a
  "More" menu button at its end — a button becomes a menu item, a toggle a
  checkable one, a dropdown a submenu — and brings them back as it widens. They
  run and report to `onCommand` exactly as their buttons would. The search box
  and custom entries always stay.

### Patch Changes

- 66c2815: "Autofit all columns", and the ref's `autoFitColumns` when it fits more than
  one column, announce once for the whole operation — "3 columns autofitted",
  the new `columnsAutoFitted` message — rather than a resize per column, of which
  a screen reader heard only the last.
- 66c2815: Hiding a column from the column chooser in a grid scrolled sideways to its end
  no longer closes the chooser when the grid scrolls back within its narrower
  columns.
- 66c2815: A context menu opened through the ref's `openContextMenu` on a cell the grid has
  scrolled out of view opens at the edge of the grid's view nearest that cell,
  rather than beside the hidden cell, possibly off the page.
- 4193f42: Keys pressed in content a template portals out of the grid — a popover or
  menu rendered into `document.body` — no longer reach the grid's own key
  handling. React bubbles a portal's events through the component tree, so
  Escape in such a panel used to clear the grid's selection, Ctrl+A in its text
  box selected every row instead of the text, and the arrow keys moved the
  grid's focus.
- 66c2815: A menu or panel opened below an element — a toolbar dropdown's menu, the column
  chooser, a context menu opened from the keyboard — now leaves a 4px gap below
  it instead of sitting flush against its border. Menus opened at the pointer,
  and submenus, are placed as before.
- 66c2815: A toolbar button relabelled while it is in "More" — a changed `messages` entry,
  say — is measured again, so it comes back out of "More" once its new label fits.
- Updated dependencies [183babc]
- Updated dependencies [183babc]
- Updated dependencies [22cf630]
- Updated dependencies [66c2815]
- Updated dependencies [183babc]
- Updated dependencies [183babc]
- Updated dependencies [183babc]
- Updated dependencies [183babc]
- Updated dependencies [183babc]
- Updated dependencies [183babc]
- Updated dependencies [1fdf433]
- Updated dependencies [1fdf433]
- Updated dependencies [3758583]
- Updated dependencies [3758583]
- Updated dependencies [3758583]
- Updated dependencies [22cf630]
- Updated dependencies [4193f42]
- Updated dependencies [66c2815]
- Updated dependencies [4193f42]
- Updated dependencies [db2ba38]
- Updated dependencies [5f9a5da]
- Updated dependencies [5f9a5da]
- Updated dependencies [5f9a5da]
- Updated dependencies [5f9a5da]
- Updated dependencies [5f9a5da]
- Updated dependencies [66c2815]
- Updated dependencies [5f9a5da]
  - @gridkitjs/core@0.12.0
  - @gridkitjs/dom@0.2.0

## 0.10.0

### Minor Changes

- 6af35c6: Columns can be shown and hidden. A column with `hidden: true` starts out
  hidden; `defaultColumnVisibility` (column id → `true`/`false`) overrides that
  per column, and the ref's `showColumns(ids)` / `hideColumns(ids)` change it
  afterwards. A hidden column still sorts, filters and groups, and keeps its
  place in the column order for when it is shown again.

  - `onColumnVisibilityChange` fires once per change with `{ columnIds,
visibility }`.
  - `DataGridApi` gains `getColumnVisibility()` and `getDataColumns()` (every
    column, hidden ones included); `getColumns()` lists only what is shown.
  - `useColumnVisibilityState(gridRef)` follows the visibility state from
    outside the grid.
  - `aria-colcount`, the column widths and keyboard column moves count only the
    columns shown; a group header or group-by chip for a hidden column keeps
    its label.

- bad8ea3: `DataGrid` takes controlled `columnSizing`, `columnOrder` and
  `columnVisibility` props beside `defaultColumnSizing`, `defaultColumnOrder`
  and `defaultColumnVisibility`. Given one, the grid applies it as given, and a
  resize, a drop or `showColumns`/`hideColumns` asks for a change through
  `onColumnResize` (whose `sizing` is the next state), `onColumnOrderChange` or
  `onColumnVisibilityChange` instead of making it.
- bad8ea3: `DataGrid` takes controlled `columnSort`, `groupBy`, `groupExpansion` and
  `pagination` props beside the existing `default*` ones. Given one, the grid
  shows exactly that value, and a header click, group toggle or pager button
  only asks for a change through the matching `on*Change` callback, taking
  effect once the prop follows:

  ```tsx
  const [sort, setSort] = useState<ColumnSortState>([]);

  <DataGrid
    sortableColumns
    columnSort={sort}
    onColumnSortChange={(event) => setSort(event.sort)}
  />;
  ```

  Each slice is controlled or not on its own; passing both a controlled prop and
  its default logs a `console.error` once and the controlled value wins. A
  controlled `pagination` is not sent back to the first page when the filter,
  sort or grouping changes — reset it alongside the change if you want that.

- 6af35c6: Cells and aggregates without a template now render through `formatCellValue`
  from `@gridkitjs/core`, and `DataGrid` takes a `locale` prop (`"de-DE"`, or a
  list to fall back through).

  - A `Date` cell renders as text instead of throwing, and a boolean cell reads
    `true`/`false` instead of rendering nothing.
  - Formatting is opt-in: setting `locale`, or a column's `format`, formats
    that column's dates and numbers through `Intl` by its `type` — `currency`
    with `format.currency`, `percent` reading `0.25` as 25%, `date` and
    `time` showing only that part. Without either, numbers, totals and group
    values read exactly as before.
  - Footer, group-summary and inline group aggregates then format like their
    column's values (a `count` reads as a plain number); a group header's value
    formats like its column's cells.
  - Announcements name a column by its new `header` text when it has one, so a
    column with a markup `headerTemplate` is announced by name.

- 78e10e5: Add `getPageRows()` to `DataGridApi`: the current page of `getDisplayRows()`,
  exactly the rows the body renders — all of them when `paginated` is off.
- bad8ea3: `DataGridApi` can now drive every slice of state, not only read it:
  `setColumnSort`, `setGroupBy`, `setGroupExpansion`, `setPagination`,
  `setColumnSizing`, `setColumnOrder`, `setColumnVisibility`,
  `setRowSelection`, `setColumnSelection` and `setCellSelection` each replace
  their slice and fire its `on*Change` callback as a user's change would
  (nothing for an equal value; only a request for a controlled slice).
  `getState()` reads every slice at once and `restoreState(saved)` puts a whole
  or partial state back with one re-render; `serializeGridState`, now
  re-exported from `@gridkitjs/react`, makes it safe to save as JSON.
  `autoFitColumn(columnId)` sizes a column to its content as double-clicking
  its resize handle does.

  `setFilter` now treats a filter equal in content to the current one as no
  change, rather than only the same entries.

- 8d411eb: `DataGrid` takes `messages`, a partial `GridMessages` that replaces its own
  English strings key by key: the pager's buttons and status, the group-by bar,
  the "Loading more…" row, boolean cell text and a blank group's "(blank)", and
  every live-region announcement. Left out, every string reads exactly as
  before. `GridMessages` is re-exported.
- bad8ea3: `@gridkitjs/core` exports `GridOptions<Row>`: every grid setting that names no
  renderer type — data, row identity, what the user may do, starting state and
  change callbacks — in one interface, with the `Borders`, `HoverableConfig` and
  `GroupByBarVisibility` types it uses. `DataGridProps<Row>` is now composed
  from it plus `ReactRenderSlots<Row>` (`columns`, `pager`, `infiniteScroll`),
  the selection callbacks and `ref`; every prop keeps its name and type.
  `@gridkitjs/react` still exports `Borders`, `HoverableConfig` and
  `GroupByBarVisibility`, and now also `GridOptions` and `ReactRenderSlots`.
- da4fbda: `@gridkitjs/react` now depends on `@gridkitjs/dom`, which holds the browser
  behaviours `DataGrid` attaches. Nothing changes at a call site.

  The live region is now created by `@gridkitjs/dom`'s `createLiveAnnouncer`,
  still as the last child of the grid's viewport element. One difference a
  screen-reader user can hear: an announcement identical to the one before it —
  the same column resized to the same width twice — is now read out again
  rather than silently dropped.

- 487d8fa: **Breaking:** the grid component is renamed from `DataGridComponent` to
  `DataGrid`, matching its `DataGridProps` and `DataGridApi` types. There is no
  deprecated alias — update the import and every JSX use:

  ```tsx
  // before
  import { DataGridComponent } from "@gridkitjs/react";
  <DataGridComponent columns={columns} dataSource={rows} />;

  // after
  import { DataGrid } from "@gridkitjs/react";
  <DataGrid columns={columns} dataSource={rows} />;
  ```

  Development warnings logged by the grid are now prefixed `DataGrid:` instead
  of `DataGridComponent:`.

- 8d411eb: `DataGrid` takes `onRowClick` and `onRowDoubleClick`, called with the row,
  the column clicked and the modifiers held, and `getRowProps`, which adds a
  class and `data-*` attributes to each data row. Every data row now carries
  `data-gridkit-row-id`, its id as `getRowId` resolves it.
  `selectable.toggleOnClick` makes a plain click toggle a row rather than
  select it alone. `RowPointerEvent` and `RowProps` are re-exported.
- bad8ea3: `DataGridApi` gains `selectRows(rowIds, intent?)`, which selects rows by id
  within `selectable.rows` (`"replace"` by default, or `"toggle"`) and fires the
  row selection callbacks once, and `getSelectedRows()`, which returns the
  selected rows themselves in selection order. Selection can also be held in
  your own state with the controlled `rowSelection`, `columnSelection` and
  `cellSelection` props beside their `default*` ones; a click then asks for a
  change through the selection callbacks instead of making it.
- bad8ea3: The filter can now change after mount. `DataGridApi` gains `getFilter()` and
  `setFilter(filter)`, which replaces the filter, sends the grid back to its
  first page and fires the new `onFilterChange` prop once (`{ filter }`). A
  `useFilterState(gridRef)` hook returns `{ filter, setFilter }` for a filter UI
  outside the grid, and a controlled `filter` prop holds the filter in your own
  state alongside `defaultFilter`.

### Patch Changes

- 487d8fa: In a `virtualized` grid, a key that moves focus to a row outside the mounted
  window (such as Ctrl+End) no longer gets stuck without scrolling when it is
  pressed while the grid is still updating from a scroll.
- da4fbda: The body's delegated clicks, focus and keys find their cell or row through
  `@gridkitjs/dom`'s `bodyCellFrom`, `groupRowFrom` and `bodyRowFrom`. Nothing
  changes for a caller.
- da4fbda: A right-button (or any non-primary) press on a column's resize handle no
  longer starts a resize. Resizing otherwise works as before, now through
  `@gridkitjs/dom`'s `startColumnResizeGesture`.
- da4fbda: A right-button (or any non-primary) press no longer starts a column-header or
  group-by chip drag. Dragging otherwise works as before, now through
  `@gridkitjs/dom`'s `startDragReorder`.
- da4fbda: `resizeMode: "fit"` measures the grid through `@gridkitjs/dom`'s
  `observeElementWidth`. Columns fit exactly as before.
- da4fbda: Keyboard navigation runs on `@gridkitjs/dom`'s `createGridFocus`. The keys,
  the tab stop, `focusCell` and `getFocusedCell` behave as before.
- da4fbda: `infiniteScroll` runs on `@gridkitjs/dom`'s `attachInfiniteScroll`. It loads
  exactly as before.
- da4fbda: `virtualized` runs on `@gridkitjs/dom`'s `createRowVirtualizer`. Rows window,
  measure and scroll as before; scrolling that keeps the same rows mounted no
  longer re-renders the grid.
- bad8ea3: `DataGrid` now keeps its sort, filter, grouping, expansion, paging, column
  widths, order and visibility in `@gridkitjs/core`'s grid controller rather
  than in React state, and draws the controller's view. Nothing changes for a
  grid using the existing props. `DataGridApi` getters now read the grid's
  current state at call time, so a read straight after an action such as
  `goToPage` already sees its result instead of the previous render's.
- bad8ea3: `DataGrid` keeps row, column and cell selection in its grid controller too,
  which fires the selection callbacks from one diff per change exactly as
  before. Nothing changes for a grid using the existing props.
- 78e10e5: Resizing a column, or the grid's width changing, no longer re-runs filtering,
  sorting, grouping and aggregation: `DataGrid` now derives what it shows through
  `createGridViewResolver` from `@gridkitjs/core`, whose row stages ignore column
  widths. Large datasets resize without stutter; nothing else changes.
- 487d8fa: The build now starts with a `"use client"` directive, so `@gridkitjs/react`
  works when imported from a Next.js App Router server component tree without a
  wrapper module of your own.
- 487d8fa: Keyboard navigation in a `virtualized` grid now moves the browser's focus to
  the cell it lands on once the grid has scrolled. Before, the focus could stay
  on the previous cell, or jump to a different row, while the highlighted cell
  moved on.
- Updated dependencies [78e10e5]
- Updated dependencies [6af35c6]
- Updated dependencies [6af35c6]
- Updated dependencies [bad8ea3]
- Updated dependencies [bad8ea3]
- Updated dependencies [78e10e5]
- Updated dependencies [da4fbda]
- Updated dependencies [da4fbda]
- Updated dependencies [da4fbda]
- Updated dependencies [da4fbda]
- Updated dependencies [da4fbda]
- Updated dependencies [da4fbda]
- Updated dependencies [da4fbda]
- Updated dependencies [da4fbda]
- Updated dependencies [da4fbda]
- Updated dependencies [da4fbda]
- Updated dependencies [44759b4]
- Updated dependencies [bad8ea3]
- Updated dependencies [8d411eb]
- Updated dependencies [bad8ea3]
- Updated dependencies [78e10e5]
- Updated dependencies [44759b4]
- Updated dependencies [bad8ea3]
- Updated dependencies [8d411eb]
  - @gridkitjs/core@0.11.0
  - @gridkitjs/dom@0.1.0

## 0.9.0

### Minor Changes

- bedd76c: `infiniteScroll`: loads more rows as the user scrolls near the bottom of the grid's body, in place of `paginated`'s page-by-page navigation.

  ```tsx
  <DataGridComponent
    columns={columns}
    dataSource={rows}
    height={400}
    infiniteScroll={{ hasMore, isLoadingMore, onLoadMore }}
  />
  ```

  `hasMore` and `onLoadMore` are required; `isLoadingMore` suppresses further calls while a load is in flight; `rootMargin` (default `"200px"`) tunes how early it fires relative to the grid's own scrollable body; `loadingTemplate` replaces the built-in "Loading more…" row.

  Mutually exclusive with `paginated` — setting both logs a dev-time `console.error` and only `paginated` takes effect. Independent of `virtualized`, though pairing the two is the recommended combination for a dataset that grows without bound.

- bedd76c: `height`: bounds the row area to a fixed size, independently scrollable — the group-by bar, header, footer, and pager stay outside it and always visible.

  ```tsx
  <DataGridComponent columns={columns} dataSource={rows} height={400} />
  ```

  A number is pixels; a string is passed through as a CSS length (e.g. `"60vh"`). Omitted, the body's height stays content-driven, exactly as before this prop existed.

  Breaking: the header, body, and footer now render as three separate `<table>`s — `.gridkit-data-grid-header`, the body's own (wrapped in a new `.gridkit-data-grid-body` scroll container), and `.gridkit-data-grid-footer` — inside a new `.gridkit-data-grid-tables` wrapper `<div>` that now carries `role="grid"`/`"treegrid"` and the grid's other grid-level ARIA attributes. Previously all three sat inside one `<table>`, which itself carried that role. This only matters to a consumer whose own CSS or tests reach into the grid's raw table structure (unsupported usage, but possible) — every cell-level role, and everything reachable through `DataGridApi`, is unchanged. One exception: `DataGridApi.table` now points at the body's `<table>` specifically (the one holding `<tbody>`) rather than a single table that also held the header and footer.

- bedd76c: `virtualized`: renders only the rows near the current scroll position rather than every row at once, for a dataset too large to mount in full. Requires `height` to be set — a body with no bounded height has no viewport to window rows against, and a dev-time `console.error` fires if `virtualized` is on without it.

  ```tsx
  <DataGridComponent
    columns={columns}
    dataSource={rows}
    height={400}
    virtualized
  />
  ```

  Row height is measured per row rather than assumed uniform, so `.is-wrapped` cells and group header/summary rows (which differ in height from data rows) lay out correctly. Two new props tune it: `overscan` (rows rendered outside the visible range on each side, default `4`) and `estimatedRowHeight` (the assumed height for a row never yet measured, default `40`) — both meaningful only with `virtualized` on.

  `scrollToRow` and keyboard navigation (arrow keys, `Home`/`End`, `Ctrl+Home`/`Ctrl+End`) both work correctly when their target row isn't currently mounted: they scroll it into range first, using measured heights where known, then correct the exact position once it mounts and is measured.

  Fully orthogonal to `paginated` and `groupBy` — combinable with either, though virtualizing an already-small paginated page is low-value.

  `@gridkitjs/core` gains `visibleRange` (plus its `RowHeights`/`VisibleRange` types) — the pure range math `virtualized` is built on. Not something most consumers need directly; it's exported for the same reason `paginateRows` is.

### Patch Changes

- Updated dependencies [bedd76c]
  - @gridkitjs/core@0.10.0

## 0.8.0

### Minor Changes

- 6e8189b: Aggregates: compute a subtotal per group and a grand total over the whole filtered/grouped dataset.

  ```ts
  <DataGridComponent
    columns={columns}
    dataSource={rows}
    groupableColumns
    defaultGroupBy={[{ columnId: "Region" }]}
    aggregates={[{ columnId: "Amount", fn: "sum" }]}
  />;
  ```

  - `aggregates` is a plain controlled prop — `AggregateState<Row>`, an array of `{ columnId, fn, id?, alignment? }` specs. Unlike `sort`/`filter`/`groupBy`/`pagination`, there is no built-in UI to add or remove an aggregate interactively, so there's no `defaultAggregates`/`onAggregatesChange` pair.
  - `groupAggregateDisplay` chooses how a group's own subtotal renders: `"inline"` (the default) keeps it as text in the group header, next to its leaf-row count; `"row"` instead renders a dedicated row after that group's last visible entry, with each aggregate's value in the `<td>` for its own column, aligned the same way the grand-total footer's cells are.
  - A footer or `"row"`-mode summary cell aligns the same way its column's own data cells do, unless `AggregateSpec.alignment` overrides it for that specific aggregate — e.g. centering a `count` under an otherwise right-aligned currency column. When two specs share a column and disagree, the first one in `aggregates` wins for that shared cell.
  - A grand-total footer (a `<tfoot>`, outside `aria-rowcount`) renders below the body whenever `aggregates` is non-empty, regardless of `groupAggregateDisplay`.
  - `ColumnDefinition.footerTemplate` renders a column's own aggregate result in place of its plain formatted value, in the grand-total footer and — under `groupAggregateDisplay: "row"` — a group's own summary row.
  - A group's summary row is presentational: it occupies a real row slot (`aria-rowindex` counts it, same as a header or data row) but the arrow keys step over it rather than landing a tab stop there, and it never splits from its own group across a page boundary.
  - Aggregates are always computed over the full dataset, never scoped to the current page — composed ahead of pagination in the render pipeline, so a group's subtotal reads identically regardless of which page currently shows it.
  - `DataGridApi` gains `getAggregates()` for the grand total; a specific group's own results are read off `getDisplayRows()`, which now returns rows carrying a populated `aggregates` field.

  Depends on `@gridkitjs/core`'s new aggregate primitives (`computeAggregates`/`withGroupAggregates`) — see that package's own changelog entry, including the additive `aggregates` field it adds to `ResolvedGroupRow`.

- 6e8189b: `pager.template` — a render prop that replaces the built-in pager's markup entirely, called on every render where pagination-relevant state changed. Also exports the new `PagerTemplateContext` type. As a side effect, `pager={{ template: () => null }}` is now the documented way to suppress the built-in pager while keeping `paginated` row-windowing and the imperative API active — previously there was no way to do that short of turning `paginated` off entirely.
- 6e8189b: Opt-in numbered pager: `pager={{ variant: "numbered" }}` swaps the built-in pager's "Page X of Y" display for `[Prev][1][2][3]…[n][Next]` page buttons. `pager.boundaryCount` (default `1`) and `pager.siblingCount` (default `1`) control how many pages are always shown at each end and around the current page. Default stays `"compact"` — today's Prev/status/Next — so no existing consumer's rendered output changes.
- 6e8189b: `DataGridProps.pageSizeOptions` is now grouped under a `pager` config object,
  so future pager presentation options (a variant, a custom template) can land
  without another breaking rename:

  ```diff
   <DataGridComponent
     paginated
  -  pageSizeOptions={[10, 25, 50]}
  +  pager={{ sizeOptions: [10, 25, 50] }}
   />;
  ```

- 6e8189b: Pagination: split the grid's rows into pages, respecting group boundaries.

  ```ts
  <DataGridComponent
    columns={columns}
    dataSource={rows}
    paginated
    defaultPagination={{ pageIndex: 0, pageSize: 25 }}
    pager={{ sizeOptions: [10, 25, 50] }}
    onPaginationChange={({ pagination }) => persist(pagination)}
  />;
  ```

  - `paginated` turns pagination on; `defaultPagination`/`onPaginationChange` are the uncontrolled page/page-size pair and its change callback, mirroring `defaultColumnSort`/`onColumnSortChange`. Pagination always composes after filtering, sorting, and grouping — a page is a window onto the finished result. When grouping is also active, a page's unit is a top-level group, never a leaf row, so a group is never split across a page boundary.
  - Turning `paginated` on renders a minimal, semantically-classed pager below the grid (Previous/Next, a page display, and — with `pager.sizeOptions` — a page-size select). Style it via `@gridkitjs/theme-tailwind` or your own CSS.
  - `DataGridApi` gains `getPagination()`, `getPageCount()`, `goToPage()`, `nextPage()`, `previousPage()`, and `setPageSize()`.
  - Filtering, sorting, or changing the group-by stack resets to the first page, so a user is never silently stranded on a page a smaller result set no longer has.

  Depends on `@gridkitjs/core`'s new pagination primitives (`paginateRows` and friends) — see that package's own changelog entry, including the `datasetIndex` field this adds to `ResolvedRow`/`ResolvedGroupRow`/`CellTemplateContext`.

  Breaking: `aria-rowindex` on a rendered row is now built from that row's absolute dataset position rather than its rendered position — the two only diverge once `paginated` is on, but the change applies unconditionally. `GridGroupRow`'s exported prop shape (if consumed directly, which is not the supported path) drops `rowIndex` in favor of `datasetIndex`.

- 6e8189b: `DataGridApi` gains `subscribe(listener)`, a read/notify channel for reacting to grid state without polling the imperative getters — not a second, imperative-only way to drive that state. It's the primitive the new `use*State` hooks (added in following changes) are built on with `useSyncExternalStore`; most consumers should reach for one of those instead of calling `subscribe` directly.
- 6e8189b: New `useAggregateState(gridRef)` hook: the grand-total aggregate results, read reactively off a mounted `DataGridComponent`'s `ref`, for a summary footer or bar living outside the grid's own DOM. Read-only, and updates even on changes with no dedicated `on*Change` prop of their own — a filter/sort/regroup altering the grand total.
- 6e8189b: New `useColumnSizingState(gridRef)` and `useColumnOrderState(gridRef)` hooks: column widths and column order, read reactively off a mounted `DataGridComponent`'s `ref`. Read-only — sizing and order stay uncontrolled via `defaultColumnSizing`/`defaultColumnOrder` and the grid's own resize/reorder handles.
- 6e8189b: New `useColumnSortState(gridRef)` hook: the grid's active sort, read reactively off a mounted `DataGridComponent`'s `ref`, for a sort indicator living outside the grid's own DOM. Read-only — `DataGridApi` has no sort-mutating action.
- 6e8189b: New `useGroupByState(gridRef)` hook: reactive group-by and group-expansion state read off a mounted `DataGridComponent`'s `ref`, with `expandAllGroups`/`collapseAllGroups` actions, for a custom group-by UI living outside the grid's own DOM.
- 6e8189b: New `usePaginationState(gridRef)` hook: reactive pagination state and actions (`goToPage`, `nextPage`, `previousPage`, `setPageSize`) read off a mounted `DataGridComponent`'s `ref`, for building a pager entirely outside the grid's own DOM. Updates on every pagination change, including the silent page-0 reset a filter/sort/regroup triggers.
- 6e8189b: New `useSelectionState(gridRef)` hook: row, column, and cell selection read together as one reactive concern off a mounted `DataGridComponent`'s `ref`, with `clearSelection`/`selectAllRows` actions, for a "N rows selected" toolbar living outside the grid's own DOM.

### Patch Changes

- Updated dependencies [6e8189b]
- Updated dependencies [6e8189b]
- Updated dependencies [6e8189b]
  - @gridkitjs/core@0.9.0

## 0.7.0

### Minor Changes

- 388def3: Drag a column header into the group-by bar to add it to the grouping, and
  drag chips within the bar to reorder the stack.

  ```ts
  <DataGridComponent
    columns={columns}
    dataSource={rows}
    groupableColumns
    groupByDraggableColumns
    groupByBarVisibility="always"
  />;
  ```

  - `groupByDraggableColumns` (grid-level) / `ColumnDefinition.groupByDraggable`
    (per-column) let a header be dragged straight into the group-by bar,
    independent of `groupableColumns` — a column can be groupable via its
    header's click/keyboard toggle, via this drag, both, or neither. Dropped at
    a specific point among the bar's existing chips, it's inserted there, not
    appended. A column already in the group-by stack rejects its own header
    dragged back toward the bar — a `not-allowed` cursor and a muted outline in
    place of the usual accent one — since repositioning an existing level is
    the chip's job, not the header's.
  - Chips in the group-by bar are now draggable to reorder the stack, and each
    chip is its own focusable stop — focus one and press `Ctrl+ArrowLeft`/
    `Ctrl+ArrowRight` to move it, mirroring a column header's own reorder
    shortcut.
  - `groupToggleIconColumns` (grid-level) / `ColumnDefinition.groupToggleIcon`
    (per-column) hide a groupable header's group-toggle icon without touching
    its capability — `Alt+ArrowDown` keeps working with the icon hidden.
  - `groupByBarVisibility` (`"always" | "auto" | "never"`, default `"auto"`)
    controls when the group-by bar renders, decoupled from `groupableColumns`.
    `"auto"` shows it once `groupBy` is non-empty, or while a header drag
    eligible to drop into it is in progress, so there's a drop target even
    from a fully empty grouping.

  **Breaking**: the group-by bar's visibility no longer follows
  `groupableColumns` — it's governed by the new `groupByBarVisibility` alone.
  A grid grouping purely programmatically (`defaultGroupBy` with
  `groupableColumns` off) previously showed no bar; under the new `"auto"`
  default it now does once `groupBy` is non-empty. Pass
  `groupByBarVisibility="never"` to keep the previous behavior.

  Internally, `useColumnDrag`'s pointer-drag mechanics are extracted into a
  new, reusable `useDragReorder` hook shared with the group-by bar's own chip
  dragging — no change to any existing public API.

- 388def3: Row grouping: stack one or more columns into nested, collapsible groups.

  ```ts
  <DataGridComponent
    columns={columns}
    dataSource={rows}
    groupableColumns
    defaultGroupBy={[{ columnId: "Region" }, { columnId: "Status" }]}
    onGroupByChange={({ groupBy }) => persist(groupBy)}
  />;
  ```

  - `groupableColumns` (grid-level) / `ColumnDefinition.groupable` (per-column)
    turn on each header's group toggle — click its icon, or focus the header
    and press `Alt+ArrowDown`, to add or remove that column from the group-by
    stack. A group-by bar above the grid lists the active stack as removable
    chips.
  - `defaultGroupBy`/`onGroupByChange` and `defaultGroupExpansion`/
    `onGroupExpansionChange` for the uncontrolled group-by stack and its
    collapsed/expanded state. Click a group header, or focus it and press
    `Space`/`Enter`, to toggle it.
  - `DataGridApi` gains `getGroupBy()`, `getGroupExpansion()`, `getDisplayRows()`
    (`getRows()`'s data regrouped, with group headers interleaved), and
    `expandAllGroups()`/`collapseAllGroups()`. `getRows()` itself is unchanged —
    it still returns the flat, ungrouped rows, exactly as before.
  - The grid's `role` switches from `"grid"` to the WAI-ARIA `"treegrid"`
    pattern whenever `groupBy` is non-empty, with `aria-expanded`/`aria-level`/
    `aria-posinset`/`aria-setsize` on each group header row. An ungrouped grid
    is unaffected — `role="grid"` stays exactly as it was.

  Depends on `@gridkitjs/core`'s new grouping primitives (`groupRows` and
  friends) — see that package's own changelog entry.

### Patch Changes

- Updated dependencies [388def3]
- Updated dependencies [388def3]
  - @gridkitjs/core@0.8.0

## 0.6.0

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

- ac7695f: `Borders` and `HoverableConfig` — the types behind `DataGridComponent`'s
  `borders` and `hoverable` props — are now exported from `@gridkitjs/react`.
- ac7695f: `DataGridComponent` accepts a `ref` prop typed `Ref<DataGridApi<Row>>`. The
  handle exposes the grid's live column sizing/order/sort, row/column/cell
  selection, resolved rows/columns, and the focused cell, plus `focusCell`,
  `clearSelection`, `selectAllRows`, `scrollToRow`, and `scrollToColumn`.

### Patch Changes

- ac7695f: Internal refactor of `DataGrid`'s implementation: pointer-drag lifecycles
  (column resize, column reorder), "compute next state, bail if unchanged,
  persist, notify" selection/sort commits, conditional class-name and ARIA
  attribute construction, keyboard select-intent handling, and a couple of
  `useMemo`-derived lookup structures now go through shared internal helpers
  instead of five-plus near-duplicate copies. No public API or rendered
  behavior changes for a correct caller.

  One deliberate exception: `useColumnResize`'s `commit` was already missing
  the bail-if-unchanged guard the other commit-style call sites have, so its
  `"move"`-phase `onColumnResize` calls during a drag pinned against a
  min/max clamp were left as-is (still firing on every pointer move) rather
  than silently gaining a new guard — kept out of the shared
  `commitIfChanged` helper on purpose, with a comment at the call site.

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

- Updated dependencies [ac7695f]
- Updated dependencies [ac7695f]
  - @gridkitjs/core@0.7.0

## 0.5.0

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

### Patch Changes

- 26adc6f: Fixed a bug where cancelling a column drag with `Escape` could discard another
  column's width if that column was resized via keyboard while the drag was
  still in progress. The cancelled column now reverts on its own, leaving
  concurrent changes to other columns intact.
- 26adc6f: Fixed a spurious `onColumnResize` "end" event firing when a resize handle's
  pointer is released with no intervening move — including each of the two
  clicks that make up a double-click.
- 26adc6f: Fixed `sizeToContent` (double-click a resize handle) measuring the header's
  own label as if it were a data cell when the grid has no rows, instead of
  correctly doing nothing.
- Updated dependencies [26adc6f]
- Updated dependencies [26adc6f]
  - @gridkitjs/core@0.6.0

## 0.4.0

### Minor Changes

- f30a2a9: The grid is now an ARIA grid a keyboard can navigate. It carries `role="grid"`
  with row and column counts and indices, headers carry `scope="col"`, and one
  roving tab stop moves cell to cell under the arrow keys, Home, End, Ctrl+Home,
  Ctrl+End and the page keys.

  Two changes to what a keyboard already did:

  - **Tab now passes the whole grid**, entering it once instead of stopping on
    every resize handle. The handles have left the tab order — a widget under
    `role="grid"` has one tab stop, and a grid of twenty columns previously had
    twenty.
  - **Keyboard resize moved to `Alt+ArrowLeft` / `Alt+ArrowRight`** on the focused
    header, from the bare arrows on its handle, which the grid now needs for
    navigation. `Ctrl+ArrowLeft` / `Ctrl+ArrowRight` still reorder.

  `label` and `labelledBy` give the grid its accessible name, without which a
  screen reader announces only "grid":

  ```tsx
  <DataGridComponent label="Application costs" ... />
  ```

  Reorders and resizes are announced through a live region, so a change with only
  a visual cue is no longer silent.

- f92198e: `DataGridComponent` takes `getRowId`, giving each row a stable identity for
  state keyed by it. Rows are keyed by it rather than by their array position, and
  `cellTemplate` receives it as `rowId` alongside a `selected` flag.

  ```tsx
  <DataGridComponent dataSource={rows} getRowId={(row) => row.Id} />
  ```

  Without it a row is identified by its position, which is enough for a static
  grid — so nothing has to change — but ties row state to where a row sits rather
  than to the row itself.

- 4a92413: Rows, columns and cells can be selected. `selectable` says which and how many
  of each — off by default, since selection claims the click:

  ```tsx
  <DataGridComponent
    dataSource={rows}
    getRowId={(row) => row.Id}
    selectable={{ rows: "multiple", columns: "multiple", cells: "single" }}
    onRowSelect={({ row }) => console.log(row.row.Name)}
    onRowSelectionChange={({ added, removed, selected }) => persist(selected)}
  />
  ```

  A cell takes `false | "single"` rather than a mode of its own — it addresses one
  value, so there is no range to take.

  Click replaces, Ctrl-click toggles and Shift-click takes a range; from the
  keyboard, Space toggles the focused row or column, Enter replaces, `Ctrl+A`
  takes every row and Escape lets them all go. Rows and cells report
  `aria-selected`, and the grid `aria-multiselectable`.

  Thirteen callbacks report it — `onRowSelect`, `onRowsSelect`, `onRowDeselect`,
  `onRowsDeselect` and `onRowSelectionChange`, the same five for columns, and
  `onCellSelect` / `onCellDeselect` / `onCellSelectionChange`. Each carries the
  resolved row, column or cell value rather than a bare id, and all of them are
  fanned out from one diff, so no two can disagree about what an interaction did.
  `defaultRowSelection`, `defaultColumnSelection` and `defaultCellSelection` set
  the starting state.

  Give `getRowId` alongside `selectable` for data that sorts, filters or pages:
  without it a row is identified by its position, so a re-sort leaves the same
  positions selected under different rows.

### Patch Changes

- Updated dependencies [f92198e]
  - @gridkitjs/core@0.5.0

## 0.3.1

### Patch Changes

- Updated dependencies [375c736]
  - @gridkitjs/core@0.4.0

## 0.3.0

### Minor Changes

- 1e112a6: `ColumnDefinition`'s new `wrap`, `headerClassName`, and `cellClassName`
  fields now render: `wrap.header`/`wrap.cells` add an `is-wrapped` class to
  that column's `th`/`td` (rendered by `@gridkitjs/theme-tailwind` as
  `white-space: normal`), and `headerClassName`/`cellClassName` are appended
  to the same elements as-is.

### Patch Changes

- Updated dependencies [1e112a6]
  - @gridkitjs/core@0.3.0

## 0.2.0

### Minor Changes

- 7f0645b: `DataGrid` can reorder its columns by drag and drop. Set `reorderableColumns`
  to let the user drag a header to a new position; a column may opt out with
  `reorderable: false` on its definition. Dragging a header anywhere on the cell
  starts the move, a copy of the header follows the pointer, and the side of the
  header the pointer is nearer to decides whether the column lands before or
  after it.

  Order is uncontrolled and mirrors sizing: `defaultColumnOrder` sets the order
  to start in, and `onColumnOrderChange` reports each drop that changes it. A
  focused header also moves with `Ctrl+ArrowLeft` / `Ctrl+ArrowRight`.

  Turning `reorderableColumns` off stops further dragging but leaves an order the
  user already made in place.

### Patch Changes

- Updated dependencies [7f0645b]
  - @gridkitjs/core@0.2.0

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

### Patch Changes

- Updated dependencies [e0f5b59]
- Updated dependencies [401a2cc]
- Updated dependencies [a3db97e]
- Updated dependencies [45e492c]
  - @gridkitjs/core@0.1.0
