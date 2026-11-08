# @gridkitjs/core

## 0.15.0

### Minor Changes

- 8ac72f8: A new `paginationUnit` grid option sets what `pageSize` counts once the rows
  are grouped. `"group"`, the default, keeps today's pages of whole top-level
  groups. `"row"` counts data rows and collapsed group headers instead, so a
  page of 25 holds 25 rows however large the groups are, and a page that
  continues a group starts with that group's headers again. `paginateRows`
  takes it as a third argument, `{ unit: "row" }`, and `resolveGridView` as
  `options.paginationUnit`. Changing it sends an uncontrolled pagination back to
  the first page, as a sort, filter or grouping change does.
- 2de78a3: `GridToolbarOptions` takes `itemAttributes`, a map from an entry's key (a
  command's, inline item's, dropdown's or custom entry's id, `"search"` or
  `"export"`) to a `ToolbarItemAttributes`: an `id` and `data-*` attributes for
  that entry's element. `resolveToolbar` takes the map as
  `options.itemAttributes` and hands the matching attributes on as `attributes`
  on each `ResolvedToolbarButton`, `ResolvedToolbarMenu`, `ResolvedToolbarSearch`
  and `ResolvedToolbarCustom`. `ToolbarItemAttributes` is exported.

### Patch Changes

- 9d549d2: An uncontrolled pagination now stores the page it shows. When rows shrink
  under a later page, say by collapsing a group on page 5 or a `dataSource`
  getting shorter, the grid showed the last page that exists (page 3) but kept
  `pageIndex: 5`, so expanding the group again jumped back to page 5. It now
  stores page 3 and stays there. Like the page reset a sort or filter makes,
  this fires no `onPaginationChange`. `setPagination` and `restoreState` with a
  page past the last store and report the last page. A controlled `pagination`
  is unchanged: the grid shows the last page that exists and leaves the value
  to you.
- 479e045: A column with no `type` sorts numbers numerically and `Date`s chronologically,
  so descending gives 1000, 999 … 2, 1 rather than 997, 993 … 97. Grouping, a
  filter checklist and `min`/`max` aggregates order such a column the same way.
  Any other pair, numeric strings included, still compares as text: set
  `type: "number"` on a column of numeric strings.

## 0.14.1

### Patch Changes

- 2980dcf: Secondary text now meets WCAG AA contrast (4.5:1) on group rows. The light `--gridkit-fg-muted-light` default is darker, `oklch(0.5 0.015 250)` where it was `oklch(0.55 0.015 250)`, so a group row's `(n)` count and inline subtotals, which sat at about 4.4:1 on `--gridkit-surface-muted` and 4.1:1 on hover, now read at 5.5:1 and 5:1. Every other use of `--gridkit-fg-muted` in light mode is slightly darker too. The dark palette already met AA and is unchanged. A grid that overrides `--gridkit-fg-muted` or its `-light` value keeps its own colour.

  `datasetIndex` is each row's position in the whole result as shown, as documented. A data row's `datasetIndex` used to stay at its index in `dataSource` through filtering, sorting and grouping, so in a grouped grid a group's first data row could share an `aria-rowindex` with the group row above it, and in a sorted or filtered grid `aria-rowindex` skipped about or ran past `aria-rowcount`. `filterRows`, `sortRows`, `groupRows` and `withGroupAggregates` now renumber `datasetIndex` alongside `rowIndex`, so every row, group row and summary row has its own `aria-rowindex`, in order, on every page and under virtualization. A `cellTemplate` that reads `datasetIndex` as a running row number now counts 1, 2, 3 down the grid however it is sorted; to reach a row's index in `dataSource`, look the row up by its id instead.

  `DataGrid`'s grand-total footer row, drawn while `aggregates` is set, has an `aria-rowindex` of its own, after the last body row, and is counted in the grid's `aria-rowcount`, which is one higher than before for a grid with aggregates. It had neither, so a screen reader could not place it among the rows.

  The built-in pager keeps keyboard focus at either end. Pressing Next until the last page used to disable the focused button and drop focus to the page; now First, Previous, Next and Last are disabled with `aria-disabled="true"` instead of the `disabled` attribute, so the button stays focused and announced as unavailable, and pressing it again does nothing. The theme styles `.grid-pager-button[aria-disabled="true"]`, fading the chevron but not the focus ring. **Breaking:** CSS or tests of your own that look for the buttons' `disabled` attribute no longer match; CSS that targets `.grid-pager-button:disabled` should target `.grid-pager-button[aria-disabled="true"]`:

  ```css
  /* Before */
  .grid-pager-button:disabled {
    opacity: 0.3;
  }
  /* After */
  .grid-pager-button[aria-disabled="true"] {
    opacity: 0.3;
  }
  ```

## 0.14.0

### Minor Changes

- 2ac1c45: Count messages such as `filterResults`, `filterSearchFirst`, `copied` and `selectedCount` now format numbers with the grid's `locale` — "1,204 of 10,000 rows" under `en`, "1.204 of 10.000 rows" under `de-DE` — and in the runtime's locale when none is given, where they printed bare digits ("1204 of 10000 rows"). Overrides keep their signatures and still receive plain numbers.

  `resolveMessages` takes the locale as an optional second argument, `resolveMessages(messages, locale)`, and the new `createDefaultMessages(locale)` returns the English defaults for a locale; `defaultMessages` is the one for the runtime's locale.

