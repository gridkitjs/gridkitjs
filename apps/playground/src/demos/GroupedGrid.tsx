import { DataGridComponent } from "@gridkitjs/react";
import { columns, rows } from "./applicationCosts";

/**
 * The same dataset as the grid above, grouped by Status. `defaultGroupBy`
 * seeds the initial grouping; `groupableColumns` turns on each header's
 * group toggle (click the icon, or focus a header and press
 * `Alt+ArrowDown`); `groupByDraggableColumns` also lets a header be dragged
 * straight into the group-by bar, at whatever position among its chips it's
 * released. `groupByBarVisibility="always"` keeps the bar visible even
 * before anything is grouped, so it's there to drop onto. Once two or more
 * levels are stacked, drag a chip (or focus one and press
 * `Ctrl+ArrowLeft`/`Ctrl+ArrowRight`) to reorder the stack.
 */
export function GroupedGrid() {
  return (
    <div>
      <DataGridComponent
        columns={columns}
        dataSource={rows}
        getRowId={(row) => String(row.Id)}
        label="Application costs, grouped by status"
        borders="all"
        groupableColumns
        groupByDraggableColumns
        groupByBarVisibility="always"
        defaultGroupBy={[{ columnId: "Status" }]}
        sortableColumns
      />
    </div>
  );
}
