import type {
  AggregateResults,
  AggregateSpec,
  AggregateState,
  BuiltInAggregate,
  ColumnDefinition,
  DisplayRow,
  GroupAggregateDisplay,
  GroupByState,
  ResolvedColumn,
  ResolvedGroupRow,
  ResolvedGroupSummaryRow,
  ResolvedRow,
} from "../types";
import { accessDotted } from "./grid";
import { bucketKey } from "./grouping";
import { compareValues } from "./sorting";

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined;
}

/** A value's numeric reading for `sum`/`avg` — `NaN` is treated as absent, same as an empty value. */
function toNumber(value: unknown): number {
  return Number(value);
}

/**
 * A key distinguishing `countDistinct`'s buckets — reuses `bucketKey`'s
 * approach in `grouping.ts` (distinct values bucketed by kind and content,
 * two `Date`s for the same instant collapsing together) rather than a
 * second implementation of the same idea.
 */
function distinctKey(value: unknown): string {
  if (isEmpty(value)) {
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
      return `\0object:${JSON.stringify(value)}`;
  }
}

/**
 * One built-in reducer over the raw values read off `rows` at `column`'s
 * field. `min`/`max` compare via `compareValues` so a `date`/`dateTime`
 * column orders chronologically rather than numerically; `sum`/`avg`
 * coerce numerically regardless of `column.type`, matching how a
 * `currency`/`decimal`/`percent`/`number` column is expected to be used.
 *
 * Null/undefined handling: `min`/`max` ignore empty entries entirely rather
 * than letting them win by `compareValues`'s own "empty sorts last"
 * convention — an aggregate that returned `undefined` merely because every
 * value happened to be null would be a worse answer than skipping them.
 * `count` counts every row in scope regardless of whether its value at this
 * column is empty (it answers "how many rows", not "how many non-null
 * values") — `countDistinct` excludes empty values from its distinct set,
 * since "blank" is not a value to count as one of the distinct ones.
 */
function reduceBuiltIn<Row>(
  rows: readonly Row[],
  fn: BuiltInAggregate,
  column: ResolvedColumn<Row, unknown> | undefined,
): unknown {
  if (fn === "count") {
    return rows.length;
  }

  const field = column?.column.field;
  const values =
    field === undefined ? [] : rows.map((row) => accessDotted(row, field));

  switch (fn) {
    case "sum": {
      let total = 0;
      for (const value of values) {
        if (isEmpty(value)) continue;
        total += toNumber(value);
      }
      return total;
    }
    case "avg": {
      const present = values.filter((value) => !isEmpty(value));
      if (present.length === 0) return undefined;
      const total = present.reduce(
        (acc: number, value) => acc + toNumber(value),
        0,
      );
      return total / present.length;
    }
    case "min":
    case "max": {
      const type = column?.column.type;
      let result: unknown;
      for (const value of values) {
        if (isEmpty(value)) continue;
        if (result === undefined) {
          result = value;
          continue;
        }
        const comparison = compareValues(value, result, type);
        if (fn === "min" ? comparison < 0 : comparison > 0) {
          result = value;
        }
      }
      return result;
    }
    case "countDistinct": {
      const seen = new Set<string>();
      for (const value of values) {
        if (isEmpty(value)) continue;
        seen.add(distinctKey(value));
      }
      return seen.size;
    }
  }
}

/** This spec's result key — `id` when given, `columnId` otherwise. */
function keyOf<Row>(spec: AggregateSpec<Row>): string {
  return spec.id ?? spec.columnId;
}

/**
 * `rows` reduced through every spec in `specs`, keyed by `spec.id ??
 * spec.columnId`. A custom `fn` (a plain function, not a `BuiltInAggregate`
 * name) is called once with the raw `rows` — no wrapping, no
 * pre-processing, so it sees exactly the same leaf set a built-in reducer
 * does.
 *
 * Two specs resolving to the same key: the later one wins, matching
 * `setColumnFilter`'s own silent-replace precedent for a key collision
 * rather than throwing.
 *
 * Returns a fresh empty `Map` for empty `rows` or empty `specs` — never a
 * shared singleton — matching this codebase's general avoidance of shared
 * mutable module state.
 */
export function computeAggregates<Row>(
  rows: readonly Row[],
  specs: AggregateState<Row>,
  columns: readonly ResolvedColumn<Row, unknown>[],
): AggregateResults {
  const results = new Map<string, unknown>();
  if (specs.length === 0) {
    return results;
  }

  const byId = new Map(columns.map((entry) => [entry.id, entry]));
  for (const spec of specs) {
    const value =
      typeof spec.fn === "function"
        ? spec.fn(rows)
        : reduceBuiltIn(rows, spec.fn, byId.get(spec.columnId));
    results.set(keyOf(spec), value);
  }
  return results;
}

/**
 * A group header's full leaf-row descendant set, found by re-filtering
 * `flatRows` (the same pre-group, filtered/sorted rows `groupRows` itself
 * partitioned) against `header.path` — each ancestor level's value matched
 * via `bucketKey`, the identical notion of "same value" `groupRows` uses to
 * bucket in the first place.
 *
 * Deliberately independent of `displayRows`' own flattened shape: a
 * collapsed group's descendants are never emitted into `displayRows` at
 * all (see `buildLevel`'s `if (expanded)` guard), so a header's subtotal
 * has to be recomputed from the original row list rather than walked out
 * of the grouped-and-collapsed output — the only way a collapsed group's
 * header still gets a correct count regardless of its own collapse state.
 */
