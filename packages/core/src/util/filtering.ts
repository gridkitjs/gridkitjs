import type {
  ColumnDefinition,
  ColumnType,
  DataColumn,
  FieldPath,
  FilterEntry,
  FilterState,
  ResolvedRow,
  TextFilterEntry,
} from "../types";
import { compileOperatorEntry } from "./filterOperators";
import { accessDotted } from "./grid";
import { renumberRows } from "./position";

interface FilterPattern {
  mode: "exact" | "contains" | "startsWith" | "endsWith";
  text: string; // anchors stripped, lowercased once
}

/**
 * Reads a query's leading/trailing `%` into a match mode — see
 * `TextFilterEntry`'s own doc comment for the four shapes. Only the first
 * and last characters are read as anchors — a `%` anywhere else in the
 * query is a literal character, not a wildcard.
 */
function parseFilterPattern(query: string): FilterPattern {
  const start = query.startsWith("%");
  const end = query.endsWith("%");
  let text = query;
  if (start) {
    text = text.slice(1);
  }
  if (end) {
    text = text.slice(0, -1);
  }
  text = text.toLowerCase();

  if (start && end) {
    return { mode: "contains", text };
  }
  if (start) {
    return { mode: "endsWith", text };
  }
  if (end) {
    return { mode: "startsWith", text };
  }
  return { mode: "exact", text };
}

function isEmptyValue(value: unknown): boolean {
  return value === null || value === undefined;
}

/**
 * `parseFilterPattern`, compiled to a reusable test — parsed once, reused
 * per row, unlike a per-call `matchesQuery`.
 */
function compileFilterQuery(query: string): (value: unknown) => boolean {
  const { mode, text } = parseFilterPattern(query);
  return (value: unknown) => {
    const candidate = (isEmptyValue(value) ? "" : String(value)).toLowerCase();
    switch (mode) {
      case "exact":
        return candidate === text;
      case "contains":
        return candidate.includes(text);
      case "startsWith":
        return candidate.startsWith(text);
      case "endsWith":
        return candidate.endsWith(text);
    }
  };
}

/**
 * Whether `target` (a `ValueFilterEntry`'s value) equals `value` under
 * `type` — `false` whenever `type` doesn't agree with `target`'s own kind,
 * so a number filter never silently matches a string column.
 */
function matchesTypedValue(
  value: unknown,
  target: number | boolean | Date,
  type: ColumnType | undefined,
): boolean {
  if (typeof target === "number") {
    if (
      type !== "number" &&
      type !== "decimal" &&
      type !== "currency" &&
      type !== "percent"
    ) {
      return false;
    }
    return typeof value === "number" && value === target;
  }
  if (typeof target === "boolean") {
    if (type !== "boolean") {
      return false;
    }
    return typeof value === "boolean" && value === target;
  }
  if (type !== "date" && type !== "dateTime" && type !== "time") {
    return false;
  }
  return value instanceof Date && value.getTime() === target.getTime();
}

/**
 * Whether a non-group entry names a column present in `byId` (or names
 * none at all) — lets a stored filter tolerate a column removed from the
 * definition the same way a stored `ColumnSortState` does, by dropping only
 * the entries that reference it.
 *
 * A `GroupFilterEntry` is always usable, regardless of its own contents:
 * its vacuous truth value under an empty or fully-unusable `entries` list
 * depends on its own `combinator` (`"and"` vacuously matches everything,
 * `"or"` vacuously matches nothing) — a group can't be dropped from its
 * parent's list the way an unusable simple entry can, since whether
 * dropping it would be safe depends on the *parent's* combinator too,
 * which this check has no way to know. Compiling it and letting `.every()`/
 * `.some()` resolve the vacuous case naturally is what stays correct in
 * every context; deciding upfront here is not.
 */
function isEntryUsable<Row>(
  entry: FilterEntry<Row>,
  byId: ReadonlyMap<string, ColumnDefinition<Row, unknown>>,
): boolean {
  if (entry.kind === "group") {
    return true;
  }
  return entry.columnId === undefined || byId.has(entry.columnId);
}

