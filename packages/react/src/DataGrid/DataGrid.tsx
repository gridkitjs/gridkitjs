import {
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from "react";
import {
  applyColumnOrder,
  computeAggregates,
  defineColumnsFromRows,
  fitColumnsToWidth,
  groupRows,
  moveColumnBefore,
  paginateRows,
  resolveColumnWidths,
  resolveRowId,
  resolveShownRows,
  totalColumnWidth,
  withGroupAggregates,
  type ColumnDefinition as CoreColumnDefinition,
  type ResolvedColumn as CoreResolvedColumn,
  type AggregateResults,
  type AggregateState,
  type ColumnOrderEvent,
  type ColumnOrderState,
  type ColumnResizeEvent,
  type ColumnSizeDefaults,
  type ColumnSizingState,
  type ColumnSortEvent,
  type ColumnSortState,
  type DisplayRow,
  type FilterState,
  type GroupAggregateDisplay,
  type GroupByEvent,
  type GroupByState,
  type GroupExpansionEvent,
  type GroupExpansionState,
  type PaginationChangeEvent,
  type PaginationState,
  type ResolvedRow,
  type CellSelectionState,
  type SelectableConfig,
  type SelectedCell as CoreSelectedCell,
  type SelectedColumn as CoreSelectedColumn,
  type SelectionState,
  type CellSelectEvent as CoreCellSelectEvent,
  type CellSelectionChangeEvent as CoreCellSelectionChangeEvent,
  type ColumnSelectEvent as CoreColumnSelectEvent,
  type ColumnSelectionChangeEvent as CoreColumnSelectionChangeEvent,
  type ColumnsSelectEvent as CoreColumnsSelectEvent,
} from "@gridkitjs/core";
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
import useElementWidth from "./useElementWidth";
import useGridNavigation, { HEADER_ROW } from "./useGridNavigation";
import useGridSelection, { type SelectionCallbacks } from "./useGridSelection";
import usePagination from "./usePagination";
import useRowGrouping from "./useRowGrouping";

/**
 * A column whose header and cells may render arbitrary React content.
 * @gridkitjs/core stays framework-agnostic and so leaves that output type open;
 * this is the binding React consumers want, and the one they should import.
 */
export type ColumnDefinition<Row> = CoreColumnDefinition<Row, ReactNode>;

/** A column paired with the width it renders at. */
export type ResolvedColumn<Row> = CoreResolvedColumn<Row, ReactNode>;

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
 * Imperative handle for a mounted `DataGridComponent`, reached via its `ref`
 * prop. Read-plus-standard-actions: getters mirror the grid's live state,
 * and the actions are the ones every grid ref carries (focus, clear/select
 * all, scroll-to). Sizing, order, sort, and selection stay uncontrolled via
 * their existing `default*` props — this is not a second, imperative-only
 * way to drive that same state.
 */
export interface DataGridApi<Row> {
  /** The grid's scrollable viewport element. */
  readonly element: HTMLDivElement | null;
  /** The grid's `<table>` element. */
  readonly table: HTMLTableElement | null;

  /** Rows as currently filtered and sorted — what's rendered, ungrouped. */
  getRows(): readonly ResolvedRow<Row>[];
  /**
   * `getRows()` regrouped into the active `groupBy` — group headers
   * interleaved with data rows, in render order. Identical to `getRows()`
   * when `groupBy` is empty.
   */
  getDisplayRows(): readonly DisplayRow<Row>[];
  /** Columns as currently sized and ordered — what's rendered. */
  getColumns(): readonly ResolvedColumn<Row>[];

  getColumnSizing(): ColumnSizingState;
  getColumnOrder(): ColumnOrderState;
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
  /** Scrolls the row with the given id into view, if it is currently shown. */
  scrollToRow(rowId: string, options?: ScrollIntoViewOptions): void;
  /** Scrolls the column with the given id into view. */
  scrollToColumn(columnId: string, options?: ScrollIntoViewOptions): void;
}

export type Borders = "horizontal" | "vertical" | "all" | "none";

/**
 * How a column's width relates to the grid's.
 *
 * `"fit"` keeps the columns filling the grid: the space a column gives up is
 * handed to the others, and the space it takes comes out of them. `"fixed"`
 * lets every column keep its own width, so a resize moves one column and
 * nothing else, and the grid scrolls or leaves a gap accordingly.
 */
export type ResizeMode = "fit" | "fixed";

/** `pagination.pageSize` a paginated grid starts at when `defaultPagination` omits one — a reasonable default for an ERP-grade dataset. */
const DEFAULT_PAGE_SIZE = 25;

/**
 * A stable empty fallback for an omitted `aggregates` prop — a fresh `[]`
 * every render would change identity each time and defeat the `useMemo`s
 * that depend on it, the same reason `groupRows`/`withGroupAggregates`
 * themselves return their input untouched for an empty array rather than a
 * new one.
 */
const NO_AGGREGATES: AggregateState<never> = [];

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

export interface HoverableConfig {
  rows?: boolean;
  columns?: boolean;
  cells?: boolean;
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

export interface DataGridProps<Row> extends SelectionCallbacks<Row> {
  columns?: readonly ColumnDefinition<Row>[] | undefined;
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
  /** Presentation options for the built-in pager. */
  pager?: PagerConfig | undefined;
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
   * The grid's accessible name, announced when it takes focus. A grid without
   * one is read only as "grid", which says nothing about which grid.
   */
  label?: string | undefined;
  /**
   * The id of an element naming the grid, for a heading already on the page.
   * Takes precedence over `label`, as `aria-labelledby` does.
   */
  labelledBy?: string | undefined;
  /** Imperative handle for reading live grid state and triggering actions. */
  ref?: Ref<DataGridApi<Row>> | undefined;
}

export function DataGridComponent<Row>({
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
  aggregates,
  groupAggregateDisplay = "inline",
  label,
  labelledBy,
  ref,
  ...callbacks
}: DataGridProps<Row>) {
  const hoverRows = hoverable?.rows ?? true;
  const hoverColumns = hoverable?.columns ?? true;
  const hoverCells = hoverable?.cells ?? true;

  const viewportRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const viewportWidth = useElementWidth(viewportRef, resizeMode === "fit");
  const [sizing, setSizing] = useState<ColumnSizingState>(
    defaultColumnSizing ?? {},
  );
  const [order, setOrder] = useState<ColumnOrderState>(
    defaultColumnOrder ?? [],
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

  /**
   * The rows as rendered, each carrying the id everything downstream keys it
   * by. Resolved once here rather than per consumer so a row's id cannot come
   * out differently in two places — the same reason `resolveColumnWidths` runs
   * once ahead of the header and the body.
   *
   * An array rather than a map keyed by id: two rows given the same id is a
   * caller's mistake, and one that should render twice and look wrong rather
   * than silently lose a row.
   */
  const rows = useMemo<readonly ResolvedRow<Row>[]>(
    () =>
      dataSource?.map((row, rowIndex) => ({
        rowId: resolveRowId(row, rowIndex, getRowId),
        row,
        rowIndex,
        datasetIndex: rowIndex,
      })) ?? [],
    [dataSource, getRowId],
  );

  const definedColumns = useMemo<readonly ColumnDefinition<Row>[]>(() => {
    if (columns && columns.length !== 0) return columns;
    if (dataSource && dataSource.length > 0)
      return defineColumnsFromRows(dataSource);
    return [];
  }, [columns, dataSource]);

  /**
   * Ahead of sizing, so everything downstream reads one already-ordered list
   * and no part of the grid has to know a reorder happened.
   */
  const orderedColumns = useMemo(
    () => applyColumnOrder(definedColumns, order),
    [definedColumns, order],
  );

  /**
   * Auto-fit is a derivation rather than a write back into `sizing`, so that a
   * `width` set in a column definition is never overwritten and the effect
   * cannot chase its own output. `"fixed"` is then simply the absence of it.
   */
  const resolved = useMemo(() => {
    const widths = resolveColumnWidths(orderedColumns, sizing, {
      sizes: columnSizeDefaults,
      resizable: resizableColumns,
      reorderable: reorderableColumns,
      groupByDraggable: groupByDraggableColumns,
    });
    return resizeMode === "fit" && viewportWidth !== null
      ? fitColumnsToWidth(widths, viewportWidth, columnSizeDefaults)
      : widths;
  }, [
    orderedColumns,
    sizing,
    resizeMode,
    viewportWidth,
    columnSizeDefaults,
    resizableColumns,
    reorderableColumns,
    groupByDraggableColumns,
  ]);

  /**
   * `rows`, filtered then sorted — needs `resolved` for each column's
   * `field` and `type`, so it runs after sizing rather than alongside
   * `rows` itself. Everything downstream that renders or interacts with row
   * order and membership reads this rather than `rows`, so what the user
   * sees, filters, sorts, and clicks all agree.
   */
  const shownRows = useMemo(
    () => resolveShownRows(rows, filter, sort, resolved),
    [rows, filter, sort, resolved],
  );

  /**
   * `shownRows` regrouped into `groupBy` — group headers interleaved with
   * data rows, in render order. `GridBody` renders this rather than
   * `shownRows` directly, grouped or not: `groupRows` returns `shownRows`
   * itself, untouched, when `groupBy` is empty, so an ungrouped grid pays
   * only the cost of that check.
   */
  const displayRows = useMemo(
    () => groupRows(shownRows, groupBy, expansion, resolved),
    [shownRows, groupBy, expansion, resolved],
  );

  const activeAggregates = aggregates ?? (NO_AGGREGATES as AggregateState<Row>);

  /**
   * `displayRows` with each group header's `aggregates` field set — always
   * ahead of pagination, so a subtotal is computed over a group's full
   * dataset-wide leaf set rather than only the rows a page happens to show.
   * `groupAggregateDisplay: "row"` additionally inserts a summary row after
   * each group's last visible entry. `withGroupAggregates` returns
   * `displayRows` itself, untouched, when no aggregates are active, so an
   * aggregate-less grid pays only that check.
   */
  const aggregatedRows = useMemo(
    () =>
      withGroupAggregates(
        displayRows,
        shownRows,
        groupBy,
        activeAggregates,
        resolved,
        groupAggregateDisplay,
      ),
    [
      displayRows,
      shownRows,
      groupBy,
      activeAggregates,
      resolved,
      groupAggregateDisplay,
    ],
  );

  /**
   * The grand total: every aggregate over the whole filtered/sorted dataset,
   * ungrouped — independent of `aggregatedRows`, which only ever attaches
   * results to group headers. Recomputed from `shownRows` directly rather
   * than derived from any per-group result, for the same reason a nested
   * group's own subtotal is: a non-associative custom aggregate would be
   * wrong if combined from parts instead of the full set.
   */
  const grandTotal = useMemo<AggregateResults>(
    () =>
      computeAggregates(
        shownRows.map((entry) => entry.row),
        activeAggregates,
        resolved,
      ),
    [shownRows, activeAggregates, resolved],
  );

  /**
   * `aggregatedRows` windowed to the current page — always last in the
   * pipeline, after grouping and aggregation, so a page never splits a
   * group and a subtotal never changes value depending on which page is
   * showing. `GridBody` renders this rather than `aggregatedRows` directly,
   * paginated or not: when `paginated` is off the grid is a single page
   * over every row, and `pageCount`/`pageIndex` report that (`1`/`0`)
   * rather than the possibly-stale values a consumer's own `pagination`
   * prop state might otherwise carry.
   */
  const paginatedRows = useMemo(
    () =>
      paginated
        ? paginateRows(aggregatedRows, pagination)
        : { rows: aggregatedRows, pageCount: 1, pageIndex: 0 },
    [paginated, aggregatedRows, pagination],
  );

  /**
   * `paginatedRows.rows` narrowed back to its data rows, in the same
   * (possibly regrouped, possibly paginated) order — what row/cell selection
   * anchors its range-select against, so that a Shift-click spans the rows
   * actually adjacent on screen rather than their pre-grouping,
   * pre-pagination order. A group collapsed at selection time, or a row on a
   * different page, contributes no rows here at all, so a range spanning its
   * position includes only what was visible when the range was drawn.
   */
  const displayDataRows = useMemo(
    () =>
      groupBy.length === 0 && !paginated
        ? shownRows
        : paginatedRows.rows.filter(
            (entry): entry is ResolvedRow<Row> => !("kind" in entry),
          ),
    [paginatedRows, groupBy.length, paginated, shownRows],
  );

  /**
   * What a column is called in an announcement. `label` carries whatever a
   * `headerTemplate` returned, which need not be text at all, so the field
   * path stands in whenever it is not.
   */
  function columnName(columnId: string): string {
    const entry = resolved.find((candidate) => candidate.id === columnId);
    if (entry === undefined) {
      return columnId;
    }
    return typeof entry.label === "string" ? entry.label : entry.column.field;
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
    tableRef,
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
    tableRef,
    // Group headers are addressable rows too — the whole point of the flat
    // `DisplayRow[]` shape is that they share one position space with data
    // rows, so navigation counts them the same way. Page-relative
    // (`paginatedRows`, not `displayRows`): arrow keys operate on what's
    // actually in the DOM, which is the current page — a different "page"
    // concept than `useGridNavigation`'s own Page Up/Down viewport scrolling.
    rowCount: paginatedRows.rows.length,
    columnCount: resolved.length,
    // A group's own summary row (`groupAggregateDisplay: "row"`) occupies a
    // real slot in `rowCount` above — its DOM position has to line up with
    // everything else — but is presentational, never a tab stop: arrow-key
    // vertical movement steps over it rather than landing there.
    isSkippableRow: (rowIndex) => {
      const entry = paginatedRows.rows[rowIndex];
      return (
        entry !== undefined && "kind" in entry && entry.kind === "group-summary"
      );
    },
  });

  /**
   * The ids as displayed, which a drop is expressed against — the order state
   * starts empty and may name only some columns, so moving against it directly
   * would have nothing to rearrange.
   */
  const displayedIds = useMemo(
    () => orderedColumns.map((column) => column.id ?? column.field),
    [orderedColumns],
  );

  /** Column ids whose header may be dragged into the group-by bar at all. */
  const groupByDraggableIds = useMemo(
    () =>
      new Set(
        resolved
          .filter((entry) => entry.groupByDraggable)
          .map((entry) => entry.id),
      ),
    [resolved],
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

    const next = moveColumnBefore(displayedIds, movedId, target.beforeId);
    // `moveColumnBefore` hands back the same reference for a move that changes
    // nothing, so a drop in place neither renders nor reports.
    if (next === displayedIds) {
      return;
    }
    const position = next.indexOf(movedId);
    setOrder(next);
    onColumnOrderChange?.({ columnId: movedId, order: next });
    announce(
      `${columnName(movedId)}, column ${String(position + 1)} of ${String(next.length)}`,
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

  const paginationApi = usePagination<Row>({
    pagination,
    setPagination,
    rows: displayRows,
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
    rows: displayDataRows,
    columns: resolved,
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
      return tableRef.current;
    },
    getRows: () => shownRows,
    // `aggregatedRows`, not the plain `displayRows` it's derived from: the
    // same array shape and content, except every group header's own
    // `aggregates` field is populated — the whole reason `getDisplayRows()`
    // is where a consumer reads a specific group's computed results from.
    getDisplayRows: () => aggregatedRows,
    getColumns: () => resolved,
    getColumnSizing: () => sizing,
    getColumnOrder: () => order,
    getColumnSort: () => sort,
    getGroupBy: () => groupBy,
    getGroupExpansion: () => expansion,
    getPagination: () => ({
      pageIndex: paginatedRows.pageIndex,
      pageSize: pagination.pageSize,
    }),
    getPageCount: () => paginatedRows.pageCount,
    getAggregates: () => grandTotal,
    getRowSelection: () => rowSelection,
    getColumnSelection: () => columnSelection,
    getCellSelection: () => cellSelection,
    getFocusedCell: () => nav.focus,
    focusCell: nav.focusCell,
    clearSelection: selection.clear,
    selectAllRows: selection.selectAllRows,
    expandAllGroups: grouping.expandAll,
    collapseAllGroups: () => {
      grouping.collapseAll(displayRows);
    },
    goToPage: paginationApi.goToPage,
    nextPage: paginationApi.nextPage,
    previousPage: paginationApi.previousPage,
    setPageSize: paginationApi.setPageSize,
    scrollToRow: (rowId, options) => {
      // `paginatedRows.rows`, not `displayRows`: a data row's DOM position is
      // its place in the currently rendered page — with grouping active,
      // that's its place in the grouped, flattened output; with pagination
      // also active, that's the page's own slice of it. A row on a different
      // page isn't in the DOM at all, so there is nothing to scroll to.
      const index = paginatedRows.rows.findIndex(
        (entry) => !("kind" in entry) && entry.rowId === rowId,
      );
      if (index === -1) return;
      tableRef.current?.tBodies[0]?.rows[index]?.scrollIntoView(options);
    },
    scrollToColumn: (columnId, options) => {
      const cells = tableRef.current?.querySelectorAll("[data-gridkit-column]");
      const cell = cells
        ? Array.from(cells).find(
            (entry) => entry.getAttribute("data-gridkit-column") === columnId,
          )
        : undefined;
      cell?.scrollIntoView(options);
    },
  }));

  return (
    <div className="gridkit-data-grid-viewport" ref={viewportRef}>
      {showGroupByBar && (
        <GroupByBar<Row>
          columns={resolved}
          grouping={grouping}
          columnName={columnName}
          headerDragEligible={dragEligibleForGroupBy}
          headerDragBlocked={draggedColumnAlreadyGrouped}
          headerDropTarget={headerGroupByDropTarget}
        />
      )}
      <table
        ref={tableRef}
        /*
         * `role="grid"` rather than the table's own semantics: it is what makes
         * the arrow keys a navigation the grid owns, and later what lets a row
         * report whether it is selected. It obliges the single tab stop
         * `useGridNavigation` keeps.
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
        // `rowCount`. `aggregatedRows`, not `displayRows`: the latter is
        // pre-aggregation and never carries summary rows at all. Total
        // dataset count, not the current page's — neither array is ever
        // windowed to one page, so this stays the true row count per the
        // WAI-ARIA grid pattern even while paged.
        aria-rowcount={aggregatedRows.length + 1}
        aria-colcount={resolved.length}
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
        // Widths are only honoured exactly when the table is as wide as its
        // columns; at `100%` the fixed layout redistributes the difference.
        style={{ width: totalColumnWidth(resolved) }}
        className={classNames(
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
        )}
      >
        <colgroup>
          {resolved.map((entry) => (
            <col key={entry.id} style={{ width: entry.width }} />
          ))}
        </colgroup>
        <GridHeader<Row>
          columns={resolved}
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
        <GridBody<Row>
          columns={resolved}
          rows={paginatedRows.rows}
          activeColumnId={resize.activeColumnId}
          nav={nav}
          selection={selection}
          grouping={grouping}
          aggregates={activeAggregates}
          groupAggregateDisplay={groupAggregateDisplay}
        />
        {activeAggregates.length > 0 && (
          <GridFooter<Row>
            columns={resolved}
            aggregates={activeAggregates}
            results={grandTotal}
            rows={shownRows.map((entry) => entry.row)}
          />
        )}
      </table>
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
