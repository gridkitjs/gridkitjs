import type {
  AggregateState,
  CellSelectEvent,
  CellSelectionChangeEvent,
  CellSelectionState,
  ColumnSelectEvent,
  ColumnSelectionChangeEvent,
  ColumnsSelectEvent,
  ColumnOrderEvent,
  ColumnOrderState,
  ColumnResizeEvent,
  ColumnSizeDefaults,
  ColumnSizingState,
  ColumnSortEvent,
  ColumnSortState,
  ColumnVisibilityEvent,
  ColumnVisibilityState,
  FilterChangeEvent,
  FilterState,
  GroupAggregateDisplay,
  GroupByEvent,
  GroupByState,
  GroupExpansionEvent,
  GroupExpansionState,
  PaginationChangeEvent,
  PaginationState,
  PaginationUnit,
  ResizeMode,
  ResolvedRow,
  RowPointerEvent,
  RowSelectEvent,
  RowSelectionChangeEvent,
  RowsSelectEvent,
  SelectableConfig,
  SelectionState,
} from "./types";
import type { GridCommand, GridCommandEvent } from "./commands/types";
import type { GridFilterMenuOptions } from "./filterMenu/options";
import type { GridMessages } from "./messages";
import type {
  ContextMenuOpenChangeEvent,
  GridContextMenuOptions,
} from "./menu/contextMenu";
import type { GridToolbarOptions } from "./toolbar/options";
import type { FormatLocale } from "./util/format";
import type { PrintOptions } from "./export/print";
import type { ExportWriter, GridExportOptions } from "./export/writer";

/** Which cell borders a grid draws. */
export type Borders = "horizontal" | "vertical" | "all" | "none";

/** Which hover highlighting a grid shows. Every member defaults to on. */
export interface HoverableConfig {
  rows?: boolean;
  columns?: boolean;
  cells?: boolean;
}

/**
 * How the group-by bar's visibility follows the active grouping. `"always"`
 * renders it even with an empty `groupBy` — a fixed drop target and a
 * constant reminder grouping exists. `"never"` never renders it, for a grid
 * driving `groupBy` entirely by its own UI (a header toggle, `Alt+ArrowDown`)
 * or programmatically. `"auto"` renders it once `groupBy` is non-empty, or
 * while a header drag eligible to drop into it is in progress — so there is
 * always somewhere to drop the very first column, even from a fully empty
 * grouping.
 */
export type GroupByBarVisibility = "always" | "auto" | "never";

/**
 * What `getRowProps` adds to a data row: a class for the theme or the
 * app's own stylesheet to target, and `data-*` attributes for a test or a
 * script to find the row by. No inline style — styling belongs to the
 * stylesheet, which a class already reaches.
 */
export interface RowProps {
  className?: string | undefined;
  /**
   * Set on the row alongside the grid's own `data-gridkit-*` attributes,
   * which win over one of the same name — the grid finds its rows by them.
   */
  attributes?: Readonly<Record<`data-${string}`, string>> | undefined;
}

/**
 * Every setting of a grid that names no renderer's types: the data, what the
 * user may do with it, the state it starts in and the callbacks that report
 * changes. A renderer's own props are this plus what only it can express —
 * React's `columns` (whose templates return `ReactNode`), its pager and
 * infinite-scroll templates, its `ref` — so two renderers cannot drift apart
 * on what a setting is called or what it means.
 */
