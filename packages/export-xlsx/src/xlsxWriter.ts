import type {
  ExportTable,
  ExportWriteContext,
  ExportWriter,
} from "@gridkitjs/core";
import { strToU8, zipSync } from "fflate";

import {
  CONTENT_TYPES_XML,
  PACKAGE_RELATIONSHIPS_XML,
  PART_PATHS,
  WORKBOOK_RELATIONSHIPS_XML,
} from "./parts/package";
import { headerRowNumber, sheetXml } from "./parts/sheet";
import { createStyleSheet } from "./parts/styles";
import { workbookXml } from "./parts/workbook";

/** How `xlsxWriter` writes a workbook. Every field is optional. */
export interface XlsxWriterOptions {
  /**
   * The sheet's name, `"Sheet1"` by default. Excel allows 31 characters and
   * none of `[ ] : * ? / \`, so a longer name is cut and those characters
   * become `_`.
   */
  readonly sheetName?: string | undefined;
  /**
   * Lines of text above the header row — a report's name, when it was
   * exported, the parameters it ran with — each a row of its own in the
   * first column, frozen with the header. A function is asked per export,
   * so an "Exported on" line carries the export's own date.
   */
  readonly headerRows?:
    | readonly string[]
    | ((context: ExportWriteContext) => readonly string[])
    | undefined;
  /**
   * `"typed"` (the default): numbers, dates and booleans are stored as
   * Excel's own, in a format read from the column's `type` and `format`, so
   * a formula can sum them; strings are the text the grid shows. `"text"`:
   * every cell is the text the grid shows, as CSV writes it.
   */
  readonly values?: "typed" | "text" | undefined;
}

export const XLSX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const DEFAULT_SHEET_NAME = "Sheet1";
const MAX_SHEET_NAME = 31;

/**
 * A name Excel accepts for a sheet: no `[ ] : * ? / \`, no quote at either
 * end, not empty, at most 31 characters.
 */
export function resolveSheetName(name: string | undefined): string {
  const cleaned = Array.from(
    (name ?? "")
      .replace(/[[\]:*?/\\]/g, "_")
      .replace(/^'+|'+$/g, "")
      .trim(),
  )
    .slice(0, MAX_SHEET_NAME)
    .join("")
    .trim();
  return cleaned === "" ? DEFAULT_SHEET_NAME : cleaned;
}

function writeWorkbook(
  table: ExportTable,
  context: ExportWriteContext,
  options: XlsxWriterOptions,
): Uint8Array {
  const sheetName = resolveSheetName(options.sheetName);
  const { headerRows = [] } = options;
  const titleRows =
    typeof headerRows === "function" ? headerRows(context) : headerRows;
  const styles = createStyleSheet();
  // The sheet first: the styles part lists the styles its cells asked for.
  const sheet = sheetXml(table, {
    titleRows,
    values: options.values ?? "typed",
    locale: context.locale,
    styles,
  });
  return zipSync({
    [PART_PATHS.contentTypes]: strToU8(CONTENT_TYPES_XML),
    [PART_PATHS.packageRelationships]: strToU8(PACKAGE_RELATIONSHIPS_XML),
    [PART_PATHS.workbook]: strToU8(
      workbookXml(sheetName, headerRowNumber(table, titleRows)),
    ),
    [PART_PATHS.workbookRelationships]: strToU8(WORKBOOK_RELATIONSHIPS_XML),
    [PART_PATHS.sheet]: strToU8(sheet),
    [PART_PATHS.styles]: strToU8(styles.xml()),
  });
}

/**
 * An `ExportWriter` for Excel workbooks: one sheet holding the table, with
 * a bold header row frozen at the top and printed on every page, each
 * column's width, numbers and dates stored as Excel's own in a format read
 * from the column, group headers bold above rows Excel's outline collapses,
 * and summary rows and the grand total bold. Register it through the grid's
 * `exportWriters` and the grid's `export.xlsx` command appears.
 *
 * `write` returns a promise, so that a table the writer cannot write
 * rejects — which a renderer reports as a failed export — rather than
 * throwing out of the command that ran it.
 */
export function xlsxWriter(options: XlsxWriterOptions = {}): ExportWriter {
  return {
    format: "xlsx",
    fileExtension: "xlsx",
    mimeType: XLSX_MIME_TYPE,
    write: (table, context) =>
      Promise.resolve().then(() => writeWorkbook(table, context, options)),
  };
}
