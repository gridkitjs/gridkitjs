import { DataGrid } from "@gridkitjs/react";
import { orderColumns, orders } from "./walkthroughOrders";

/**
 * The walkthrough's orders grouped by Region, every group open, with the
 * group-by bar always shown. `Alt+ArrowDown` on a header, or "Group by" in
 * its context menu, adds a second level.
 */
export function WalkthroughGroupedGrid() {
  return (
    <DataGrid
      columns={orderColumns}
      dataSource={orders}
      getRowId={(row) => String(row.Id)}
      label="Orders, grouped by region"
      borders="all"
      sortableColumns
      groupableColumns
      groupByBarVisibility="always"
      contextMenu
      defaultGroupBy={[{ columnId: "Region" }]}
    />
  );
}
