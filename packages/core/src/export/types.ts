/**
 * A value an export stores as it is rather than as text — what a cell's
 * `ExportCell.value` holds and a column's `exportValue` returns. Narrow on
 * purpose: these are the kinds every format has a reading for (a spreadsheet
 * number, date or boolean cell; a JSON scalar), so nothing a writer cannot
 * represent reaches it.
 */
export type ExportScalar = string | number | boolean | Date | null;
