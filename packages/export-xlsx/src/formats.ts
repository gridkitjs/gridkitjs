import type { ExportColumn, FormatLocale } from "@gridkitjs/core";

/**
 * Excel's number format codes for a column's cells, read from its `type`
 * and `format` the way the grid reads them to print a cell — so a currency
 * column is currency in Excel too, while the cell still holds a number a
 * formula can sum. `undefined` is Excel's General, which shows a number as
 * it is stored, as the grid prints a number column given no `format`.
 *
 * A code's `,` and `.` are always the grouping and decimal marks in the
 * file; Excel shows them as the reader's own locale writes them.
 */

const DATE = "yyyy-mm-dd";

function fractionDigits(
  format: Intl.NumberFormatOptions | undefined,
): number | undefined {
  return format?.maximumFractionDigits ?? format?.minimumFractionDigits;
}

/**
 * A fixed number of decimals: Excel's optional digit (`#`) would leave a
 * whole number with a bare decimal mark, `12.`, so the grid's "up to two"
 * becomes "two" here.
 */
function digitsCode(digits: number, grouping: boolean): string {
  const whole = grouping ? "#,##0" : "0";
  return digits > 0 ? `${whole}.${"0".repeat(digits)}` : whole;
}

/** Text Excel prints as it is, quoted; a format code cannot hold a quote. */
function literal(text: string): string {
  return `"${text.replaceAll('"', "")}"`;
}

/**
 * A currency code with the symbol and spacing `locale` writes, on the side
 * it writes them — `"€"#,##0.00` in English, `#,##0.00" ""€"` in German —
 * read from how `Intl` formats a sample amount.
 */
function currencyCode(
  format: Intl.NumberFormatOptions,
  locale: FormatLocale,
): string {
  const formatter = new Intl.NumberFormat(locale, {
    ...format,
    style: "currency",
  });
  const digits =
    fractionDigits(format) ?? formatter.resolvedOptions().maximumFractionDigits;
  const number = digitsCode(digits ?? 2, format.useGrouping !== false);
  let numberWritten = false;
  return formatter
    .formatToParts(1)
    .map((part) => {
      if (part.type === "currency" || part.type === "literal") {
        return literal(part.value);
      }
      if (numberWritten) {
        return "";
      }
      numberWritten = true;
      return number;
    })
    .join("");
}

/**
 * The `Intl` style a numeric column prints in: its `type`'s, or for a plain
 * number column the `style` its `format` names. `undefined` for a column
 * that is not numeric.
 */
function numberStyle(
  column: ExportColumn,
  format: Intl.NumberFormatOptions | undefined,
): Intl.NumberFormatOptions["style"] {
  switch (column.type) {
    case "percent":
    case "currency":
      return column.type;
    case "number":
    case "decimal":
      return format?.style ?? "decimal";
    default:
      return undefined;
  }
}

/**
 * The code a number in `column` is shown with. A column whose `type` is not
 * numeric shows its numbers in General, as the grid prints them as they are,
 * and so does a `format` no code reads as — a compact or scientific
 * notation, a unit.
 */
export function numberFormatCode(
  column: ExportColumn,
  locale: FormatLocale,
): string | undefined {
  const format = column.format as Intl.NumberFormatOptions | undefined;
  if (format?.notation !== undefined && format.notation !== "standard") {
    return undefined;
  }
  const grouping = format?.useGrouping !== false;
  const digits = fractionDigits(format);
  switch (numberStyle(column, format)) {
    case "percent":
      return `${digitsCode(digits ?? 0, false)}%`;
    case "currency":
      return format?.currency === undefined
        ? digitsCode(digits ?? 2, grouping)
        : currencyCode(format, locale);
    case "decimal":
      return digits === undefined ? undefined : digitsCode(digits, grouping);
    default:
      return undefined;
  }
}

/**
 * Whether the grid prints seconds: its own default fields do, and so does a
 * `format` naming `second` or a `timeStyle` longer than `"short"`.
 */
function showsSeconds(format: Intl.DateTimeFormatOptions | undefined): boolean {
  return (
    format === undefined ||
    format.second !== undefined ||
    (format.timeStyle !== undefined && format.timeStyle !== "short")
  );
}

/**
 * The code a date in `column` is shown with: ISO 8601's order, which reads
 * the same in every locale, the date alone under `"date"`, the time alone
 * under `"time"`, both otherwise.
 */
export function dateFormatCode(column: ExportColumn): string {
  const format = column.format as Intl.DateTimeFormatOptions | undefined;
  const time = showsSeconds(format) ? "hh:mm:ss" : "hh:mm";
  switch (column.type) {
    case "date":
      return DATE;
    case "time":
      return time;
    default:
      return `${DATE} ${time}`;
  }
}
