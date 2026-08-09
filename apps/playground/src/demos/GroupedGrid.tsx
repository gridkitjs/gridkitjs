import { DataGridComponent } from "@gridkitjs/react";
import { columns, rows } from "./applicationCosts";

/**
 * The same dataset as the grid above, grouped by Status. `defaultGroupBy`
 * seeds the initial grouping; `groupableColumns` turns on each header's
 * group toggle (click the icon, or focus a header and press
 * `Alt+ArrowDown`) and the group-by bar showing the active stack.
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
        defaultGroupBy={[{ columnId: "Status" }]}
        sortableColumns
      />
    </div>
  );
}