- 6a4c6c2: `GridMessages` has two new keys, `firstPage` ("First") and `lastPage` ("Last"), naming the pager's buttons to the first and last page. A partial `messages` override keeps working unchanged; a complete `GridMessages` object written out in full needs the two keys added.
- 6a4c6c2: `paginationWindow` now returns the same number of entries for every page once `pageCount` exceeds `2 * boundaryCount + 2 * siblingCount + 3` (7 with the defaults), so a numbered pager no longer grows and shrinks as the user pages through. Near either end the run of sibling pages slides inwards instead of being cut short: page 1 of 10 gives `[1, 2, 3, 4, 5, "ellipsis", 10]` where it gave `[1, 2, "ellipsis", 10]`, and page 10 of 10 gives `[1, "ellipsis", 6, 7, 8, 9, 10]` where it gave `[1, "ellipsis", 9, 10]`. Middle pages and page counts small enough to show every page are unchanged.

## 0.13.0

### Minor Changes

- 7fc1b14: Columns take two new props for exporting. `exportable: false` keeps a column
  — one of action buttons, say — out of every export, clipboard copy and print.
  `exportValue(value, row)` returns the typed value an export stores for a cell
  (a new `ExportScalar`: `string | number | boolean | Date | null`) where the raw
  value is not the one to keep; the text every format writes still comes from
  `formatCellValue`.
- 7fc1b14: `buildExportTable(source, options?)` turns the grid's view into an
  `ExportTable` — columns, every row as cells carrying both the formatted text
  and a typed value, group header and summary rows, and the grand total — the
  one model every export format, the clipboard and print are written from. It
  reads the view and state, never the page, so rows on another page or inside a
  collapsed group still export. By default it holds every filtered and sorted
  row, every group expanded, and the visible columns less any with
  `exportable: false`; `ExportOptions` narrows it with `scope`, `columns`,
  `includeGroups`, `includeAggregates` and `includeHeader`. A command passes its
  `GridCommandContext` as the source as it is.
- ebac1dd: `copyContent(source, request)` builds what the clipboard carries from the
  export model: tab-separated text (no byte order mark, no formula guard) and an
  HTML table. `request` is a cell (`{ kind: "cell", rowId, columnId }`), a row
  (`{ kind: "row", rowId }`) or the selection (`{ kind: "selection" }` — the
  selected rows, else the selected columns, else the selected cell). Hidden and
  `exportable: false` columns never copy, and a row the filter hides gives
  `null`. Three new built-in commands use it: `copy.cell`, `copy.row` and
  `copy.selection`, labelled by the new `messages` keys `copyCell`, `copyRow`
  and `copySelection`, with the `copy` icon key. The default cell context menu
  now starts with the three, then a separator. Two more keys, `copied(count,
unit)` and `copyFailed`, are for a renderer's announcement.
- 7fc1b14: `toCsv(table, options?)` and `toTsv(table, options?)` write an `ExportTable`
  as text. CSV is quoted per RFC 4180 and by default starts with a UTF-8 byte
  order mark, ends records with CRLF, writes each cell as the grid shows it, and
  prefixes a field a spreadsheet would run as a formula (`=`, `+`, `-`, `@`, a
  leading tab or carriage return) with `'` — a numeric cell keeps its sign.
  `delimiter: "auto"` with a `locale` writes `;` where a decimal is written with
  a comma, and `values: "raw"` writes typed values plainly instead. TSV, the
  clipboard's plain-text form, is tab-separated with LF line ends, no byte order
  mark and no formula guard. Both return a string; making a `Blob` is the
  renderer's job.
- 812d0b6: Exporting is a set of built-in commands. `export.csv` and `export.json` save
  the grid's view through `host.saveFile`, under the grid's `export` defaults;
  `export.xlsx` and `export.pdf` do the same and show only once a writer for
  their format is registered through `exportWriters`. `exportSelection.csv`,
  `exportSelection.json` and `exportSelection.xlsx` save the selected rows, and
  show only while rows are selected. Each shows on the grid, toolbar, body and
  cell targets, and is disabled while there is nothing to export. Their labels
  are new `messages` keys: `exportCsv`, `exportJson`, `exportXlsx`, `exportPdf`,
  `exportSelectionCsv`, `exportSelectionJson` and `exportSelectionXlsx`.

  A toolbar takes a new entry, `"export"`: a dropdown, labelled
  `messages.exportMenu` ("Export"), of the export commands that show — left out
  when none do. It is not among the default toolbar's entries; list it to add
  it:

  ```ts
  toolbar={{ items: ["search", "spacer", "export"] }}
  ```

- 812d0b6: A new `messages` key, `exportFailed` ("Export failed"), is what a renderer
  announces when an export's writer fails and no file is saved.
- 812d0b6: Export formats are pluggable. An `ExportWriter` — `{ format, fileExtension,
mimeType, write(table, context) }`, `write` returning text, bytes or a promise
  of either — turns an `ExportTable` into a file's contents; `csvWriter` and
  `jsonWriter` ship built in. `exportFile(source, format, options, writers)`
  builds the table, runs the format's writer and names the file, returning an
  `ExportFile` (`{ fileName, mimeType, content }`), a promise of one for an
  asynchronous writer, or `null` for a format with no writer.

  Two new grid options go with it: `export`, a `GridExportOptions` holding the
  grid's export defaults (every `ExportOptions` field, `fileName` — `"export"`
  by default, the extension added — and `csv` / `json` settings), and
  `exportWriters`, which registers further formats by `format` and replaces a
  built-in writer of the same one. `resolveExportWriters(exportWriters)` gives
  every writer a grid has, by format.

- 7fc1b14: `formatGroupValue(value, column, locale, messages)` is exported from
  `@gridkitjs/core`: the text a group's own value reads as, as the grouped
  column's cells read it, with a missing value reading
  `messages.blankGroupValue`. The React grid's group headers now use it, so a
  header and an export name a group the same way; nothing changes on screen.
