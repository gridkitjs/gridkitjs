import type {
  ColumnSortState,
  DataColumn,
  FilterState,
  ResolvedColumn,
  ResolvedRow,
  SelectedCell,
  SelectedCellRef,
  SelectedColumn,
} from "../types";
import { accessDotted } from "./grid";
import { filterRows } from "./filtering";
import { sortRows } from "./sorting";

/**
 * `rows`, filtered then sorted — the one function `DataGrid.tsx` (and any
 * future framework binding) calls instead of composing `filterRows`/
 * `sortRows` itself.
 *
 * Filter always runs first: an O(n) pass that shrinks what the O(n log n)
 * sort has to touch whenever a filter is active, free when it isn't. This
 * is a performance choice, not a correctness one — filtering is an
 * order-preserving predicate and sort is a stable total order over whatever
 * it's handed, so the final order is identical either way.
 */
export function resolveShownRows<Row>(
  rows: readonly ResolvedRow<Row>[],
  filter: FilterState<Row>,
  sort: ColumnSortState,
  columns: readonly DataColumn<Row, unknown>[],
): readonly ResolvedRow<Row>[] {
  return sortRows(filterRows(rows, filter, columns), sort, columns);
}

/**
 * The `default` of a switch over every `DisplayRow` kind: a switch that
 * leaves a kind out doesn't compile.
 */
export function unknownDisplayRow(entry: never): never {
  const { kind } = entry as { readonly kind: unknown };
  throw new TypeError(
    `GridKit: \`${String(kind)}\` is not a display row kind.`,
  );
}

/**
 * `ids` resolved back to the rows behind them, keyed by `rowsById`.
 *
 * An id with no row behind it is dropped rather than left `undefined`: a
 * selection outlives a change to the data, so that filtering a row out and
 * back leaves it selected, and only what still exists can be handed to a
 * callback.
 */
export function resolveRows<Row>(
  rowsById: ReadonlyMap<string, ResolvedRow<Row>>,
  ids: readonly string[],
): readonly ResolvedRow<Row>[] {
  return ids.map((id) => rowsById.get(id)).filter((row) => row !== undefined);
}

/**
 * `ids` resolved back to the columns behind them, paired with the position
 * each holds in `columns` — a stale id is dropped, matching `resolveRows`.
 */
export function resolveColumns<Row, Node>(
  columns: readonly ResolvedColumn<Row, Node>[],
  ids: readonly string[],
): readonly SelectedColumn<Row, Node>[] {
  return ids
    .map((id) => {
      const columnIndex = columns.findIndex((entry) => entry.id === id);
      const column = columns[columnIndex];
      return column === undefined
        ? undefined
        : { columnId: id, column, columnIndex };
    })
    .filter((column) => column !== undefined);
}

/**
 * `cell` resolved down to the row, column and value it addresses — `null`
 * when there is no cell, or when either half of it names a row or column
 * that no longer exists.
 */
export function resolveCell<Row, Node>(
  rowsById: ReadonlyMap<string, ResolvedRow<Row>>,
  columns: readonly ResolvedColumn<Row, Node>[],
  cell: SelectedCellRef | null,
): SelectedCell<Row, Node> | null {
  if (cell === null) {
    return null;
  }
  const entry = rowsById.get(cell.rowId);
  const columnIndex = columns.findIndex(
    (candidate) => candidate.id === cell.columnId,
  );
  const column = columns[columnIndex];
  if (entry === undefined || column === undefined) {
    return null;
  }
  return {
    rowId: cell.rowId,
    columnId: cell.columnId,
    row: entry.row,
    column,
    rowIndex: entry.rowIndex,
    columnIndex,
    value: accessDotted(entry.row, column.column.field),
  };
}
