import type { ColumnType, OperatorFilterEntry } from "../types";
import { bucketKey } from "./grouping";
import { compareValues } from "./sorting";

type CellTest = (value: unknown) => boolean;

type Operand = OperatorFilterEntry<unknown>["value"];

/**
 * Where a cell stands against one operand: below it, equal to it or above
 * it as `compareValues` orders them — or `undefined` when the two can't be
 * compared at all (an empty cell, a cell of another kind).
 */
type Comparison = (value: unknown) => number | undefined;

/** How a column's values compare, which decides what an operand must be. */
type ValueKind = "number" | "boolean" | "date" | "text";

const matchNothing: CellTest = () => false;

function kindOf(type: ColumnType | undefined): ValueKind {
  switch (type) {
    case "number":
    case "decimal":
    case "currency":
    case "percent":
      return "number";
    case "boolean":
      return "boolean";
    case "date":
    case "dateTime":
    case "time":
      return "date";
    default:
      return "text";
  }
}

/** Whether a column of `type` holds dates — what a saved string is revived for. */
export function isDateType(type: ColumnType | undefined): boolean {
  return kindOf(type) === "date";
}

/**
 * `null`, `undefined` and `""` — the three a filter user calls blank. Wider
 * than the `null`/`undefined` a `TextFilterEntry` stringifies to `""`,
 * because an empty string is just as blank to someone reading the grid.
 */
export function isEmptyCell(value: unknown): boolean {
  return value === null || value === undefined || value === "";
}

/**
 * `value` as a `Date`, when it is one or a string that reads as one —
 * `undefined` otherwise, an invalid date included, so an unparseable value
 * never compares as a date.
 */
export function toDate(value: unknown): Date | undefined {
  const date =
    value instanceof Date
      ? value
      : typeof value === "string"
        ? new Date(value)
        : undefined;
  return date === undefined || Number.isNaN(date.getTime()) ? undefined : date;
}

/**
 * `value` in the form `compareValues` compares under `kind`, or `undefined`
 * when it isn't of that kind. Text is lowercased here, once, so every text
 * comparison is case-insensitive the way a query is.
 */
function comparable(value: unknown, kind: ValueKind): unknown {
  switch (kind) {
    case "number":
      return typeof value === "number" && !Number.isNaN(value)
        ? value
        : undefined;
    case "boolean":
      return typeof value === "boolean" ? value : undefined;
    case "date":
      return toDate(value);
    case "text":
      return String(value).toLowerCase();
  }
}

/** Whether an operand can stand for a value of `kind` at all. */
function isOperandOfKind(operand: unknown, kind: ValueKind): boolean {
  if (kind !== "text") {
    return comparable(operand, kind) !== undefined;
  }
  return (
    typeof operand === "string" ||
    typeof operand === "number" ||
    typeof operand === "boolean"
  );
}

/**
 * Compares each cell against `operand` the way the column's `type` orders
 * values, or `undefined` when `operand` is of the wrong kind for the column
 * and so can be compared with nothing.
 */
function compileComparison(
  operand: Operand,
  type: ColumnType | undefined,
): Comparison | undefined {
  const kind = kindOf(type);
  if (!isOperandOfKind(operand, kind)) {
    return undefined;
  }
  const target = comparable(operand, kind);
  return (value) => {
    if (isEmptyCell(value)) {
      return undefined;
    }
    const cell = comparable(value, kind);
    return cell === undefined ? undefined : compareValues(cell, target, type);
  };
}

/** Whether an operand is a list — what `in` and `between` take. */
export function isScalarList<Scalar>(
  operand: Scalar | readonly Scalar[] | undefined,
): operand is readonly Scalar[] {
  return Array.isArray(operand);
}

