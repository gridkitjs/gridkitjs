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
  createGridViewResolver,
  defineColumnsFromRows,
  moveColumnBefore,
  resolveColumnHeaderText,
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
import useColumnSort from "./useColumnSort";
import useColumnVisibility from "./useColumnVisibility";
import useElementWidth from "./useElementWidth";
import useGridNavigation, { HEADER_ROW } from "./useGridNavigation";
import useGridSelection, { type SelectionCallbacks } from "./useGridSelection";
import useInfiniteScroll from "./useInfiniteScroll";
import usePagination from "./usePagination";
import useRowGrouping from "./useRowGrouping";
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

/**
 * Imperative handle for a mounted `DataGrid`, reached via its `ref`
 * prop. Read-plus-standard-actions: getters mirror the grid's live state,
 * and the actions are the ones every grid ref carries (focus, clear/select
 * all, scroll-to). Sizing, order, sort, and selection stay uncontrolled via
 * their existing `default*` props — this is not a second, imperative-only
 * way to drive that same state. `subscribe` doesn't change that: it's a
 * read/notify channel for reacting to state that already lives here, not a
 * write path — nothing becomes newly *driven* through the ref by its
 * existence. Column visibility is the one exception: the grid has no
 * built-in control for showing or hiding a column, so `showColumns` and
 * `hideColumns` are how it changes. See `packages/react/src/DataGrid/hooks/`
 * for the public hooks built on it.
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
  getColumnSelection(): SelectionState;
  getCellSelection(): CellSelectionState;
  /** The cell currently holding the grid's single tab stop. */
  getFocusedCell(): { rowIndex: number; columnIndex: number };

  focusCell(rowIndex: number, columnIndex: number): void;
  clearSelection(): void;
  selectAllRows(): void;
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

/** `pagination.pageSize` a paginated grid starts at when `defaultPagination` omits one — a reasonable default for an ERP-grade dataset. */
const DEFAULT_PAGE_SIZE = 25;

/**
 * A stable empty fallback for an omitted `aggregates` prop — a fresh `[]`
 * every render would change identity each time and defeat the view
 * stages memoised on it, the same reason `groupRows`/`withGroupAggregates`
 * themselves return their input untouched for an empty array rather than a
 * new one.
 */
const NO_AGGREGATES: AggregateState<never> = [];

/** A stable empty fallback for an omitted `dataSource`, for the same reason. */
const NO_ROWS: readonly never[] = [];

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

