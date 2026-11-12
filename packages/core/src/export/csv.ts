import type { FormatLocale } from "../util/format";
import { type TextField, textRecords } from "./records";
import type { ExportTable } from "./types";

/** How `toCsv` writes a file. Every field is optional. */
export interface CsvOptions {
  /**
   * The field separator: `","` by default, any string, or `"auto"` for the
   * separator a spreadsheet expects in `locale` — `";"` where a decimal is
   * written with a comma, as in most of Europe, since a comma there is part
   * of a number; `","` elsewhere.
   */
  readonly delimiter?: string | undefined;
  /** The locale `delimiter: "auto"` reads; the runtime's own when absent. */
  readonly locale?: FormatLocale | undefined;
  /** What ends each record. Defaults to `"\r\n"`, as RFC 4180 writes it. */
  readonly eol?: string | undefined;
  /**
   * Whether the file starts with a UTF-8 byte order mark. Defaults to
   * `true`: without one, Excel reads the file in the system's legacy code
   * page and garbles every character outside ASCII.
   */
  readonly bom?: boolean | undefined;
  /**
   * Whether a field a spreadsheet would run as a formula is written as text
   * instead. Defaults to `true`; see `toCsv`.
   */
  readonly neutralizeFormulas?: boolean | undefined;
  /**
   * Which reading of each cell is written: `"text"` (the default), as the
   * grid shows it; or `"raw"`, the typed value — numbers plain, dates in ISO
   * 8601, booleans as `true` and `false` — for a file a program reads.
   */
  readonly values?: "text" | "raw" | undefined;
}

const BOM = "﻿";

/** What a spreadsheet takes for the start of a formula, or a DDE call. */
const FORMULA_START = /^[=+\-@\t\r]/;

/** The signs a formatted number can lead with — `-5`, `+5` — and still be one. */
const SIGN_START = /^[+-]/;

/**
 * Whether a field needs quotes: RFC 4180 quotes one holding the delimiter,
 * a quote, or a line break, and nothing else.
 */
const NEEDS_QUOTES = /["\r\n]/;

/**
 * `","`, or `";"` where `locale` writes a decimal with a comma — the
 * separator a spreadsheet in that locale splits a CSV on, since it reads a
 * comma as part of a number.
 */
function autoDelimiter(locale: FormatLocale): string {
  const decimal = new Intl.NumberFormat(locale)
    .formatToParts(1.5)
    .find((part) => part.type === "decimal")?.value;
  return decimal === "," ? ";" : ",";
}

/**
 * The field with a leading `'` when a spreadsheet would run it as a
 * formula, which it then shows as text. A number keeps its sign: a cell
 * whose typed value is a number may read `-5` or `+5`, and those stay
 * numbers a formula can sum.
 */
function neutralize(field: TextField): string {
  const { text } = field;
  if (!FORMULA_START.test(text) || (field.isNumber && SIGN_START.test(text))) {
    return text;
  }
  return `'${text}`;
}

function quote(text: string, delimiter: string): string {
  return text.includes(delimiter) || NEEDS_QUOTES.test(text)
    ? `"${text.replaceAll('"', '""')}"`
    : text;
}

/**
 * The table as CSV, quoted per RFC 4180: a field is quoted when it holds the
 * delimiter, a quote or a line break, and a quote inside one is doubled, so
 * a line break inside a cell survives. A group row writes its label in the
 * first column; summary rows and the footer write their aggregates under
 * their columns.
 *
 * A CSV file opened in a spreadsheet runs any field that starts with `=`,
 * `+`, `-` or `@` as a formula — and a tab or a carriage return can hide
 * such a start — so a value a user typed into the data could make another
 * user's spreadsheet fetch a URL or run a command. By default such a field
 * gets a leading `'`, which the spreadsheet shows as text. A cell whose
 * value is a number keeps its leading sign, since it is one.
 *
 * Returns a string, not a file: making a `Blob` of it, with the type
 * `text/csv;charset=utf-8`, is the renderer's job.
 */
export function toCsv(table: ExportTable, options: CsvOptions = {}): string {
  const delimiter =
    options.delimiter === "auto"
      ? autoDelimiter(options.locale)
      : (options.delimiter ?? ",");
  const guard = options.neutralizeFormulas ?? true;
  const lines = textRecords(table, options.values ?? "text").map((record) =>
    record
      .map((field) => quote(guard ? neutralize(field) : field.text, delimiter))
      .join(delimiter),
  );
  return ((options.bom ?? true) ? BOM : "") + lines.join(options.eol ?? "\r\n");
}
