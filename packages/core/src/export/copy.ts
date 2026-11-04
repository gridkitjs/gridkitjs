import type { DataColumn, GridState } from "../types";
import { buildExportTable, type ExportSource } from "./buildExportTable";
import { toHtmlTable } from "./htmlTable";
import { toTsv } from "./tsv";

/**
 * What a copy is built from: an export's source, with the column and cell
 * selection a selection copy reads as well. A `GridCommandContext` is one
 * as it stands.
 */
export interface CopySource<Row> extends ExportSource<Row> {
  readonly state: Pick<
    GridState<Row>,
    | "groupBy"
    | "rowSelection"
    | "columnSizing"
    | "columnSelection"
    | "cellSelection"
  >;
}

/**
 * What to copy: one cell, one row, or whatever the grid has selected — the
 * selected rows, else the selected columns, else the selected cell.
 */
export type CopyRequest =
  | {
      readonly kind: "cell";
      readonly rowId: string;
      readonly columnId: string;
    }
  | { readonly kind: "row"; readonly rowId: string }
  | { readonly kind: "selection" };

/**
 * A copy in the two forms the clipboard carries, with what it holds for the
 * announcement: `count` cells, rows or columns.
 */
export interface CopyContent {
  /** Tab-separated text, as `toTsv` writes it — what a spreadsheet splits into cells. */
  readonly text: string;
  /** The same as an HTML table, as `toHtmlTable` writes it — what a word processor keeps the columns of. */
  readonly html: string;
  readonly count: number;
  readonly unit: "cells" | "rows" | "columns";
}

/**
 * What a selection copy holds, settled without building anything — so a
 * menu can ask whether there is anything to copy each time it resolves.
 */
type SelectionCopy =
  | { readonly kind: "rows"; readonly count: number }
  | { readonly kind: "columns"; readonly columnIds: readonly string[] }
  | {
      readonly kind: "cell";
      readonly rowId: string;
      readonly columnId: string;
    };

function isCopyable<Row>(column: DataColumn<Row, unknown>): boolean {
  return column.column.exportable !== false;
}

/** Whether the row passes the filter, on whichever page it falls. */
function hasRow<Row>(source: ExportSource<Row>, rowId: string): boolean {
  return source.view.rows.some((entry) => entry.rowId === rowId);
}

/** Whether the column is shown and may leave the grid. */
function hasColumn<Row>(source: ExportSource<Row>, columnId: string): boolean {
  return source.view.columns.some(
    (entry) => entry.id === columnId && isCopyable(entry),
  );
}

/**
 * The selection a copy reads, in order of precedence: the selected rows the
 * filter leaves; else the selected columns that are shown and exportable,
 * while the filter leaves any row; else the selected cell, when its row and
 * its column both would copy — or `null` when nothing selected can be.
 */
function selectionCopy<Row>(source: CopySource<Row>): SelectionCopy | null {
  const { state, view } = source;
  const selectedRows = new Set(state.rowSelection);
  const count = view.rows.filter((entry) =>
    selectedRows.has(entry.rowId),
  ).length;
  if (count > 0) {
    return { kind: "rows", count };
  }
  const selectedColumns = new Set(state.columnSelection);
  const columnIds = view.columns
    .filter((entry) => selectedColumns.has(entry.id) && isCopyable(entry))
    .map((entry) => entry.id);
  if (columnIds.length > 0 && view.rows.length > 0) {
    return { kind: "columns", columnIds };
  }
  const cell = state.cellSelection;
  if (
    cell !== null &&
    hasRow(source, cell.rowId) &&
    hasColumn(source, cell.columnId)
  ) {
    return { kind: "cell", rowId: cell.rowId, columnId: cell.columnId };
  }
  return null;
}

/**
 * Whether `copyContent(source, { kind: "selection" })` has anything to
 * copy, worked out without building it — cheap enough to ask each time a
 * menu or toolbar resolves.
 */
export function canCopySelection<Row>(source: CopySource<Row>): boolean {
  return selectionCopy(source) !== null;
}

/**
 * The source with `rowIds` as its row selection, so `scope: "selection"`
 * exports exactly those rows, in the order the grid shows them.
 */
function withRows<Row>(
  source: ExportSource<Row>,
  rowIds: readonly string[],
): ExportSource<Row> {
  return { ...source, state: { ...source.state, rowSelection: rowIds } };
}

interface CopyTableOptions {
  readonly scope: "all" | "selection";
  /** Column ids, in order; the shown columns when left out. */
  readonly columns?: readonly string[];
  readonly header: boolean;
}

/**
 * The table as the clipboard carries it. Group headers and aggregates stay
 * behind: a copy is of data, which a paste lays out in rows of its own.
 */
function contentOf<Row>(
  source: ExportSource<Row>,
  { scope, columns, header }: CopyTableOptions,
  unit: CopyContent["unit"],
): CopyContent | null {
  const table = buildExportTable(source, {
    scope,
    columns: columns ?? "visible",
    includeHeader: header,
    includeGroups: false,
    includeAggregates: false,
  });
  if (table.columns.length === 0 || table.rows.length === 0) {
    return null;
  }
  return {
    text: toTsv(table),
    html: toHtmlTable(table),
    count: unit === "columns" ? table.columns.length : table.rows.length,
    unit,
  };
}

function cellContent<Row>(
  source: ExportSource<Row>,
  rowId: string,
  columnId: string,
): CopyContent | null {
  if (!hasRow(source, rowId) || !hasColumn(source, columnId)) {
    return null;
  }
  return contentOf(
    withRows(source, [rowId]),
    { scope: "selection", columns: [columnId], header: false },
    "cells",
  );
}

function rowContent<Row>(
  source: ExportSource<Row>,
  rowId: string,
): CopyContent | null {
  if (!hasRow(source, rowId)) {
    return null;
  }
  return contentOf(
    withRows(source, [rowId]),
    { scope: "selection", header: false },
    "rows",
  );
}

function selectionContent<Row>(source: CopySource<Row>): CopyContent | null {
  const selection = selectionCopy(source);
  switch (selection?.kind) {
    case undefined:
      return null;
    case "rows":
      return contentOf(
        source,
        { scope: "selection", header: selection.count > 1 },
        "rows",
      );
    case "columns":
      return contentOf(
        source,
        { scope: "all", columns: selection.columnIds, header: true },
        "columns",
      );
    case "cell":
      return cellContent(source, selection.rowId, selection.columnId);
  }
}

/**
 * What `request` copies, as tab-separated text and an HTML table, or `null`
 * when there is nothing to copy — a row the filter hides, a column hidden
 * or marked `exportable: false`, or an empty selection.
 *
 * Built from the export model, never the page, so a copy holds exactly what
 * an export would and reads as the grid shows it: each cell's formatted
 * text, the shown columns in their order less any with `exportable: false`.
 * The text has no byte order mark and no formula neutralising — what is
 * copied is what is seen, and pasting it is the user's own act.
 *
 * A cell copies its text alone, and a row its cells without a header. A
 * selection copies the selected rows, in the order the grid shows them and
 * under a header row once there are two or more; else the selected columns
 * over every row the filter leaves, under their header; else the selected
 * cell.
 */
export function copyContent<Row>(
  source: CopySource<Row>,
  request: CopyRequest,
): CopyContent | null {
  switch (request.kind) {
    case "cell":
      return cellContent(source, request.rowId, request.columnId);
    case "row":
      return rowContent(source, request.rowId);
    case "selection":
      return selectionContent(source);
  }
}
