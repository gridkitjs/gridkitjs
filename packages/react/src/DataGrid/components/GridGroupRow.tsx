import { memo, type ReactNode } from "react";
import type { AggregateResults, AggregateState } from "@gridkitjs/core";
import type { ResolvedColumn } from "../DataGrid";
import { classNames } from "../classNames";
import { formatAggregateValue } from "./formatAggregateValue";

interface GridGroupRowProps<Row> {
  /** How many columns this group's header spans, matching the grid's own count. */
  columnCount: number;
  groupId: string;
  /** Nesting depth, 0 for a top-level group — indents the header and feeds `aria-level`. */
  level: number;
  /** The grouped column's own label, whatever its `headerTemplate` returns. */
  columnLabel: ReactNode;
  /** This group's own value — the last entry of its `path`. */
  value: unknown;
  expanded: boolean;
  /** Leaf row count under this group, regardless of collapse state. */
  count: number;
  /** This header's absolute position in the whole dataset, unaffected by which page is showing — see `ResolvedGroupRow.datasetIndex`. */
  datasetIndex: number;
  /** This group's 1-based position among its own siblings, for `aria-posinset`. */
  posinset: number;
  /** How many siblings this group has, for `aria-setsize`. */
  setsize: number;
  /** Whether this row currently holds the grid's single tab stop. */
  focused: boolean;
  /** Active aggregates — empty when none are active, in which case no subtotal renders. */
  aggregates: AggregateState<Row>;
  /** This group's own computed results, keyed the same way `aggregates` resolves each spec's key. */
  results: AggregateResults;
  columns: readonly ResolvedColumn<Row>[];
}

/**
 * How a group's own value renders in its header — blank rather than the
 * literal word "null"/"undefined", and never `Object`'s own
 * `[object Object]` for a value `String()` can't stringify meaningfully.
 */
function formatGroupValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "(blank)";
  }
  if (value instanceof Date) {
    return value.toLocaleString();
  }
  switch (typeof value) {
    case "string":
    case "number":
    case "boolean":
    case "bigint":
    case "symbol":
      return String(value);
    case "function":
      return "(function)";
    default:
      // Arrays, and anything else a grouped column's value could still be.
      return JSON.stringify(value);
  }
}

function GridGroupRowComponent<Row>({
  columnCount,
  groupId,
  level,
  columnLabel,
  value,
  expanded,
  count,
  datasetIndex,
  posinset,
  setsize,
  focused,
  aggregates,
  results,
  columns,
}: GridGroupRowProps<Row>) {
  const byId = new Map(columns.map((entry) => [entry.id, entry]));

  return (
    <tr
      role="row"
      // Two past the index: rows are counted from one, and the header is the
      // first of them — the same convention `GridRow` uses. Built from
      // `datasetIndex`, not the page-relative `rowIndex`, matching `GridRow`.
      aria-rowindex={datasetIndex + 2}
      // 1-based, per the WAI-ARIA treegrid pattern.
      aria-level={level + 1}
      aria-expanded={expanded}
      aria-setsize={setsize}
      aria-posinset={posinset}
      data-gridkit-group={groupId}
      className={classNames(
        "grid-group-row",
        `is-group-level-${String(level)}`,
      )}
    >
      <td
        role="gridcell"
        colSpan={columnCount}
        tabIndex={focused ? 0 : -1}
        aria-keyshortcuts="Space Enter"
        className="grid-group-cell"
      >
        {/*
         * The flex layout lives on this inner `div`, not the `<td>` itself:
         * a `display` other than `table-cell` on the cell element changes
         * its box type entirely, and the browser fixes that up by wrapping
         * it in an anonymous table-cell — which throws off the cell's own
         * hit-testing (a click landing where the row's bounding box says
         * the cell is can miss it and hit the table underneath instead).
         */}
        <div
          className="grid-group-cell-content"
          style={{ paddingInlineStart: `${String(level * 1.25 + 0.5)}rem` }}
        >
          <span
            className={classNames(
              "group-toggle",
              expanded ? "is-expanded" : "is-collapsed",
            )}
            aria-hidden="true"
          />
          <span className="group-label">
            {columnLabel}: {formatGroupValue(value)}
          </span>
          <span className="group-count">({count})</span>
          {aggregates.length > 0 && (
            <span className="group-aggregates">
              {aggregates.map((spec) => {
                const key = spec.id ?? spec.columnId;
                const aggregateValue = results.get(key);
                const column = byId.get(spec.columnId);
                const rendered = column?.column.footerTemplate
                  ? column.column.footerTemplate({
                      value: aggregateValue,
                      rows: [],
                    })
                  : formatAggregateValue(aggregateValue);
                // An explicit `id` disambiguates two specs on the same
                // column (e.g. both `sum` and `avg` of Amount) — when given,
                // it's the caller's own label for this result, so it takes
                // priority over the column's shared label.
                const aggregateLabel =
                  spec.id ?? column?.label ?? spec.columnId;
                return (
                  <span key={key} className="group-aggregate">
                    {aggregateLabel}: {rendered}
                  </span>
                );
              })}
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

/**
 * `memo()`-wrapped for the same reason `GridRow` is: every prop here is a
 * scalar or an already-narrowed value, and no handler reaches this component
 * directly — `GridBody` delegates group-header clicks and keydowns the same
 * way it does for data rows.
 */
const GridGroupRow = memo(
  GridGroupRowComponent,
) as typeof GridGroupRowComponent;

export default GridGroupRow;
