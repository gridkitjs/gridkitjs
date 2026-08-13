import { memo } from "react";
import type { AggregateResults, AggregateState } from "@gridkitjs/core";
import type { ResolvedColumn } from "../DataGrid";
import { classNames } from "../classNames";
import { formatAggregateValue } from "./formatAggregateValue";

interface GridGroupSummaryRowProps<Row> {
  groupId: string;
  /** Nesting depth, matching the group's own level — indents the row the same amount `GridGroupRow` does. */
  level: number;
  /** This row's absolute position in the whole dataset, unaffected by which page is showing — see `ResolvedGroupSummaryRow.datasetIndex`. */
  datasetIndex: number;
  /** The group's own computed results — identical to its header's `aggregates`. */
  results: AggregateResults;
  aggregates: AggregateState<Row>;
  columns: readonly ResolvedColumn<Row>[];
}

/**
 * A group's own aggregate results, one real `<td>` per column rather than
 * text inside the header's single spanning cell — the `groupAggregateDisplay:
 * "row"` alternative to `GridGroupRow`'s own inline rendering. Structurally
 * mirrors `GridFooter`'s grand-total row, scoped to one group's `results`
 * instead of the dataset-wide total, and indented the same amount its own
 * `GridGroupRow` is.
 *
 * Presentational: it occupies a real row slot (counted in `rowCount`/
 * `aria-rowindex`, since it is a genuine `<tr>` inside `<tbody>`) but is
 * never a keyboard tab stop — `DataGrid.tsx`'s `isSkippableRow` steps over
 * it during arrow-key navigation the same way this component itself takes
 * no `tabIndex`, `role="row"`/`"gridcell"` only, no interactive attributes.
 */
function GridGroupSummaryRowComponent<Row>({
  groupId,
  level,
  datasetIndex,
  results,
  aggregates,
  columns,
}: GridGroupSummaryRowProps<Row>) {
  return (
    <tr
      role="row"
      aria-rowindex={datasetIndex + 2}
      data-gridkit-group-summary={groupId}
      className={classNames(
        "grid-group-summary-row",
        `is-group-level-${String(level)}`,
      )}
    >
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
            className="grid-group-summary-cell"
          >
            {entry.id === columns[0]?.id && (
              <span
                className="grid-group-summary-indent"
                style={{ width: `${String(level * 1.25 + 0.5)}rem` }}
                aria-hidden="true"
              />
            )}
            {specs
              .map((spec) => {
                const value = results.get(spec.id ?? spec.columnId);
                return column.footerTemplate
                  ? column.footerTemplate({ value, rows: [] })
                  : formatAggregateValue(value);
              })
              .flatMap((rendered, index) =>
                index === 0 ? [rendered] : [", ", rendered],
              )}
          </td>
        );
      })}
    </tr>
  );
}

/**
 * `memo()`-wrapped for the same reason `GridGroupRow`/`GridRow` are: every
 * prop here is a scalar or an already-narrowed value.
 */
const GridGroupSummaryRow = memo(
  GridGroupSummaryRowComponent,
) as typeof GridGroupSummaryRowComponent;

export default GridGroupSummaryRow;