/**
 * The `default` of a switch over every `FilterEntry` kind: a switch that
 * leaves a kind out doesn't compile, and an entry whose `kind` is none of
 * them — from plain JavaScript or JSON — throws rather than matching
 * nothing in silence.
 */
export function unknownFilterEntry(entry: never): never {
  const { kind } = entry as { readonly kind: unknown };
  throw new TypeError(
    `GridKit: \`${String(kind)}\` is not a filter entry kind.`,
  );
}

/**
 * A test of one column's cell when `columnId` is given — failing every row
 * when no column has that id — or of any column's when it is omitted.
 */
function compileCellTest<Row>(
  columnId: string | undefined,
  byId: ReadonlyMap<string, ColumnDefinition<Row, unknown>>,
  columns: readonly DataColumn<Row, unknown>[],
  test: (value: unknown, type: ColumnType | undefined) => boolean,
): (row: Row) => boolean {
  if (columnId === undefined) {
    return (row) =>
      columns.some((entry) =>
        test(accessDotted(row, entry.column.field), entry.column.type),
      );
  }
  const column = byId.get(columnId);
  if (column === undefined) {
    return () => false;
  }
  return (row) => test(accessDotted(row, column.field), column.type);
}

/**
 * One compiled test per usable `FilterEntry`, closing over its column
 * lookup so `filterRows`'s row loop is just `.every(test)`.
 */
function compileFilterEntry<Row>(
  entry: FilterEntry<Row>,
  byId: ReadonlyMap<string, ColumnDefinition<Row, unknown>>,
  columns: readonly DataColumn<Row, unknown>[],
): (row: Row) => boolean {
  switch (entry.kind) {
    case "group": {
      const tests = entry.entries
        .filter((nested) => isEntryUsable(nested, byId))
        .map((nested) => compileFilterEntry(nested, byId, columns));
      return entry.combinator === "and"
        ? (row) => tests.every((test) => test(row))
        : (row) => tests.some((test) => test(row));
    }
    case "predicate": {
      const { columnId, predicate } = entry;
      const column = columnId === undefined ? undefined : byId.get(columnId);
      return (row) =>
        predicate(
          column === undefined ? undefined : accessDotted(row, column.field),
          row,
        );
    }
    case "operator": {
      const column = byId.get(entry.columnId);
      if (column === undefined) {
        return () => false;
      }
      const test = compileOperatorEntry(entry, column.type);
      return (row) => test(accessDotted(row, column.field));
    }
    case "value": {
      const { value } = entry;
      return compileCellTest(entry.columnId, byId, columns, (cell, type) =>
        matchesTypedValue(cell, value, type),
      );
    }
    case "text": {
      const test = compileFilterQuery(entry.query);
      return compileCellTest(entry.columnId, byId, columns, test);
    }
    default:
      return unknownFilterEntry(entry);
  }
}

/**
 * `filter` compiled to one test of a row, every entry ANDed as `filterRows`
 * applies them — or `undefined` when no entry applies to `columns`, so a
 * caller can skip the row loop. Entries naming a column absent from
 * `columns` are dropped, as `filterRows` drops them.
 */
export function compileFilter<Row>(
  filter: FilterState<Row>,
  columns: readonly DataColumn<Row, unknown>[],
): ((row: Row) => boolean) | undefined {
  const byId = new Map(columns.map((entry) => [entry.id, entry.column]));
  const compiled = filter
    .filter((entry) => isEntryUsable(entry, byId))
    .map((entry) => compileFilterEntry(entry, byId, columns));
  return compiled.length === 0
    ? undefined
    : (row) => compiled.every((test) => test(row));
}

