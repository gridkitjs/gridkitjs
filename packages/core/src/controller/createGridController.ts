import type { GridOptions } from "../options";
import type {
  ColumnDefinition,
  ColumnSizingState,
  ColumnVisibilityState,
  GridState,
  GridView,
  GroupByState,
  GroupExpansionState,
  PaginationState,
  PaginationUnit,
} from "../types";
import { defineColumnsFromRows } from "../util/grid";
import {
  collapseAllGroups as collapsedGroups,
  expandAllGroups as expandedGroups,
  moveGroupByBefore,
  toggleGroupExpansion as toggledGroupExpansion,
} from "../util/grouping";
import { memoizeLast } from "../util/memoize";
import { moveColumnBefore } from "../util/ordering";
import { paginateRows, type PaginatedRows } from "../util/paging";
import { reportError } from "../util/report";
import { reviveFilter } from "../util/serialize";
import { resolveColumnWidths, revertColumnSize } from "../util/sizing";
import { toggleColumnSort as toggledColumnSort } from "../util/sorting";
import { createGridViewResolver } from "../util/view";
import { setColumnVisibility as withColumnVisibility } from "../util/visibility";
import {
  changedEntryColumnId,
  changedId,
  changedKeys,
  sameFilter,
  sameItems,
  samePagination,
} from "./changes";
import type { GridController, GridControllerOptions } from "./gridController";
import { createSelectionActions } from "./selectionActions";

/** `pagination.pageSize` an uncontrolled grid starts at when `defaultPagination` omits one — a reasonable default for an ERP-grade dataset. */
const DEFAULT_PAGE_SIZE = 25;

/**
 * Stable empty fallbacks: a fresh `[]` per call would change identity each
 * time and defeat every view stage memoised on it.
 */
const NO_ROWS: readonly never[] = [];
const NO_COLUMNS: readonly never[] = [];

type SliceKey = keyof GridState<unknown>;

const SLICE_KEYS = [
  "columnSizing",
  "columnOrder",
  "columnVisibility",
  "columnSort",
  "filter",
  "groupBy",
  "groupExpansion",
  "pagination",
  "rowSelection",
  "columnSelection",
  "cellSelection",
] as const satisfies readonly SliceKey[];

/** The option that seeds each slice while it is uncontrolled. */
const DEFAULT_OPTION: { readonly [K in SliceKey]: `default${Capitalize<K>}` } =
  {
    columnSizing: "defaultColumnSizing",
    columnOrder: "defaultColumnOrder",
    columnVisibility: "defaultColumnVisibility",
    columnSort: "defaultColumnSort",
    filter: "defaultFilter",
    groupBy: "defaultGroupBy",
    groupExpansion: "defaultGroupExpansion",
    pagination: "defaultPagination",
    rowSelection: "defaultRowSelection",
    columnSelection: "defaultColumnSelection",
    cellSelection: "defaultCellSelection",
  };

/** The slices the controller keeps itself — those not controlled. */
type OwnState<Row> = { -readonly [K in SliceKey]: GridState<Row>[K] };

/** The options read as controlled values: a slice given here is the caller's. */
type ControlledState<Row> = {
  readonly [K in SliceKey]?: GridState<Row>[K] | undefined;
};

/**
 * What sends an uncontrolled pagination back to the first page when it
 * changes: the filter, sort and grouping slices, and the unit a page counts.
 */
interface PagingInputs<Row> extends Pick<
  GridState<Row>,
  "filter" | "columnSort" | "groupBy"
> {
  readonly paginationUnit: PaginationUnit;
}

function startingState<Row>(options: GridOptions<Row>): OwnState<Row> {
  return {
    columnSizing: options.defaultColumnSizing ?? {},
    columnOrder: options.defaultColumnOrder ?? [],
    columnVisibility: options.defaultColumnVisibility ?? {},
    columnSort: options.defaultColumnSort ?? [],
    filter: options.defaultFilter ?? [],
    groupBy: options.defaultGroupBy ?? [],
    groupExpansion: options.defaultGroupExpansion ?? [],
    pagination: options.defaultPagination ?? {
      pageIndex: 0,
      pageSize: DEFAULT_PAGE_SIZE,
    },
    rowSelection: options.defaultRowSelection ?? [],
    columnSelection: options.defaultColumnSelection ?? [],
    cellSelection: options.defaultCellSelection ?? null,
  };
}

