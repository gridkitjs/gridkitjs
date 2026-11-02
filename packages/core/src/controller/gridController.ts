import type { GridOptions } from "../options";
import type {
  ColumnDefinition,
  ColumnOrderState,
  ColumnSizingState,
  ColumnSortState,
  ColumnVisibilityState,
  FilterState,
  GridState,
  GridView,
  GroupByState,
  GroupExpansionState,
  PaginationState,
} from "../types";

/**
 * What `createGridController` is given: the grid's options, plus the two
 * things a renderer supplies that are not settings — the column definitions,
 * whose templates name the renderer's own node type, and the width the
 * viewport measured.
 */
export interface GridControllerOptions<
  Row,
  Node = string,
> extends GridOptions<Row> {
  /**
   * The columns to show. Omitted or empty, one column is inferred per field
   * of `dataSource` — see `defineColumnsFromRows`.
   */
  columns?: readonly ColumnDefinition<Row, Node>[] | undefined;
  /**
   * The width, in px, `resizeMode: "fit"` fills. `null` or absent before it
   * has been measured, or where there is no viewport at all (an export in
   * Node), and then columns keep their resolved widths.
   */
  viewportWidth?: number | null | undefined;
}

/**
 * A grid without a renderer: its state, the view derived from it, and every
 * action that changes it. A renderer creates one per grid, hands it the
 * current options on each update, draws `getView()` and calls the actions
 * from its event handlers, so no renderer decides anything the user can see.
 *
 * Each slice of `GridState` is controlled or not on its own, the way a form
 * input is: given as an option (`columnSort`), the grid shows that value and
 * an action only asks for a change through the slice's callback
 * (`onColumnSortChange`); left out, the controller keeps the slice itself,
 * starting from its default (`defaultColumnSort`).
 *
 * Every action follows the same steps: work out the next value; stop if it
 * is the very object the slice already holds; keep it, unless the slice is
 * controlled; report it through the slice's callback; then call every
 * subscriber, synchronously. The setters (`setColumnSort` and the like) also
 * stop for a value equal to the current one, so restoring what is already
 * there reports nothing.
 */
export interface GridController<Row, Node = string> {
  getOptions(): GridControllerOptions<Row, Node>;
  /**
   * Replaces the options, as a renderer does with its current props on every
   * update; calling it again with equal options changes nothing. A controlled
   * slice takes its new value from here.
   *
   * Does not call subscribers: a renderer calls this while it updates, and
   * draws the result itself — a subscriber called mid-update would update
   * mid-update too. A renderer that also tells other listeners about it does
   * so once its update is done.
   */
  setOptions(options: GridControllerOptions<Row, Node>): void;
  /** Every slice as the grid now applies it. The same object until a slice changes. */
  getState(): GridState<Row>;
  /** What the user is looking at — see `resolveGridView`. The same object until something in it changes. */
  getView(): GridView<Row, Node>;
  /**
   * Calls `listener` after each action that got as far as reporting a
   * change. Returns the function that unsubscribes it.
   */
  subscribe(listener: () => void): () => void;

  /**
   * Replaces the column widths. Reported through `onColumnResize` as the
   * `"end"` of a resize of the first column whose width changed, at its new
   * width — or, when its entry was removed, the width its definition gives
   * it. Equal widths report nothing.
   */
  setColumnSizing(sizing: ColumnSizingState): void;
  /**
   * Sets one column's width, as a resize gesture does: `"move"` while the
   * gesture lasts, `"end"` once it is over. Never skipped for an unchanged
   * width, so a drag held against a column's minimum still reports every
   * move.
   */
  resizeColumn(columnId: string, width: number, phase: "move" | "end"): void;
  /**
   * Ends a resize gesture by putting its column back as it was when the
   * gesture began — `startSizing` is the sizing state then, `startWidth` the
   * width the column was drawn at — keeping any other column's change made in
   * the meantime. Reported as the gesture's `"end"`, at `startWidth`.
   */
  cancelColumnResize(
    columnId: string,
    startSizing: ColumnSizingState,
    startWidth: number,
  ): void;

  /**
   * Replaces the column order. Reported through `onColumnOrderChange` naming
   * the first column whose position changed; an equal order reports nothing.
   */
  setColumnOrder(order: ColumnOrderState): void;
  /**
   * Moves a column in front of `beforeId`, or to the end when that is
   * `null`, among every column — hidden ones keep their place. A move that
   * changes nothing reports nothing.
   */
  moveColumn(columnId: string, beforeId: string | null): void;

  /**
   * Replaces the column visibility state. Reported through
   * `onColumnVisibilityChange` with every column whose entry changed; an
   * equal state reports nothing.
   */
  setColumnVisibility(visibility: ColumnVisibilityState): void;
  /** Shows the given columns, each in the place it held when hidden. One report for the whole call. */
  showColumns(columnIds: readonly string[]): void;
  /** Hides the given columns. A hidden column still sorts, filters and groups. */
  hideColumns(columnIds: readonly string[]): void;

  /**
   * Replaces the filter. Reported through `onFilterChange`; the same
   * entries in the same order report nothing.
   */
  setFilter(filter: FilterState<Row>): void;

  /**
   * Replaces the sort. Reported through `onColumnSortChange` naming the
   * first column whose place or direction changed; a sort equal to the
   * current one changes nothing and reports nothing.
   */
  setColumnSort(sort: ColumnSortState): void;
  /**
   * Cycles a column's sort, as its header toggle does: ascending, descending,
   * off. `stack` adds it to the sort rather than replacing the sort with it.
   */
  toggleColumnSort(
    columnId: string,
    options?: { readonly stack?: boolean | undefined },
  ): void;

  /**
   * Replaces the group-by stack. Reported through `onGroupByChange` naming
   * the first level that changed; an equal stack reports nothing.
   */
  setGroupBy(groupBy: GroupByState): void;
  /** Adds a column to the end of the group-by stack, or removes it if it is already there. */
  toggleGroupBy(columnId: string): void;
  /**
   * Puts a column into the group-by stack in front of `beforeColumnId`, or at
   * the end when that is `null` — adding it, or moving it if it is already
   * there.
   */
  moveGroupBy(columnId: string, beforeColumnId: string | null): void;

  /**
   * Replaces the collapsed groups. Reported with `groupId: null`, as a change
   * to every group at once; the same ids in the same order report nothing.
   */
  setGroupExpansion(expansion: GroupExpansionState): void;
  toggleGroupExpansion(groupId: string): void;
  expandAllGroups(): void;
  /** Collapses every group currently shown — see `collapseAllGroups`. */
  collapseAllGroups(): void;

  /**
   * Replaces the page and page size as given; the view clamps a page past
   * the last one. An equal pagination reports nothing.
   */
  setPagination(pagination: PaginationState): void;
  /** Moves to the given page, clamped into range. */
  goToPage(pageIndex: number): void;
  nextPage(): void;
  previousPage(): void;
  /** Changes the page size and goes back to the first page. */
  setPageSize(pageSize: number): void;
}