export function DataGrid<Row>({
  dataSource,
  columns,
  getRowId,
  borders,
  hoverable,
  selectable,
  defaultRowSelection,
  defaultColumnSelection,
  defaultCellSelection,
  resizableColumns = false,
  reorderableColumns = false,
  resizeMode = "fit",
  defaultColumnSizing,
  defaultColumnOrder,
  defaultColumnVisibility,
  onColumnVisibilityChange,
  columnSizeDefaults,
  onColumnResize,
  onColumnOrderChange,
  sortableColumns = false,
  defaultColumnSort,
  onColumnSortChange,
  groupableColumns = false,
  groupToggleIconColumns = true,
  groupByDraggableColumns = false,
  groupByBarVisibility = "auto",
  defaultGroupBy,
  onGroupByChange,
  defaultGroupExpansion,
  onGroupExpansionChange,
  defaultFilter,
  paginated = false,
  defaultPagination,
  pager,
  onPaginationChange,
  infiniteScroll,
  aggregates,
  groupAggregateDisplay = "inline",
  height,
  virtualized = false,
  overscan = 4,
  estimatedRowHeight = 40,
  label,
  labelledBy,
  locale,
  ref,
  ...callbacks
}: DataGridProps<Row>) {
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
  const [sizing, setSizing] = useState<ColumnSizingState>(
    defaultColumnSizing ?? {},
  );
  const [order, setOrder] = useState<ColumnOrderState>(
    defaultColumnOrder ?? [],
  );
  const [visibility, setVisibility] = useState<ColumnVisibilityState>(
    defaultColumnVisibility ?? {},
  );
  const [sort, setSort] = useState<ColumnSortState>(defaultColumnSort ?? []);
  const [groupBy, setGroupBy] = useState<GroupByState>(defaultGroupBy ?? []);
  const [expansion, setExpansion] = useState<GroupExpansionState>(
    defaultGroupExpansion ?? [],
  );
  const [filter] = useState<FilterState<Row>>(defaultFilter ?? []);
  const [pagination, setPagination] = useState<PaginationState>(
    defaultPagination ?? { pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE },
  );
  const [announcement, setAnnouncement] = useState("");
  const [rowSelection, setRowSelection] = useState<SelectionState>(
    defaultRowSelection ?? [],
  );
  const [columnSelection, setColumnSelection] = useState<SelectionState>(
    defaultColumnSelection ?? [],
  );
  const [cellSelection, setCellSelection] = useState<CellSelectionState>(
    defaultCellSelection ?? null,
  );

  const definedColumns = useMemo<readonly ColumnDefinition<Row>[]>(() => {
    if (columns && columns.length !== 0) return columns;
    if (dataSource && dataSource.length > 0)
      return defineColumnsFromRows(dataSource);
    return [];
  }, [columns, dataSource]);

  const activeAggregates = aggregates ?? (NO_AGGREGATES as AggregateState<Row>);

  /**
   * Everything the grid draws, derived in one place. Held for the grid's
   * lifetime so each stage's memo survives between renders: a render that
   * changed only `sizing` or the viewport width re-sizes the columns and
   * hands back the very same row lists, so a resize never re-runs filtering,
   * sorting or grouping. See `createGridViewResolver` in `@gridkitjs/core`.
   */
  const [resolveView] = useState(() =>
    createGridViewResolver<Row, ReactNode>(),
  );
  const view = resolveView({
    rows: dataSource ?? NO_ROWS,
    getRowId,
    columns: definedColumns,
    state: {
      columnSizing: sizing,
      columnOrder: order,
      columnVisibility: visibility,
      columnSort: sort,
      filter,
      groupBy,
      groupExpansion: expansion,
      pagination,
    },
    options: {
      paginated,
      aggregates: activeAggregates,
      groupAggregateDisplay,
      columnSizeDefaults,
      resizableColumns,
      reorderableColumns,
      groupByDraggableColumns,
      resizeMode,
      viewportWidth,
    },
  });

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

  /**
   * Cached rather than built fresh on every `getPagination()` call: a
   * `useSyncExternalStore`-based hook's `getSnapshot` must return a
   * referentially stable value when nothing changed, or React warns/loops.
   */
  const paginationSnapshot = useMemo<PaginationState>(
    () => ({
      pageIndex: view.pageIndex,
      pageSize: pagination.pageSize,
    }),
    [view.pageIndex, pagination.pageSize],
  );

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
   * Wrapped rather than announced from the resize hook, which reports the
   * continuous `"move"` phase as well — a live region given every frame of a
   * drag says nothing an assistive technology can keep up with.
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
    sizing,
    setSizing,
    columnSizeDefaults,
    onColumnResize: handleColumnResize,
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
   * Constructed ahead of `handleDrop`/`drag` below (rather than alongside
   * `columnSort`, its closest sibling) because `handleDrop`'s `"group-by"`
   * arm calls `grouping.moveGroupBy` directly.
   */
  const grouping = useRowGrouping<Row>({
    groupBy,
    setGroupBy,
    expansion,
    setExpansion,
    onGroupByChange: handleGroupByChange,
    onGroupExpansionChange: handleGroupExpansionChange,
  });

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
   * Every id in display order, hidden ones included, which a drop is applied
   * to — the order state starts empty and may name only some columns, so
   * moving against it directly would have nothing to rearrange, and a hidden
   * column has to keep its slot through a move made around it.
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
      // Already announced: `grouping.moveGroupBy` commits through the same
      // `onGroupByChange` pipeline the header toggle and the bar's own chip
      // drag do, so this needs no announcement or focus-follow of its own —
      // unlike a column-order drop, the moved thing leaves the grid's single
      // tab-stop system entirely for the bar's own independently-focusable
      // chips, which have no shared index to update.
      grouping.moveGroupBy(movedId, target.beforeColumnId);
      return;
    }

    const next = moveColumnBefore(orderedIds, movedId, target.beforeId);
    // `moveColumnBefore` hands back the same reference for a move that changes
    // nothing, so a drop in place neither renders nor reports.
    if (next === orderedIds) {
      return;
    }
    // Counted among the columns on screen, which is what the user can see
    // and what the tab stop indexes.
    const shown = next.filter((id) => displayedIds.includes(id));
    const position = shown.indexOf(movedId);
    setOrder(next);
    onColumnOrderChange?.({ columnId: movedId, order: next });
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
    groupBy,
    groupByDraggableIds,
    onDrop: handleDrop,
  });

  /** Whether the header drag currently open (if any) is for a column already in the group-by stack — reordering it is the chip's job, so dragging it back in is never a valid target. */
  const draggedColumnAlreadyGrouped =
    drag.draggedColumnId !== null &&
    groupBy.some((entry) => entry.columnId === drag.draggedColumnId);

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
      (groupBy.length > 0 || dragEligibleForGroupBy));

  const headerGroupByDropTarget =
    drag.dropTarget?.kind === "group-by" ? drag.dropTarget : null;

  /**
   * Wrapped the same way `handleColumnResize`/`handleDrop` are, so a toggle,
   * a stack, or a clear back to "none" each get their own announcement.
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

  const columnSort = useColumnSort<Row>({
    sort,
    setSort,
    onColumnSortChange: handleColumnSortChange,
  });

  /** Wrapped the same way `handleColumnSortChange` is, for its own announcement. */
  function handlePaginationChange(event: PaginationChangeEvent): void {
    onPaginationChange?.(event);
    announce(
      `Page ${String(event.pagination.pageIndex + 1)} of ${String(event.pageCount)}`,
    );
  }

  const columnVisibility = useColumnVisibility<Row>({
    dataColumns: view.dataColumns,
    visibility,
    setVisibility,
    onColumnVisibilityChange,
  });

  const paginationApi = usePagination<Row>({
    pagination,
    setPagination,
    rows: view.displayRows,
    onPaginationChange: handlePaginationChange,
  });

  /**
   * A user looking at page 7 of a result that filtering, sorting, or
   * regrouping just shrank to 2 pages must not be silently stranded on an
   * empty page — reset to the first page whenever any of the three change.
   *
   * Adjusted during render (React's own pattern for "state changed, derive a
   * reset" — see https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes)
   * rather than in a `useEffect`, which would `setState` a render after the
   * change already committed and paint the stale page for one frame. A
   * plain `setPagination` rather than `pager.goToPage(0)`: this is a
   * consequence of another change, not a page navigation of its own, and so
   * reports no `onPaginationChange` of its own either — the filter/sort/
   * group change's own callback already covers it.
   */
  const [previous, setPrevious] = useState({ filter, sort, groupBy });
  if (
    previous.filter !== filter ||
    previous.sort !== sort ||
    previous.groupBy !== groupBy
  ) {
    setPrevious({ filter, sort, groupBy });
    if (pagination.pageIndex !== 0) {
      setPagination({ ...pagination, pageIndex: 0 });
    }
  }

  const selection = useGridSelection<Row>({
    rows: view.displayDataRows,
    columns: view.columns,
    selectable,
    rowSelection,
    setRowSelection,
    columnSelection,
    setColumnSelection,
    cellSelection,
    setCellSelection,
    callbacks,
    announce,
    columnName,
  });

  const multiselectable =
    selection.rowMode === "multiple" || selection.columnMode === "multiple";

  /**
   * Deps list every getter's own backing value, not threaded through each
   * individual `commitIfChanged`/`setState` call site across the various
   * `use*` hooks above. Several of those bypass `commitIfChanged` on
   * purpose (pagination's own filter/sort/group-triggered page reset,
   * `useColumnResize`'s drag-move phase, `useGroupByDrag`/`useColumnDrag`'s
   * transient drag state) or don't use it at all, so threading a `notify()`
   * through each call site individually is real surface area to get wrong
   * and silently miss a spot. Listing every value here instead means any
   * future getter just needs adding to this array, not a new call site.
   *
   * A plain no-deps effect (fire after every render, let each `listener`'s
   * own `useSyncExternalStore` reference-equality check filter out the
   * no-op ones) looks equivalent but isn't: `useSyncExternalStore` schedules
   * a re-render *before* that bail-out check runs, not after, so notifying
   * on a render that changed nothing here still forces the subscribing
   * component to re-render — and if that component also renders this same
   * `DataGrid` as a plain (non-memoized) sibling, its own re-render
   * re-runs this very effect, forever, even though no value below ever
   * actually changes. Gating on the dependency array is what breaks that
   * cycle, not the listener-side check.
   */
  useEffect(() => {
    for (const listener of subscribersRef.current) {
      listener();
    }
  }, [
    view.rows,
    view.displayRows,
    view.columns,
    view.dataColumns,
    sizing,
    order,
    visibility,
    sort,
    groupBy,
    expansion,
    paginationSnapshot,
    view.pageCount,
    view.grandTotal,
    rowSelection,
    columnSelection,
    cellSelection,
    nav.focus,
  ]);

  /**
   * No deps array: `nav`, `selection`, `resize`, and `drag` are all freshly
   * constructed every render (none of those hooks memoize their returned
   * API), so the handle has to be rebuilt every render too or its closures
   * would go stale.
   */
  useImperativeHandle(ref, () => ({
    get element() {
      return viewportRef.current;
    },
    get table() {
      return bodyTableRef.current;
    },
    getRows: () => view.rows,
    // Every group header's own `aggregates` field is populated here — the
    // whole reason `getDisplayRows()` is where a consumer reads a specific
    // group's computed results from.
    getDisplayRows: () => view.displayRows,
    getPageRows: () => view.pageRows,
    getColumns: () => view.columns,
    getDataColumns: () => view.dataColumns,
    getColumnSizing: () => sizing,
    getColumnOrder: () => order,
    getColumnVisibility: () => visibility,
    getColumnSort: () => sort,
    getGroupBy: () => groupBy,
    getGroupExpansion: () => expansion,
    getPagination: () => paginationSnapshot,
    getPageCount: () => view.pageCount,
    getAggregates: () => view.grandTotal,
    getRowSelection: () => rowSelection,
    getColumnSelection: () => columnSelection,
    getCellSelection: () => cellSelection,
    getFocusedCell: () => nav.focus,
    focusCell: nav.focusCell,
    clearSelection: selection.clear,
    selectAllRows: selection.selectAllRows,
    expandAllGroups: grouping.expandAll,
    collapseAllGroups: () => {
      grouping.collapseAll(view.displayRows);
    },
    goToPage: paginationApi.goToPage,
    nextPage: paginationApi.nextPage,
    previousPage: paginationApi.previousPage,
    setPageSize: paginationApi.setPageSize,
    showColumns: columnVisibility.showColumns,
    hideColumns: columnVisibility.hideColumns,
    scrollToRow: (rowId, options) => {
      // `view.pageRows`, not `view.displayRows`: a data row's DOM position is
      // its place in the currently rendered page — with grouping active,
      // that's its place in the grouped, flattened output; with pagination
      // also active, that's the page's own slice of it. A row on a different
      // page isn't in the DOM at all, so there is nothing to scroll to.
      const index = view.pageRows.findIndex(
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
          grouping={grouping}
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
        role={groupBy.length > 0 ? "treegrid" : "grid"}
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
            sort={columnSort}
            sortableColumns={sortableColumns}
            grouping={grouping}
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
              grouping={grouping}
              aggregates={activeAggregates}
              groupAggregateDisplay={groupAggregateDisplay}
              virtualRange={virtualized ? virtualizer : null}
              infiniteScroll={infiniteScroll}
              sentinelRef={sentinelRef}
              locale={locale}
            />
          </table>
        </div>

        {activeAggregates.length > 0 && (
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
              aggregates={activeAggregates}
              results={view.grandTotal}
              rows={view.rows.map((entry) => entry.row)}
              locale={locale}
            />
          </table>
        )}
      </div>
      {paginated &&
        (pager?.template ? (
          pager.template({
            pagination: paginationApi.pagination,
            currentPage: paginationApi.currentPage,
            pageCount: paginationApi.pageCount,
            pageSizeOptions: pager.sizeOptions,
            goToPage: paginationApi.goToPage,
            nextPage: paginationApi.nextPage,
            previousPage: paginationApi.previousPage,
            setPageSize: paginationApi.setPageSize,
          })
        ) : (
          <GridPager pager={paginationApi} config={pager} />
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
