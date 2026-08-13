import type { AggregateResults, AggregateState } from "@gridkitjs/core";
import type { ResolvedColumn } from "../DataGrid";
import { formatAggregateValue } from "./formatAggregateValue";

interface GridFooterProps<Row> {
  columns: readonly ResolvedColumn<Row>[];
  aggregates: AggregateState<Row>;
  results: AggregateResults;
  /** Every row the grand total was computed over — what a `footerTemplate` receives as `rows`. */
  rows: readonly Row[];
}

/**
 * The grand-total footer — one `<tfoot>` row, one cell per column, using
 * that column's own `footerTemplate` when it defines one, its own computed
 * value formatted plainly when it doesn't, and a blank cell for a column
 * with no aggregate at all. Structurally mirrors `GridHeader`, minus
 * everything interactive: a footer cell is not resizable, sortable, or
 * selectable.
 *
 * Sits outside `<tbody>`'s row count on purpose — a `<tfoot>` is not part
 * of `aria-rowcount`/`aria-rowindex`/keyboard navigation's `rowCount`, the
 * same way `<thead>`'s header row is counted separately from data rows.
 */
export default function GridFooter<Row>({
  columns,
  aggregates,
  results,
  rows,
}: GridFooterProps<Row>) {
  return (
    <tfoot>
      <tr className="grid-footer" role="row">
        {columns.map((entry) => {
          const spec = aggregates.find(
            (candidate) => candidate.columnId === entry.id,
          );
          const key =
            spec === undefined ? undefined : (spec.id ?? spec.columnId);
          const value = key === undefined ? undefined : results.get(key);
          const { column } = entry;

          return (
            <td
              key={entry.id}
              role="gridcell"
              data-gridkit-column={entry.id}
              className="grid-footer-cell"
            >
              {spec !== undefined &&
                (column.footerTemplate
                  ? column.footerTemplate({ value, rows })
                  : formatAggregateValue(value))}
            </td>
          );
        })}
      </tr>
    </tfoot>
  );
}