export interface GridOptions<Row> {
  dataSource?: readonly Row[] | undefined;
  /**
   * A row's stable identity, for state keyed by it. Defaults to the row's
   * position, which is enough for a static grid but ties that state to where a
   * row sits rather than to the row — so anything sorting, filtering or paging
   * its data should give one.
   *
   * Called for every row on every change to `dataSource`, so it should be
   * cheap and stable; an inline arrow is fine, one that re-reads the data is
   * not.
   */
  getRowId?: ((row: Row, index: number) => string) | undefined;
  /**
   * A class and `data-*` attributes for each data row, worked out from the
   * row — an `is-overdue` class, a `data-status` to style or find it by.
   * Group headers and summary rows are not passed to it.
   *
   * Called for each data row as it renders, so it should be cheap. A row
   * whose result reads the same as last time is not redrawn for it, so an
   * inline arrow returning a fresh object each time is fine.
   */
  getRowProps?: ((row: ResolvedRow<Row>) => RowProps) | undefined;
  /**
   * Called when a data row is clicked, after the click has changed the
   * selection — so a handler reading the selection sees the new one. Not
   * called for a group header, whose click expands or collapses it.
   */
  onRowClick?: ((event: RowPointerEvent<Row>) => void) | undefined;
  /**
   * Called once when a data row is double-clicked — the usual "open this
   * record" gesture. The two clicks before it still report through
   * `onRowClick` and select as clicks do.
   */
  onRowDoubleClick?: ((event: RowPointerEvent<Row>) => void) | undefined;
  borders?: Borders | undefined;
  hoverable?: HoverableConfig | undefined;
  /**
   * Which parts of the grid the user may select, and how many of each —
   * `{ rows: "multiple", cells: "single" }`. A cell addresses one value, so it
   * has no `"multiple"`.
   *
   * Off by default, unlike `hoverable`: selection claims the click, which a
   * grid that only displays data should not do. Give `getRowId` alongside it
   * for data that sorts, filters or pages, or a selection follows the position
   * rather than the row.
   */
  selectable?: SelectableConfig | undefined;
  /** Row ids selected to start with, keyed as `getRowId` resolves them. Uncontrolled. */
  defaultRowSelection?: SelectionState | undefined;
  /**
   * The selected row ids, controlled — applied as given, changed only through
   * the row selection callbacks (`onRowSelectionChange` carries the whole
   * next state). Leave it `undefined` for the grid to keep it itself,
   * starting from `defaultRowSelection`.
   */
  rowSelection?: SelectionState | undefined;
  /** Column ids selected to start with. Uncontrolled. */
  defaultColumnSelection?: SelectionState | undefined;
  /**
   * The selected column ids, controlled — changed only through the column
   * selection callbacks. Leave it `undefined` for the grid to keep it.
   */
  columnSelection?: SelectionState | undefined;
  /** The cell selected to start with. Uncontrolled. */
  defaultCellSelection?: CellSelectionState | undefined;
  /**
   * The selected cell, controlled — `null` for none, changed only through
   * the cell selection callbacks. Leave it `undefined` for the grid to keep
   * it.
   */
  cellSelection?: CellSelectionState | undefined;
  /** Whether columns can be dragged wider, unless a column says otherwise. */
  resizableColumns?: boolean | undefined;
  /**
   * Whether columns can be dragged into a new position, unless a column says
   * otherwise. Turning it off leaves an order the user already made in place.
   */
  reorderableColumns?: boolean | undefined;
  /**
   * Whether columns fill the grid's width or sit at their own. Defaults to
   * `"fit"`, under which columns the user has sized keep their width and the
   * rest share what is left.
   */
  resizeMode?: ResizeMode | undefined;
  /** Column widths to start from, keyed by column id. Uncontrolled. */
  defaultColumnSizing?: ColumnSizingState | undefined;
  /**
   * Column widths, controlled — applied as given, changed only through
   * `onColumnSizingChange`, whose `sizing` is the next state. Leave it
   * `undefined` for the grid to keep the widths itself, starting from
   * `defaultColumnSizing`.
   */
  columnSizing?: ColumnSizingState | undefined;
  /**
   * Column ids in the order to start in. Uncontrolled, and partial: ids it
   * omits keep their position among `columns` and follow those it lists.
   */
  defaultColumnOrder?: ColumnOrderState | undefined;
  /**
   * The column order, controlled — applied as given, changed only through
   * `onColumnOrderChange`. Leave it `undefined` for the grid to keep the
   * order itself, starting from `defaultColumnOrder`.
   */
  columnOrder?: ColumnOrderState | undefined;
  /**
   * Columns shown (`true`) or hidden (`false`) to start with, keyed by
   * column id, over each definition's own `hidden`. Uncontrolled.
   */
  defaultColumnVisibility?: ColumnVisibilityState | undefined;
  /**
   * Which columns are shown, controlled — applied as given, changed only
   * through `onColumnVisibilityChange`. Leave it `undefined` for the grid to
   * keep it itself, starting from `defaultColumnVisibility`.
   */
  columnVisibility?: ColumnVisibilityState | undefined;
  /**
   * Called once when columns are shown or hidden, with every column that one
   * change touched. A call that changes nothing does not call it.
   */
  onColumnVisibilityChange?:
    ((event: ColumnVisibilityEvent) => void) | undefined;
  /**
   * Sizes applied to columns that do not set their own — the width they start
   * at and the bounds they may be resized between. Distinct from
   * `defaultColumnSizing`, which sets specific columns' starting widths.
   */
  columnSizeDefaults?: Partial<ColumnSizeDefaults> | undefined;
  /**
   * Called as the user resizes a column. Fires continuously with
   * `phase: "move"` and once on release with `phase: "end"` — the latter being
   * the one to persist. Auto-fitting a column calls it once, with "end".
   */
  onColumnSizingChange?: ((event: ColumnResizeEvent) => void) | undefined;
  /**
   * Called once when the user drops a column somewhere new. A drop that leaves
   * the order as it was does not call it.
   */
  onColumnOrderChange?: ((event: ColumnOrderEvent) => void) | undefined;
  /**
   * Whether columns can be sorted by clicking their header toggle, unless a
   * column says otherwise. Shift-click stacks a column into the sort instead
   * of replacing it.
   */
  sortableColumns?: boolean | undefined;
  /** The sort to start with, in priority order. Uncontrolled. */
  defaultColumnSort?: ColumnSortState | undefined;
  /**
   * The sort, controlled: the grid shows exactly this, and a header click
   * only asks for a change through `onColumnSortChange`, which takes effect
   * once this prop follows it. Leave it `undefined` for the grid to keep the
   * sort itself, starting from `defaultColumnSort`.
   */
  columnSort?: ColumnSortState | undefined;
  /**
   * Called once when the user changes the sort — a toggle, a stack, or a
   * clear back to "none".
   */
  onColumnSortChange?: ((event: ColumnSortEvent) => void) | undefined;
  /**
   * Whether columns can be grouped by — a header's click/`Alt+ArrowDown`
   * toggle — unless a column says otherwise. The grouping itself still
   * applies when this is off, via `defaultGroupBy` or the imperative API;
   * this only gates that one interaction, the same way `sortableColumns`
   * gates the sort toggle without disabling `defaultColumnSort`. Independent
   * of `groupByBarVisibility` and `groupByDraggableColumns`, which gate the
   * bar and the drag-in gesture respectively.
   */
  groupableColumns?: boolean | undefined;
  /**
   * Whether a groupable header shows its group-toggle icon, unless a column
   * says otherwise. Purely a rendering choice: `Alt+ArrowDown` keeps working
   * on a groupable header with the icon hidden.
   */
  groupToggleIconColumns?: boolean | undefined;
  /**
   * Whether a column's header may be dragged into the group-by bar to add
   * it to the grouping, unless a column says otherwise. Independent of
   * `groupableColumns`: a column can be groupable via its header's
   * click/keyboard toggle, via this drag, both, or neither.
   */
  groupByDraggableColumns?: boolean | undefined;
  /** How the group-by bar's visibility follows the active grouping. */
  groupByBarVisibility?: GroupByBarVisibility | undefined;
  /** The group-by stack to start with, outer to inner. Uncontrolled. */
  defaultGroupBy?: GroupByState | undefined;
  /**
   * The group-by stack, controlled — applied as given, changed only through
   * `onGroupByChange`. Leave it `undefined` for the grid to keep it itself,
   * starting from `defaultGroupBy`.
   */
  groupBy?: GroupByState | undefined;
  /**
   * Called once when the user changes the group-by stack — adding, removing,
   * or reordering a level.
   */
  onGroupByChange?: ((event: GroupByEvent) => void) | undefined;
  /**
   * Which groups start expanded, as a mode with exceptions — `{ mode:
   * "allCollapsed", except: [] }` starts every group collapsed. Every group
   * starts expanded when it is left out. Uncontrolled.
   */
  defaultGroupExpansion?: GroupExpansionState | undefined;
  /**
   * Which groups are expanded, controlled — applied as given, changed only
   * through `onGroupExpansionChange`. Leave it `undefined` for the grid to
   * keep it itself, starting from `defaultGroupExpansion`.
   */
  groupExpansion?: GroupExpansionState | undefined;
  /** Called once when the user expands or collapses a group, or every group at once. */
  onGroupExpansionChange?: ((event: GroupExpansionEvent) => void) | undefined;
  /** The filter to start with — every applied entry, ANDed together. Uncontrolled. */
  defaultFilter?: FilterState<Row> | undefined;
  /**
   * The filter, controlled — applied as given, changed only through
   * `onFilterChange`. Leave it `undefined` for the grid to keep it itself,
   * starting from `defaultFilter`.
   */
  filter?: FilterState<Row> | undefined;
  /**
   * Called once when the filter changes — from the toolbar's search box, the
   * `filter.clearAll` command, `setFilter` or a restored state.
   */
  onFilterChange?: ((event: FilterChangeEvent<Row>) => void) | undefined;
  /**
   * Whether columns get a filter menu, opened from their header, unless a
   * column says otherwise. Off by default, like `sortableColumns`; the
   * filter itself applies either way, from `defaultFilter`, `setFilter` or a
   * search box. A renderer draws the menu from what
   * `resolveColumnFilterMenu` settles.
   */
  filterableColumns?: boolean | undefined;
  /**
   * How the filter menus look: which editor they open — `"simple"`
   * conditions or an `"excel"` checklist — and the checklist's counts and
   * value limit. A column's own `filterMenu` wins over it. Switching `ui`
   * keeps every filter, since both editors edit the one `filter`.
   */
  filterMenu?: GridFilterMenuOptions | undefined;
  /**
   * Whether the grid's rows are split into pages. Off by default, matching
   * `sortableColumns`. What a page's `pageSize` counts once the rows are
   * grouped is `paginationUnit`'s choice.
   */
  paginated?: boolean | undefined;
  /**
   * What `pageSize` counts in a grouped grid. `"group"` (the default) counts
   * top-level groups, each with everything beneath it, so a page never
   * splits a group but can grow as large as its groups. `"row"` counts data
   * rows, plus collapsed group headers, which stand in for their hidden
   * rows: every page holds `pageSize` of them, and a page continuing a group
   * starts with that group's headers again, with a group's summary row on
   * the page holding its last row. An ungrouped grid pages by data rows
   * under either. Selection, export and aggregates behave the same under
   * either unit.
   */
  paginationUnit?: PaginationUnit | undefined;
  /**
   * The page and page size to start on. Uncontrolled. Defaults to
   * `{ pageIndex: 0, pageSize: 25 }` when `paginated` is on and this is
   * omitted.
   */
  defaultPagination?: PaginationState | undefined;
  /**
   * The page and page size, controlled — applied as given, changed only
   * through `onPaginationChange`. Leave it `undefined` for the grid to keep
   * them itself, starting from `defaultPagination`.
   *
   * The grid sends an uncontrolled pagination back to the first page when
   * the filter, sort, grouping or `paginationUnit` changes; a controlled
   * one is the parent's to reset alongside that change. Until it does, the
   * grid shows the last page that exists rather than an empty one.
   */
  pagination?: PaginationState | undefined;
  /** Called once when the user changes the page or the page size. */
  onPaginationChange?: ((event: PaginationChangeEvent) => void) | undefined;
  /**
   * Aggregates to compute — a subtotal per group (rendered in that group's
   * header) plus a grand total over the whole filtered/grouped dataset
   * (rendered in a footer). Always computed over every row, never scoped to
   * the current page. A plain controlled prop, unlike `sort`/`filter`/
   * `groupBy`/`pagination`: there is no built-in UI for a user to add or
   * remove an aggregate interactively, so there is no `defaultAggregates`/
   * `onAggregatesChange` pair to go with it.
   */
  aggregates?: AggregateState<Row> | undefined;
  /**
   * Where a group's own aggregate results render. `"inline"` (the default)
   * keeps them as text in the group header, next to its leaf-row count.
   * `"row"` instead renders a dedicated row after that group's last visible
   * entry, with each aggregate's value in the `<td>` for its own column —
   * the same alignment the grand-total footer's own cells have. Has no
   * effect when `aggregates` is empty or omitted.
   */
  groupAggregateDisplay?: GroupAggregateDisplay | undefined;
  /**
   * Bounds the row area's height, independently scrollable — the grid's own
   * chrome (group-by bar, header, footer, pager) stays outside it and
   * always visible. A number is pixels; a string is passed through as a CSS
   * length (e.g. "60vh"). Omitted, the body's height stays content-driven,
   * same as today.
   */
  height?: number | string | undefined;
  /**
   * Renders only the rows near the current scroll position rather than every
   * row at once — for a dataset too large to mount in full. Requires
   * `height` to be set; a grid without a bounded body has no viewport to
   * window rows against (a dev-time console warning fires when it's
   * missing). Off by default, matching every other opt-in behavior here.
   */
  virtualized?: boolean | undefined;
  /**
   * Rows rendered outside the visible range on each side, to reduce
   * blank-frame flashes on fast scrolling. Only meaningful with `virtualized`
   * on.
   */
  overscan?: number | undefined;
  /**
   * Assumed height for a row never yet measured — only matters for the very
   * first paint and for `scrollToRow`'s initial jump before it corrects
   * itself against that row's real, measured height. Only meaningful with
   * `virtualized` on.
   */
  estimatedRowHeight?: number | undefined;
  /**
   * The grid's accessible name, announced when it takes focus. A grid without
   * one is read only as "grid", which says nothing about which grid.
   */
  label?: string | undefined;
  /**
   * The id of an element naming the grid, for a heading already on the page.
   * Takes precedence over `label`, as `aria-labelledby` does.
   */
  labelledBy?: string | undefined;
  /**
   * The locale values are formatted for — a BCP 47 tag such as `"de-DE"`, or
   * a list to fall back through. Setting it turns on `Intl` formatting of
   * dates and numbers in every cell and aggregate shown without a template;
   * without it, only a column with its own `format` is formatted, in the
   * runtime's locale, and the rest print as they always have.
   */
  locale?: FormatLocale;
  /**
   * The grid's own strings, replacing its English key by key — the pager's
   * buttons, the group-by bar, the loading row, boolean and blank values,
   * the built-in commands' labels, the menus' names, and every live-region
   * announcement. Keys
   * left out keep their default.
   * Formatting is `locale`'s, not this.
   */
  messages?: Partial<GridMessages> | undefined;
  /**
   * The grid's own context menu, opened on a column header, a data cell, a
   * group row or the body's empty space by a right-click, Shift+F10 or the
   * ContextMenu key. Off by default, like every other feature, leaving the
   * browser's menu. `true` shows each area's defaults — see
   * `defaultContextMenu`; an object lists an area's entries, an area left
   * out keeping its defaults and one given `[]` showing the browser's menu
   * there.
   */
  contextMenu?: boolean | GridContextMenuOptions<Row> | undefined;
  /**
   * Called when the grid's context menu opens or closes, with where. A menu
   * opened in place of another reports that one closing first. It also
   * reports closing when a panel opens in its place (before the command of
   * a menu item that opened it runs), when the grid unmounts and when
   * `contextMenu` is turned off while it is open. The open state is the renderer's to keep, so no
   * option holds it.
   */
  onContextMenuOpenChange?:
    ((event: ContextMenuOpenChangeEvent) => void) | undefined;
  /**
   * The app's own commands, for its menus to list by id. One with a
   * built-in's id replaces it wherever that id is listed — a translated,
   * privilege-gated or differently behaving "Hide column" — see
   * `resolveCommands`.
   */
  commands?: readonly GridCommand<Row>[] | undefined;
  /**
   * Called after a command or an inline menu item runs — chosen from a menu,
   * or run through a renderer's API — saying which, where it was asked for
   * and from where. One that did not run, being hidden or disabled, is not
   * reported.
   */
  onCommand?: ((event: GridCommandEvent) => void) | undefined;
  /**
   * A toolbar above the grid: its own commands, a search box over the
   * filter's global text entry, dropdowns and the app's own content, in the
   * menu vocabulary. Off by default. `true` lists `defaultToolbar`; an object
   * lists its `items` and may name it with `label` — see `ToolbarEntry`.
   */
  toolbar?: boolean | GridToolbarOptions<Row> | undefined;
  /**
   * How the grid exports unless a call says otherwise: which rows and
   * columns, the file's name, and the CSV and JSON settings. Left out, an
   * export holds what the user sees, across every page, in a file named
   * `export` with the format's extension.
   */
  export?: GridExportOptions | undefined;
  /**
   * Export formats beyond CSV and JSON — an xlsx writer, or one of the
   * app's own — each registered by its `format`, replacing a built-in
   * writer of the same format. `export.xlsx` and `export.pdf` show only
   * once a writer for their format is here — see `resolveExportWriters`.
   */
  exportWriters?: readonly ExportWriter[] | undefined;
  /**
   * How the grid prints unless a call says otherwise: the rows and columns,
   * the title and text around the table, and the page. Left out, a print
   * holds what an export does, titled with `label`, on an A4 page.
   */
  print?: PrintOptions | undefined;
}

