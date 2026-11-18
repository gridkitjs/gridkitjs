import { DataGrid } from "@gridkitjs/react";
import { largeRows, type LargeRow } from "../largeDataset";

/**
 * Columns pinned to both edges of a grid far wider than its container: `Id`
 * and `Name` stay at the start and `Amount` at the end while the rest scroll
 * sideways under them, over virtualized rows with a grand-total footer. A
 * header's context menu pins and unpins any column, and grouping by a column
 * shows the group rows' labels staying at the start too.
 *
 * Held narrower than the page, so it scrolls sideways on any screen.
 */
export function PinnedColumnsGrid() {
  return (
    <div className="max-w-3xl">
      <DataGrid<LargeRow>
        columns={[
          { field: "Id", width: 80, pinned: "start" },
          { field: "Name", width: 140, pinned: "start" },
          { field: "Region", width: 180 },
          { field: "Status", width: 180 },
          { field: "Notes", width: 520 },
          { field: "Amount", width: 140, type: "currency", pinned: "end" },
        ]}
        dataSource={largeRows}
        getRowId={(row) => String(row.Id)}
        label="Pinned columns"
        borders="all"
        resizeMode="fixed"
        height={420}
        virtualized
        sortableColumns
        resizableColumns
        reorderableColumns
        groupableColumns
        contextMenu
        selectable={{ rows: "multiple", cells: "single" }}
        aggregates={[{ columnId: "Amount", fn: "sum" }]}
      />
    </div>
  );
}