- 0119cd3: **Breaking for a hand-built command host.** `GridCommandHost` has a new
  required member, `print(document, options)`, which puts a `PrintDocument` on
  paper — the `print` command hands it the document it built and the
  `PrintOptions` it built it under. A host you build yourself, for a renderer of
  your own or a test, has to add it; one that cannot print passes a member that
  does nothing:

  ```ts
  // before
  const host = {
    autoFitColumns() {},
    openPanel() {},
    announce() {},
    saveFile() {},
    writeClipboard() {},
  };

  // after
  const host = {
    autoFitColumns() {},
    openPanel() {},
    announce() {},
    saveFile() {},
    writeClipboard() {},
    print() {},
  };
  ```

- 812d0b6: **Breaking for a hand-built command host.** `GridCommandHost` has a new
  required member, `saveFile(file)`, which saves an `ExportFile` (or a promise of
  one) — the export commands hand it the file they write. A host you build
  yourself, for a renderer of your own or a test, has to add it; one with no
  file to save to passes a member that does nothing:

  ```ts
  // before
  const host = { autoFitColumns() {}, openPanel() {}, announce() {} };

  // after
  const host = {
    autoFitColumns() {},
    openPanel() {},
    announce() {},
    saveFile() {},
  };
  ```

- ebac1dd: **Breaking for a hand-built command host.** `GridCommandHost` has a new
  required member, `writeClipboard(content)`, which puts a `CopyContent` on the
  clipboard and announces it — the copy commands hand it what they copy. A host
  you build yourself, for a renderer of your own or a test, has to add it; one
  with no clipboard passes a member that does nothing:

  ```ts
  // before
  const host = {
    autoFitColumns() {},
    openPanel() {},
    announce() {},
    saveFile() {},
  };

  // after
  const host = {
    autoFitColumns() {},
    openPanel() {},
    announce() {},
    saveFile() {},
    writeClipboard() {},
  };
  ```

- 7fc1b14: `toHtmlTable(table, options?)` writes an `ExportTable` as an HTML `<table>`
  string — column names in `<thead>`, rows in `<tbody>`, the grand total in
  `<tfoot>`, every text escaped. It carries the class names
  `gridkit-export-table`, `export-group` (with `data-level`) and
  `export-group-summary`, and each column's alignment inline so it survives a
  paste into a spreadsheet or document. `caption` adds a `<caption>`.
- 7fc1b14: `toJson(table, options?)` writes an `ExportTable`'s data rows as a JSON array
  of objects, one property per column holding the cell's typed value — dates as
  ISO 8601 strings. Group, summary and total rows are left out. Properties are
  named by column id, or by header text under `keys: "header"`, where a
  repeated header is suffixed ` (2)`; `space` indents the output.
- 0119cd3: A built-in `print` command prints the grid's view — every row an export would
  hold, across pages and collapsed groups — under a new `print` grid option, a
  `PrintOptions`. It shows on the grid, the toolbar, the body and a cell, is
  labelled by the new `print` message ("Print") with the new `print` icon key,
  and hands the host the document `exportPrintDocument(source, options)` builds:
  `buildPrintDocument` over the grid's own view, its timestamp in the grid's
  locale and, given no `title`, titled with the grid's `label`. `print` is no
  longer a reserved command id.
- 0119cd3: `buildPrintDocument(table, options?)` lays an `ExportTable` out as a printable
  document: a heading of the `title`, `subtitle` and `timestamp` set in a new
  `PrintOptions`, the table as `toHtmlTable` writes it, and a `footer` line,
  every piece of text escaped. It returns a `PrintDocument` — the document's
  `title`, its `bodyHtml`, and the `page` it is laid out on with every default
  settled: `paperSize` (`"A4"`), `orientation` (landscape for a table of more
  than six columns, else portrait), `pageNumbers` (on) and `fitToWidth` (off).
  It holds no styles; a renderer prints it.
- 610d28a: `GridMessages` gains the filter checklist's strings: `filterSearchLabel`
  ("Search values"), the accessible name of its search box; `filterSelectAll`
  ("Select all"), the checkbox over every value the search shows;
  `filterValuesLabel` ("Values"), the accessible name of its list; and
  `filterByCondition` ("Filtered by condition"), shown above it while the
  column is filtered by conditions.
