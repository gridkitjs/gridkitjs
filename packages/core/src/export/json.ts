import type { ExportTable } from "./types";

/** How `toJson` writes its text. Every field is optional. */
export interface JsonOptions {
  /**
   * What each record is keyed by: `"id"` (the default), the column's id,
   * stable whatever the header says; or `"header"`, its header text, for a
   * reader who sees the keys. A header repeated across columns is suffixed
   * ` (2)`, ` (3)` and so on, so no column overwrites another.
   */
  readonly keys?: "id" | "header" | undefined;
  /** Indentation, as `JSON.stringify` takes it; none by default. */
  readonly space?: number | string | undefined;
}

/**
 * `names` made unique in order: the first of a name keeps it, each repeat
 * takes the first ` (n)` suffix not already in use.
 */
function uniqueNames(names: readonly string[]): string[] {
  const used = new Set<string>();
  return names.map((name) => {
    let unique = name;
    for (let n = 2; used.has(unique); n += 1) {
      unique = `${name} (${String(n)})`;
    }
    used.add(unique);
    return unique;
  });
}

/**
 * The table's data rows as a JSON array of objects, one property per
 * column holding the cell's typed value — a number stays a number, a `Date`
 * becomes its ISO 8601 string. Group headers, summary rows and the footer
 * are left out: JSON is read by programs, which group and total for
 * themselves, and a row that is not data would only have to be filtered
 * out again.
 *
 * Returns a string; making a `Blob` of it, with the type
 * `application/json`, is the renderer's job.
 */
export function toJson(table: ExportTable, options: JsonOptions = {}): string {
  const keys =
    options.keys === "header"
      ? uniqueNames(table.columns.map((column) => column.header))
      : table.columns.map((column) => column.id);
  const records = table.rows.flatMap((row) =>
    row.kind === "data"
      ? [
          Object.fromEntries(
            keys.map((key, index) => [key, row.cells[index]?.value ?? null]),
          ),
        ]
      : [],
  );
  // `JSON.stringify` writes a `Date` through its `toJSON`, the ISO string —
  // or `null` for an invalid one, as it does a `NaN`.
  return JSON.stringify(records, null, options.space);
}