/**
 * The columns the grid shows: the caller's, or — when it gives none — one per
 * field of the rows, re-inferred only when the rows change.
 */
function definedColumns<Row, Node>(
  columns: readonly ColumnDefinition<Row, Node>[] | undefined,
  rows: readonly Row[] | undefined,
): readonly ColumnDefinition<Row, Node>[] {
  if (columns !== undefined && columns.length > 0) {
    return columns;
  }
  if (rows !== undefined && rows.length > 0) {
    return defineColumnsFromRows<Row, Node>(rows);
  }
  return NO_COLUMNS;
}

/**
 * Several actions applied as one change — see `transaction` in
 * `createGridController`. Its commits only store their value: `held` keeps
 * their reports until it ends, and `pageAsked` records that it set the page
 * itself.
 */
interface Transaction {
  readonly kind: "transaction";
  readonly held: (() => void)[];
  pageAsked: boolean;
}

/**
 * What the controller is doing: `idle`, each commit is refreshed, reported
 * and announced on its own; or in a `Transaction`.
 */
type ControllerMode = { readonly kind: "idle" } | Transaction;

const IDLE: ControllerMode = { kind: "idle" };

function samePagingInputs<Row>(
  a: PagingInputs<Row>,
  b: PagingInputs<Row>,
): boolean {
  return (
    a.filter === b.filter &&
    a.columnSort === b.columnSort &&
    a.groupBy === b.groupBy &&
    a.paginationUnit === b.paginationUnit
  );
}

function pagingInputsOf<Row>(
  state: GridState<Row>,
  options: GridOptions<Row>,
): PagingInputs<Row> {
  return {
    filter: state.filter,
    columnSort: state.columnSort,
    groupBy: state.groupBy,
    paginationUnit: options.paginationUnit ?? "group",
  };
}

/**
 * Creates the state container for one grid — see `GridController`. Hold one
 * per grid for its whole life: it keeps the uncontrolled slices, and its view
 * is memoised across calls the way `createGridViewResolver`'s is.
 */
