import type {
  ColumnType,
  DataColumn,
  FilterEntry,
  FilterScalar,
  FilterState,
  GridState,
  OperatorFilterEntry,
  SerializedFilterEntry,
  SerializedFilterScalar,
  SerializedFilterState,
  SerializedGridState,
  SerializedOperatorFilterEntry,
} from "../types";
import { isDateType, isScalarList, toDate } from "./filterOperators";
import { reportError } from "./report";

type Operand = Exclude<OperatorFilterEntry<unknown>["value"], undefined>;
type SerializedOperand = Exclude<
  SerializedOperatorFilterEntry<unknown>["value"],
  undefined
>;

function serializeScalar(scalar: FilterScalar): SerializedFilterScalar {
  return scalar instanceof Date ? scalar.toISOString() : scalar;
}

function serializeOperand(operand: Operand): SerializedOperand {
  return isScalarList(operand)
    ? operand.map(serializeScalar)
    : serializeScalar(operand);
}

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
  if ("operator" in entry) {
    const { value, ...rest } = entry;
    return value === undefined
      ? rest
      : { ...rest, value: serializeOperand(value) };
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
 * filter: a `Date` value or operand is written as its ISO string, and a
 * predicate entry, being a function, cannot be written at all and is left
 * out with a `console.error` naming its column.
 */
export function serializeGridState<Row>(
  state: GridState<Row>,
): SerializedGridState<Row> {
  return { ...state, filter: serializeFilter(state.filter) };
}

/** A saved scalar back as a `Date` when a date column's string reads as one. */
function reviveScalar(
  scalar: FilterScalar,
  type: ColumnType | undefined,
): FilterScalar {
  return isDateType(type) && typeof scalar === "string"
    ? (toDate(scalar) ?? scalar)
    : scalar;
}

function reviveOperand(
  operand: Operand | SerializedOperand,
  type: ColumnType | undefined,
): Operand {
  return isScalarList(operand)
    ? operand.map((scalar) => reviveScalar(scalar, type))
    : reviveScalar(operand, type);
}

function reviveEntry<Row>(
  entry: FilterEntry<Row> | SerializedFilterEntry<Row>,
  typeOf: (columnId: string) => ColumnType | undefined,
): FilterEntry<Row> {
  if ("combinator" in entry) {
    return {
      combinator: entry.combinator,
      entries: reviveEntries(entry.entries, typeOf),
    };
  }
  if ("operator" in entry) {
    const { value, ...rest } = entry;
    return value === undefined
      ? rest
      : { ...rest, value: reviveOperand(value, typeOf(entry.columnId)) };
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

function reviveEntries<Row>(
  filter: FilterState<Row> | SerializedFilterState<Row>,
  typeOf: (columnId: string) => ColumnType | undefined,
): FilterState<Row> {
  return filter.map((entry) => reviveEntry(entry, typeOf));
}

/**
 * A filter as `serializeGridState` wrote it, back as a `FilterState`. A
 * value entry holding a string held a `Date`, since that is the only way one
 * comes to hold a string. An operator entry's strings are read as dates only
 * on a date, date-time or time column in `columns`, since elsewhere a string
 * is just a string. A filter that was never serialised passes through as it
 * is.
 */
export function reviveFilter<Row>(
  filter: FilterState<Row> | SerializedFilterState<Row>,
  columns: readonly DataColumn<Row, unknown>[],
): FilterState<Row> {
  const types = new Map(columns.map((entry) => [entry.id, entry.column.type]));
  return reviveEntries(filter, (columnId) => types.get(columnId));
}
