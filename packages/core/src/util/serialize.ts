import type {
  ColumnType,
  DataColumn,
  FilterEntry,
  FilterScalar,
  FilterState,
  GridState,
  GroupExpansionState,
  OperatorFilterEntry,
  SerializedFilterEntry,
  SerializedFilterScalar,
  SerializedFilterState,
  SerializedGridState,
  SerializedOperatorFilterEntry,
} from "../types";
import { isDateType, isScalarList, toDate } from "./filterOperators";
import { unknownFilterEntry } from "./filtering";
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
  switch (entry.kind) {
    case "group": {
      const entries = serializeFilter(entry.entries);
      // A group emptied by dropping its predicates would match everything (an
      // "and") or nothing (an "or") — neither what was saved — so it goes too.
      return entries.length === 0 && entry.entries.length > 0
        ? undefined
        : { kind: "group", combinator: entry.combinator, entries };
    }
    case "predicate":
      reportError(
        entry.columnId === undefined
          ? "a predicate filter entry across every column cannot be serialised, so it is left out of the saved state."
          : `a predicate filter entry on \`${entry.columnId}\` cannot be serialised, so it is left out of the saved state.`,
      );
      return undefined;
    case "operator": {
      const { value, ...rest } = entry;
      return value === undefined
        ? rest
        : { ...rest, value: serializeOperand(value) };
    }
    case "value": {
      const { value, ...rest } = entry;
      return {
        ...rest,
        value: value instanceof Date ? value.toISOString() : value,
      };
    }
    case "text":
      return entry;
    default:
      return unknownFilterEntry(entry);
  }
}

function serializeFilter<Row>(
  filter: FilterState<Row>,
): SerializedFilterState<Row> {
  return filter
    .map((entry) => serializeEntry(entry))
    .filter((entry) => entry !== undefined);
}

/**
 * The `version` `serializeGridState` writes: the highest one `restoreState`
 * reads.
 */
const SAVED_STATE_VERSION = 1;

/**
 * `state` in a form that survives `JSON.stringify` and back unchanged, for
 * saving a layout — to local storage, a URL, a user's profile — and handing
 * it to `restoreState` later. Every slice is plain data already except the
 * filter: a `Date` value or operand is written as its ISO string, and a
 * predicate entry, being a function, cannot be written at all and is left
 * out with a `console.error` naming its column. The result carries the
 * `version` of its shape, which `restoreState` reads it by.
 */
export function serializeGridState<Row>(
  state: GridState<Row>,
): SerializedGridState<Row> {
  return {
    version: SAVED_STATE_VERSION,
    ...state,
    filter: serializeFilter(state.filter),
  };
}

/** What `restoreState` takes: live or saved state, whole or in part. */
export type SavedGridState<Row> =
  Partial<GridState<Row>> | Partial<SerializedGridState<Row>>;

/** A `SavedGridState` in the shape this release writes, without a version. */
export type CurrentGridState<Row> =
  Partial<GridState<Row>> | Partial<Omit<SerializedGridState<Row>, "version">>;

/**
 * `saved` in the shape this release writes, read by the `version` it was
 * saved with. One with no version was saved before the field existed, or is
 * live state from `getState()`; it may hold a `groupExpansion` as a bare
 * list of group ids, the shape before the slice carried a mode, which names
 * the collapsed groups and so reads as `allExpanded` with them as the
 * exceptions. A version newer than this release reads throws, rather than
 * restoring half of a shape it does not know.
 */
export function migrateSavedState<Row>(
  saved: SavedGridState<Row> & { readonly version?: unknown },
): CurrentGridState<Row> {
  const { version, ...state } = saved;
  if (version === undefined) {
    return isStringList(state.groupExpansion)
      ? {
          ...state,
          groupExpansion: { mode: "allExpanded", except: state.groupExpansion },
        }
      : state;
  }
  if (version === SAVED_STATE_VERSION) {
    return state;
  }
  throw new TypeError(
    `GridKit: a saved state has \`version\` ${JSON.stringify(version)}, and this release reads saved state up to version ${String(SAVED_STATE_VERSION)}.`,
  );
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

/**
 * A filter entry as saved before entries carried a `kind`: the same fields
 * without it, told apart by the keys each kind alone holds.
 */
type UntaggedEntry<Entry> = Entry extends unknown ? Omit<Entry, "kind"> : never;

type SavedEntry<Row> =
  | FilterEntry<Row>
  | SerializedFilterEntry<Row>
  | UntaggedEntry<FilterEntry<Row> | SerializedFilterEntry<Row>>;

/**
 * `entry` with its `kind`, inferred from its keys when it has none. An
 * operator entry usually holds a `value` too, so `operator` is read first.
 */
function tagged<Row>(
  entry: SavedEntry<Row>,
): FilterEntry<Row> | SerializedFilterEntry<Row> {
  if ("kind" in entry) {
    return entry;
  }
  if ("combinator" in entry) {
    return { ...entry, kind: "group" };
  }
  if ("operator" in entry) {
    return { ...entry, kind: "operator" };
  }
  if ("predicate" in entry) {
    return { ...entry, kind: "predicate" };
  }
  if ("value" in entry) {
    return { ...entry, kind: "value" };
  }
  if ("query" in entry) {
    return { ...entry, kind: "text" };
  }
  throw new TypeError(
    "GridKit: a saved filter entry has no `kind`, nor any key one could be read from.",
  );
}

function reviveEntry<Row>(
  saved: SavedEntry<Row>,
  typeOf: (columnId: string) => ColumnType | undefined,
): FilterEntry<Row> {
  const entry = tagged(saved);
  switch (entry.kind) {
    case "group":
      return {
        kind: "group",
        combinator: entry.combinator,
        entries: reviveEntries(entry.entries, typeOf),
      };
    case "operator": {
      const { value, ...rest } = entry;
      return value === undefined
        ? rest
        : { ...rest, value: reviveOperand(value, typeOf(entry.columnId)) };
    }
    case "value": {
      const { value, ...rest } = entry;
      return {
        ...rest,
        value: typeof value === "string" ? new Date(value) : value,
      };
    }
    case "text":
    case "predicate":
      return entry;
    default:
      return unknownFilterEntry(entry);
  }
}

function reviveEntries<Row>(
  filter: readonly SavedEntry<Row>[],
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
 *
 * An entry with no `kind`, as GridKit saved filters before entries carried
 * one, gets the kind its keys name: `combinator`, `operator`, `predicate`,
 * `value` or `query`, read in that order. One with none of them throws.
 */
export function reviveFilter<Row>(
  filter: FilterState<Row> | SerializedFilterState<Row>,
  columns: readonly DataColumn<Row, unknown>[],
): FilterState<Row> {
  const types = new Map(columns.map((entry) => [entry.id, entry.column.type]));
  return reviveEntries(filter, (columnId) => types.get(columnId));
}

function isStringList(value: unknown): value is readonly string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function isGroupExpansion(value: unknown): value is GroupExpansionState {
  return (
    typeof value === "object" &&
    value !== null &&
    "mode" in value &&
    (value.mode === "allExpanded" || value.mode === "allCollapsed") &&
    "except" in value &&
    isStringList(value.except)
  );
}

/**
 * A saved `groupExpansion`, checked to be a `GroupExpansionState`; anything
 * else throws. `migrateSavedState` has already read an older shape as this
 * one.
 */
export function reviveGroupExpansion(saved: unknown): GroupExpansionState {
  if (isGroupExpansion(saved)) {
    return saved;
  }
  throw new TypeError(
    "GridKit: a saved `groupExpansion` is not `{ mode, except }`.",
  );
}
