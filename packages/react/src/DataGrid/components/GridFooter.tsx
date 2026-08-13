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
 * A column named by more than one spec (e.g. both `sum` and `avg` of the
 * same column, disambiguated by `id`) renders every matching spec's result
 * in its one cell, comma-separated — the cell grid stays one-per-column,
 * but no result is dropped the way picking only the first match would. The
 * cell's own alignment follows the first matching spec's `AggregateSpec.
 * alignment` override, falling back to the column's own `alignment` when
 * neither is set — one `<td>` can only take one `text-align`, so a second
 * spec's own override (if it disagrees) applies only to its value, not the
 * cell.
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
          const specs = aggregates.filter(
            (candidate) => candidate.columnId === entry.id,
          );
          const { column } = entry;

          return (
            <td
              key={entry.id}
              role="gridcell"
              data-gridkit-column={entry.id}
              className="grid-footer-cell"
              style={{ textAlign: specs[0]?.alignment ?? entry.alignment }}
            >
              {specs
                .map((spec) => {
                  const value = results.get(spec.id ?? spec.columnId);
                  return column.footerTemplate
                    ? column.footerTemplate({ value, rows })
                    : formatAggregateValue(value);
                })
                // Two values in one cell need a visible separator; a single
                // one (the common case) renders exactly as before.
                .flatMap((rendered, index) =>
                  index === 0 ? [rendered] : [", ", rendered],
                )}
            </td>
          );
        })}
      </tr>
    </tfoot>
  );
}