/**
 * Whether `value`, stringified, matches `query`'s SQL LIKE-style pattern —
 * case-insensitive always. A bare query is an exact match; `%text%` is
 * contains; `text%` is starts-with; `%text` is ends-with. `null`/`undefined`
 * stringify to `""`.
 *
 * A one-shot convenience: parses `query` fresh on every call. `filterRows`
 * does not call this per cell — it compiles each `TextFilterEntry` once,
 * outside its row loop.
 */
export function matchesQuery(value: unknown, query: string): boolean {
  return compileFilterQuery(query)(value);
}

/**
 * This column's current text query, or the global entry's when `columnId`
 * is omitted; `null` if no `TextFilterEntry` names it — including when the
 * entry that exists for that key is a `ValueFilterEntry`/
 * `PredicateFilterEntry`/`OperatorFilterEntry`/`GroupFilterEntry` instead,
 * since none of those hold a query string to report.
 */
export function filterQueryFor<Row>(
  filter: FilterState<Row>,
  columnId?: FieldPath<Row> | (string & {}),
): string | null {
  const entry = filter.find(
    (candidate): candidate is TextFilterEntry<Row> =>
      candidate.kind === "text" && candidate.columnId === columnId,
  );
  return entry?.query ?? null;
}

/**
 * The filter with the `TextFilterEntry` for `columnId` (or the global
 * entry, when `columnId` is omitted) set to `query` — replacing whatever
 * entry already holds that key, of any variant, if present; appending a new
 * `TextFilterEntry` if not. An empty `query` removes the entry instead of
 * storing a filter that can never usefully match.
 *
 * Returns `filter` itself, unchanged, when the result would be a no-op: an
 * empty `query` naming a key with no existing entry, or a `query` equal to
 * an existing `TextFilterEntry`'s.
 */
export function setColumnFilter<Row>(
  filter: FilterState<Row>,
  columnId: (FieldPath<Row> | (string & {})) | undefined,
  query: string,
): FilterState<Row> {
  const index = filter.findIndex(
    (entry) => entry.kind !== "group" && entry.columnId === columnId,
  );

  if (query === "") {
    return index === -1 ? filter : filter.filter((_entry, i) => i !== index);
  }

  const next: TextFilterEntry<Row> =
    columnId === undefined
      ? { kind: "text", query }
      : { kind: "text", columnId, query };

  if (index === -1) {
    return [...filter, next];
  }
  const existing = filter[index];
  if (existing?.kind === "text" && existing.query === query) {
    return filter;
  }
  return filter.map((entry, i) => (i === index ? next : entry));
}

/** `filter` reduced to empty. Returns `filter` itself when already empty. */
export function clearAllFilters<Row>(
  filter: FilterState<Row>,
): FilterState<Row> {
  return filter.length === 0 ? filter : [];
}

/**
 * `rows` reduced to those matching every entry in `filter` (AND at the top
 * level — nest a `GroupFilterEntry` for OR). `rowIndex` and `datasetIndex`
 * are renumbered to match the retained positions — the same invariant
 * `sortRows` keeps,
 * needed here independently since `filterRows` runs before `sortRows` in
 * the composed pipeline (see `resolveShownRows`).
 *
 * Order-preserving: surviving rows keep their relative order, which is what
 * makes running this before a sort produce the identical final order a
 * sort-then-filter would — only the cost differs.
 *
 * Every entry is compiled once, before the row loop.
 *
 * Returns `rows` itself, untouched, when `filter` is empty or names only
 * columns absent from `columns` — a stored filter tolerates a column
 * removed from the definition the same way a stored `ColumnSortState` does.
 */
export function filterRows<Row>(
  rows: readonly ResolvedRow<Row>[],
  filter: FilterState<Row>,
  columns: readonly DataColumn<Row, unknown>[],
): readonly ResolvedRow<Row>[] {
  if (filter.length === 0) {
    return rows;
  }
  const test = compileFilter(filter, columns);
  if (test === undefined) {
    return rows;
  }

  const filtered = rows.filter((row) => test(row.row));

  return renumberRows(filtered);
}
