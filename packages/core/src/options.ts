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
  ResizeMode,
  ResolvedRow,
  RowPointerEvent,
  RowSelectEvent,
  RowSelectionChangeEvent,
  RowsSelectEvent,
  SelectableConfig,
  SelectionState,
} from "./types";
import type { FormatLocale } from "./util/format";

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
   * `onColumnResize`, whose `sizing` is the next state. Leave it
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
   * the one to persist. Auto-fit does not call it; it reports user intent only.
   */
  onColumnResize?: ((event: ColumnResizeEvent) => void) | undefined;
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
  /** Group keys collapsed to start with — every other group starts expanded. Uncontrolled. */
  defaultGroupExpansion?: GroupExpansionState | undefined;
  /**
   * The collapsed groups, controlled — applied as given, changed only
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
   * Called once when the filter changes — through `setFilter` for now, as
   * the grid has no filter UI of its own yet.
   */
  onFilterChange?: ((event: FilterChangeEvent<Row>) => void) | undefined;
  /**
   * Whether the grid's rows are split into pages. A page's unit is a
   * top-level group or a bare data row, never a leaf row — a group is never
   * split across a page boundary. Off by default, matching `sortableColumns`.
   */
  paginated?: boolean | undefined;
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
   * the filter, sort or grouping changes; a controlled one is the parent's
   * to reset alongside that change. Until it does, the grid shows the last
   * page that exists rather than an empty one.
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
