import {
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from "react";
import {
  moveColumnBefore,
  resolveColumnHeaderText,
  resolveRows,
  totalColumnWidth,
  type ColumnDefinition as CoreColumnDefinition,
  type DataColumn as CoreDataColumn,
  type ResolvedColumn as CoreResolvedColumn,
  type AggregateResults,
  type AggregateState,
  type Borders,
  type ColumnOrderState,
  type ColumnResizeEvent,
  type ColumnSizingState,
  type ColumnSortEvent,
  type ColumnSortState,
  type ColumnVisibilityState,
  type DisplayRow,
  type FilterState,
  type GridOptions,
  type GridState,
  type GroupByBarVisibility,
  type GroupByEvent,
  type GroupByState,
  type GroupExpansionEvent,
  type GroupExpansionState,
  type HoverableConfig,
  type PaginationChangeEvent,
  type PaginationState,
  type ResizeMode,
  type ResolvedRow,
  type CellSelectionState,
  type SelectedCell as CoreSelectedCell,
  type SelectedColumn as CoreSelectedColumn,
  type SelectionState,
  type CellSelectEvent as CoreCellSelectEvent,
  type CellSelectionChangeEvent as CoreCellSelectionChangeEvent,
  type ColumnSelectEvent as CoreColumnSelectEvent,
  type ColumnSelectionChangeEvent as CoreColumnSelectionChangeEvent,
  type ColumnsSelectEvent as CoreColumnsSelectEvent,
  type SelectionCallbacks as CoreSelectionCallbacks,
  type SelectionDiffEvent,
  type SerializedGridState,
} from "@gridkitjs/core";
import GridColgroup from "./components/GridColgroup";
import GridHeader from "./components/GridHeader";
import GridBody from "./components/GridBody";
import GridFooter from "./components/GridFooter";
import GridPager from "./components/GridPager";
import GroupByBar from "./components/GroupByBar";
import { ariaAttr } from "./ariaAttr";
import { classNames } from "./classNames";
import useColumnDrag, { type DropTarget } from "./useColumnDrag";
import useColumnResize from "./useColumnResize";
import useElementWidth from "./useElementWidth";
import useGridController, {
  type DataGridController,
} from "./useGridController";
import useGridNavigation, { HEADER_ROW } from "./useGridNavigation";
import useGridSelection from "./useGridSelection";
import useInfiniteScroll from "./useInfiniteScroll";
import useRowVirtualizer from "./useRowVirtualizer";

/**
 * A column whose header and cells may render arbitrary React content.
 * @gridkitjs/core stays framework-agnostic and so leaves that output type open;
 * this is the binding React consumers want, and the one they should import.
 */
export type ColumnDefinition<Row> = CoreColumnDefinition<Row, ReactNode>;

/** A column paired with the width it renders at. */
export type ResolvedColumn<Row> = CoreResolvedColumn<Row, ReactNode>;

/** A column paired with its id, hidden or not — what `getDataColumns()` lists. */
export type DataColumn<Row> = CoreDataColumn<Row, ReactNode>;

/**
 * The selection payloads, bound to React's node type for the same reason
 * `ColumnDefinition` is: they carry a resolved column, whose label is whatever
 * a `headerTemplate` returned.
 *
 * The row payloads name no node type at all and so are re-exported from
 * `@gridkitjs/core` as they are.
 */
export type SelectedColumn<Row> = CoreSelectedColumn<Row, ReactNode>;
export type SelectedCell<Row> = CoreSelectedCell<Row, ReactNode>;
export type ColumnSelectEvent<Row> = CoreColumnSelectEvent<Row, ReactNode>;
export type ColumnsSelectEvent<Row> = CoreColumnsSelectEvent<Row, ReactNode>;
export type ColumnSelectionChangeEvent<Row> = CoreColumnSelectionChangeEvent<
  Row,
  ReactNode
>;
export type CellSelectEvent<Row> = CoreCellSelectEvent<Row, ReactNode>;
export type CellSelectionChangeEvent<Row> = CoreCellSelectionChangeEvent<
  Row,
  ReactNode
>;
export type SelectionCallbacks<Row> = CoreSelectionCallbacks<Row, ReactNode>;

/**
 * Imperative handle for a mounted `DataGrid`, reached via its `ref` prop:
 * the grid's DOM nodes, getters for its live state, the actions every grid
 * ref carries (focus, select all, scroll-to), and a setter for every slice of
 * state, for a toolbar, a saved layout or a test to drive it from outside.
 *
 * Every getter reads the grid's state at call time, so a read straight after
 * an action sees its result. Every setter changes the grid as the user's own
 * interaction would: it fires the slice's `on*Change` callback, and, for a
 * slice held through a controlled prop, only asks. `subscribe` is the
 * notify channel for state that changes; see
 * `packages/react/src/DataGrid/hooks/` for the public hooks built on it.
 */
export interface DataGridApi<Row> {
  /** The grid's scrollable viewport element. */
  readonly element: HTMLDivElement | null;
  /**
   * The grid's row-area `<table>` element — the one holding `<tbody>`. The
   * header and, when aggregates are active, footer render as their own
   * sibling `<table>`s outside this one; use `element` to reach the whole
   * scrollable viewport instead.
   */
  readonly table: HTMLTableElement | null;

  /** Rows as currently filtered and sorted — what's rendered, ungrouped. */
  getRows(): readonly ResolvedRow<Row>[];
  /**
   * `getRows()` regrouped into the active `groupBy` — group headers
   * interleaved with data rows, in render order. Identical to `getRows()`
   * when `groupBy` is empty.
   */
  getDisplayRows(): readonly DisplayRow<Row>[];
  /**
   * The current page of `getDisplayRows()` — exactly the rows the body
   * renders. All of `getDisplayRows()` when `paginated` is off.
   */
  getPageRows(): readonly DisplayRow<Row>[];
  /** Columns as currently sized and ordered — what's rendered, so hidden columns are left out. */
  getColumns(): readonly ResolvedColumn<Row>[];
  /** Every column in its current order, hidden ones included — what sorting, filtering and grouping read. */
  getDataColumns(): readonly DataColumn<Row>[];

  getColumnSizing(): ColumnSizingState;
  getColumnOrder(): ColumnOrderState;
  /** Columns shown or hidden since the grid mounted. A column absent from it follows its definition's `hidden`. */
  getColumnVisibility(): ColumnVisibilityState;
  getColumnSort(): ColumnSortState;
  /** The filter the rows are shown through — every entry, ANDed together. */
  getFilter(): FilterState<Row>;
  getGroupBy(): GroupByState;
  getGroupExpansion(): GroupExpansionState;
  /** The active page and page size. Meaningful even when `paginated` is off — it stays at page 0 over the grid's whole (single) page. */
  getPagination(): PaginationState;
  /** How many pages the current `pagination.pageSize` splits the grid's rows into — `1` whenever `paginated` is off. */
  getPageCount(): number;
  /**
   * The grand-total aggregate results — every active aggregate computed over
   * the whole filtered/sorted dataset, ungrouped and unpaginated. A specific
   * group's own results are read off `getDisplayRows()` instead, on that
   * group header's `aggregates` field.
   */
  getAggregates(): AggregateResults;
  getRowSelection(): SelectionState;
  /**
   * The selected rows themselves, in the order they were selected — among
   * every row the filter lets through, on any page or in any group, so a row
   * filtered out while selected is left out until it is back.
   */
  getSelectedRows(): readonly ResolvedRow<Row>[];
  getColumnSelection(): SelectionState;
  getCellSelection(): CellSelectionState;
  /** The cell currently holding the grid's single tab stop. */
  getFocusedCell(): { rowIndex: number; columnIndex: number };
  /**
   * Every slice of state as the grid applies it, in one object — what
   * `restoreState` takes back. Pass it through `serializeGridState` before
   * saving it as JSON.
   */
  getState(): GridState<Row>;
  /**
   * Puts back state saved earlier, whole or in part — from `getState()`, or
   * from `serializeGridState` and back through JSON. Each slice given is set
   * as its setter would set it, firing its callback when it changes; the
   * grid re-renders once.
   */
  restoreState(
    saved: Partial<GridState<Row>> | Partial<SerializedGridState<Row>>,
  ): void;

  focusCell(rowIndex: number, columnIndex: number): void;
  clearSelection(): void;
  selectAllRows(): void;
  /**
   * Selects rows by id, as far as `selectable.rows` allows: `"replace"` (the
   * default) selects exactly these — only the last of them under
   * `"single"` — and `"toggle"` flips each one. Fires the row selection
   * callbacks once for the whole call, and none when nothing changed.
   */
  selectRows(rowIds: readonly string[], intent?: "replace" | "toggle"): void;
  /** Expands every group at once — there is no dedicated UI control for it. */
  expandAllGroups(): void;
  /** Collapses every group currently shown at once — see `collapseAllGroups` in `@gridkitjs/core` for what "currently shown" means for a group already nested under a collapsed one. */
  collapseAllGroups(): void;
  /** Moves to the given page, clamped into range. */
  goToPage(pageIndex: number): void;
  /** Moves to the next page. A no-op on the last page. */
  nextPage(): void;
  /** Moves to the previous page. A no-op on the first page. */
  previousPage(): void;
  /** Changes the page size, resetting to the first page. */
  setPageSize(pageSize: number): void;
  /**
   * Shows the columns with the given ids, each in the place it held when
   * hidden. Reports one `onColumnVisibilityChange` for the whole call, and
   * none if every column was already showing.
   */
  showColumns(columnIds: readonly string[]): void;
  /**
   * Hides the columns with the given ids. A hidden column still sorts,
   * filters and groups, and keeps its place in the column order.
   */
  hideColumns(columnIds: readonly string[]): void;
  /**
   * Replaces the filter, the way a filter UI would, and sends an uncontrolled
   * grid back to its first page. Reports one `onFilterChange`, and none when
   * `filter` is equal to the current one. With a controlled `filter` prop it
   * only asks, as any change does.
   */
  setFilter(filter: FilterState<Row>): void;
  /**
   * Replaces the sort. Reports one `onColumnSortChange`, naming the first
   * column whose place or direction changed, and none for an equal sort —
   * the rule every setter below follows for its own slice and callback.
   */
  setColumnSort(sort: ColumnSortState): void;
  /** Replaces the group-by stack. Reports through `onGroupByChange`. */
  setGroupBy(groupBy: GroupByState): void;
  /** Replaces the collapsed groups. Reports through `onGroupExpansionChange` with `groupId: null`. */
  setGroupExpansion(expansion: GroupExpansionState): void;
  /** Replaces the page and page size as given. Reports through `onPaginationChange`. */
  setPagination(pagination: PaginationState): void;
  /** Replaces the column widths. Reports through `onColumnResize`, as the `"end"` of a resize. */
  setColumnSizing(sizing: ColumnSizingState): void;
  /** Replaces the column order. Reports through `onColumnOrderChange`. */
  setColumnOrder(order: ColumnOrderState): void;
  /** Replaces the column visibility state. Reports through `onColumnVisibilityChange`. */
  setColumnVisibility(visibility: ColumnVisibilityState): void;
  /** Replaces the selected row ids as given, whatever `selectable` allows. Fires the row selection callbacks. */
  setRowSelection(selection: SelectionState): void;
  /** Replaces the selected column ids as given. Fires the column selection callbacks. */
  setColumnSelection(selection: SelectionState): void;
  /** Replaces the selected cell as given, `null` for none. Fires the cell selection callbacks. */
  setCellSelection(selection: CellSelectionState): void;
  /**
   * Sizes a shown column to fit its content, as double-clicking its resize
   * handle does, reporting through `onColumnResize`. A hidden column, or one
   * with no rows to measure, is left as it is.
   */
  autoFitColumn(columnId: string): void;
  /** Scrolls the row with the given id into view, if it is currently shown. */
  scrollToRow(rowId: string, options?: ScrollIntoViewOptions): void;
  /** Scrolls the column with the given id into view. */
  scrollToColumn(columnId: string, options?: ScrollIntoViewOptions): void;

  /**
   * Registers `listener` to be called after any render in which the grid's
   * internal state may have changed — every getter above may return a
   * different value once `listener` fires, not just one. Returns an
   * unsubscribe function. The primitive the `use*State` hooks under
   * `packages/react/src/DataGrid/hooks/` build on; most consumers should
   * reach for one of those instead of calling `subscribe` directly.
   */
  subscribe(listener: () => void): () => void;
}

/**
 * Defined in `@gridkitjs/core` with the rest of `GridOptions`, and exported
 * from here too so a React consumer needs one import.
 */
export type { Borders, GroupByBarVisibility, HoverableConfig, ResizeMode };

/**
 * A stable empty fallback for an omitted `aggregates` prop, for the parts of
 * the grid that draw aggregate cells — a fresh `[]` every render would hand
 * them a new array each time.
 */
const NO_AGGREGATES: AggregateState<never> = [];

/**
 * `DataGridApi.getPagination`, read off `controller` at call time: the page
 * shown — clamped, unlike the stored index — and the page size. The same
 * object while both stay the same, since a `useSyncExternalStore` snapshot
 * built fresh on every read makes React warn and re-render forever.
 */
function paginationReader<Row>(
  controller: DataGridController<Row>,
): () => PaginationState {
  let last: PaginationState | undefined;
  return () => {
    const { pageIndex } = controller.getView();
    const { pageSize } = controller.getState().pagination;
    if (last?.pageIndex !== pageIndex || last.pageSize !== pageSize) {
      last = { pageIndex, pageSize };
    }
    return last;
  };
}

/**
 * Everything a `pager.template` render prop needs to rebuild the built-in
 * pager's UI itself. Passed fresh on every render where pagination-relevant
 * state changed, so it's current by construction — unlike `DataGridApi`'s
 * imperative methods and snapshot getters, which carry no "something
 * changed, re-render" signal of their own.
 */
export interface PagerTemplateContext {
  /** Same shape as `DataGridApi.getPagination()` — 0-based `pageIndex`. */
  pagination: PaginationState;
  /** `pagination.pageIndex + 1`, clamped — the display-ready page number. */
  currentPage: number;
  pageCount: number;
  /** Passthrough of `pager.sizeOptions`, undefined when not given. */
  pageSizeOptions: readonly number[] | undefined;
  /** 0-based, same as `DataGridApi.goToPage` — not `currentPage`'s numbering. */
  goToPage: (pageIndex: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  setPageSize: (pageSize: number) => void;
}

/** Presentation options for the grid's built-in pager. */
export interface PagerConfig {
  /** Page sizes offered by the built-in pager's page-size control. */
  sizeOptions?: readonly number[] | undefined;
  /** Defaults to `"compact"` — today's Prev/status/Next. */
  variant?: "compact" | "numbered" | undefined;
  /** Numbered variant only. How many pages to always show at each end. Defaults to 1. */
  boundaryCount?: number | undefined;
  /** Numbered variant only. How many pages to show on each side of the current page. Defaults to 1. */
  siblingCount?: number | undefined;
  /** Replaces the built-in pager entirely when given. `variant` is ignored. */
  template?: ((context: PagerTemplateContext) => ReactNode) | undefined;
}

/**
 * Loads more rows as the user scrolls near the bottom, in place of paging.
 * Appends only — there is no equivalent of `paginated`'s reset-to-page-0 for
 * a result set that shrinks out from under the current position.
 */
export interface InfiniteScrollConfig {
  /** Whether a further `onLoadMore` could still return more rows. `false` removes the sentinel entirely, so no further scrolling can trigger a load. */
  readonly hasMore: boolean;
  /**
   * Called at most once per genuine threshold-crossing: fires when the
   * sentinel comes within `rootMargin` of the body's viewport, and not again
   * until `isLoadingMore` has gone back to `false`.
   */
  readonly onLoadMore: () => void;
  /** Whether a load triggered by `onLoadMore` is still in flight. Suppresses further calls to it until this goes back to `false`. */
  readonly isLoadingMore?: boolean | undefined;
  /**
   * `IntersectionObserver`'s `rootMargin` — how far from the bottom of the
   * scrollable body `onLoadMore` fires, ahead of the sentinel actually
   * scrolling into view. Defaults to `"200px"`.
   */
  readonly rootMargin?: string | undefined;
  /** Replaces the built-in "Loading more…" row. */
  readonly loadingTemplate?: (() => ReactNode) | undefined;
}

/**
 * The props that name a React type, and so have no place in the
 * framework-free `GridOptions`: columns whose templates return `ReactNode`,
 * and the pager and infinite-scroll configs whose templates do too.
 */
export interface ReactRenderSlots<Row> {
  columns?: readonly ColumnDefinition<Row>[] | undefined;
  /** Presentation options for the built-in pager. */
  pager?: PagerConfig | undefined;
  /**
   * Loads more rows as the user scrolls near the bottom, instead of paging.
   * Mutually exclusive with `paginated` — setting both logs a dev-time
   * `console.error` and only `paginated` takes effect. Recommended (not
   * required) alongside `virtualized` for a dataset that grows without
   * bound, so the mounted row count never grows with it either.
   */
  infiniteScroll?: InfiniteScrollConfig | undefined;
}

/**
 * Every grid setting in `@gridkitjs/core`'s `GridOptions`, plus what only
 * React can express: render slots, selection callbacks carrying React-bound
 * columns, and the `ref`.
 */
export interface DataGridProps<Row>
  extends GridOptions<Row>, ReactRenderSlots<Row>, SelectionCallbacks<Row> {
  /** Imperative handle for reading live grid state and triggering actions. */
  ref?: Ref<DataGridApi<Row>> | undefined;
}

/**
 * `DataGridApi.getSelectedRows`, read off `controller` at call time: the
 * selected ids resolved against every filtered row. Recomputed only when the
 * rows or the selection change, so repeated reads are cheap and return the
 * same array.
 */
function selectedRowsReader<Row>(
  controller: DataGridController<Row>,
): () => readonly ResolvedRow<Row>[] {
  let last:
    | {
        readonly rows: readonly ResolvedRow<Row>[];
        readonly selection: SelectionState;
        readonly selected: readonly ResolvedRow<Row>[];
      }
    | undefined;
  return () => {
    const { rows } = controller.getView();
    const selection = controller.getState().rowSelection;
    if (last?.rows !== rows || last.selection !== selection) {
      const rowsById = new Map(rows.map((entry) => [entry.rowId, entry]));
      last = { rows, selection, selected: resolveRows(rowsById, selection) };
    }
    return last.selected;
  };
}

/** "3 rows selected", for the live region. */
function countMessage(count: number, noun: string): string {
  if (count === 0) {
    return `No ${noun}s selected`;
  }
  return count === 1
    ? `1 ${noun} selected`
    : `${String(count)} ${noun}s selected`;
}

export function DataGrid<Row>(props: DataGridProps<Row>) {
  const {
    borders,
    hoverable,
    selectable,
    resizeMode = "fit",
    columnSizeDefaults,
    onColumnResize,
    sortableColumns = false,
    onColumnSortChange,
    groupableColumns = false,
    groupToggleIconColumns = true,
    groupByBarVisibility = "auto",
    onGroupByChange,
    onGroupExpansionChange,
    paginated = false,
    pager,
    onPaginationChange,
    onCellSelectionChange,
    infiniteScroll,
    aggregates = NO_AGGREGATES as AggregateState<Row>,
    groupAggregateDisplay = "inline",
    height,
    virtualized = false,
    overscan = 4,
    estimatedRowHeight = 40,
    label,
    labelledBy,
    locale,
    ref,
  } = props;
  const hoverRows = hoverable?.rows ?? true;
  const hoverColumns = hoverable?.columns ?? true;
  const hoverCells = hoverable?.cells ?? true;

  const viewportRef = useRef<HTMLDivElement>(null);
  const headerTableRef = useRef<HTMLTableElement>(null);
  const bodyTableRef = useRef<HTMLTableElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLTableRowElement>(null);
  const viewportWidth = useElementWidth(viewportRef, resizeMode === "fit");
  const subscribersRef = useRef(new Set<() => void>());
  const [announcement, setAnnouncement] = useState("");

  /**
   * Every slice of grid state, and everything the grid draws, comes from
   * here. The change callbacks go in wrapped, so each change is announced
   * where the controller reports it — see `announce`.
   */
  const { controller, state, view } = useGridController<Row>({
    ...props,
    viewportWidth,
    onColumnResize: handleColumnResize,
    onColumnSortChange: handleColumnSortChange,
    onGroupByChange: handleGroupByChange,
    onGroupExpansionChange: handleGroupExpansionChange,
    onPaginationChange: handlePaginationChange,
    onCellSelectionChange: handleCellSelectionChange,
    onSelectionDiff: handleSelectionDiff,
  });

  /**
   * `getPagination()`'s value: the page shown — clamped, unlike the stored
   * index — and the page size, kept as one object while both stay the same.
   * Read live off the controller rather than this render, so a read straight
   * after an action sees it.
   */
  const [readPagination] = useState(() => paginationReader(controller));
  const [readSelectedRows] = useState(() => selectedRowsReader(controller));

  /**
   * `enabled` is `virtualized` alone, independent of `height`: an `auto`
   * height body has no `overflow`, so its measured `clientHeight` covers
   * the whole content and the computed range naturally comes out as
   * everything anyway — the dev-time warning below is what tells a consumer
   * that combination does nothing useful, not a behavioral gate here.
   */
  const virtualizer = useRowVirtualizer({
    enabled: virtualized,
    rows: view.pageRows,
    bodyScrollRef,
    estimatedRowHeight,
    overscan,
  });

  useEffect(() => {
    if (virtualized && height === undefined) {
      console.error(
        "DataGrid: `virtualized` has no effect without `height` — a body with no bounded height has no viewport to window rows against.",
      );
    }
  }, [virtualized, height]);

  const hasInfiniteScroll = infiniteScroll !== undefined;
  useEffect(() => {
    if (paginated && hasInfiniteScroll) {
      console.error(
        "DataGrid: `paginated` and `infiniteScroll` are mutually exclusive — only `paginated` takes effect while both are set.",
      );
    }
  }, [paginated, hasInfiniteScroll]);

  useInfiniteScroll({
    rootRef: bodyScrollRef,
    sentinelRef,
    config: infiniteScroll,
  });

  /** What a column is called in an announcement — see `resolveColumnHeaderText`. */
  function columnName(columnId: string): string {
    const entry = view.dataColumns.find(
      (candidate) => candidate.id === columnId,
    );
    return entry === undefined
      ? columnId
      : resolveColumnHeaderText(entry.column);
  }

  /**
   * Reports a change no visual cue can carry to a screen reader. Held as state
   * rather than written to the DOM directly so React owns the one element the
   * live region watches.
   */
  function announce(message: string): void {
    setAnnouncement(message);
  }

  /**
   * Announced only once the drag ends: the controller reports the continuous
   * `"move"` phase as well, and a live region given every frame of a drag
   * says nothing an assistive technology can keep up with.
   */
  function handleColumnResize(event: ColumnResizeEvent): void {
    onColumnResize?.(event);
    if (event.phase === "end") {
      announce(
        `${columnName(event.columnId)}, ${String(Math.round(event.width))} pixels wide`,
      );
    }
  }

  const resize = useColumnResize<Row>({
    // `measureColumnContent` only ever matches `td[data-gridkit-column]`
    // (never `th`), so the header table has nothing for it to find — the
    // body table alone was already the effective scope before this split.
    tableRef: bodyTableRef,
    controller,
    columnSizeDefaults,
  });

  /** Wrapped the same way `handleColumnResize` is, for its own announcement. */
  function handleGroupByChange(event: GroupByEvent): void {
    onGroupByChange?.(event);
    const entry = event.groupBy.find(
      (candidate) => candidate.columnId === event.columnId,
    );
    if (entry === undefined) {
      announce(`${columnName(event.columnId)}, grouping removed`);
      return;
    }
    announce(
      event.groupBy.length > 1
        ? `Grouped by ${columnName(event.columnId)}, level ${String(event.groupBy.indexOf(entry) + 1)} of ${String(event.groupBy.length)}`
        : `Grouped by ${columnName(event.columnId)}`,
    );
  }

  /**
   * `groupId: null` marks `expandAll`/`collapseAll`, which touch every group
   * in one call rather than one at a time — announced as a single summary
   * instead of naming a group that doesn't apply.
   */
  function handleGroupExpansionChange(event: GroupExpansionEvent): void {
    onGroupExpansionChange?.(event);
    if (event.groupId === null) {
      announce(
        event.expansion.length === 0
          ? "All groups expanded"
          : "All groups collapsed",
      );
      return;
    }
    announce(
      event.expansion.includes(event.groupId)
        ? "Group collapsed"
        : "Group expanded",
    );
  }

  /**
   * Wrapped the same way `handleColumnResize` is, so a toggle, a stack, or a
   * clear back to "none" each get their own announcement.
   */
  function handleColumnSortChange(event: ColumnSortEvent): void {
    onColumnSortChange?.(event);
    const entry = event.sort.find(
      (candidate) => candidate.columnId === event.columnId,
    );
    if (entry === undefined) {
      announce(`${columnName(event.columnId)}, sort cleared`);
      return;
    }
    const direction = entry.direction === "asc" ? "ascending" : "descending";
    announce(
      event.sort.length > 1
        ? `${columnName(event.columnId)} sorted ${direction}, key ${String(event.sort.indexOf(entry) + 1)} of ${String(event.sort.length)}`
        : `${columnName(event.columnId)} sorted ${direction}`,
    );
  }

  /** Wrapped the same way `handleColumnSortChange` is, for its own announcement. */
  function handlePaginationChange(event: PaginationChangeEvent): void {
    onPaginationChange?.(event);
    announce(
      `Page ${String(event.pagination.pageIndex + 1)} of ${String(event.pageCount)}`,
    );
  }

  /**
   * Announced only for a change touching more than one row or column. A
   * single selection is already carried by the focused member's own
   * `aria-selected`, and repeating it here would talk over that. Counted by
   * id, so rows the change touched off screen — on another page, in a
   * collapsed group — count too.
   */
  function handleSelectionDiff(event: SelectionDiffEvent): void {
    if (event.added.length + event.removed.length > 1) {
      announce(
        countMessage(
          event.selection.length,
          event.target === "rows" ? "row" : "column",
        ),
      );
    }
  }

  /**
   * Unlike rows and columns, a cell selection is always exactly one cell —
   * there is no multi-cell range — so it never crosses the count's >1
   * threshold and the focused cell's own `aria-selected` is the only
   * feedback a screen-reader user would otherwise get. Announced on every
   * change that lands on a cell instead.
   */
  function handleCellSelectionChange(
    event: CellSelectionChangeEvent<Row>,
  ): void {
    onCellSelectionChange?.(event);
    if (event.selected !== null) {
      announce(
        `${columnName(event.selected.columnId)}, row ${String(event.selected.rowIndex + 1)}, selected`,
      );
    }
  }

  const nav = useGridNavigation({
    headerTableRef,
    bodyTableRef,
    // `null` when virtualization is off, in which case behavior is
    // byte-for-byte unchanged from before this feature existed.
    virtualRange: virtualized ? virtualizer : null,
    // Group headers are addressable rows too — the whole point of the flat
    // `DisplayRow[]` shape is that they share one position space with data
    // rows, so navigation counts them the same way. Page-relative
    // (`view.pageRows`, not `view.displayRows`): arrow keys operate on what's
    // actually in the DOM, which is the current page — a different "page"
    // concept than `useGridNavigation`'s own Page Up/Down viewport scrolling.
    rowCount: view.pageRows.length,
    columnCount: view.columns.length,
    // A group's own summary row (`groupAggregateDisplay: "row"`) occupies a
    // real slot in `rowCount` above — its DOM position has to line up with
    // everything else — but is presentational, never a tab stop: arrow-key
    // vertical movement steps over it rather than landing there.
    isSkippableRow: (rowIndex) => {
      const entry = view.pageRows[rowIndex];
      return (
        entry !== undefined && "kind" in entry && entry.kind === "group-summary"
      );
    },
  });

  /**
   * Every id in display order, hidden ones included — the list a column
   * move is made among, so a hidden column keeps its slot through a move
   * made around it.
   */
  const orderedIds = useMemo(
    () => view.dataColumns.map((entry) => entry.id),
    [view.dataColumns],
  );

  /**
   * The ids of the columns on screen, which a drag or a keyboard move is
   * resolved against: a move one place left has to pass the next visible
   * column, not stop in front of a hidden one and appear to do nothing.
   */
  const displayedIds = useMemo(
    () => view.columns.map((entry) => entry.id),
    [view.columns],
  );

  /** Every column's definition by id, hidden ones included, for a group header naming a hidden column. */
  const definitions = useMemo(
    () => new Map(view.dataColumns.map((entry) => [entry.id, entry.column])),
    [view.dataColumns],
  );

  /** Column ids whose header may be dragged into the group-by bar at all. */
  const groupByDraggableIds = useMemo(
    () =>
      new Set(
        view.columns
          .filter((entry) => entry.groupByDraggable)
          .map((entry) => entry.id),
      ),
    [view.columns],
  );

  /**
   * The one place a drop is applied — the two-armed switch on `target.kind`
   * the group-by bar's own second drop zone was always going to need.
   */
  function handleDrop(target: DropTarget, movedId: string): void {
    if (target.kind === "group-by") {
      // Already announced: `moveGroupBy` reports through the same
      // `onGroupByChange` pipeline the header toggle and the bar's own chip
      // drag do, so this needs no announcement or focus-follow of its own —
      // unlike a column-order drop, the moved thing leaves the grid's single
      // tab-stop system entirely for the bar's own independently-focusable
      // chips, which have no shared index to update.
      controller.moveGroupBy(movedId, target.beforeColumnId);
      return;
    }

    // The order the controller will arrive at, worked out here as well for
    // where the column lands on screen. `moveColumnBefore` hands back the
    // same reference for a move that changes nothing, so a drop in place
    // neither renders nor reports.
    const next = moveColumnBefore(orderedIds, movedId, target.beforeId);
    if (next === orderedIds) {
      return;
    }
    controller.moveColumn(movedId, target.beforeId);
    // Counted among the columns on screen, which is what the user can see
    // and what the tab stop indexes.
    const shown = next.filter((id) => displayedIds.includes(id));
    const position = shown.indexOf(movedId);
    announce(
      `${columnName(movedId)}, column ${String(position + 1)} of ${String(shown.length)}`,
    );
    /**
     * The tab stop travels with the column. React reorders the headers by key,
     * so the browser's focus stays on the moved one by itself — without this
     * the stop would be left on whichever column took its index, and the next
     * arrow key would appear to do nothing.
     */
    nav.focusCell(HEADER_ROW, position);
  }

  const drag = useColumnDrag<Row>({
    order: displayedIds,
    groupBy: state.groupBy,
    groupByDraggableIds,
    onDrop: handleDrop,
  });

  /** Whether the header drag currently open (if any) is for a column already in the group-by stack — reordering it is the chip's job, so dragging it back in is never a valid target. */
  const draggedColumnAlreadyGrouped =
    drag.draggedColumnId !== null &&
    state.groupBy.some((entry) => entry.columnId === drag.draggedColumnId);

  /**
   * Whether the drag currently open (if any) could land on the group-by bar
   * — the signal `groupByBarVisibility="auto"` needs to show the bar as a
   * drop target even while `groupBy` is still empty. Depends only on
   * `draggedColumnId` (set once the drag opens), the static
   * `groupByDraggableIds`, and whether that column is already grouped, never
   * the pointer's current position, so the bar mounts for the drag's whole
   * duration rather than flickering in only while directly hovering it.
   */
  const dragEligibleForGroupBy =
    drag.draggedColumnId !== null &&
    groupByDraggableIds.has(drag.draggedColumnId) &&
    !draggedColumnAlreadyGrouped;

  const showGroupByBar =
    groupByBarVisibility === "always" ||
    (groupByBarVisibility === "auto" &&
      (state.groupBy.length > 0 || dragEligibleForGroupBy));

  const headerGroupByDropTarget =
    drag.dropTarget?.kind === "group-by" ? drag.dropTarget : null;

  /** What the built-in pager draws, and what a `pager.template` is handed. */
  const pagerContext: PagerTemplateContext = {
    pagination: state.pagination,
    currentPage: Math.min(state.pagination.pageIndex + 1, view.pageCount),
    pageCount: view.pageCount,
    pageSizeOptions: pager?.sizeOptions,
    goToPage: controller.goToPage,
    nextPage: controller.nextPage,
    previousPage: controller.previousPage,
    setPageSize: controller.setPageSize,
  };

  const selection = useGridSelection<Row>({ controller, state, selectable });

  const multiselectable =
    selection.rowMode === "multiple" || selection.columnMode === "multiple";

  /**
   * Tells `subscribe`'s listeners once a render has drawn a change: to the
   * controller's state or view — whether an action or a prop made it — or to
   * the focused cell, which React still holds itself.
   *
   * Gated on those values, not run after every render: `useSyncExternalStore`
   * re-renders a subscriber that is notified, and a subscriber that renders
   * this grid as a plain (non-memoized) child would re-render it in turn and
   * be notified again, forever, though nothing ever changed. The state and
   * view objects keep their identity until something in them changes, which
   * is what breaks that cycle.
   */
  useEffect(() => {
    for (const listener of subscribersRef.current) {
      listener();
    }
  }, [view, state, nav.focus]);

  /**
   * No deps array: `nav`, `resize` and `virtualizer` are freshly
   * constructed every render (none of those hooks memoize their returned
   * API), so the handle has to be rebuilt every render too or its closures
   * would go stale. Grid state is read off the controller at call time.
   */
  useImperativeHandle(ref, () => ({
    get element() {
      return viewportRef.current;
    },
    get table() {
      return bodyTableRef.current;
    },
    getRows: () => controller.getView().rows,
    // Every group header's own `aggregates` field is populated here — the
    // whole reason `getDisplayRows()` is where a consumer reads a specific
    // group's computed results from.
    getDisplayRows: () => controller.getView().displayRows,
    getPageRows: () => controller.getView().pageRows,
    getColumns: () => controller.getView().columns,
    getDataColumns: () => controller.getView().dataColumns,
    getColumnSizing: () => controller.getState().columnSizing,
    getColumnOrder: () => controller.getState().columnOrder,
    getColumnVisibility: () => controller.getState().columnVisibility,
    getColumnSort: () => controller.getState().columnSort,
    getFilter: () => controller.getState().filter,
    getGroupBy: () => controller.getState().groupBy,
    getGroupExpansion: () => controller.getState().groupExpansion,
    getPagination: readPagination,
    getPageCount: () => controller.getView().pageCount,
    getAggregates: () => controller.getView().grandTotal,
    getRowSelection: () => controller.getState().rowSelection,
    getSelectedRows: readSelectedRows,
    getColumnSelection: () => controller.getState().columnSelection,
    getCellSelection: () => controller.getState().cellSelection,
    getFocusedCell: () => nav.focus,
    getState: controller.getState,
    restoreState: controller.restoreState,
    focusCell: nav.focusCell,
    clearSelection: controller.clearSelection,
    selectAllRows: controller.selectAllRows,
    selectRows: controller.selectRows,
    expandAllGroups: controller.expandAllGroups,
    collapseAllGroups: controller.collapseAllGroups,
    goToPage: controller.goToPage,
    nextPage: controller.nextPage,
    previousPage: controller.previousPage,
    setPageSize: controller.setPageSize,
    showColumns: controller.showColumns,
    hideColumns: controller.hideColumns,
    setFilter: controller.setFilter,
    setColumnSort: controller.setColumnSort,
    setGroupBy: controller.setGroupBy,
    setGroupExpansion: controller.setGroupExpansion,
    setPagination: controller.setPagination,
    setColumnSizing: controller.setColumnSizing,
    setColumnOrder: controller.setColumnOrder,
    setColumnVisibility: controller.setColumnVisibility,
    setRowSelection: controller.setRowSelection,
    setColumnSelection: controller.setColumnSelection,
    setCellSelection: controller.setCellSelection,
    autoFitColumn: (columnId) => {
      const entry = controller
        .getView()
        .columns.find((candidate) => candidate.id === columnId);
      if (entry !== undefined) {
        resize.sizeToContent(entry);
      }
    },
    scrollToRow: (rowId, options) => {
      // `pageRows`, not `displayRows`: a data row's DOM position is its place
      // in the currently rendered page — with grouping active, that's its
      // place in the grouped, flattened output; with pagination also active,
      // that's the page's own slice of it. A row on a different page isn't
      // in the DOM at all, so there is nothing to scroll to.
      const index = controller
        .getView()
        .pageRows.findIndex(
          (entry) => !("kind" in entry) && entry.rowId === rowId,
        );
      if (index === -1) return;
      // Under virtualization the target row may not be mounted at all —
      // `virtualizer.scrollToIndex` estimates, scrolls, and self-corrects
      // once it mounts and is measured, rather than reaching for a DOM row
      // that may not exist.
      if (virtualized) {
        virtualizer.scrollToIndex(index, options);
        return;
      }
      bodyTableRef.current?.tBodies[0]?.rows[index]?.scrollIntoView(options);
    },
    scrollToColumn: (columnId, options) => {
      // The whole viewport, not just one table: a column's cells with
      // `data-gridkit-column` now live across three sibling tables
      // (header/body/footer) rather than one, and the header's `<th>` is
      // the one guaranteed to exist even when the body has no rows.
      const cells = viewportRef.current?.querySelectorAll(
        "[data-gridkit-column]",
      );
      const cell = cells
        ? Array.from(cells).find(
            (entry) => entry.getAttribute("data-gridkit-column") === columnId,
          )
        : undefined;
      cell?.scrollIntoView(options);
    },
    subscribe: (listener) => {
      subscribersRef.current.add(listener);
      return () => {
        subscribersRef.current.delete(listener);
      };
    },
  }));

  // Shared by all three tables below, so borders/hover/selectable styling —
  // every `.gridkit-data-grid.<modifier>` rule in `theme-tailwind` — applies
  // identically to each rather than only to whichever one happened to carry
  // it. Each rule's own descendant selector (e.g. `.borders-horizontal
  // .grid-cell`) still needs the modifier class on that cell's own table
  // ancestor, which is exactly what splitting into one table per section
  // would otherwise lose.
  const gridTableClassName = classNames(
    "gridkit-data-grid",
    borders ? `borders-${borders}` : "",
    // Hover is on by default and selection off, so one set of classes
    // turns styling off and the other turns it on. The polarity differs
    // because the defaults do.
    hoverRows ? "" : "no-hover-rows",
    hoverColumns ? "" : "no-hover-columns",
    hoverCells ? "" : "no-hover-cells",
    selection.rowMode === false ? "" : "selectable-rows",
    selection.columnMode === false ? "" : "selectable-columns",
    selection.cellMode === false ? "" : "selectable-cells",
  );

  return (
    <div className="gridkit-data-grid-viewport" ref={viewportRef}>
      {showGroupByBar && (
        <GroupByBar<Row>
          columns={view.columns}
          definitions={definitions}
          groupBy={state.groupBy}
          controller={controller}
          columnName={columnName}
          headerDragEligible={dragEligibleForGroupBy}
          headerDragBlocked={draggedColumnAlreadyGrouped}
          headerDropTarget={headerGroupByDropTarget}
        />
      )}
      <div
        className="gridkit-data-grid-tables"
        /*
         * `role="grid"` sits on this wrapper rather than any one of the
         * three `<table>`s below: the WAI-ARIA grid pattern needs a single
         * ancestor holding every row — header, body, and (when aggregates
         * are active) footer alike — and no one table is an ancestor of the
         * other two's rows now that they're split. It obliges the single
         * tab stop `useGridNavigation` keeps.
         *
         * Switches to `"treegrid"` — the WAI-ARIA pattern for expandable,
         * collapsible rows — whenever `groupBy` is non-empty, rather than
         * committing to it unconditionally. The alternative (always
         * `treegrid`) would change what every existing, ungrouped consumer
         * announces to assistive technology the moment this feature shipped;
         * that regression is certain, while the edge case this trades away —
         * the role flipping mid-session if a consumer removes its last
         * group-by level — is rare and, per the WAI-ARIA grid pattern, still
         * a valid `role` change to make when the row structure itself
         * changes shape. See the "Scope note" this mirrors: grouping stays
         * an internal detail for an ungrouped grid, ARIA role included.
         */
        role={state.groupBy.length > 0 ? "treegrid" : "grid"}
        // The header is a row too, and counted from one; group headers (and,
        // under `groupAggregateDisplay: "row"`, each group's own summary
        // row) count as rows here too, the same way they do in `nav`'s
        // `rowCount`. `view.displayRows`, not `view.pageRows`: the total
        // dataset count, not the current page's, so this stays the true row
        // count per the WAI-ARIA grid pattern even while paged.
        aria-rowcount={view.displayRows.length + 1}
        aria-colcount={view.columns.length}
        {...ariaAttr(multiselectable, "aria-multiselectable", true)}
        {...ariaAttr(labelledBy !== undefined, "aria-labelledby", labelledBy)}
        {...ariaAttr(
          labelledBy === undefined && label !== undefined,
          "aria-label",
          label,
        )}
        onKeyDown={(event) => {
          /*
           * The two keys that address the grid rather than a cell, and so are
           * caught here where everything bubbles to rather than in each of
           * them.
           */
          if (event.key === "Escape") {
            // A gesture in flight has its own use for Escape — cancelling —
            // and gets it first.
            if (drag.draggedColumnId !== null || resize.activeColumnId !== null)
              return;
            selection.clear();
            return;
          }
          if (
            (event.ctrlKey || event.metaKey) &&
            (event.key === "a" || event.key === "A")
          ) {
            // Left to the browser unless the grid has something to do with it,
            // so a grid without multiple rows does not swallow select-all.
            if (selection.rowMode !== "multiple") return;
            event.preventDefault();
            selection.selectAllRows();
          }
        }}
      >
        <table
          ref={headerTableRef}
          // Widths are only honoured exactly when the table is as wide as its
          // columns; at `100%` the fixed layout redistributes the difference.
          style={{ width: totalColumnWidth(view.columns) }}
          className={classNames(gridTableClassName, "gridkit-data-grid-header")}
        >
          <GridColgroup columns={view.columns} />
          <GridHeader<Row>
            columns={view.columns}
            resize={resize}
            drag={drag}
            controller={controller}
            columnSort={state.columnSort}
            sortableColumns={sortableColumns}
            groupBy={state.groupBy}
            groupableColumns={groupableColumns}
            groupToggleIconColumns={groupToggleIconColumns}
            nav={nav}
            selection={selection}
          />
        </table>

        <div
          className="gridkit-data-grid-body"
          ref={bodyScrollRef}
          style={
            height === undefined
              ? undefined
              : ({
                  "--gridkit-body-height":
                    typeof height === "number" ? `${String(height)}px` : height,
                } as CSSProperties)
          }
        >
          <table
            ref={bodyTableRef}
            style={{ width: totalColumnWidth(view.columns) }}
            className={gridTableClassName}
          >
            <GridColgroup columns={view.columns} />
            <GridBody<Row>
              columns={view.columns}
              definitions={definitions}
              rows={view.pageRows}
              activeColumnId={resize.activeColumnId}
              nav={nav}
              selection={selection}
              controller={controller}
              aggregates={aggregates}
              groupAggregateDisplay={groupAggregateDisplay}
              virtualRange={virtualized ? virtualizer : null}
              infiniteScroll={infiniteScroll}
              sentinelRef={sentinelRef}
              locale={locale}
            />
          </table>
        </div>

        {aggregates.length > 0 && (
          <table
            style={{ width: totalColumnWidth(view.columns) }}
            className={classNames(
              gridTableClassName,
              "gridkit-data-grid-footer",
            )}
          >
            <GridColgroup columns={view.columns} />
            <GridFooter<Row>
              columns={view.columns}
              aggregates={aggregates}
              results={view.grandTotal}
              rows={view.rows.map((entry) => entry.row)}
              locale={locale}
            />
          </table>
        )}
      </div>
      {paginated &&
        (pager?.template ? (
          pager.template(pagerContext)
        ) : (
          <GridPager pager={pagerContext} config={pager} />
        ))}
      {/*
       * Outside the table, which admits no `div`, and polite so it waits for a
       * pause rather than cutting across what the user is already hearing.
       */}
      <div className="gridkit-sr-only" role="status" aria-live="polite">
        {announcement}
      </div>
    </div>
  );
}
