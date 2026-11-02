import type { GridOptions } from "../options";
import type {
  ColumnDefinition,
  GridState,
  GridView,
  GroupByState,
  GroupExpansionState,
  PaginationState,
} from "../types";
import { defineColumnsFromRows } from "../util/grid";
import {
  collapseAllGroups as collapsedGroups,
  expandAllGroups as expandedGroups,
  moveGroupByBefore,
  toggleGroupExpansion as toggledGroupExpansion,
} from "../util/grouping";
import { memoizeLast } from "../util/memoize";
import { paginateRows } from "../util/paging";
import { reportError } from "../util/report";
import { toggleColumnSort as toggledColumnSort } from "../util/sorting";
import { createGridViewResolver } from "../util/view";
import { changedEntryColumnId, sameIds, samePagination } from "./changes";
import type { GridController, GridControllerOptions } from "./gridController";

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
  };

/** The slices the controller keeps itself — those not controlled. */
type OwnState<Row> = { -readonly [K in SliceKey]: GridState<Row>[K] };

/** The options read as controlled values: a slice given here is the caller's. */
type ControlledState<Row> = {
  readonly [K in SliceKey]?: GridState<Row>[K] | undefined;
};

/** The slices a filter, sort or grouping change sends back to the first page. */
type PagingInputs<Row> = Pick<
  GridState<Row>,
  "filter" | "columnSort" | "groupBy"
>;

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

function pagingInputsOf<Row>(state: GridState<Row>): PagingInputs<Row> {
  return {
    filter: state.filter,
    columnSort: state.columnSort,
    groupBy: state.groupBy,
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

  let state = resolveSlices();
  let pagingInputs = pagingInputsOf(state);
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
   * when none differs, so a snapshot read twice is the same object.
   *
   * Applies the one rule linking slices: a user on page 7 of a result that
   * filtering, sorting or regrouping just shrank to 2 pages must not be left
   * on an empty page, so a change to any of the three sends an uncontrolled
   * pagination back to the first page. It is a consequence of that change,
   * not a page change of its own, so it reports nothing — the change that
   * caused it already did. A controlled pagination is the caller's to reset.
   */
  function refresh(): void {
    let next = resolveSlices();
    if (
      next.filter !== pagingInputs.filter ||
      next.columnSort !== pagingInputs.columnSort ||
      next.groupBy !== pagingInputs.groupBy
    ) {
      pagingInputs = pagingInputsOf(next);
      if (!isControlled("pagination") && own.pagination.pageIndex !== 0) {
        own.pagination = { ...own.pagination, pageIndex: 0 };
        next = { ...next, pagination: own.pagination };
      }
    }
    state = SLICE_KEYS.every((key) => next[key] === state[key]) ? state : next;
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
    refresh();
    report();
    notify();
  }

  function getView(): GridView<Row, Node> {
    return resolveView({
      rows: options.dataSource ?? NO_ROWS,
      getRowId: options.getRowId,
      columns: resolveColumns(options.columns, options.dataSource),
      state,
      options: {
        paginated: options.paginated,
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
   * grid is paginated, which is what a pager built on the event shows.
   */
  function commitPagination(next: PaginationState): void {
    commit("pagination", next, () => {
      options.onPaginationChange?.({
        pagination: next,
        pageCount: paginateRows(getView().displayRows, next).pageCount,
      });
    });
  }

  /**
   * `pageIndex` clamped into the pages that exist, by `paginateRows` itself
   * rather than by hand, so it can never disagree with the page the view
   * shows.
   */
  function goToPage(pageIndex: number): void {
    const current = state.pagination;
    const clamped = paginateRows(getView().displayRows, {
      ...current,
      pageIndex,
    }).pageIndex;
    commitPagination({ ...current, pageIndex: clamped });
  }

  /** The page shown, which may sit below a stored index past the last page. */
  function shownPageIndex(): number {
    return paginateRows(getView().displayRows, state.pagination).pageIndex;
  }

  return {
    getOptions: () => options,
    setOptions(next) {
      options = next;
      reportConflicts();
      refresh();
    },
    getState: () => state,
    getView,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
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
      if (!sameIds(state.groupExpansion, expansion)) {
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

    setPagination(pagination) {
      if (!samePagination(state.pagination, pagination)) {
        commitPagination(pagination);
      }
    },
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
        pageIndex: paginateRows(getView().displayRows, first).pageIndex,
      });
    },
  };
}