function leafDescendantsOf<Row>(
  flatRows: readonly ResolvedRow<Row>[],
  path: readonly unknown[],
  groupBy: GroupByState,
  byId: ReadonlyMap<string, ColumnDefinition<Row, unknown>>,
): Row[] {
  const keys = path.map((value) => bucketKey(value));
  return flatRows
    .filter((row) =>
      keys.every((key, level) => {
        const columnId = groupBy[level]?.columnId;
        const column = columnId === undefined ? undefined : byId.get(columnId);
        if (column === undefined) return false;
        return bucketKey(accessDotted(row.row, column.field)) === key;
      }),
    )
    .map((row) => row.row);
}

/**
 * `displayRows` (already regrouped by `groupBy`, per `groupRows`) with
 * every group header's `aggregates` field set to `specs` computed over
 * that group's full leaf-row descendants, re-derived from `flatRows` (the
 * same pre-group rows `groupRows` was given) — regardless of the group's
 * own collapse state, since a collapsed group's header still needs a
 * correct subtotal and its descendants are otherwise absent from
 * `displayRows` entirely. Each level's `aggregates` comes from its own
 * full descendant set, computed independently rather than combined from
 * its children's already-computed results, so a non-associative custom
 * aggregate (median, distinct count) is never silently wrong at a nested
 * level.
 *
 * `display: "row"` additionally emits a `ResolvedGroupSummaryRow` right
 * after each group's last visible entry (its last nested group/data row,
 * or immediately after its own header when collapsed) — every level gets
 * its own, the same way every level already gets its own `aggregates`.
 * `display: "inline"` (the default) emits none; a header's `aggregates`
 * field is populated either way, since `GridGroupRow`'s own inline
 * rendering and a summary row both read from it.
 *
 * `rowIndex`/`datasetIndex` are renumbered across the whole output when a
 * row was inserted, the same invariant `groupRows` itself keeps.
 *
 * Returns `displayRows` itself, untouched, when `specs` is empty — the
 * same reference-equality no-op every other transform across
 * grouping/pagination uses.
 */
/**
 * One pass over a contiguous run of `displayRows` sharing one parent — the
 * top-level call covers the whole array, and each group header found along
 * the way recurses into its own span (every entry up to the next one at
 * its level or shallower) the same way, so a group at any nesting depth
 * gets its own `aggregates` computed and, under `display: "row"`, its own
 * summary row appended right after everything beneath it.
 *
 * Returns the index just past the run this call consumed, so the caller
 * (itself, one level up, or `withGroupAggregates`) knows where to resume.
 */
function appendAggregatedSpan<Row>(
  displayRows: readonly DisplayRow<Row>[],
  start: number,
  levelFloor: number | null,
  flatRows: readonly ResolvedRow<Row>[],
  groupBy: GroupByState,
  byId: ReadonlyMap<string, ColumnDefinition<Row, unknown>>,
  specs: AggregateState<Row>,
  columns: readonly ResolvedColumn<Row, unknown>[],
  display: GroupAggregateDisplay,
  out: DisplayRow<Row>[],
): number {
  let index = start;
  while (index < displayRows.length) {
    const entry = displayRows[index];
    if (entry === undefined) {
      index++;
      continue;
    }
    if (
      levelFloor !== null &&
      "kind" in entry &&
      entry.kind === "group" &&
      entry.level <= levelFloor
    ) {
      // The next entry at this level or shallower ends the current span —
      // handled by the caller's own iteration, not this one.
      break;
    }
    index++;
    if (!("kind" in entry) || entry.kind !== "group") {
      out.push(entry);
      continue;
    }

    const leaves = leafDescendantsOf(flatRows, entry.path, groupBy, byId);
    const aggregates = computeAggregates(leaves, specs, columns);
    const withAggregates: ResolvedGroupRow = { ...entry, aggregates };
    out.push(withAggregates);

    index = appendAggregatedSpan(
      displayRows,
      index,
      entry.level,
      flatRows,
      groupBy,
      byId,
      specs,
      columns,
      display,
      out,
    );

    if (display === "row") {
      const summary: ResolvedGroupSummaryRow = {
        kind: "group-summary",
        groupId: entry.groupId,
        level: entry.level,
        rowIndex: -1,
        datasetIndex: -1,
        aggregates,
      };
      out.push(summary);
    }
  }
  return index;
}

export function withGroupAggregates<Row>(
  displayRows: readonly DisplayRow<Row>[],
  flatRows: readonly ResolvedRow<Row>[],
  groupBy: GroupByState,
  specs: AggregateState<Row>,
  columns: readonly ResolvedColumn<Row, unknown>[],
  display: GroupAggregateDisplay = "inline",
): readonly DisplayRow<Row>[] {
  if (specs.length === 0) {
    return displayRows;
  }

  const byId = new Map(columns.map((entry) => [entry.id, entry.column]));
  const out: DisplayRow<Row>[] = [];
  appendAggregatedSpan(
    displayRows,
    0,
    null,
    flatRows,
    groupBy,
    byId,
    specs,
    columns,
    display,
    out,
  );

  return out.map((entry, position) => {
    if ("kind" in entry) {
      return entry.rowIndex === position && entry.datasetIndex === position
        ? entry
        : { ...entry, rowIndex: position, datasetIndex: position };
    }
    return entry.rowIndex === position
      ? entry
      : { ...entry, rowIndex: position };
  });
}
