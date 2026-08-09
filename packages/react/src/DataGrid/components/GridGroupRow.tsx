import { memo, type ReactNode } from "react";
import { classNames } from "../classNames";

interface GridGroupRowProps {
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
  /** Position among the display rows as rendered, matching `ResolvedGroupRow.rowIndex`. */
  rowIndex: number;
  /** This group's 1-based position among its own siblings, for `aria-posinset`. */
  posinset: number;
  /** How many siblings this group has, for `aria-setsize`. */
  setsize: number;
  /** Whether this row currently holds the grid's single tab stop. */
  focused: boolean;
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

function GridGroupRowComponent({
  columnCount,
  groupId,
  level,
  columnLabel,
  value,
  expanded,
  count,
  rowIndex,
  posinset,
  setsize,
  focused,
}: GridGroupRowProps) {
  return (
    <tr
      role="row"
      // Two past the index: rows are counted from one, and the header is the
      // first of them — the same convention `GridRow` uses.
      aria-rowindex={rowIndex + 2}
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
const GridGroupRow = memo(GridGroupRowComponent);

export default GridGroupRow;
