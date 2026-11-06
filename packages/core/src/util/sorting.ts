import type {
  ColumnSortState,
  ColumnType,
  DataColumn,
  ResolvedRow,
  SortDirection,
} from "../types";
import { accessDotted } from "./grid";
import { renumberRows } from "./position";

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined;
}

/** A date/time value converted to a comparable instant. */
function toTime(value: unknown): number {
  return value instanceof Date
    ? value.getTime()
    : new Date(String(value)).getTime();
}

/**
 * Compares two cell values the way `type` implies — numerically for the
 * numeric types, chronologically for the date/time types, lexically
 * otherwise. Defaults to string comparison when `type` is absent, mirroring
 * `ColumnDefinition.type`'s own default.
 *
 * `null`/`undefined` sort after every value on both sides. Used directly,
 * that ordering is fixed; `sortRows` applies it directionally without
 * disturbing it — see its own doc comment.
 */
export function compareValues(
  a: unknown,
  b: unknown,
  type?: ColumnType,
): number {
  if (isEmpty(a)) {
    return isEmpty(b) ? 0 : 1;
  }
  if (isEmpty(b)) {
    return -1;
  }

  switch (type) {
    case "number":
    case "decimal":
    case "currency":
    case "percent":
      return Number(a) - Number(b);
    case "boolean":
      return Number(Boolean(a)) - Number(Boolean(b));
    case "date":
    case "dateTime":
    case "time":
      return toTime(a) - toTime(b);
    default:
      return String(a).localeCompare(String(b));
  }
}

/** This column's direction in `sort`, or `null` outside it. */
export function sortDirectionFor(
  sort: ColumnSortState,
  columnId: string,
): SortDirection | null {
  return sort.find((entry) => entry.columnId === columnId)?.direction ?? null;
}

/** This column's 1-based place in `sort`, or `null` outside it. */
export function sortPriorityFor(
  sort: ColumnSortState,
  columnId: string,
): number | null {
  const index = sort.findIndex((entry) => entry.columnId === columnId);
  return index === -1 ? null : index + 1;
}

/**
 * The sort with `columnId` cycled to its next direction — none → asc → desc →
 * none.
 *
 * `stack: false` (a plain click) means "sort by only this column": unless
 * `columnId` is already the sole entry, in which case its own cycle just
 * continues, it collapses `sort` down to `columnId` alone at `"asc"`,
 * regardless of any direction it held as part of a larger stack.
 *
 * `stack: true` (a Shift-click) cycles or appends `columnId` in place without
 * disturbing the rest of the stack; cycling it back to `"none"` removes it
 * and closes the gap, leaving the others in their existing order.
 */
export function toggleColumnSort(
  sort: ColumnSortState,
  columnId: string,
  options: { readonly stack: boolean },
): ColumnSortState {
  const index = sort.findIndex((entry) => entry.columnId === columnId);
  const isSoleEntry = sort.length === 1 && index === 0;

  if (!options.stack && !isSoleEntry) {
    return [{ columnId, direction: "asc" }];
  }

  const current = index === -1 ? undefined : sort[index]?.direction;
  const next: SortDirection | null =
    current === undefined ? "asc" : current === "asc" ? "desc" : null;

  if (next === null) {
    return sort.filter((entry) => entry.columnId !== columnId);
  }
  if (index === -1) {
    return [...sort, { columnId, direction: next }];
  }
  return sort.map((entry, i) =>
    i === index ? { columnId, direction: next } : entry,
  );
}

/**
 * `rows` ordered by `sort` — each entry read against `columns` for its
 * `field` and `type` — with `rowIndex` and `datasetIndex` renumbered to
 * match the new positions, the invariant the rest of the grid relies on for
 * keyboard navigation and `aria-rowindex`.
 *
 * Stable (`Array.prototype.sort` has been stable since ES2019), so rows
 * equal under every active key keep their relative order. A `null`/
 * `undefined` value sorts last under either direction — resolved before
 * `compareValues` is asked, and left out of the direction flip below, so
 * that toggling a column reorders the values it holds rather than moving its
 * gaps to the front.
 *
 * Returns `rows` itself, untouched, when `sort` is empty or names only
 * columns absent from `columns` — a stored sort tolerates a column removed
 * from the definition the same way a stored `ColumnOrderState` does.
 */
export function sortRows<Row>(
  rows: readonly ResolvedRow<Row>[],
  sort: ColumnSortState,
  columns: readonly DataColumn<Row, unknown>[],
): readonly ResolvedRow<Row>[] {
  if (sort.length === 0) {
    return rows;
  }

  const byId = new Map(columns.map((entry) => [entry.id, entry.column]));
  const active = sort.filter((entry) => byId.has(entry.columnId));
  if (active.length === 0) {
    return rows;
  }

  const sorted = [...rows].sort((a, b) => {
    for (const { columnId, direction } of active) {
      const column = byId.get(columnId);
      if (column === undefined) {
        continue;
      }
      const left = accessDotted(a.row, column.field);
      const right = accessDotted(b.row, column.field);
      const leftEmpty = isEmpty(left);
      const rightEmpty = isEmpty(right);
      if (leftEmpty || rightEmpty) {
        if (leftEmpty && rightEmpty) {
          continue;
        }
        return leftEmpty ? 1 : -1;
      }

      const result = compareValues(left, right, column.type);
      if (result !== 0) {
        return direction === "asc" ? result : -result;
      }
    }
    return 0;
  });

  return renumberRows(sorted);
}