/**
 * Reported as the user selects. Every one of these is fanned out from a single
 * diff of the transition it describes, so no two can disagree about what one
 * interaction did.
 *
 * Kept apart from `GridOptions` because the column payloads carry resolved
 * columns, whose labels are whatever a renderer's `headerTemplate` returns —
 * `Node` is that renderer's node type.
 */
export interface SelectionCallbacks<Row, Node = string> {
  /** Called once per row newly selected. The last call names the last row. */
  onRowSelect?: ((event: RowSelectEvent<Row>) => void) | undefined;
  /** Called once with every row one interaction selected. */
  onRowsSelect?: ((event: RowsSelectEvent<Row>) => void) | undefined;
  onRowDeselect?: ((event: RowSelectEvent<Row>) => void) | undefined;
  onRowsDeselect?: ((event: RowsSelectEvent<Row>) => void) | undefined;
  /**
   * Called once per change with what it added, what it removed and everything
   * selected after it — the one to persist from.
   */
  onRowSelectionChange?:
    ((event: RowSelectionChangeEvent<Row>) => void) | undefined;
  onColumnSelect?: ((event: ColumnSelectEvent<Row, Node>) => void) | undefined;
  onColumnsSelect?:
    ((event: ColumnsSelectEvent<Row, Node>) => void) | undefined;
  onColumnDeselect?:
    ((event: ColumnSelectEvent<Row, Node>) => void) | undefined;
  onColumnsDeselect?:
    ((event: ColumnsSelectEvent<Row, Node>) => void) | undefined;
  onColumnSelectionChange?:
    ((event: ColumnSelectionChangeEvent<Row, Node>) => void) | undefined;
  onCellSelect?: ((event: CellSelectEvent<Row, Node>) => void) | undefined;
  onCellDeselect?: ((event: CellSelectEvent<Row, Node>) => void) | undefined;
  onCellSelectionChange?:
    ((event: CellSelectionChangeEvent<Row, Node>) => void) | undefined;
}
