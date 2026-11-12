import type {
  ExportCell,
  ExportColumn,
  ExportGroupRow,
  ExportRow,
  ExportTable,
} from "./types";

/** How `toHtmlTable` writes its markup. */
export interface HtmlTableOptions {
  /** Text for a `<caption>` above the table; none by default. */
  readonly caption?: string | undefined;
}

const ENTITIES: Readonly<Record<string, string>> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * `text` safe to place in markup, as content or as a quoted attribute: a
 * cell's text is data, and data can hold `<script>`.
 */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => ENTITIES[char] ?? char);
}

/**
 * One cell. Alignment is written inline rather than as a class, so it
 * survives a paste into a spreadsheet or a word processor, which keep a
 * `style` attribute and have no stylesheet to read a class from.
 */
function cellHtml(
  tag: "th" | "td",
  text: string,
  column: ExportColumn | undefined,
): string {
  const alignment = column?.alignment ?? "left";
  const style = alignment === "left" ? "" : ` style="text-align:${alignment}"`;
  return `<${tag}${style}>${escapeHtml(text)}</${tag}>`;
}

function cellsHtml(
  cells: readonly ExportCell[],
  columns: readonly ExportColumn[],
): string {
  return cells
    .map((cell, index) => cellHtml("td", cell.text, columns[index]))
    .join("");
}

/**
 * A group header: its label in one cell spanning every column, as the grid
 * draws it. When the group shows aggregates inline, the label spans only the
 * columns before the first of them, so each aggregate stays under its own
 * column — at least the first column, where an aggregate gives way to the
 * label.
 */
function groupRowHtml(
  row: ExportGroupRow,
  columns: readonly ExportColumn[],
): string {
  const firstAggregate = row.cells.findIndex((cell) => cell.text !== "");
  const span = Math.max(
    1,
    firstAggregate === -1 ? row.cells.length : firstAggregate,
  );
  const colspan = span > 1 ? ` colspan="${String(span)}"` : "";
  const label = `<td${colspan}>${escapeHtml(row.label)}</td>`;
  const aggregates = row.cells
    .slice(span)
    .map((cell, index) => cellHtml("td", cell.text, columns[span + index]))
    .join("");
  return `<tr class="gridkit-export-group" data-level="${String(row.level)}">${label}${aggregates}</tr>`;
}

function rowHtml(row: ExportRow, columns: readonly ExportColumn[]): string {
  switch (row.kind) {
    case "data":
      return `<tr>${cellsHtml(row.cells, columns)}</tr>`;
    case "group":
      return groupRowHtml(row, columns);
    case "groupSummary":
      return `<tr class="gridkit-export-group-summary" data-level="${String(row.level)}">${cellsHtml(row.cells, columns)}</tr>`;
  }
}

/**
 * The table as an HTML `<table>` string: a `<thead>` of column names when
 * the table has a header, every row in `<tbody>`, and the grand total in
 * `<tfoot>`. Every piece of text is escaped. It carries the semantic class
 * names a stylesheet targets — `gridkit-export-table` on the table,
 * `gridkit-export-group` with a `data-level` on group headers,
 * `gridkit-export-group-summary` on summary rows — and nothing else of style but
 * each column's alignment, so it reads the same pasted into a document as
 * it does printed.
 */
export function toHtmlTable(
  table: ExportTable,
  options: HtmlTableOptions = {},
): string {
  const { columns } = table;
  const caption =
    options.caption === undefined
      ? ""
      : `<caption>${escapeHtml(options.caption)}</caption>`;
  const head = table.header
    ? `<thead><tr>${columns.map((column) => cellHtml("th", column.header, column)).join("")}</tr></thead>`
    : "";
  const body = `<tbody>${table.rows.map((row) => rowHtml(row, columns)).join("")}</tbody>`;
  const foot =
    table.footer === null
      ? ""
      : `<tfoot><tr>${cellsHtml(table.footer.cells, columns)}</tr></tfoot>`;
  return `<table class="gridkit-export-table">${caption}${head}${body}${foot}</table>`;
}
