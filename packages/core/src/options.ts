import type {
  AggregateState,
  CellSelectionState,
  ColumnOrderEvent,
  ColumnOrderState,
  ColumnResizeEvent,
  ColumnSizeDefaults,
  ColumnSizingState,
  ColumnSortEvent,
  ColumnSortState,
  ColumnVisibilityEvent,
  ColumnVisibilityState,
  FilterState,
  GroupAggregateDisplay,
  GroupByEvent,
  GroupByState,
  GroupExpansionEvent,
  GroupExpansionState,
  PaginationChangeEvent,
  PaginationState,
  ResizeMode,
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
  /** Column ids selected to start with. Uncontrolled. */
  defaultColumnSelection?: SelectionState | undefined;
  /** The cell selected to start with. Uncontrolled. */
  defaultCellSelection?: CellSelectionState | undefined;
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
   * Column ids in the order to start in. Uncontrolled, and partial: ids it
   * omits keep their position among `columns` and follow those it lists.
   */
  defaultColumnOrder?: ColumnOrderState | undefined;
  /**
   * Columns shown (`true`) or hidden (`false`) to start with, keyed by
   * column id, over each definition's own `hidden`. Uncontrolled.
   */
  defaultColumnVisibility?: ColumnVisibilityState | undefined;
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
   * Called once when the user changes the group-by stack — adding, removing,
   * or reordering a level.
   */
  onGroupByChange?: ((event: GroupByEvent) => void) | undefined;
  /** Group keys collapsed to start with — every other group starts expanded. Uncontrolled. */
  defaultGroupExpansion?: GroupExpansionState | undefined;
  /** Called once when the user expands or collapses a group, or every group at once. */
  onGroupExpansionChange?: ((event: GroupExpansionEvent) => void) | undefined;
  /** The filter to start with — every applied entry, ANDed together. Uncontrolled. */
  defaultFilter?: FilterState<Row> | undefined;
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