- a5ace0c: `filterChecklist(draft, { valueLimit, blanksLabel })` returns the list a
  checklist filter editor draws: `items` — the values its search shows, in sort
  order, cut to `valueLimit`, then a blanks item while nothing is searched —
  each with its `key`, `label`, `count` and `checked`. A column with more values
  than `valueLimit` lists nothing until something is searched (`needsSearch`),
  and a search matching more lists the first of them, with the rest counted in
  `hiddenCount`.

  `GridMessages` gains `filterBlanks` ("(Blanks)"), `filterSearchFirst(total)`
  ("Type to search 12000 values") and `filterMoreValues(count)` ("250 more,
  refine the search").

- a5ace0c: `isColumnFiltered(filter, columnId)` says whether any entry is about the
  column — whether `describeColumnFilter` reads it as anything but `"none"` —
  for a header to show its column as filtered. A global search marks no column.
- a5ace0c: A condition model for a simple filter editor's rows, which hold text until
  the editor is applied. `filterOperandArity(operator)` says how many inputs a
  row shows. `parseFilterOperand(text, type)` reads a typed operand as the
  column filters it — a number with a point for decimals, rejecting `"12abc"`
  and `"1,5"`; a date as a date input (`yyyy-mm-dd`, local midnight) or a
  date-time input (`yyyy-mm-ddThh:mm`) gives it — and `formatFilterOperand(value,
type)` writes one back for its input.

  `conditionRowsFrom(shape, operators, type)` opens a column's two rows over its
  `describeColumnFilter` shape, as `ConditionRowDraft`s — `{ operator, text,
textTo }`. `conditionsFromRows(rows, columnId, type)` reads them back as
  `{ conditions, invalid }`: the conditions for `filterEditorReducer`'s
  `setConditions`, and the indexes of rows whose operand is missing or doesn't
  read. An empty second row is dropped rather than invalid.

- 1026158: `GridMessages` gains the simple filter editor's strings:
  `filterConditionLabel(position)` ("Condition 2"), `filterOperatorFieldLabel`
  ("Operator"), `filterValueLabel` ("Value"), `filterFromLabel` ("From") and
  `filterToLabel` ("To") for a `between` condition's two ends,
  `filterCombinatorLabel` ("Combine conditions"), `filterAnd` ("And"),
  `filterOr` ("Or"), and `filterValueInvalid(family)` — "Enter a number" on a
  number column, "Enter a date", "Enter a value" or "Choose a value" on the
  others.
- 1026158: Two built-in commands for a column's filter menu, both shown on the header of
  a column `resolveColumnFilterMenu` gives a menu: `filter.open` asks the host
  to open it — `host.openPanel("filter", target)` — and `filter.clear`, enabled
  while `isColumnFiltered`, takes every entry about the column out of the
  filter. `defaultContextMenu.header` lists both after the sort commands.

  `GridPanelKind` gains `"filter"`, and `GridCommandSource` gains
  `"filterMenu"`, for the sort and clear commands a filter menu runs. A switch
  over either that covers every member needs the new case.

  `buildKeyShortcuts` takes `filterable`, naming `Alt+Shift+ArrowDown` — the key
  that opens a header's filter menu.

  `GridMessages` gains `openFilter` ("Filter…"), `clearColumnFilter` ("Clear
  filter"), `filterMenuLabel(columnName)` ("Name filter"), `columnFiltered`
  ("Filtered"), `applyFilter` ("OK"), `cancelFilter` ("Cancel"), `customFilter`
  ("Custom filter") and `filterResults(shown, total)` ("3 of 10 rows").

- a5ace0c: Filter menu options, for a renderer to draw a filter menu in each column's
  header. `GridOptions` gains `filterableColumns` (off by default, like
  `sortableColumns`) and `filterMenu` — `{ ui?: "simple" | "excel";
showCounts?: boolean; valueLimit?: number }`. `ColumnDefinition` gains
  `filterable` and `filterMenu` — `{ ui?, operators? }` — which override the
  grid's, as `sortable` does.

  `resolveColumnFilterMenu(options, column)` settles them for one column: `null`
  when it has no filter menu, else a `ResolvedColumnFilterMenu` — its `ui`
  (`"simple"` by default), the `operators` its conditions offer (the column's
  own without `in`, else its type's `defaultFilterOperators`), its operator
  `family`, `showCounts` (off by default) and `valueLimit`
  (`DEFAULT_FILTER_VALUE_LIMIT`, 10,000, by default).

- 098fd6e: New `excelFilter` preset: `{ filterableColumns: true, filterMenu: { ui: "excel",
showCounts: true } }`, a plain `GridOptions` value that turns on the
  Excel-style filter popup in one spread. Options given after it override it;
  `filterMenu` is replaced whole, not merged.
- 610d28a: `GridMessages` gains the excel filter editor's operator submenu strings:
  `filterOperatorMenu(family)` ("Text filters", "Number filters", "Date
  filters" or "Boolean filters", by the column's `filterOperatorFamily`), the
  button opening the conditions a column offers and that menu's accessible
  name; and `filterBackToValues` ("Back to values"), the button going from a
  condition back to the checklist.
- a5ace0c: Operators by column type, for a filter menu's conditions.
  `filterOperatorFamily(type)` reads a column's `type` as the
  `FilterOperatorFamily` it filters as — `"text"`, `"number"`, `"date"` or
  `"boolean"` — and `defaultFilterOperators(type)` lists the operators a menu
  offers on it: contains, equality, the ends and blanks on text; the orderings
  and `between` on numbers; before, after and `between` on dates, with equality
  left out on date-time and time columns, whose instants a typed value seldom
  equals. `in` is never among them: the checklist is its editor.

  `GridMessages` gains `filterOperatorLabel(operator, family)` — "Before" for
  `lt` on a date, "Less than" on a number, "Is blank" for `isEmpty`.

- a5ace0c: `createColumnValueOptionsCache()` remembers each column's checklist values, so
  reopening a column's filter doesn't count its rows again. Its
  `get(rows, dataColumns, filter, columnId, { locale?, messages? })` returns the
  column's whole `columnValueOptions` list, and the same object again while the
  rows, the columns, the locale, the messages and the filter's entries about
  other columns keep their identity. A column's own entries don't count, so
  applying its filter leaves its list cached.

### Patch Changes

- bd78d43: The package manifests and READMEs now point at the repository's current home, `github.com/gridkitjs/gridkitjs`.

## 0.12.1

### Patch Changes

- 0cf56d4: The `onColumnResize` doc comment no longer claims auto-fit skips it: fitting a column to its content calls it once, with `phase: "end"`.
- 0cf56d4: The `onFilterChange` doc comment names every way the filter changes — the toolbar's search box, `filter.clearAll`, `setFilter` and a restored state — in place of a note that the grid had no filter UI.

## 0.12.0

### Minor Changes

- 183babc: The sorting, grouping, hiding and autofit built-in commands carry an `icon`
  key — `sortAscending`, `sortDescending`, `group`, `hide` and `autoFit`, typed
  as the new `BuiltInCommandIcon` — for a renderer to draw beside their labels.
  An app command may use the same keys.
- 183babc: The controller has `clearColumnSort(columnId)`, which takes one column out of
  the sort and keeps the rest. Its `onColumnSortChange` names that column, where
  a `setColumnSort` leaving it out names the first key that changed — the next
  column, when it was the first key. The built-in `sort.clear` command uses it,
  so clearing the first key of a multi-column sort reports the column cleared.
- 22cf630: A column chooser model and the built-in `column.choose` command, which asks
  the renderer to open the column chooser panel —
  `host.openPanel("columnChooser", target)` — on the grid, a toolbar or a
  header target. `resolveColumnChooser({ columns, visibility, search })` lists
  every data column for a search, hidden ones included, with whether each is
  shown and whether its checkbox is disabled (not `hideable`, or the last
  column shown), the tri-state of a "Show all" checkbox over the hideable
  columns the search lists, and which columns toggling it shows or hides —
  never one that is not `hideable`, and never the last column shown.

  `GridMessages` has new keys: `chooseColumns`, the command's label;
  `columnChooserLabel`, `columnChooserSearchLabel`, `showAllColumns` and
  `noMatchingColumns` for the chooser; and `columnsShown(count)` and
  `columnsHidden(count)`, announced when one change shows or hides more than one
  column.

- 66c2815: `GridMessages` gains `columnsAutoFitted(count)` — "3 columns autofitted",
  "1 column autofitted" — announced when one action autofits more than one
  column.
- 183babc: Three new grid options. `commands` registers the app's own commands for its
  menus to list by id; one with a built-in's id replaces that built-in wherever
  it is listed. `onCommand` is called after a command or an inline menu item
  runs, with a `GridCommandEvent` — `{ commandId, target, source }`, `source`
  being a `GridCommandSource`: `"contextMenu"`, `"toolbar"` or `"api"`.
  `onContextMenuOpenChange` is called as the grid's context menu opens or
  closes, with a `ContextMenuOpenChangeEvent` — `{ open, target }`.
- 183babc: `contextMenu` has three more areas beside `header`: `cell`, a data cell's
  menu, acting on its row and cell; `group`, a group header row's; and `body`,
  the body's empty space. `defaultContextMenu` gives `cell` select all rows,
  clear the selection, and expand or collapse every group; `group` expand or
  collapse every group and stop grouping by its column; and `body` nothing, so
  empty space keeps the browser's menu until it is given entries.
  `GridContextMenuTarget` is a command target in one of the four areas.

  `GridMessages` has three new keys naming these menus: `cellMenuLabel` ("Row
  menu"), `groupMenuLabel` ("Group menu") and `bodyMenuLabel` ("Grid menu").

- 183babc: A `contextMenu` grid option for the grid's own context menu on column
  headers, off by default. `true` shows the defaults — `defaultContextMenu`:
  sort ascending and descending, clear the sort, group by and stop grouping,
  autofit the column or all of them, hide it, and choose the columns shown,
  each where the column allows;
  `{ header: entries }` lists a header's menu in the menu vocabulary, and
  `{ header: [] }` leaves the browser's menu.

  `buildKeyShortcuts` takes an optional `contextMenu` capability, which adds
  `Shift+F10`. `GridMessages` has three new keys: `headerMenuLabel(columnName)`,
  a header menu's accessible name, and `columnHidden(columnName)` and
  `columnShown(columnName)`, announced when one column is hidden or shown.

- 183babc: A `contextMenu` area takes a function as well as entries, asked each time its
  menu opens with a `GridContextMenuRequest` — `{ target, defaults, context }`,
  the target typed for the area — and returning the entries to show, or `null`
  for the browser's menu there. It is how to add to an area's defaults, take
  some out, reorder them, or vary the menu by column or row:

  ```ts
  contextMenu: {
    cell: ({ target, defaults }) =>
      target.columnId === "Id" ? null : ["orders.open", "separator", ...defaults],
  }
  ```

  For a renderer of its own, `contextMenuEntries(contextMenu, context)` gives
  the entries for the place `context.target` names, asking an area's function
  if it has one, and `hasContextMenu(contextMenu, area)` says whether an area
  opens a grid menu at all. `GridContextMenuEntries` is the type of an area's
  option.

- 1fdf433: `columnValueOptions` takes an optional `messages` in its query, the grid's own
  partial `GridMessages`. A boolean option is then labelled `booleanTrue` /
  `booleanFalse`, the same words its cells use, and `search` matches those
  labels. Without it, booleans still read `"true"` / `"false"`.

  ```ts
  columnValueOptions(rows, dataColumns, filter, "Active", {
    locale,
    messages: { booleanTrue: "ja", booleanFalse: "nein" },
  });
  ```

- 3758583: Grid commands: the one implementation behind a menu item, a toolbar button and
  a renderer's API. `builtInCommands()` returns the grid's own — sort a column
  ascending or descending, clear its sort or all sorting, group and ungroup,
  expand or collapse every group, hide or autofit a column, select all rows,
  clear the selection, clear filters — each deciding from a `GridCommandContext`
  whether it shows and whether it can run, and changing the grid only through
  the controller's actions. `resolveCommands(commands)` lays an app's own
  commands over them, replacing a built-in of the same id; `createCommandContext`
  builds the context for a header, cell, group, toolbar or grid target; and
  `runCommand` runs a command only when it is visible and enabled.

  `ColumnDefinition` takes `hideable` (default `true`), which the built-in
  `column.hide` command honours; `hideColumns` still hides any column.
  `GridMessages` has a new key for each built-in label — `sortAscending`,
  `groupByColumn(columnName)`, `clearFilters` and the rest.

- 3758583: A menu model every renderer draws its menus from. A menu is a list of
  `MenuEntry`s — command ids, `"separator"`, inline items and submenus — and
  `resolveMenu(entries, { commands, context })` turns it into what to draw:
  hidden entries and unknown ids left out, labels resolved to strings, `checked`
  set only on checkable items, separators never leading, trailing or doubled,
  empty submenus dropped, and each item's `run()` bound to its context.

  `nextMenuIndex` and `typeaheadIndex` are the pure halves of a menu's keyboard
  handling: where an arrow, Home or End key moves focus, skipping separators and
  wrapping, and which item a typed prefix picks.

- 5f9a5da: `searchTextOf(filter)` and `setSearchText(filter, text)` read and write the
  filter's global text entry as a search box shows it: `setSearchText` stores
  `%text%` — contains `text`, in any column — or removes the entry for empty
  text, leaving every column's entries alone; `searchTextOf` gives the text
  back without its `%` anchors, so a box reading from the filter shows what was
  typed.
- 5f9a5da: `GridMessages` gains the toolbar's strings: `toolbarLabel` ("Grid toolbar"),
  `searchLabel` ("Search"), `searchPlaceholder` ("Search…"), `moreToolbarItems`
  ("More") and `searchResults(count)` ("3 rows found", "1 row found", "No rows
  found"), announced when a search settles. A `messages` object that lists
  every key needs these five added.
- 5f9a5da: A toolbar model, written in the menu vocabulary. A `ToolbarEntry` is any
  `MenuEntry` — a command id is a button, a checkable one a toggle, a submenu a
  dropdown — plus `"search"`, `"spacer"` and `{ type: "custom", id }` for a
  renderer's own content. `resolveToolbar(entries, { commands, contextFor })`
  resolves them by `resolveMenu`'s rules, each item in a context targeting
  `{ area: "toolbar", itemId }`, and separators also collapse beside a spacer.
  `GridToolbarOptions`, `defaultToolbar` (search, spacer, `filter.clearAll`,
  `column.choose`) and
  `toolbarEntries(toolbar)` describe the `toolbar` grid option.

  For a toolbar too narrow for its items, `fitToolbarItems` works out how many
  fit — pinned entries (search and custom, see `isPinnedToolbarItem`) always
  stay, and room for a "More" button is kept only when something overflows —
  and `splitToolbarItems` splits the resolved items into what stays and the
  "More" menu's entries.

  A menu or toolbar entry naming no command is now reported as "the menu or
  toolbar entry `id` names no command, so it is left out."

- 5f9a5da: `GridOptions` gains `toolbar?: boolean | GridToolbarOptions<Row>`: a toolbar
  above the grid, off by default. `true` lists `defaultToolbar` — the search
  box, a spacer, "Clear filters" and "Choose columns" — and `{ items, label }` lists your own
  entries and names the toolbar for a screen reader.

### Patch Changes

- 1fdf433: A checklist filter on a date column whose cells hold ISO strings now opens with
  its values checked after a restore. `restoreState` revives a saved `in` list to
  `Date`s, which still filtered correctly, but `initialFilterEditorDraft` showed
  those values unchecked. Checklist values are now keyed the way the `in`
  operator matches them, so on a date column a date string and the `Date` it
  names count as the same value. `columnValueOptions` also merges strings that
  spell the same date differently into one option, and returns the column's
  `columnType`, which the draft uses for keying.
- db2ba38: `goToPage`, `nextPage`, `previousPage` and `setPageSize` no longer fire
  `onPaginationChange` or call subscribers when they leave the pagination as it
  was — `nextPage()` on the last page, `previousPage()` on the first,
  `goToPage()` to the page already shown. A controlled grid is no longer asked
  for the page it already has.

## 0.11.0

### Minor Changes

- 6af35c6: Columns gain a plain-text `header`, and values gain an opt-in formatting
  layer.

  - `ColumnDefinition.header` names a column as text. The header shows it when
    there is no `headerTemplate`; `resolveColumnHeaderText(column)` returns it
    (or a text label, or the field path) for announcements and exports.
  - `ColumnDefinition.format` takes `Intl.NumberFormatOptions` or
    `Intl.DateTimeFormatOptions`, and `ColumnDefinition.valueFormatter`
    (`(value, row) => string`) overrides it outright.
  - `formatCellValue(value, column, locale?, row?)` turns a value into the text
    a cell shows: booleans as `"true"`/`"false"`, `null` as empty text. Dates
    and numbers go through `Intl` only once the column has a `format` or a
    `locale` is passed — dates by `type` (`date`, `time`, otherwise date and
    time), numeric types through `Intl.NumberFormat` (`currency` with
    `format.currency`, `percent` reading `0.25` as 25%). Without either, a
    number prints as-is and a date through `toLocaleString()`.
    `formatAggregateValue` does the same for aggregate results, reading a
    `count` as a plain number and, without a `format` or `locale`, a numeric
    result through `toLocaleString()`.

- 6af35c6: Columns can be hidden. `ColumnDefinition.hidden` sets where a column starts,
  and a `columnVisibility` slice on `GridState` (`ColumnVisibilityState`, column
  id → `true` shown / `false` hidden) records what the user changed.
  `resolveGridView` drops hidden columns from `columns` after ordering and
  before sizing; they stay in `dataColumns`, so a sort, filter or grouping on a
  hidden column still applies and the column keeps its slot in the order.

  New helpers: `isColumnVisible(column, visibility)`,
  `applyColumnVisibility(dataColumns, visibility)` and
  `setColumnVisibility(dataColumns, visibility, columnIds, visible)`, plus the
  `ColumnVisibilityEvent` type (`{ columnIds, visibility }`).

- bad8ea3: The grid controller now also owns the filter, column widths, column order and
  column visibility. New actions: `setFilter`, `resizeColumn(columnId, width,
phase)`, `cancelColumnResize`, `setColumnSizing`, `moveColumn(columnId,
beforeId)`, `setColumnOrder`, `showColumns`, `hideColumns` and
  `setColumnVisibility`, each reporting through the slice's existing callback.

  `GridOptions` gains controlled `filter`, `columnSizing`, `columnOrder` and
  `columnVisibility` options, and `onFilterChange` with the new
  `FilterChangeEvent` type (`{ filter }`). A filter change sends an uncontrolled
  pagination back to the first page, as a sort or grouping change does.

- bad8ea3: The grid controller now owns row, column and cell selection. `GridState`
  gains `rowSelection`, `columnSelection` and `cellSelection`; `GridOptions`
  gains controlled props for each beside their `default*` ones; and the
  selection callbacks move into core as `SelectionCallbacks<Row, Node>`, fired
  from one diff per change exactly as `@gridkitjs/react` fired them. New actions:
  `selectRow`, `selectRows(ids, intent?)`, `selectAllRows`, `clearSelection`,
  `setRowSelection`, `selectColumn`, `setColumnSelection`, `selectCell` and
  `setCellSelection`. `GridControllerOptions.onSelectionDiff` reports each row
  or column change by id, for a renderer's own feedback.

  `resolveGridView`'s `state` is now typed `GridViewState<Row>` — `GridState`
  without the selections, which the view never reads; a whole `GridState` still
  fits.

- 78e10e5: Add `DataColumn` — `{ id, column }`, a column without its width — and
  `resolveDataColumns(columns, order)`, which orders column definitions and pairs
  each with its id. `filterRows`, `sortRows`, `resolveShownRows`, `groupRows`,
  `computeAggregates` and `withGroupAggregates` now accept `DataColumn[]` in place
  of `ResolvedColumn[]`; a `ResolvedColumn[]` still fits, so no call site changes.
- 44759b4: The headless model a column's filter editor is drawn over, so a checklist
  or condition editor needs no logic of its own:

  - `describeColumnFilter(filter, columnId)` reads which form the column's
    filter is in — `none`, a `values` checklist, one or two `conditions`, or
    `custom`.
  - `columnValueOptions(rows, dataColumns, filter, columnId, { search, limit, locale })`
    lists the column's distinct values with labels and counts, cascaded over
    the rows every other column's filter keeps.
  - `initialFilterEditorDraft`, `filterEditorReducer`, `visibleFilterOptions`
    and `selectAllState` hold an editor's draft — checked values, search,
    blanks, a tri-state select-all, conditions — and `draftToFilter` applies
    it: everything checked removes the column's filter, a partial pick is one
    `in` entry.

  New types: `ColumnFilterShape`, `ColumnValueOption`, `ColumnValueOptions`,
  `ColumnValueQuery`, `FilterEditorAction`, `FilterEditorDraft`,
  `SelectAllState`.

- bad8ea3: Add `createGridController(options)`, a grid without a renderer: it holds the
  grid's state, derives the view with `resolveGridView`, and carries the sort,
  grouping, expansion and paging actions (`toggleColumnSort`, `setColumnSort`,
  `toggleGroupBy`, `moveGroupBy`, `setGroupBy`, `toggleGroupExpansion`,
  `expandAllGroups`, `collapseAllGroups`, `setGroupExpansion`, `goToPage`,
  `nextPage`, `previousPage`, `setPageSize`, `setPagination`). Each action fires
  the same callback, with the same payload, a user's interaction does.
  `getState()` and `getView()` keep their identity until something changes, and
  `subscribe(listener)` is called after each change, so either can back a
  `useSyncExternalStore`-style subscription. Columns are inferred from
  `dataSource` when none are given.

  `GridOptions` gains controlled `columnSort`, `groupBy`, `groupExpansion` and
  `pagination` options beside their `default*` counterparts: given, the grid
  shows that value and an action only asks for a change through the matching
  `on*Change` callback.

  `defineColumnsFromRows` takes an optional `Node` type parameter, so its result
  can be typed for any renderer's columns.

- 8d411eb: `GridOptions` gains `messages`, a partial `GridMessages` replacing the grid's
  own English strings key by key — the pager, the group-by bar, the loading
  row, boolean and blank values, and every live-region announcement.
  `defaultMessages` holds the English defaults and `resolveMessages(messages)`
  lays a partial set over them. `formatCellValue` takes an optional fifth
  `messages` argument for a boolean's words.
- bad8ea3: `@gridkitjs/core` exports `GridOptions<Row>`: every grid setting that names no
  renderer type — data, row identity, what the user may do, starting state and
  change callbacks — in one interface, with the `Borders`, `HoverableConfig` and
  `GroupByBarVisibility` types it uses. `DataGridProps<Row>` is now composed
  from it plus `ReactRenderSlots<Row>` (`columns`, `pager`, `infiniteScroll`),
  the selection callbacks and `ref`; every prop keeps its name and type.
  `@gridkitjs/react` still exports `Borders`, `HoverableConfig` and
  `GroupByBarVisibility`, and now also `GridOptions` and `ReactRenderSlots`.
- 78e10e5: Add `resolveGridView(input)`, which derives everything a grid shows in one
  call: rows filtered, sorted, grouped, aggregated and paginated, and columns
  ordered and sized, returned as a `GridView` (`dataColumns`, `columns`, `rows`,
  `displayRows`, `pageRows`, `displayDataRows`, `pageCount`, `pageIndex`,
  `grandTotal`). `createGridViewResolver()` returns a memoised version that
  recomputes only the stages a change touches — a column resize or a viewport
  change leaves every row list and the grand total untouched. New types:
  `GridState`, `GridViewInput`, `GridViewOptions`, `GridView`, and `ResizeMode`
  (moved from `@gridkitjs/react`, which still exports it).
- 44759b4: A fifth filter entry kind, `OperatorFilterEntry` — `{ columnId, operator, value }`
  with `eq`, `ne`, `contains`, `notContains`, `startsWith`, `endsWith`, `gt`,
  `gte`, `lt`, `lte`, `between`, `in`, `isEmpty` and `isNotEmpty` — expresses a
  range, a value list or a blank check as plain data, so a filter that needed a
  predicate can now be saved:

  ```ts
  { columnId: "amount", operator: "between", value: [10, 100] }
  ```

  Blank cells (`null`, `undefined`, `""`) match only `isEmpty`, `ne` and
  `notContains`. `serializeGridState` writes an operator entry's `Date`s as ISO
  strings, and `restoreState` turns them back into `Date`s on date, date-time
  and time columns. New types: `FilterOperator`, `FilterScalar`,
  `OperatorFilterEntry`, `SerializedFilterScalar`,
  `SerializedOperatorFilterEntry`.

- bad8ea3: Grid state can be saved and put back. `serializeGridState(state)` returns a
  `SerializedGridState` that survives `JSON.stringify` and back — a `Date`
  filter value becomes its ISO string, and a predicate filter entry, which
  cannot be written down, is left out with a `console.error` naming its column.
  The controller's `restoreState(saved)` applies a full or partial state, from
  `getState()` or from JSON: each slice that changes fires its callback,
  subscribers are called once, and a restored page survives a restored sort.

  The controller's `setFilter` now compares filters by content rather than by
  entry identity, so setting a filter equal to the current one reports nothing.

- 8d411eb: `GridOptions` gains `onRowClick` and `onRowDoubleClick`, called with a
  `RowPointerEvent` (the row, the column clicked and the modifiers, no DOM
  event), and `getRowProps`, which returns a class name and `data-*` attributes
  for each data row. `SelectableConfig` gains `toggleOnClick`, under which a
  plain click toggles a row instead of selecting it alone, and `intentOf` takes
  it as an optional second argument: `intentOf(event, { toggleOnClick: true })`.

### Patch Changes

- 78e10e5: `collapseAllGroups` no longer lists a group twice when given display rows that
  carry summary rows (`groupAggregateDisplay: "row"`), such as
  `DataGridApi.getDisplayRows()`.

## 0.10.0

### Minor Changes

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

## 0.9.0

### Minor Changes

- 6e8189b: Aggregate functions: `computeAggregates` reduces rows through built-in reducers (`sum`, `avg`, `min`, `max`, `count`, `countDistinct`) or a custom `AggregateFn`, and `withGroupAggregates` attaches each group's own subtotal to its header — or, with `display: "row"`, appends a `ResolvedGroupSummaryRow` carrying the same results as its own entry in the display list. `AggregateSpec.alignment` overrides that aggregate's own cell alignment, falling back to its column's own `alignment` when omitted. New exports: `computeAggregates`, `withGroupAggregates`, and the types `AggregateFn`/`AggregateSpec`/`AggregateState`/`AggregateResults`/`BuiltInAggregate`/`FooterTemplateContext`/`GroupAggregateDisplay`/`ResolvedGroupSummaryRow`.

  Every aggregate — built-in or custom — is always computed from the full leaf-row set in scope, never combined from already-computed child results, so a non-associative aggregate (a custom "distinct count", for example) is never silently wrong at a nested group level. A collapsed group's subtotal is recomputed the same way, independent of its own collapse state. Under `display: "row"`, a group's own summary row is inserted immediately after its last visible entry at every nesting level, never splits from its group across a page boundary (`paginateRows` treats it as part of the same unit), and never receives a keyboard tab stop — `nextFocusForKey` takes a new optional `isSkippableRow` predicate so `ArrowUp`/`ArrowDown`/`PageUp`/`PageDown`/`Ctrl+End` step over it.

  Breaking: `ResolvedGroupRow` gains a required `aggregates: AggregateResults` field (empty when no aggregates are active), and `DisplayRow<Row>` widens to include the new `ResolvedGroupSummaryRow` variant — a caller doing an exhaustive `"kind" in entry` check now needs to also narrow on `entry.kind` to tell a group header apart from a summary row. `ColumnDefinition` gains an optional `footerTemplate` for rendering a column's own aggregate result.

- 6e8189b: Pagination primitives: `paginateRows` slices a `DisplayRow<Row>[]` into pages, treating a top-level group and its whole subtree as one unit so a page never splits a group. New exports: `paginateRows`, and the types `PaginationState`/`PaginationChangeEvent`.

  Breaking: `ResolvedRow`/`ResolvedGroupRow`/`CellTemplateContext` gain a required `datasetIndex` field — a row's absolute position in the whole filtered/sorted/grouped dataset, distinct from `rowIndex` (which is scoped to what's currently rendered — the page, once pagination is in use). A caller constructing either of these directly, or reading a template context, needs to account for the new field.

- 6e8189b: New export: `paginationWindow(currentPage, pageCount, options?)`, the boundary + sibling windowing logic behind a numbered pager — which page numbers to show and where to collapse a gap into a `PaginationWindowEntry` `"ellipsis"` entry.

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
