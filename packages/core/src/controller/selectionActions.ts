import type {
  CellSelectionState,
  GridState,
  GridView,
  ResolvedRow,
  SelectIntent,
  SelectionMode,
  SelectionState,
} from "../types";
import { memoizeLast } from "../util/memoize";
import {
  applySelectionIntent,
  clearSelection,
  isSameCell,
  selectAll,
  selectCell,
  toggleCellSelection,
  toggleSelection,
} from "../util/selection";
import { sameItems } from "./changes";
import type { GridController, GridControllerOptions } from "./gridController";
import {
  reportCellSelection,
  reportColumnSelection,
  reportRowSelection,
} from "./selectionEvents";

/** What the selection actions need of the controller they belong to. */
export interface SelectionContext<Row, Node> {
  readonly getState: () => GridState<Row>;
  readonly getOptions: () => GridControllerOptions<Row, Node>;
  readonly getView: () => GridView<Row, Node>;
  /** The controller's shared commit — see `createGridController`. */
  readonly commit: <K extends keyof GridState<Row>>(
    key: K,
    next: GridState<Row>[K],
    report: () => void,
  ) => void;
  /** Runs several commits as one change — see `createGridController`. */
  readonly transaction: (run: () => void) => void;
}

type SelectionActions<Row, Node> = Pick<
  GridController<Row, Node>,
  | "setRowSelection"
  | "selectRows"
  | "selectRow"
  | "selectAllRows"
  | "clearSelection"
  | "setColumnSelection"
  | "selectColumn"
  | "setCellSelection"
  | "selectCell"
>;

function indexRows<Row>(
  rows: readonly ResolvedRow<Row>[],
): ReadonlyMap<string, ResolvedRow<Row>> {
  return new Map(rows.map((entry) => [entry.rowId, entry]));
}

/** `ids` without repeats, each where it first appears. */
function distinct(ids: readonly string[]): readonly string[] {
  return [...new Set(ids)];
}

/**
 * One click or key press on a row or column, and where its axis's anchor
 * goes after it. An anchor no longer among `orderedIds` (its row paged,
 * filtered or grouped out of sight) counts as none, so a range from it
 * starts afresh at `id`, as a first Shift-click does. A range from a live
 * anchor keeps it; anything else moves it to `id`; an axis that can't be
 * selected leaves it alone.
 */
function click(
  selection: SelectionState,
  orderedIds: readonly string[],
  anchor: string | null,
  id: string,
  intent: SelectIntent,
  mode: SelectionMode,
): { readonly selection: SelectionState; readonly anchor: string | null } {
  const live = anchor !== null && orderedIds.includes(anchor) ? anchor : null;
  const keepsAnchor = mode === false || (intent === "range" && live !== null);
  return {
    selection: applySelectionIntent(
      selection,
      orderedIds,
      live,
      id,
      intent,
      mode,
    ),
    anchor: keepsAnchor ? anchor : id,
  };
}

/**
 * The row, column and cell selection actions of one controller. Kept in a
 * module of their own as the largest group of actions, and the only one with
 * memory beyond the state: the anchor a range is measured from.
 *
 * Rows are resolved against the data rows on the current page and columns
 * against the columns as rendered — what the user can see and click — so a
 * range spans what is adjacent on screen.
 */
export function createSelectionActions<Row, Node>(
  grid: SelectionContext<Row, Node>,
): SelectionActions<Row, Node> {
  /**
   * Where a range is measured from: the last row or column selected by
   * anything but a range, so that repeated Shift-clicks re-draw one span
   * instead of walking the anchor along with them. Replacing or clearing an
   * axis's selection lets go of its anchor, which belonged to the selection
   * that went.
   */
  let rowAnchor: string | null = null;
  let columnAnchor: string | null = null;
  const rowsById = memoizeLast(indexRows<Row>);

  function modes() {
    const selectable = grid.getOptions().selectable;
    return {
      rows: selectable?.rows ?? false,
      columns: selectable?.columns ?? false,
      cells: selectable?.cells ?? false,
    };
  }

  function rowIds(): readonly string[] {
    return grid.getView().displayDataRows.map((entry) => entry.rowId);
  }

  function columnIds(): readonly string[] {
    return grid.getView().columns.map((entry) => entry.id);
  }

  function commitRows(next: SelectionState): void {
    const previous = grid.getState().rowSelection;
    grid.commit("rowSelection", next, () => {
      const options = grid.getOptions();
      const diff = reportRowSelection(
        previous,
        next,
        rowsById(grid.getView().displayDataRows),
        options,
      );
      options.onSelectionDiff?.({ target: "rows", ...diff, selection: next });
    });
  }

  function commitColumns(next: SelectionState): void {
    const previous = grid.getState().columnSelection;
    grid.commit("columnSelection", next, () => {
      const options = grid.getOptions();
      const diff = reportColumnSelection(
        previous,
        next,
        grid.getView().columns,
        options,
      );
      options.onSelectionDiff?.({
        target: "columns",
        ...diff,
        selection: next,
      });
    });
  }

  function commitCell(next: CellSelectionState): void {
    const previous = grid.getState().cellSelection;
    grid.commit("cellSelection", next, () => {
      const view = grid.getView();
      reportCellSelection(
        previous,
        next,
        rowsById(view.displayDataRows),
        view.columns,
        grid.getOptions(),
      );
    });
  }

  return {
    setRowSelection(selection) {
      rowAnchor = null;
      if (!sameItems(grid.getState().rowSelection, selection)) {
        commitRows(selection);
      }
    },
    selectRows(ids, intent = "replace") {
      const mode = modes().rows;
      const current = grid.getState().rowSelection;
      if (mode === false || ids.length === 0) {
        return;
      }
      const next =
        intent === "toggle"
          ? ids.reduce(
              (selection, id) => toggleSelection(selection, id, mode),
              current,
            )
          : mode === "single"
            ? ids.slice(-1)
            : distinct(ids);
      rowAnchor = ids.at(-1) ?? null;
      if (!sameItems(current, next)) {
        commitRows(next);
      }
    },
    selectRow(rowId, intent) {
      const next = click(
        grid.getState().rowSelection,
        rowIds(),
        rowAnchor,
        rowId,
        intent,
        modes().rows,
      );
      rowAnchor = next.anchor;
      commitRows(next.selection);
    },
    selectAllRows() {
      commitRows(
        selectAll(grid.getState().rowSelection, rowIds(), modes().rows),
      );
    },
    clearSelection() {
      rowAnchor = null;
      columnAnchor = null;
      grid.transaction(() => {
        commitRows(clearSelection(grid.getState().rowSelection));
        commitColumns(clearSelection(grid.getState().columnSelection));
        commitCell(null);
      });
    },

    setColumnSelection(selection) {
      columnAnchor = null;
      if (!sameItems(grid.getState().columnSelection, selection)) {
        commitColumns(selection);
      }
    },
    selectColumn(columnId, intent) {
      const next = click(
        grid.getState().columnSelection,
        columnIds(),
        columnAnchor,
        columnId,
        intent,
        modes().columns,
      );
      columnAnchor = next.anchor;
      commitColumns(next.selection);
    },

    setCellSelection(selection) {
      if (!isSameCell(grid.getState().cellSelection, selection)) {
        commitCell(selection);
      }
    },
    selectCell(cell, intent) {
      const current = grid.getState().cellSelection;
      const mode = modes().cells;
      commitCell(
        intent === "toggle"
          ? toggleCellSelection(current, cell, mode)
          : selectCell(current, cell, mode),
      );
    },
  };
}
