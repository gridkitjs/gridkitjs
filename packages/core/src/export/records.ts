import type { ExportCell, ExportScalar, ExportTable } from "./types";

/**
 * One field of a delimited text record, before the format's own escaping.
 * `isNumber` marks a cell whose typed value is a number, so a formula guard
 * can tell the sign of `-5` from the start of a formula.
 */
export interface TextField {
  readonly text: string;
  readonly isNumber: boolean;
}

/**
 * Which reading of a cell a text format writes: `"text"`, as the grid shows
 * it, or `"raw"`, its typed value written plainly, for a program to read.
 */
export type TextValues = "text" | "raw";

/**
 * A typed value as plain text: a number without grouping or a locale's
 * decimal comma, a date in ISO 8601, a boolean as `true` or `false` — the
 * forms every program parses the same way. An invalid date has no ISO form,
 * so it is written empty, as a missing value is.
 */
function rawText(value: ExportScalar): string {
  if (value === null) {
    return "";
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "" : value.toISOString();
  }
  return String(value);
}

function cellField(cell: ExportCell, values: TextValues): TextField {
  return {
    text: values === "raw" ? rawText(cell.value) : cell.text,
    isNumber: typeof cell.value === "number",
  };
}

function textField(text: string): TextField {
  return { text, isNumber: false };
}

/**
 * The table as records of fields, one per column: the header row when the
 * table has one, every body row, then the footer. A group row writes its
 * label in the first column, where a reader scanning down the left edge
 * finds it, and its inline aggregates under their own columns after it.
 */
export function textRecords(
  table: ExportTable,
  values: TextValues,
): TextField[][] {
  const records: TextField[][] = [];
  if (table.header) {
    records.push(table.columns.map((column) => textField(column.header)));
  }
  for (const row of table.rows) {
    records.push(
      row.cells.map((cell, index) =>
        row.kind === "group" && index === 0
          ? textField(row.label)
          : cellField(cell, values),
      ),
    );
  }
  if (table.footer !== null) {
    records.push(table.footer.cells.map((cell) => cellField(cell, values)));
  }
  return records;
}
