import type {
  ColumnDefinition,
  ColumnVisibilityState,
  DataColumn,
} from "../types";
import { getColumnId } from "./grid";

/**
 * Whether `column` is shown: what the user last chose for it, if anything,
 * else what its definition says. The one place that precedence is decided,
 * so the view and an imperative "is it showing?" cannot disagree.
 */
export function isColumnVisible<Row>(
  column: ColumnDefinition<Row, unknown>,
  visibility: ColumnVisibilityState,
): boolean {
  return visibility[getColumnId(column)] ?? column.hidden !== true;
}

/**
 * `columns` without the hidden ones, in the same order. `columns` itself when
 * every column is shown — the common case — so a stage memoised on this
 * output sees nothing change.
 */
export function applyColumnVisibility<Row, Node>(
  columns: readonly DataColumn<Row, Node>[],
  visibility: ColumnVisibilityState,
): readonly DataColumn<Row, Node>[] {
  const visible = columns.filter((entry) =>
    isColumnVisible(entry.column, visibility),
  );
  return visible.length === columns.length ? columns : visible;
}

/**
 * `visibility` with each of `columnIds` shown (`visible: true`) or hidden.
 * Only a column whose visibility actually changes gets an entry, and ids
 * naming no column are ignored, so asking to show what is already showing
 * hands back `visibility` itself — the same reference, for a caller deciding
 * whether anything happened.
 */
export function setColumnVisibility<Row>(
  columns: readonly DataColumn<Row, unknown>[],
  visibility: ColumnVisibilityState,
  columnIds: readonly string[],
  visible: boolean,
): ColumnVisibilityState {
  const requested = new Set(columnIds);
  const changed = columns.filter(
    (entry) =>
      requested.has(entry.id) &&
      isColumnVisible(entry.column, visibility) !== visible,
  );
  if (changed.length === 0) {
    return visibility;
  }
  return {
    ...visibility,
    ...Object.fromEntries(changed.map((entry) => [entry.id, visible])),
  };
}
