import type {
  ColumnDefinition,
  DisplayRow,
  GroupByEntry,
  GroupByState,
  GroupExpansionState,
  ResolvedColumn,
  ResolvedGroupRow,
  ResolvedRow,
  SortDirection,
} from "../types";
import { accessDotted } from "./grid";
import { compareValues } from "./sorting";

/**
 * This group's id, from its path. Every group-id producer/consumer in this
 * package goes through this — never join `path` by hand elsewhere.
 *
 * `JSON.stringify` rather than a delimiter join: a delimiter would have to be
 * escaped in every segment to stay collision-free against a value that
 * legitimately contains it, and `JSON.stringify` already draws that
 * boundary between array entries for free.
 */
export function groupRowId(path: readonly unknown[]): string {
  return JSON.stringify(path);
}

interface ValueGroup<Row> {
  value: unknown;
  rows: ResolvedRow<Row>[];
}

/**
 * A key `accessDotted`'s result can be bucketed by, distinguishing values
 * that `compareValues`/`===` would treat as equal-but-not-identical (two
 * `Date` instances for the same instant) while keeping values of different
 * types apart (the number `1` and the string `"1"`).
 */
function bucketKey(value: unknown): string {
  if (value === null || value === undefined) {
    return "\0empty";
  }
  if (value instanceof Date) {
    return `\0date:${String(value.getTime())}`;
  }
  switch (typeof value) {
    case "string":
    case "number":
    case "boolean":
    case "bigint":
    case "symbol":
      return `\0${typeof value}:${String(value)}`;
    case "function":
      return "\0function";
    default:
      // Arrays, and anything else `accessDotted` could return.
      return `\0object:${JSON.stringify(value)}`;
  }
}

/**
 * `rows` bucketed by `column`'s value, one bucket per distinct value in
 * first-seen order, then ordered by `direction` via `compareValues` — the
 * same comparator `sortRows` uses, so a grouped column and a sorted column
 * order their values identically.
 */
function partitionByValue<Row>(
  rows: readonly ResolvedRow<Row>[],
  column: ColumnDefinition<Row, unknown>,
  direction: SortDirection,
): readonly ValueGroup<Row>[] {
  const buckets = new Map<string, ValueGroup<Row>>();
  for (const row of rows) {
    const value = accessDotted(row.row, column.field);
    const key = bucketKey(value);
    const bucket = buckets.get(key);
    if (bucket === undefined) {
      buckets.set(key, { value, rows: [row] });
    } else {
      bucket.rows.push(row);
    }
  }

  const groups = [...buckets.values()];
  groups.sort((a, b) => {
    const result = compareValues(a.value, b.value, column.type);
    return direction === "asc" ? result : -result;
  });
  return groups;
}

/**
 * Depth-first builder behind `groupRows`: partitions `rows` by `levels[0]`,
 * appends a header per resulting group, and recurses into `levels.slice(1)`
 * for each — unless that group is collapsed, in which case only its header
 * is appended. `rows` with no levels left (either `levels` started empty, or
 * recursion exhausted it) are appended as plain data rows, keeping the
 * relative order filter/sort already gave them.
 */
function buildLevel<Row>(
  rows: readonly ResolvedRow<Row>[],
  levels: readonly GroupByEntry[],
  parentPath: readonly unknown[],
  expansion: GroupExpansionState,
  byId: ReadonlyMap<string, ColumnDefinition<Row, unknown>>,
  out: DisplayRow<Row>[],
): void {
  const level = levels[0];
  if (level === undefined) {
    out.push(...rows);
    return;
  }

  // `levels` is pre-filtered to entries naming a column present in `byId`
  // (see `groupRows`), so this is always found.
  const column = byId.get(level.columnId);
  if (column === undefined) {
    out.push(...rows);
    return;
  }

  const rest = levels.slice(1);
  const groups = partitionByValue(rows, column, level.direction ?? "asc");

  for (const group of groups) {
    const path = [...parentPath, group.value];
    const groupId = groupRowId(path);
    const expanded = !expansion.includes(groupId);
    const header: ResolvedGroupRow = {
      kind: "group",
      groupId,
      level: parentPath.length,
      columnId: level.columnId,
      value: group.value,
      path,
      expanded,
      count: group.rows.length,
      // Renumbered globally once `groupRows` has the whole flattened array.
      rowIndex: -1,
    };
    out.push(header);
    if (expanded) {
      buildLevel(group.rows, rest, path, expansion, byId, out);
    }
  }
}

/**
 * `rows`, regrouped into `groupBy`'s stacked levels — a group header per
 * distinct value at each level, ordered by `compareValues` per that level's
 * own `direction`, followed depth-first by its nested groups and/or data
 * rows. A collapsed group (its `groupId` present in `expansion`) contributes
 * only its own header, nothing beneath it — but its `count` still reports
 * the group's full leaf-row count either way.
 *
 * Filter and sort are expected to have already run (see `resolveShownRows`):
 * this only reshapes their output, and never changes which rows appear or
 * their relative order within a group.
 *
 * `rowIndex` is renumbered across the whole flattened output, header rows
 * included — the same invariant `sortRows`/`filterRows` keep for
 * `ResolvedRow.rowIndex`, extended to `ResolvedGroupRow.rowIndex` since
 * `GridBody` addresses both kinds by the same flat position.
 *
 * Returns `rows` itself, untouched, when `groupBy` is empty or names only
 * columns absent from `columns` — a stored grouping tolerates a column
 * removed from the definition the same way a stored `ColumnSortState` does.
 */
export function groupRows<Row>(
  rows: readonly ResolvedRow<Row>[],
  groupBy: GroupByState,
  expansion: GroupExpansionState,
  columns: readonly ResolvedColumn<Row, unknown>[],
): readonly DisplayRow<Row>[] {
  if (groupBy.length === 0) {
    return rows;
  }

  const byId = new Map(columns.map((entry) => [entry.id, entry.column]));
  const active = groupBy.filter((entry) => byId.has(entry.columnId));
  if (active.length === 0) {
    return rows;
  }

  const out: DisplayRow<Row>[] = [];
  buildLevel(rows, active, [], expansion, byId, out);

  return out.map((entry, index) =>
    entry.rowIndex === index ? entry : { ...entry, rowIndex: index },
  );
}

/**
 * The expansion with `groupId` collapsed if it was expanded, or expanded if
 * it was collapsed.
 */
export function toggleGroupExpansion(
  expansion: GroupExpansionState,
  groupId: string,
): GroupExpansionState {
  return expansion.includes(groupId)
    ? expansion.filter((id) => id !== groupId)
    : [...expansion, groupId];
}

/** `expansion` reduced to empty — every group expanded. Mirrors `clearAllFilters`. */
export function expandAllGroups(
  expansion: GroupExpansionState,
): GroupExpansionState {
  return expansion.length === 0 ? expansion : [];
}

/**
 * Every group id present in `rows` — for collapsing every group currently
 * shown in one call. Operates on the already-grouped display, not the raw
 * grouping, so a group hidden beneath an already-collapsed ancestor (and so
 * absent from `rows`) keeps whatever expansion it already had rather than
 * being forced closed too; expanding that ancestor again reveals it exactly
 * as it was left.
 */
export function collapseAllGroups<Row>(
  rows: readonly DisplayRow<Row>[],
): GroupExpansionState {
  return rows
    .filter((entry): entry is ResolvedGroupRow => "kind" in entry)
    .map((entry) => entry.groupId);
}
