import type {
  FilterEntry,
  FilterState,
  GridState,
  SerializedFilterEntry,
  SerializedFilterState,
  SerializedGridState,
} from "../types";
import { reportError } from "./report";

/**
 * `entry` as JSON can hold it, or `undefined` when it cannot be written down
 * at all — a predicate, or a group left with nothing but predicates.
 */
function serializeEntry<Row>(
  entry: FilterEntry<Row>,
): SerializedFilterEntry<Row> | undefined {
  if ("combinator" in entry) {
    const entries = serializeFilter(entry.entries);
    // A group emptied by dropping its predicates would match everything (an
    // "and") or nothing (an "or") — neither what was saved — so it goes too.
    return entries.length === 0 && entry.entries.length > 0
      ? undefined
      : { combinator: entry.combinator, entries };
  }
  if ("predicate" in entry) {
    reportError(
      entry.columnId === undefined
        ? "a predicate filter entry across every column cannot be serialised, so it is left out of the saved state."
        : `a predicate filter entry on \`${entry.columnId}\` cannot be serialised, so it is left out of the saved state.`,
    );
    return undefined;
  }
  if ("value" in entry) {
    const { value, ...rest } = entry;
    return {
      ...rest,
      value: value instanceof Date ? value.toISOString() : value,
    };
  }
  return entry;
}

function serializeFilter<Row>(
  filter: FilterState<Row>,
): SerializedFilterState<Row> {
  return filter
    .map((entry) => serializeEntry(entry))
    .filter((entry) => entry !== undefined);
}

/**
 * `state` in a form that survives `JSON.stringify` and back unchanged, for
 * saving a layout — to local storage, a URL, a user's profile — and handing
 * it to `restoreState` later. Every slice is plain data already except the
 * filter: a `Date` value is written as its ISO string, and a predicate entry,
 * being a function, cannot be written at all and is left out with a
 * `console.error` naming its column.
 */
export function serializeGridState<Row>(
  state: GridState<Row>,
): SerializedGridState<Row> {
  return { ...state, filter: serializeFilter(state.filter) };
}

function reviveEntry<Row>(
  entry: FilterEntry<Row> | SerializedFilterEntry<Row>,
): FilterEntry<Row> {
  if ("combinator" in entry) {
    return {
      combinator: entry.combinator,
      entries: reviveFilter(entry.entries),
    };
  }
  if ("value" in entry) {
    const { value, ...rest } = entry;
    return {
      ...rest,
      value: typeof value === "string" ? new Date(value) : value,
    };
  }
  return entry;
}

/**
 * A filter as `serializeGridState` wrote it, back as a `FilterState`: a value
 * entry holding a string held a `Date`, since that is the only way one comes
 * to hold a string. A filter that was never serialised passes through as it
 * is.
 */
export function reviveFilter<Row>(
  filter: FilterState<Row> | SerializedFilterState<Row>,
): FilterState<Row> {
  return filter.map((entry) => reviveEntry(entry));
}
