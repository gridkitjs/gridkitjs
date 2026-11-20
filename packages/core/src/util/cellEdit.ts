import type { ColumnDefinition, GridView, SelectedCellRef } from "../types";

/**
 * Whether `column`'s `editable` accepts `row`: `true`, or a function
 * returning `true` for it. For a renderer drawing one cell, which already
 * holds both; `isCellEditable` answers for a cell by its address.
 */
export function isColumnEditable<Row, Node>(
  column: ColumnDefinition<Row, Node>,
  row: Row,
): boolean {
  const { editable } = column;
  return typeof editable === "function" ? editable(row) : editable === true;
}

/**
 * Whether `cell` may be edited, both to start an edit and to keep one open:
 * a data row on the current page (`view.displayDataRows`), a shown column
 * (`view.columns`), and the column's `editable` true for that row. Group
 * and summary rows never are.
 */
export function isCellEditable<Row, Node>(
  view: GridView<Row, Node>,
  cell: SelectedCellRef,
): boolean {
  const entry = view.displayDataRows.find(
    (candidate) => candidate.rowId === cell.rowId,
  );
  const column = view.columns.find(
    (candidate) => candidate.id === cell.columnId,
  );
  return (
    entry !== undefined &&
    column !== undefined &&
    isColumnEditable(column.column, entry.row)
  );
}
