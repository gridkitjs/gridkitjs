import type { GridMessages } from "../messages";
import type { FormatLocale } from "../util/format";
import { type CsvOptions, toCsv } from "./csv";
import { type JsonOptions, toJson } from "./json";
import type { ExportOptions, ExportTable } from "./types";

/**
 * How a grid exports unless a call says otherwise: which rows and columns
 * (every `ExportOptions` field), what the file is called, and each built-in
 * format's settings. The grid's `export` option.
 */
export interface GridExportOptions extends ExportOptions {
  /**
   * The file's name, without its extension — the writer's is added unless
   * the name already ends with it. A function is asked per export with the
   * format, `"csv"` or `"xlsx"`. Defaults to `"export"`.
   */
  readonly fileName?: string | ((format: string) => string) | undefined;
  /**
   * How the CSV writer writes. Its `locale`, which `delimiter: "auto"`
   * reads, defaults to the grid's.
   */
  readonly csv?: CsvOptions | undefined;
  /** How the JSON writer writes. */
  readonly json?: JsonOptions | undefined;
}

/** What a writer is given beside the table: the grid's language and the export's settings. */
export interface ExportWriteContext {
  /** The grid's `locale`. */
  readonly locale: FormatLocale;
  /** The grid's messages, over the defaults. */
  readonly messages: GridMessages;
  /**
   * The export's options, where a writer finds its own settings: the CSV
   * writer reads `csv`, the JSON writer `json`. A writer of the app's own
   * takes its settings when it is made instead, as a closure.
   */
  readonly options: GridExportOptions;
}

/**
 * One export format: how to write an `ExportTable` as a file of it, and what
 * the file is. CSV and JSON ship with the grid; any other — xlsx from
 * `@gridkitjs/export-xlsx`, or one of the app's own — is registered through
 * the grid's `exportWriters`.
 *
 * `write` returns the file's contents, not a file: text, bytes, or a promise
 * of either for a writer that loads a library first. Making a `Blob` of it
 * is the renderer's job.
 */
export interface ExportWriter {
  /** The id the grid knows it by — `"csv"`, `"xlsx"`; one per grid. */
  readonly format: string;
  /** Without the dot: `"csv"`. */
  readonly fileExtension: string;
  /** The file's media type, the `Blob`'s `type`. */
  readonly mimeType: string;
  readonly write: (
    table: ExportTable,
    context: ExportWriteContext,
  ) => string | Uint8Array | Promise<string | Uint8Array>;
}

/** An export ready to save: what `exportFile` hands a renderer to download. */
export interface ExportFile {
  /** With its extension: `"export.csv"`. */
  readonly fileName: string;
  readonly mimeType: string;
  readonly content: string | Uint8Array;
}

/** CSV through `toCsv`, its delimiter read for the grid's locale unless `csv.locale` says otherwise. */
export const csvWriter: ExportWriter = {
  format: "csv",
  fileExtension: "csv",
  mimeType: "text/csv;charset=utf-8",
  write: (table, { locale, options }) =>
    toCsv(table, { locale, ...options.csv }),
};

/** The data rows as JSON, through `toJson`. */
export const jsonWriter: ExportWriter = {
  format: "json",
  fileExtension: "json",
  mimeType: "application/json",
  write: (table, { options }) => toJson(table, options.json),
};

/**
 * Every writer a grid can export with, by format: CSV and JSON, then
 * `writers` — one with a built-in's format replacing it, as an app command
 * replaces a built-in of the same id.
 */
export function resolveExportWriters(
  writers: readonly ExportWriter[] | undefined,
): ReadonlyMap<string, ExportWriter> {
  return new Map(
    [csvWriter, jsonWriter, ...(writers ?? [])].map((writer) => [
      writer.format,
      writer,
    ]),
  );
}
