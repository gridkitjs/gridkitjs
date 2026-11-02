import type { ReactNode } from "react";
import {
  formatAggregateValue,
  type AggregateSpec,
  type FormatLocale,
} from "@gridkitjs/core";
import type { ColumnDefinition } from "../DataGrid";

/**
 * One aggregate result as the grid shows it — in the grand-total footer, a
 * group's summary row, or inline in a group's header. The column's own
 * `footerTemplate` when it has one; otherwise the text
 * `formatAggregateValue` makes of it, with a dash standing in for an empty
 * result so a cell that has an aggregate never looks like one that has none.
 */
export function renderAggregate<Row>(
  value: unknown,
  spec: AggregateSpec<Row>,
  column: ColumnDefinition<Row> | undefined,
  rows: readonly Row[],
  locale: FormatLocale,
): ReactNode {
  if (column?.footerTemplate) {
    return column.footerTemplate({ value, rows });
  }
  if (value === null || value === undefined) {
    return "—";
  }
  return formatAggregateValue(value, spec, column, locale);
}