export function createGridController<Row, Node = string>(
  initial: GridControllerOptions<Row, Node>,
): GridController<Row, Node> {
  let options = initial;
  const own = startingState(initial);
  const resolveView = createGridViewResolver<Row, Node>();
  const resolveColumns = memoizeLast(definedColumns<Row, Node>);
  const listeners = new Set<() => void>();
  /** Slices already reported as given both ways, so each is reported once. */
  const reportedConflicts = new Set<SliceKey>();
  let mode: ControllerMode = IDLE;

  let state = resolveSlices();
  let pagingInputs = pagingInputsOf(state, options);
  reportConflicts();

  function controlledValue<K extends SliceKey>(
    key: K,
  ): GridState<Row>[K] | undefined {
    const controlled: ControlledState<Row> = options;
    return controlled[key];
  }

  function isControlled(key: SliceKey): boolean {
    return controlledValue(key) !== undefined;
  }

  function resolveSlice<K extends SliceKey>(key: K): GridState<Row>[K] {
    const controlled = controlledValue(key);
    return controlled === undefined ? own[key] : controlled;
  }

  function resolveSlices(): GridState<Row> {
    return {
      columnSizing: resolveSlice("columnSizing"),
      columnOrder: resolveSlice("columnOrder"),
      columnVisibility: resolveSlice("columnVisibility"),
      columnSort: resolveSlice("columnSort"),
      filter: resolveSlice("filter"),
      groupBy: resolveSlice("groupBy"),
      groupExpansion: resolveSlice("groupExpansion"),
      pagination: resolveSlice("pagination"),
      rowSelection: resolveSlice("rowSelection"),
      columnSelection: resolveSlice("columnSelection"),
      cellSelection: resolveSlice("cellSelection"),
    };
  }

  /**
   * A controlled value and its default together is a contradiction React's
   * own inputs report the same way: the controlled value wins, and the
   * default is never read.
   */
  function reportConflicts(): void {
    for (const key of SLICE_KEYS) {
      const defaultKey = DEFAULT_OPTION[key];
      if (
        reportedConflicts.has(key) ||
        !isControlled(key) ||
        options[defaultKey] === undefined
      ) {
        continue;
      }
      reportedConflicts.add(key);
      reportError(
        `\`${key}\` and \`${defaultKey}\` are both set — \`${key}\` is controlled, so \`${defaultKey}\` is ignored.`,
      );
    }
  }

  /**
   * Re-resolves every slice after a change, keeping the previous state object
   * when none differs, so a snapshot read twice is the same object. For
   * `keepPage`, see `followPagingInputs`.
   */
  function refresh(keepPage = false): void {
    const next = followPagingInputs(resolveSlices(), keepPage);
    state = SLICE_KEYS.every((key) => next[key] === state[key]) ? state : next;
    storeShownPage();
  }

  /**
   * The one rule linking slices: a user on page 7 of a result that
   * filtering, sorting or regrouping just shrank to 2 pages must not be left
   * on an empty page, so a change to any of the three, or to the unit a page
   * counts, sends an uncontrolled pagination back to the first page. It is a
   * consequence of that change, not a page change of its own, so it reports
   * nothing — the change that caused it already did. A controlled pagination
   * is the caller's to reset, and `keepPage` — a transaction that set the
   * page itself — keeps the page asked for alongside the change.
   */
  function followPagingInputs(
    next: GridState<Row>,
    keepPage: boolean,
  ): GridState<Row> {
    const inputs = pagingInputsOf(next, options);
    if (samePagingInputs(inputs, pagingInputs)) {
      return next;
    }
    pagingInputs = inputs;
    if (
      keepPage ||
      isControlled("pagination") ||
      own.pagination.pageIndex === 0
    ) {
      return next;
    }
    own.pagination = { ...own.pagination, pageIndex: 0 };
    return { ...next, pagination: own.pagination };
  }

  /**
   * Rows that shrink under a later page — a collapsed group, a shorter
   * `dataSource` — leave the view clamped to the last page that exists. An
   * uncontrolled pagination stores that page, so the rows growing back keep
   * the user on the page they saw rather than one they never chose. Like the
   * reset in `refresh`, it reports nothing. A controlled pagination is left
   * to the caller, and an empty grid has no page to clamp to, so a page
   * waiting for its rows to load is kept.
   */
  function storeShownPage(): void {
    const stored = storedPagination(state.pagination);
    if (stored !== state.pagination) {
      own.pagination = stored;
      state = { ...state, pagination: stored };
    }
  }

  /**
   * `pagination` as an uncontrolled paginated grid with rows stores it: its
   * page clamped to the one the view would show. Anything else, and a page
   * already in range, is the same object.
   */
  function storedPagination(pagination: PaginationState): PaginationState {
    if (options.paginated !== true || isControlled("pagination")) {
      return pagination;
    }
    const { pageCount, pageIndex } = pageOf(pagination);
    return pageCount === 0 || pageIndex === pagination.pageIndex
      ? pagination
      : { ...pagination, pageIndex };
  }

  function notify(): void {
    for (const listener of [...listeners]) {
      listener();
    }
  }

  /**
   * The shared tail of every action — see `GridController`. `report` fires
   * the slice's callback; it runs after the value is kept, so a callback
   * reading `getState()` or calling another action sees the change.
   */
  function commit<K extends SliceKey>(
    key: K,
    next: GridState<Row>[K],
    report: () => void,
  ): void {
    if (next === state[key]) {
      return;
    }
    if (!isControlled(key)) {
      own[key] = next;
    }
    if (mode.kind === "transaction") {
      mode.held.push(report);
      return;
    }
    refresh();
    report();
    notify();
  }

  /**
   * Runs `run` as one change: its commits are stored as they go, and only
   * when it ends — returning or throwing — is the state refreshed, every
   * held report fired in order and subscribers called once, so no one sees a
   * state halfway through it, and one that throws part-way still shows and
   * reports what it stored before rethrowing. A transaction started inside
   * another joins it.
   */
  function transaction(run: () => void): void {
    if (mode.kind === "transaction") {
      run();
      return;
    }
    const current: Transaction = {
      kind: "transaction",
      held: [],
      pageAsked: false,
    };
    mode = current;
    try {
      run();
    } finally {
      mode = IDLE;
      refresh(current.pageAsked);
      for (const report of current.held) {
        report();
      }
      if (current.held.length > 0) {
        notify();
      }
    }
  }

  function getView(): GridView<Row, Node> {
    return resolveView({
      rows: options.dataSource ?? NO_ROWS,
      getRowId: options.getRowId,
      columns: resolveColumns(options.columns, options.dataSource),
      state,
      options: {
        paginated: options.paginated,
        paginationUnit: options.paginationUnit,
        aggregates: options.aggregates,
        groupAggregateDisplay: options.groupAggregateDisplay,
        columnSizeDefaults: options.columnSizeDefaults,
        resizableColumns: options.resizableColumns,
        reorderableColumns: options.reorderableColumns,
        groupByDraggableColumns: options.groupByDraggableColumns,
        resizeMode: options.resizeMode,
        viewportWidth: options.viewportWidth,
      },
    });
  }

  function commitColumnSizing(
    next: ColumnSizingState,
    columnId: string,
    width: number,
    phase: "move" | "end",
  ): void {
    commit("columnSizing", next, () => {
      options.onColumnResize?.({ columnId, width, sizing: next, phase });
    });
  }

  /**
   * The width a column's definition gives it, before any user resize or fit
   * — what a column reverts to when its sizing entry goes.
   */
  function definedWidth(columnId: string): number {
    const entry = getView().dataColumns.find(
      (candidate) => candidate.id === columnId,
    );
    const [resolved] =
      entry === undefined
        ? []
        : resolveColumnWidths(
            [entry.column],
            {},
            {
              sizes: options.columnSizeDefaults,
            },
          );
    return resolved?.width ?? 0;
  }

  /**
   * Reported once per change, naming every column it touched in the order
   * they are shown, whatever order the caller named them in — and ids naming
   * no column last.
   */
  function commitColumnVisibility(next: ColumnVisibilityState): void {
    const previous = state.columnVisibility;
    commit("columnVisibility", next, () => {
      const changed = new Set(changedKeys(previous, next));
      const shown = getView()
        .dataColumns.map((entry) => entry.id)
        .filter((id) => changed.delete(id));
      options.onColumnVisibilityChange?.({
        columnIds: [...shown, ...changed],
        visibility: next,
      });
    });
  }

  function changeColumnVisibility(
    columnIds: readonly string[],
    visible: boolean,
  ): void {
    commitColumnVisibility(
      withColumnVisibility(
        getView().dataColumns,
        state.columnVisibility,
        columnIds,
        visible,
      ),
    );
  }

  function commitGroupBy(next: GroupByState, columnId: string): void {
    commit("groupBy", next, () => {
      options.onGroupByChange?.({ columnId, groupBy: next });
    });
  }

  function commitGroupExpansion(
    next: GroupExpansionState,
    groupId: string | null,
  ): void {
    commit("groupExpansion", next, () => {
      options.onGroupExpansionChange?.({ groupId, expansion: next });
    });
  }

  /**
   * The page count reported is over every display row whether or not the
   * grid is paginated, which is what a pager built on the event shows. A
   * pagination equal to the current one — `nextPage` on the last page,
   * `goToPage` to the page shown — reports nothing.
   *
   * An uncontrolled grid reports the pagination it stored, which clamps a
   * page past the last one. Inside a transaction the view does not yet
   * reflect the slices set before it, so the clamp waits for the `refresh`
   * that ends the transaction, and the report reads what it stored. The page
   * asked for there is kept over the transaction's other changes, even when
   * it is the page already shown.
   */
  function commitPagination(asked: PaginationState): void {
    let next = asked;
    if (mode.kind === "transaction") {
      mode.pageAsked = true;
    } else {
      next = storedPagination(asked);
    }
    if (samePagination(state.pagination, next)) {
      return;
    }
    commit("pagination", next, () => {
      const pagination = isControlled("pagination") ? next : own.pagination;
      options.onPaginationChange?.({
        pagination,
        pageCount: pageOf(pagination).pageCount,
      });
    });
  }

  /**
   * The page `pagination` names, over every display row and in the grid's
   * `paginationUnit`. Page counts and clamping all go through this rather
   * than by hand, so none can disagree with the page the view shows.
   */
  function pageOf(pagination: PaginationState): PaginatedRows<Row> {
    return paginateRows(getView().displayRows, pagination, {
      unit: options.paginationUnit,
    });
  }

  /** `pageIndex` clamped into the pages that exist. */
  function goToPage(pageIndex: number): void {
    const current = state.pagination;
    const clamped = pageOf({ ...current, pageIndex }).pageIndex;
    commitPagination({ ...current, pageIndex: clamped });
  }

  /** The page shown, which may sit below a stored index past the last page. */
  function shownPageIndex(): number {
    return pageOf(state.pagination).pageIndex;
  }

  const selection = createSelectionActions<Row, Node>({
    getState: () => state,
    getOptions: () => options,
    getView,
    commit,
    transaction,
  });

  const controller: GridController<Row, Node> = {
    ...selection,
    getOptions: () => options,
    setOptions(next) {
      options = next;
      reportConflicts();
      refresh();
    },
    getState: () => state,
    getView,
    restoreState(saved) {
      transaction(() => {
        restoreSlices(saved);
      });
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    setColumnSizing(sizing) {
      const [columnId] = changedKeys(state.columnSizing, sizing);
      if (columnId !== undefined) {
        commitColumnSizing(
          sizing,
          columnId,
          sizing[columnId] ?? definedWidth(columnId),
          "end",
        );
      }
    },
    resizeColumn(columnId, width, phase) {
      commitColumnSizing(
        { ...state.columnSizing, [columnId]: width },
        columnId,
        width,
        phase,
      );
    },
    cancelColumnResize(columnId, startSizing, startWidth) {
      commitColumnSizing(
        revertColumnSize(state.columnSizing, startSizing, columnId),
        columnId,
        startWidth,
        "end",
      );
    },

    setColumnOrder(order) {
      const columnId = changedId(state.columnOrder, order);
      if (columnId === undefined) {
        return;
      }
      commit("columnOrder", order, () => {
        options.onColumnOrderChange?.({ columnId, order });
      });
    },
    /**
     * Applied to every id in display order rather than to the stored order,
     * which starts empty and may name only some columns, so would have
     * nothing to rearrange.
     */
    moveColumn(columnId, beforeId) {
      const orderedIds = getView().dataColumns.map((entry) => entry.id);
      const next = moveColumnBefore(orderedIds, columnId, beforeId);
      if (next === orderedIds) {
        return;
      }
      commit("columnOrder", next, () => {
        options.onColumnOrderChange?.({ columnId, order: next });
      });
    },

    setColumnVisibility(visibility) {
      if (changedKeys(state.columnVisibility, visibility).length > 0) {
        commitColumnVisibility(visibility);
      }
    },
    showColumns(columnIds) {
      changeColumnVisibility(columnIds, true);
    },
    hideColumns(columnIds) {
      changeColumnVisibility(columnIds, false);
    },

    setFilter(filter) {
      if (sameFilter(state.filter, filter)) {
        return;
      }
      commit("filter", filter, () => {
        options.onFilterChange?.({ filter });
      });
    },

    setColumnSort(sort) {
      const columnId = changedEntryColumnId(state.columnSort, sort);
      if (columnId === undefined) {
        return;
      }
      commit("columnSort", sort, () => {
        options.onColumnSortChange?.({ columnId, sort });
      });
    },
    toggleColumnSort(columnId, { stack = false } = {}) {
      const next = toggledColumnSort(state.columnSort, columnId, { stack });
      commit("columnSort", next, () => {
        options.onColumnSortChange?.({ columnId, sort: next });
      });
    },
    clearColumnSort(columnId) {
      const next = state.columnSort.filter(
        (entry) => entry.columnId !== columnId,
      );
      if (next.length === state.columnSort.length) {
        return;
      }
      commit("columnSort", next, () => {
        options.onColumnSortChange?.({ columnId, sort: next });
      });
    },

    setGroupBy(groupBy) {
      const columnId = changedEntryColumnId(state.groupBy, groupBy);
      if (columnId !== undefined) {
        commitGroupBy(groupBy, columnId);
      }
    },
    toggleGroupBy(columnId) {
      const grouped = state.groupBy.some(
        (entry) => entry.columnId === columnId,
      );
      commitGroupBy(
        grouped
          ? state.groupBy.filter((entry) => entry.columnId !== columnId)
          : [...state.groupBy, { columnId }],
        columnId,
      );
    },
    moveGroupBy(columnId, beforeColumnId) {
      commitGroupBy(
        moveGroupByBefore(state.groupBy, columnId, beforeColumnId),
        columnId,
      );
    },

    setGroupExpansion(expansion) {
      if (!sameItems(state.groupExpansion, expansion)) {
        commitGroupExpansion(expansion, null);
      }
    },
    toggleGroupExpansion(groupId) {
      commitGroupExpansion(
        toggledGroupExpansion(state.groupExpansion, groupId),
        groupId,
      );
    },
    expandAllGroups() {
      commitGroupExpansion(expandedGroups(state.groupExpansion), null);
    },
    collapseAllGroups() {
      commitGroupExpansion(collapsedGroups(getView().displayRows), null);
    },

    setPagination: commitPagination,
    goToPage,
    nextPage() {
      goToPage(shownPageIndex() + 1);
    },
    previousPage() {
      goToPage(shownPageIndex() - 1);
    },
    setPageSize(pageSize) {
      const first = { pageIndex: 0, pageSize };
      commitPagination({
        ...first,
        pageIndex: pageOf(first).pageIndex,
      });
    },
  };

  /** Each slice `saved` holds, through the action that sets it. */
  function restoreSlices(
    saved: Parameters<GridController<Row, Node>["restoreState"]>[0],
  ): void {
    if (saved.columnSizing !== undefined) {
      controller.setColumnSizing(saved.columnSizing);
    }
    if (saved.columnOrder !== undefined) {
      controller.setColumnOrder(saved.columnOrder);
    }
    if (saved.columnVisibility !== undefined) {
      controller.setColumnVisibility(saved.columnVisibility);
    }
    if (saved.columnSort !== undefined) {
      controller.setColumnSort(saved.columnSort);
    }
    if (saved.filter !== undefined) {
      controller.setFilter(reviveFilter(saved.filter, getView().dataColumns));
    }
    if (saved.groupBy !== undefined) {
      controller.setGroupBy(saved.groupBy);
    }
    if (saved.groupExpansion !== undefined) {
      controller.setGroupExpansion(saved.groupExpansion);
    }
    if (saved.pagination !== undefined) {
      controller.setPagination(saved.pagination);
    }
    if (saved.rowSelection !== undefined) {
      controller.setRowSelection(saved.rowSelection);
    }
    if (saved.columnSelection !== undefined) {
      controller.setColumnSelection(saved.columnSelection);
    }
    if (saved.cellSelection !== undefined) {
      controller.setCellSelection(saved.cellSelection);
    }
  }

  return controller;
}
