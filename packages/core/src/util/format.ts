import type { AggregateSpec, ColumnDefinition, ColumnType } from "../types";

/** The locale(s) values are formatted for — `undefined` is the runtime's own. */
export type FormatLocale = string | readonly string[] | undefined;

type FormatOptions = Intl.NumberFormatOptions | Intl.DateTimeFormatOptions;

/**
 * The fields `Date.prototype.toLocaleString` and its date-/time-only
 * siblings print, so a column with no `format` reads exactly as those always
 * have. `Intl.DateTimeFormat` with no fields at all prints the date alone,
 * which suits `"date"` but would drop the time from a date-and-time column.
 */
const DATE_FIELDS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "numeric",
  day: "numeric",
};
const TIME_FIELDS: Intl.DateTimeFormatOptions = {
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
};
const DATE_TIME_FIELDS: Intl.DateTimeFormatOptions = {
  ...DATE_FIELDS,
  ...TIME_FIELDS,
};

/** Without a `format.currency` there is no symbol to show, only the digits a price has. */
const CURRENCY_DIGITS: Intl.NumberFormatOptions = {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
};

/** Stands in for an absent `format` as a `WeakMap` key. */
const NO_FORMAT: FormatOptions = {};

/**
 * Formatters already built, keyed first by the column's `format` object and
 * then by type and locale. Building an `Intl` formatter costs far more than
 * using one, and a grid formats every visible cell on every render, so each
 * distinct (type, locale, format) gets one formatter for the life of the
 * page. Weakly keyed on `format` so that a column definition thrown away
 * takes its formatters with it.
 */
const formatters = new WeakMap<
  FormatOptions,
  Map<string, Intl.NumberFormat | Intl.DateTimeFormat>
>();

function cached<Formatter extends Intl.NumberFormat | Intl.DateTimeFormat>(
  format: FormatOptions | undefined,
  key: string,
  create: () => Formatter,
): Formatter {
  const owner = format ?? NO_FORMAT;
  let byKey = formatters.get(owner);
  if (byKey === undefined) {
    byKey = new Map();
    formatters.set(owner, byKey);
  }
  const existing = byKey.get(key);
  if (existing !== undefined) {
    // Each key is only ever filled by the `create` of the same kind.
    return existing as Formatter;
  }
  const formatter = create();
  byKey.set(key, formatter);
  return formatter;
}

function localeKey(locale: FormatLocale): string {
  return typeof locale === "string" ? locale : (locale?.join(",") ?? "");
}

function isNumericType(type: ColumnType | undefined): boolean {
  return (
    type === "number" ||
    type === "decimal" ||
    type === "currency" ||
    type === "percent"
  );
}

/**
 * The options a numeric `type` starts from, with the column's own `format`
 * laid over them — so `{ maximumFractionDigits: 0 }` on a currency column
 * keeps the currency style and changes only the digits.
 */
function numberOptions(
  type: ColumnType | undefined,
  format: Intl.NumberFormatOptions | undefined,
): Intl.NumberFormatOptions {
  switch (type) {
    case "currency":
      return format?.currency === undefined
        ? { ...CURRENCY_DIGITS, ...format }
        : { style: "currency", ...format };
    case "percent":
      // Intl's own reading: `0.25` is a quarter, shown as "25%".
      return { style: "percent", ...format };
    default:
      return format ?? {};
  }
}

/**
 * The fields a date `type` prints. A column's own `format` replaces them
 * rather than merging in: `dateStyle`/`timeStyle` refuse to be combined with
 * individual fields, and a format naming only a month means only a month.
 */
function dateOptions(
  type: ColumnType | undefined,
  format: Intl.DateTimeFormatOptions | undefined,
): Intl.DateTimeFormatOptions {
  if (format !== undefined) {
    return format;
  }
  if (type === "date") return DATE_FIELDS;
  if (type === "time") return TIME_FIELDS;
  return DATE_TIME_FIELDS;
}

function formatNumber(
  value: number | bigint,
  type: ColumnType | undefined,
  format: FormatOptions | undefined,
  locale: FormatLocale,
): string {
  const formatter = cached(
    format,
    `number|${type ?? ""}|${localeKey(locale)}`,
    () =>
      new Intl.NumberFormat(
        locale,
        numberOptions(type, format as Intl.NumberFormatOptions | undefined),
      ),
  );
  return formatter.format(value);
}

