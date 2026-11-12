import type { ColumnAlignment, ColumnType } from "../types";

/**
 * A value an export stores as it is rather than as text — what a cell's
 * `ExportCell.value` holds and a column's `exportValue` returns. Narrow on
 * purpose: these are the kinds every format has a reading for (a spreadsheet
 * number, date or boolean cell; a JSON scalar), so nothing a writer cannot
 * represent reaches it.
 */
export type ExportScalar = string | number | boolean | Date | null;

/**
 * One cell of an export, in both of its readings. `text` is what the grid
 * shows — CSV, the clipboard and print write it, so a file reads as the
 * screen does. `value` is the typed value a spreadsheet stores, so a number
 * stays a number a formula can sum rather than text that looks like one.
 */
export interface ExportCell {
  readonly value: ExportScalar;
  readonly text: string;
}

/**
 * A column of an export, settled once so that no writer reads a column
 * definition for itself. `type` and `format` pass through for a writer that
 * keeps typed values, which derives its own number or date format from them.
 */
export interface ExportColumn {
  readonly id: string;
  /** The column's name as text — `resolveColumnHeaderText`, never markup. */
  readonly header: string;
  /** The column's `type`, `"string"` when it has none. */
  readonly type: ColumnType;
  readonly format?:
    Intl.NumberFormatOptions | Intl.DateTimeFormatOptions | undefined;
  /** How the column's cells align, after falling back to its type. */
  readonly alignment: ColumnAlignment;
  /** Width in px: as rendered for a visible column, as it would start for a hidden one. */
  readonly width: number;
}

/** One row of data: a cell per `ExportTable.columns` entry, in that order. */
export interface ExportDataRow {
  readonly kind: "data";
  readonly rowId: string;
  readonly cells: readonly ExportCell[];
}

/**
 * A group header. `label` is the header's text, `"Region: West"`; `cells`
 * holds the group's aggregates under their own columns when the grid shows
 * them inline in the header, and is empty text elsewhere — a cell per
 * column either way, so a writer can lay it out like any other row.
 */
export interface ExportGroupRow {
  readonly kind: "group";
  /** Nesting depth, 0 for a top-level group. */
  readonly level: number;
  readonly groupId: string;
  readonly label: string;
  /** Data rows under this group, at every depth. */
  readonly count: number;
  readonly cells: readonly ExportCell[];
}

/**
 * A group's aggregates as a row of their own, after everything in the group
 * — present where the grid shows them that way (`groupAggregateDisplay:
 * "row"`), and at the same `level` as its group.
 */
export interface ExportGroupSummaryRow {
  readonly kind: "groupSummary";
  readonly level: number;
  readonly cells: readonly ExportCell[];
}

/**
 * A body row of an export, in the order the grid shows them. Discriminate on
 * `kind`; a minor release may add a kind, so a writer's `switch` over it
 * needs a `default`.
 */
export type ExportRow = ExportDataRow | ExportGroupRow | ExportGroupSummaryRow;

/**
 * The grand total — every aggregate over the exported rows. Its own kind
 * rather than an `ExportRow`, since it only ever stands in
 * `ExportTable.footer`, never among the body rows.
 */
export interface ExportTotalRow {
  readonly kind: "total";
  readonly cells: readonly ExportCell[];
}

/**
 * What an export writes, whatever the format: the grid's view as data,
 * built by `buildExportTable` from the controller's view and state and
 * never from the page. Every serialiser and writer reads this one shape, so
 * a file, the clipboard and a print cannot disagree.
 */
export interface ExportTable {
  readonly columns: readonly ExportColumn[];
  /** Whether a header row of column names leads the output. */
  readonly header: boolean;
  readonly rows: readonly ExportRow[];
  /** The grand total, or `null` when there are no aggregates to total. */
  readonly footer: ExportTotalRow | null;
}

/**
 * Narrows what an export holds. Every field defaults to what the user sees,
 * with nothing hidden by paging or a collapsed group.
 */
export interface ExportOptions {
  /**
   * Which rows: `"all"` (the default) every row the filter, search and sort
   * leave, across every page; `"page"` the data rows on the current page;
   * `"selection"` the selected rows among those `"all"` holds.
   */
  readonly scope?: "all" | "page" | "selection" | undefined;
  /**
   * Which columns: `"visible"` (the default) those shown, in their current
   * order; `"all"` hidden ones too; or a list of column ids, in that order.
   * A column with `exportable: false` is left out of every one.
   */
  readonly columns?: "visible" | "all" | readonly string[] | undefined;
  /**
   * Whether a grouped grid exports its group header rows, every group
   * expanded whatever its state on screen. Defaults to `true`; `false`
   * keeps the rows in grouped order without the headers.
   */
  readonly includeGroups?: boolean | undefined;
  /** Whether group aggregates and the grand total are exported. Defaults to `true`. */
  readonly includeAggregates?: boolean | undefined;
  /** Whether a header row of column names leads the output. Defaults to `true`. */
  readonly includeHeader?: boolean | undefined;
}
