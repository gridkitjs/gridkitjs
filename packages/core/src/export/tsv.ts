import { textRecords } from "./records";
import type { ExportTable } from "./types";

/** How `toTsv` writes its text. */
export interface TsvOptions {
  /**
   * Which reading of each cell is written: `"text"` (the default), as the
   * grid shows it; or `"raw"`, the typed value written plainly.
   */
  readonly values?: "text" | "raw" | undefined;
}

/** A tab or a line break, which would end a TSV field or record early. */
const SEPARATORS = /\r\n|[\t\r\n]/g;

/**
 * The table as tab-separated text, records ending `"\n"` — the plain-text
 * form a spreadsheet splits into cells when it is pasted, which is what the
 * clipboard carries. TSV has no quoting a paste target agrees on, so a tab
 * or line break inside a cell becomes a space instead. Unlike `toCsv` it
 * writes no byte order mark and leaves formulas alone: what is copied is
 * exactly what the grid shows, and pasting it is the user's own act.
 */
export function toTsv(table: ExportTable, options: TsvOptions = {}): string {
  return textRecords(table, options.values ?? "text")
    .map((record) =>
      record.map((field) => field.text.replace(SEPARATORS, " ")).join("\t"),
    )
    .join("\n");
}