function formatDate(
  value: Date,
  type: ColumnType | undefined,
  format: FormatOptions | undefined,
  locale: FormatLocale,
): string {
  // `Intl.DateTimeFormat` throws on an invalid date rather than printing one.
  if (Number.isNaN(value.getTime())) {
    return String(value);
  }
  const formatter = cached(
    format,
    `date|${type ?? ""}|${localeKey(locale)}`,
    () =>
      new Intl.DateTimeFormat(
        locale,
        dateOptions(type, format as Intl.DateTimeFormatOptions | undefined),
      ),
  );
  return formatter.format(value);
}

/**
 * Anything without a reading of its own. A plain object or an array is
 * written out as JSON, since `String` would make every one of them
 * `"[object Object]"`. One JSON cannot write — a cycle, a `bigint` inside
 * — is left at that `"[object Object]"` after all.
 */
function formatOther(value: unknown): string {
  if (typeof value === "object" && value !== null) {
    try {
      return JSON.stringify(value);
    } catch {
      return Object.prototype.toString.call(value);
    }
  }
  return String(value);
}

/**
 * The text a value reads as in `column` — what a cell shows when the column
 * has no `cellTemplate`, and what an export or a print writes, so the two
 * cannot disagree.
 *
 * A `valueFormatter` decides outright. Otherwise the value's own kind picks
 * the formatter and the column's `type` refines it:
 *
 * - `null`/`undefined` → `""`.
 * - A `Date` → `Intl.DateTimeFormat`: the date alone under `"date"`, the time
 *   alone under `"time"`, both otherwise.
 * - A number under a numeric `type` → `Intl.NumberFormat`: `"currency"` with
 *   a currency symbol once `format.currency` names one (two fraction digits
 *   until then), `"percent"` reading `0.25` as 25 %. Under any other type it
 *   is printed as-is, the way a number id should be.
 * - A boolean → `"true"`/`"false"`.
 * - A string as it is; a plain object or array as JSON; anything else
 *   through `String`.
 *
 * `format` and `locale` go to the `Intl` constructor unchanged, so any
 * option it accepts is honoured.
 */
export function formatCellValue<Row>(
  value: unknown,
  column: ColumnDefinition<Row, unknown>,
  locale?: FormatLocale,
  row?: Row,
): string {
  if (column.valueFormatter !== undefined) {
    return column.valueFormatter(value, row);
  }
  if (value === null || value === undefined) {
    return "";
  }
  const { type, format } = column;
  if (value instanceof Date) {
    return formatDate(value, type, format, locale);
  }
  if (
    (typeof value === "number" || typeof value === "bigint") &&
    isNumericType(type)
  ) {
    return formatNumber(value, type, format, locale);
  }
  if (typeof value === "string") {
    return value;
  }
  return formatOther(value);
}

/**
 * Whose rules an aggregate result formats by: the column's, unless the
 * result is plainly not one of the column's values. A `count` or
 * `countDistinct` is a number of rows — a count of a currency column is 12,
 * not $12.00 — and a number reduced from a column whose `type` is not
 * numeric (the sum of a column left untyped) is still a number to read as
 * one, unless the column's own `valueFormatter` claims it.
 */
function aggregateFormatColumn<Row>(
  value: unknown,
  spec: AggregateSpec<Row>,
  column: ColumnDefinition<Row, unknown> | undefined,
): ColumnDefinition<Row, unknown> {
  const plain: ColumnDefinition<Row, unknown> = {
    field: spec.columnId,
    type: "number",
  };
  if (
    column === undefined ||
    spec.fn === "count" ||
    spec.fn === "countDistinct"
  ) {
    return plain;
  }
  const numeric = typeof value === "number" || typeof value === "bigint";
  return column.valueFormatter === undefined &&
    numeric &&
    !isNumericType(column.type)
    ? plain
    : column;
}

/**
 * The text an aggregate result reads as — a footer cell, a group's subtotal
 * — through `formatCellValue`, so a `sum` of a currency column reads as
 * currency and a `max` of a date column as a date. `column` is `undefined`
 * for a spec naming a column the grid does not have, which then formats by
 * its value alone.
 */
export function formatAggregateValue<Row>(
  value: unknown,
  spec: AggregateSpec<Row>,
  column: ColumnDefinition<Row, unknown> | undefined,
  locale?: FormatLocale,
): string {
  return formatCellValue(
    value,
    aggregateFormatColumn(value, spec, column),
    locale,
  );
}
