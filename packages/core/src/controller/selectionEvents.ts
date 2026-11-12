import type { SelectionCallbacks } from "../options";
import type {
  CellSelectionState,
  ResolvedColumn,
  ResolvedRow,
  SelectedCellRef,
  SelectionDiff,
  SelectionState,
} from "../types";
import { resolveCell, resolveColumns, resolveRows } from "../util/rows";
import { diffSelection } from "../util/selection";

/**
 * Fires every row selection callback for one change, from one diff of it, so
 * that no two can disagree about what the change did. Returns the diff by id,
 * which still counts ids no row on screen answers to — the resolved rows the
 * callbacks carry leave those out.
 */
export function reportRowSelection<Row, Node>(
  previous: SelectionState,
  next: SelectionState,
  rowsById: ReadonlyMap<string, ResolvedRow<Row>>,
  callbacks: SelectionCallbacks<Row, Node>,
): SelectionDiff {
  const diff = diffSelection(previous, next);
  const added = resolveRows(rowsById, diff.added);
  const removed = resolveRows(rowsById, diff.removed);

  for (const row of added) {
    callbacks.onRowSelect?.({ row, selection: next });
  }
  if (added.length > 0) {
    callbacks.onRowsSelect?.({ rows: added, selection: next });
  }
  for (const row of removed) {
    callbacks.onRowDeselect?.({ row, selection: next });
  }
  if (removed.length > 0) {
    callbacks.onRowsDeselect?.({ rows: removed, selection: next });
  }
  callbacks.onRowSelectionChange?.({
    added,
    removed,
    selected: resolveRows(rowsById, next),
    selection: next,
  });
  return diff;
}

/** `reportRowSelection`, for the columns as rendered. */
export function reportColumnSelection<Row, Node>(
  previous: SelectionState,
  next: SelectionState,
  columns: readonly ResolvedColumn<Row, Node>[],
  callbacks: SelectionCallbacks<Row, Node>,
): SelectionDiff {
  const diff = diffSelection(previous, next);
  const added = resolveColumns(columns, diff.added);
  const removed = resolveColumns(columns, diff.removed);

  for (const column of added) {
    callbacks.onColumnSelect?.({ column, selection: next });
  }
  if (added.length > 0) {
    callbacks.onColumnsSelect?.({ columns: added, selection: next });
  }
  for (const column of removed) {
    callbacks.onColumnDeselect?.({ column, selection: next });
  }
  if (removed.length > 0) {
    callbacks.onColumnsDeselect?.({ columns: removed, selection: next });
  }
  callbacks.onColumnSelectionChange?.({
    added,
    removed,
    selected: resolveColumns(columns, next),
    selection: next,
  });
  return diff;
}

/** The one cell `selection` holds, or `null` when it holds none. */
function selectedCellOf(selection: CellSelectionState): SelectedCellRef | null {
  return selection.kind === "cell" ? selection : null;
}

/**
 * Fires the cell selection callbacks for one change. The cell left and the
 * cell arrived at are resolved together, so moving between two cells reports
 * the leaving and the arriving as one change.
 */
export function reportCellSelection<Row, Node>(
  previous: CellSelectionState,
  next: CellSelectionState,
  rowsById: ReadonlyMap<string, ResolvedRow<Row>>,
  columns: readonly ResolvedColumn<Row, Node>[],
  callbacks: SelectionCallbacks<Row, Node>,
): void {
  const selected = resolveCell(rowsById, columns, selectedCellOf(next));
  const deselected = resolveCell(rowsById, columns, selectedCellOf(previous));

  if (deselected !== null) {
    callbacks.onCellDeselect?.({ cell: deselected, selection: next });
  }
  if (selected !== null) {
    callbacks.onCellSelect?.({ cell: selected, selection: next });
  }
  callbacks.onCellSelectionChange?.({
    selected,
    deselected,
    selection: next,
  });
}
