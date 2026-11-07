import type { GridOptions, SelectionCallbacks } from "../options";
import type {
  CellSelectionState,
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
  SelectedCellRef,
  SelectIntent,
  SelectionDiff,
  SelectionState,
  SerializedGridState,
} from "../types";

/**
 * A row or column selection change by id — see
 * `GridControllerOptions.onSelectionDiff`.
 */
export interface SelectionDiffEvent extends SelectionDiff {
  /** Which selection changed. */
  readonly target: "rows" | "columns";
  /** The whole selection after the change. */
  readonly selection: SelectionState;
}

/**
 * What `createGridController` is given: the grid's options and selection
 * callbacks, plus what a renderer supplies that is not a setting — the column
 * definitions, whose templates name the renderer's own node type, the width
 * the viewport measured, and a hook for its own selection feedback.
 */
export interface GridControllerOptions<Row, Node = string>
  extends GridOptions<Row>, SelectionCallbacks<Row, Node> {
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
  /**
   * Called once per row or column selection change, after the selection
   * callbacks, with the change by id — every id it added or removed,
   * including those with no row on screen (on another page, in a collapsed
   * group, filtered out), which the callbacks' resolved rows leave out. For a
   * renderer's own feedback, such as a live region announcing how many rows
   * are selected; an application reads the selection callbacks instead.
   */
  onSelectionDiff?: ((event: SelectionDiffEvent) => void) | undefined;
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
 *
 * Every member is a plain function bound to its grid, safe to hand around on
 * its own — `onClick={controller.nextPage}`.
 */
export interface GridController<Row, Node = string> {
  readonly getOptions: () => GridControllerOptions<Row, Node>;
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
  readonly setOptions: (options: GridControllerOptions<Row, Node>) => void;
  /** Every slice as the grid now applies it. The same object until a slice changes. */
  readonly getState: () => GridState<Row>;
  /** What the user is looking at — see `resolveGridView`. The same object until something in it changes. */
  readonly getView: () => GridView<Row, Node>;
  /**
   * Calls `listener` after each action that got as far as reporting a
   * change. Returns the function that unsubscribes it.
   */
  readonly subscribe: (listener: () => void) => () => void;
  /**
   * Puts back state saved earlier — from `getState()`, or from
   * `serializeGridState` and back through JSON. Every slice given is set as
   * its own `set*` action would set it, so each that changes fires its
   * callback and a controlled one only asks; slices left out keep their value.
   * Subscribers are called once, after every slice is in place, and a
   * restored pagination is kept even when the same call changed the sort,
   * filter or grouping that would otherwise send it back to the first page.
   */
  readonly restoreState: (
    saved: Partial<GridState<Row>> | Partial<SerializedGridState<Row>>,
  ) => void;

  /**
   * Replaces the column widths. Reported through `onColumnResize` as the
   * `"end"` of a resize of the first column whose width changed, at its new
   * width — or, when its entry was removed, the width its definition gives
   * it. Equal widths report nothing.
   */
  readonly setColumnSizing: (sizing: ColumnSizingState) => void;
  /**
   * Sets one column's width, as a resize gesture does: `"move"` while the
   * gesture lasts, `"end"` once it is over. Never skipped for an unchanged
   * width, so a drag held against a column's minimum still reports every
   * move.
   */
  readonly resizeColumn: (
    columnId: string,
    width: number,
    phase: "move" | "end",
  ) => void;
  /**
   * Ends a resize gesture by putting its column back as it was when the
   * gesture began — `startSizing` is the sizing state then, `startWidth` the
   * width the column was drawn at — keeping any other column's change made in
   * the meantime. Reported as the gesture's `"end"`, at `startWidth`.
   */
  readonly cancelColumnResize: (
    columnId: string,
    startSizing: ColumnSizingState,
    startWidth: number,
  ) => void;

  /**
   * Replaces the column order. Reported through `onColumnOrderChange` naming
   * the first column whose position changed; an equal order reports nothing.
   */
  readonly setColumnOrder: (order: ColumnOrderState) => void;
  /**
   * Moves a column in front of `beforeId`, or to the end when that is
   * `null`, among every column — hidden ones keep their place. A move that
   * changes nothing reports nothing.
   */
  readonly moveColumn: (columnId: string, beforeId: string | null) => void;

  /**
   * Replaces the column visibility state. Reported through
   * `onColumnVisibilityChange` with every column whose entry changed; an
   * equal state reports nothing.
   */
  readonly setColumnVisibility: (visibility: ColumnVisibilityState) => void;
  /** Shows the given columns, each in the place it held when hidden. One report for the whole call. */
  readonly showColumns: (columnIds: readonly string[]) => void;
  /** Hides the given columns. A hidden column still sorts, filters and groups. */
  readonly hideColumns: (columnIds: readonly string[]) => void;

  /**
   * Replaces the filter. Reported through `onFilterChange`; a filter equal to
   * the current one — the same entries in the same order, a `Date` value
   * compared by time and a predicate by identity — reports nothing.
   */
  readonly setFilter: (filter: FilterState<Row>) => void;

  /**
   * Replaces the selected row ids as given, whatever `selectable` allows —
   * the way a controlled or default value is applied. The same ids in the
   * same order report nothing.
   */
  readonly setRowSelection: (selection: SelectionState) => void;
  /**
   * Selects rows as a user could, within what `selectable.rows` allows:
   * `"replace"` (the default) selects exactly these — only the last of them
   * under `"single"` — and `"toggle"` flips each one. An id need not name a
   * row on screen. A call that leaves the selection as it was reports
   * nothing.
   */
  readonly selectRows: (
    rowIds: readonly string[],
    intent?: "replace" | "toggle",
  ) => void;
  /**
   * Applies one click or key press to a row: `"replace"`, `"toggle"` or
   * `"range"` from the last row selected by anything but a range, across
   * the data rows on the current page.
   */
  readonly selectRow: (rowId: string, intent: SelectIntent) => void;
  /** Selects every data row on the current page, when `selectable.rows` is `"multiple"`. */
  readonly selectAllRows: () => void;
  /** Lets go of every row, column and cell selection at once, as Escape does. */
  readonly clearSelection: () => void;
  /** Replaces the selected column ids as given — see `setRowSelection`. */
  readonly setColumnSelection: (selection: SelectionState) => void;
  /** `selectRow`, for a column among the columns as rendered. */
  readonly selectColumn: (columnId: string, intent: SelectIntent) => void;
  /** Replaces the selected cell as given, `null` for none. */
  readonly setCellSelection: (selection: CellSelectionState) => void;
  /**
   * Applies one click or key press to a cell: `"toggle"` lets go of it when
   * it is the one selected; anything else selects it. A cell holds one value,
   * so a range over cells reads as a plain click.
   */
  readonly selectCell: (cell: SelectedCellRef, intent: SelectIntent) => void;

  /**
   * Replaces the sort. Reported through `onColumnSortChange` naming the
   * first column whose place or direction changed; a sort equal to the
   * current one changes nothing and reports nothing.
   */
  readonly setColumnSort: (sort: ColumnSortState) => void;
  /**
   * Cycles a column's sort, as its header toggle does: ascending, descending,
   * off. `stack` adds it to the sort rather than replacing the sort with it.
   */
  readonly toggleColumnSort: (
    columnId: string,
    options?: { readonly stack?: boolean | undefined },
  ) => void;
  /**
   * Takes one column out of the sort, keeping the rest in their order, and
   * reports naming that column — which `setColumnSort` without it would not
   * when it was the first key, naming instead the key that moved up. A
   * column the sort leaves out already reports nothing.
   */
  readonly clearColumnSort: (columnId: string) => void;

  /**
   * Replaces the group-by stack. Reported through `onGroupByChange` naming
   * the first level that changed; an equal stack reports nothing.
   */
  readonly setGroupBy: (groupBy: GroupByState) => void;
  /** Adds a column to the end of the group-by stack, or removes it if it is already there. */
  readonly toggleGroupBy: (columnId: string) => void;
  /**
   * Puts a column into the group-by stack in front of `beforeColumnId`, or at
   * the end when that is `null` — adding it, or moving it if it is already
   * there.
   */
  readonly moveGroupBy: (
    columnId: string,
    beforeColumnId: string | null,
  ) => void;

  /**
   * Replaces the collapsed groups. Reported with `groupId: null`, as a change
   * to every group at once; the same ids in the same order report nothing.
   */
  readonly setGroupExpansion: (expansion: GroupExpansionState) => void;
  readonly toggleGroupExpansion: (groupId: string) => void;
  readonly expandAllGroups: () => void;
  /** Collapses every group currently shown — see `collapseAllGroups`. */
  readonly collapseAllGroups: () => void;

  /**
   * Replaces the page and page size. A controlled pagination asks for them
   * as given and the view clamps a page past the last one; an uncontrolled
   * one stores and reports that page clamped. An equal pagination reports
   * nothing.
   */
  readonly setPagination: (pagination: PaginationState) => void;
  /**
   * Moves to the given page, clamped into range. A page that clamps to the
   * current one reports nothing.
   */
  readonly goToPage: (pageIndex: number) => void;
  /** Moves one page on; on the last page it does nothing and reports nothing. */
  readonly nextPage: () => void;
  /** Moves one page back; on the first page it does nothing and reports nothing. */
  readonly previousPage: () => void;
  /**
   * Changes the page size and goes back to the first page. The current size,
   * already on the first page, reports nothing.
   */
  readonly setPageSize: (pageSize: number) => void;
}
