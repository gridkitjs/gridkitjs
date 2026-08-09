import type { ResolvedColumn } from "../DataGrid";
import type { RowGroupingApi } from "../useRowGrouping";

interface GroupByBarProps<Row> {
  columns: readonly ResolvedColumn<Row>[];
  grouping: RowGroupingApi<Row>;
  /** A column's accessible name — see `DataGrid.tsx`'s own `columnName`. */
  columnName: (columnId: string) => string;
}

/**
 * The active group-by stack, outer to inner, as removable chips — the
 * "simpler ... header-menu action" this plan's own notes allow in place of
 * dragging a column here: `useColumnDrag`'s pointer-gesture machinery is
 * built entirely around reordering the fixed column list, and teaching it a
 * second, variable-length drop zone with its own reorder semantics is
 * materially more work than the rest of row grouping combined. Each column's
 * own header carries a group toggle (a pointer affordance, plus
 * `Alt+ArrowDown` on the header) for adding or removing a level; this bar
 * exists to show the resulting stack and let a level be removed from it
 * directly, not to be dropped onto.
 *
 * Renders nothing when ungrouped: with no drag target to hint at, an empty
 * bar has nothing honest to say.
 */
export default function GroupByBar<Row>({
  columns,
  grouping,
  columnName,
}: GroupByBarProps<Row>) {
  const { groupBy } = grouping;
  if (groupBy.length === 0) {
    return null;
  }

  function labelFor(columnId: string) {
    return columns.find((entry) => entry.id === columnId)?.label ?? columnId;
  }

  return (
    <div className="gridkit-group-by-bar" role="group" aria-label="Grouped by">
      {groupBy.map((entry) => (
        <span key={entry.columnId} className="group-by-chip">
          <span className="group-by-chip-label">
            {labelFor(entry.columnId)}
          </span>
          <button
            type="button"
            className="group-by-chip-remove"
            aria-label={`Stop grouping by ${columnName(entry.columnId)}`}
            onClick={() => {
              grouping.toggleGroupBy(entry.columnId);
            }}
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}
