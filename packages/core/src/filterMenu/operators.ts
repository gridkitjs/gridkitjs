import type { ColumnType, FilterOperator, FilterScalar } from "../types";
import type { ValueKind } from "../util/filterOperators";
import { kindOf, toDate } from "../util/filterOperators";

/**
 * The kind of value a column filters as — what decides which conditions a
 * filter menu offers on it, how their operators read, and what a typed
 * operand must be.
 */
export type FilterOperatorFamily = ValueKind;

/**
 * The family a column of `type` falls in: `"number"` for the numeric
 * types, `"date"` for date, date-time and time, `"boolean"`, and `"text"`
 * for everything else. It is the filter engine's own reading of `type`, so
 * a menu never offers a condition the column would compare differently.
 */
export function filterOperatorFamily(
  type: ColumnType | undefined,
): FilterOperatorFamily {
  return kindOf(type);
}

const familyOperators: Readonly<
  Record<FilterOperatorFamily, readonly FilterOperator[]>
> = {
  text: [
    "contains",
    "notContains",
    "eq",
    "ne",
    "startsWith",
    "endsWith",
    "isEmpty",
    "isNotEmpty",
  ],
  number: [
    "eq",
    "ne",
    "gt",
    "gte",
    "lt",
    "lte",
    "between",
    "isEmpty",
    "isNotEmpty",
  ],
  date: ["eq", "ne", "lt", "gt", "between", "isEmpty", "isNotEmpty"],
  boolean: ["eq", "isEmpty", "isNotEmpty"],
};

/**
 * A date-time or time column's cells are instants, which a typed day or
 * minute seldom equals to the millisecond — so its menu offers before, after
 * and between, not equals.
 */
const instantOperators: readonly FilterOperator[] = [
  "lt",
  "gt",
  "between",
  "isEmpty",
  "isNotEmpty",
];

/**
 * The conditions a filter menu offers on a column of `type`, in the order it
 * lists them, unless the column names its own. Never `in`: a list of values
 * is the checklist's to pick, not a condition's to type.
 */
export function defaultFilterOperators(
  type: ColumnType | undefined,
): readonly FilterOperator[] {
  return type === "dateTime" || type === "time"
    ? instantOperators
    : familyOperators[filterOperatorFamily(type)];
}

/**
 * How many operands `operator` takes — how many inputs a condition row
 * shows: none for the blanks, `between`'s two ends, one for the rest. `in`
 * takes one list, which only a checklist writes.
 */
export function filterOperandArity(operator: FilterOperator): 0 | 1 | 2 {
  switch (operator) {
    case "isEmpty":
    case "isNotEmpty":
      return 0;
    case "between":
      return 2;
    case "eq":
    case "ne":
    case "contains":
    case "notContains":
    case "startsWith":
    case "endsWith":
    case "gt":
    case "gte":
    case "lt":
    case "lte":
    case "in":
      return 1;
  }
}

/**
 * A number as a number input gives it: digits with a point for decimals and
 * an optional exponent. No thousands separator — whether `1,500` is fifteen
 * hundred or one and a half depends on the locale, so it is not guessed at.
 */
const NUMBER_INPUT = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i;

/**
 * A day as a date input gives it, `yyyy-mm-dd`, or a moment as a date-time
 * input does, `yyyy-mm-ddThh:mm` with optional seconds and milliseconds.
 */
const DATE_INPUT =
  /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?)?$/;

function parseNumber(text: string): number | undefined {
  const value = Number(text);
  return NUMBER_INPUT.test(text) && Number.isFinite(value) ? value : undefined;
}

/**
 * The local day or moment `text` names — local, as the input meant it,
 * where `new Date("2024-03-01")` would read midnight in UTC.
 */
function parseDate(text: string): Date | undefined {
  const match = DATE_INPUT.exec(text);
  if (match === null) {
    return undefined;
  }
  const [
    ,
    year,
    month,
    day,
    hours = "0",
    minutes = "0",
    seconds = "0",
    fraction = "",
  ] = match;
  if (Number(hours) > 23 || Number(minutes) > 59 || Number(seconds) > 59) {
    return undefined;
  }
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hours),
    Number(minutes),
    Number(seconds),
    Number(fraction.padEnd(3, "0")),
  );
  // A day past the month's end rolls into the next month, and a year below
  // 100 reads as 19xx: either way the date reads back changed.
  return date.getFullYear() === Number(year) &&
    date.getMonth() === Number(month) - 1 &&
    date.getDate() === Number(day)
    ? date
    : undefined;
}

function parseBoolean(text: string): boolean | undefined {
  if (text === "true") {
    return true;
  }
  return text === "false" ? false : undefined;
}

/**
 * The operand a condition input's `text` stands for on a column of `type`,
 * read as the column filters — or `undefined` when the text is empty or
 * doesn't read as one, which an editor shows as a value still to fix.
 *
 * - Text is kept as typed, spaces and all.
 * - A number reads with a point for decimals, as a number input gives it:
 *   `"12abc"` and `"1,5"` read as nothing rather than as a guess.
 * - A date reads as a date input gives it, `yyyy-mm-dd`, at that day's
 *   local midnight; or as a date-time input does, `yyyy-mm-ddThh:mm`, at
 *   that local time.
 * - A boolean reads `"true"` or `"false"`.
 */
export function parseFilterOperand(
  text: string,
  type: ColumnType | undefined,
): Exclude<FilterScalar, null> | undefined {
  if (text === "") {
    return undefined;
  }
  switch (filterOperatorFamily(type)) {
    case "text":
      return text;
    case "number":
      return parseNumber(text.trim());
    case "date":
      return parseDate(text.trim());
    case "boolean":
      return parseBoolean(text.trim());
  }
}

function pad(value: number, width = 2): string {
  return String(value).padStart(width, "0");
}

/** `yyyy-mm-dd`, the local day — what a date input takes. */
function dayInput(date: Date): string {
  return `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** `yyyy-mm-ddThh:mm`, seconds and milliseconds when set — what a date-time input takes. */
function momentInput(date: Date): string {
  const minute = `${dayInput(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  const seconds = date.getSeconds();
  const milliseconds = date.getMilliseconds();
  if (seconds === 0 && milliseconds === 0) {
    return minute;
  }
  const second = `${minute}:${pad(seconds)}`;
  return milliseconds === 0 ? second : `${second}.${pad(milliseconds, 3)}`;
}

/**
 * The text a condition input shows for `value` — `parseFilterOperand`'s
 * inverse, for opening a condition already applied. A date reads back in
 * the form its column's input takes: the day alone on a `"date"` column,
 * the day and time on a `"dateTime"` or `"time"` one. A blank operand is
 * empty, and one that isn't a date on a date column — a string set in code
 * that names none — shows as it is, for the user to fix.
 */
export function formatFilterOperand(
  value: FilterScalar | undefined,
  type: ColumnType | undefined,
): string {
  if (value === null || value === undefined) {
    return "";
  }
  const date =
    filterOperatorFamily(type) === "date" ? toDate(value) : undefined;
  if (date === undefined) {
    return String(value);
  }
  return type === "date" ? dayInput(date) : momentInput(date);
}