function compileOrdering(
  operator: "eq" | "ne" | "gt" | "gte" | "lt" | "lte",
  operand: Operand,
  type: ColumnType | undefined,
): CellTest {
  const compare = compileComparison(operand, type);
  if (compare === undefined) {
    return matchNothing;
  }
  /** A cell that can't be compared satisfies no ordering. */
  const where =
    (holds: (result: number) => boolean): CellTest =>
    (value) => {
      const result = compare(value);
      return result !== undefined && holds(result);
    };
  switch (operator) {
    case "eq":
      return where((result) => result === 0);
    case "ne": {
      const equals = where((result) => result === 0);
      return (value) => !equals(value);
    }
    case "gt":
      return where((result) => result > 0);
    case "gte":
      return where((result) => result >= 0);
    case "lt":
      return where((result) => result < 0);
    case "lte":
      return where((result) => result <= 0);
  }
}

function compileBetween(
  operand: Operand,
  type: ColumnType | undefined,
): CellTest {
  if (!isScalarList(operand) || operand.length !== 2) {
    return matchNothing;
  }
  const [low, high] = operand;
  const fromLow = compileComparison(low, type);
  const fromHigh = compileComparison(high, type);
  if (fromLow === undefined || fromHigh === undefined) {
    return matchNothing;
  }
  return (value) => {
    const aboveLow = fromLow(value);
    const belowHigh = fromHigh(value);
    return (
      aboveLow !== undefined &&
      belowHigh !== undefined &&
      aboveLow >= 0 &&
      belowHigh <= 0
    );
  };
}

/**
 * The key `in` matches by: grouping's own `bucketKey`, so two values are
 * "the same" exactly when grouping would put them in one group — except that
 * a date column reads a date string as the date it names, so a list saved as
 * `Date`s still matches cells that hold ISO strings, and the other way round.
 */
export function filterValueKey(
  value: unknown,
  type: ColumnType | undefined,
): string {
  return bucketKey(isDateType(type) ? (toDate(value) ?? value) : value);
}

function compileIn(operand: Operand, type: ColumnType | undefined): CellTest {
  if (!isScalarList(operand)) {
    return matchNothing;
  }
  const keys = new Set(
    operand
      .filter((scalar) => !isEmptyCell(scalar))
      .map((scalar) => filterValueKey(scalar, type)),
  );
  return (value) =>
    !isEmptyCell(value) && keys.has(filterValueKey(value, type));
}

function compileText(
  operator: "contains" | "notContains" | "startsWith" | "endsWith",
  operand: Operand,
): CellTest {
  if (!isOperandOfKind(operand, "text")) {
    return matchNothing;
  }
  const text = String(operand).toLowerCase();
  const read = (value: unknown) => String(value).toLowerCase();
  switch (operator) {
    case "contains":
      return (value) => !isEmptyCell(value) && read(value).includes(text);
    case "notContains":
      return (value) => isEmptyCell(value) || !read(value).includes(text);
    case "startsWith":
      return (value) => !isEmptyCell(value) && read(value).startsWith(text);
    case "endsWith":
      return (value) => !isEmptyCell(value) && read(value).endsWith(text);
  }
}

/**
 * One reusable test for an `OperatorFilterEntry`, given its column's `type`
 * — its operand read, checked and normalised once, so `filterRows`'s row
 * loop only reads the cell. See `OperatorFilterEntry` for what each
 * operator matches.
 */
export function compileOperatorEntry(
  entry: OperatorFilterEntry<unknown>,
  type: ColumnType | undefined,
): CellTest {
  const { operator, value } = entry;
  switch (operator) {
    case "isEmpty":
      return isEmptyCell;
    case "isNotEmpty":
      return (cell) => !isEmptyCell(cell);
    case "contains":
    case "notContains":
    case "startsWith":
    case "endsWith":
      return compileText(operator, value);
    case "between":
      return compileBetween(value, type);
    case "in":
      return compileIn(value, type);
    case "eq":
    case "ne":
    case "gt":
    case "gte":
    case "lt":
    case "lte":
      return compileOrdering(operator, value, type);
  }
}
