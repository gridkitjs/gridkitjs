import { DataGridComponent } from "@gridkitjs/react";
import { largeRows, type LargeRow } from "../largeDataset";

/**
 * `virtualized` over a few thousand rows, inside a `height`-bound body — the
 * combination `row-virtualization.mdx` documents. Only a small, bounded
 * number of `<tr>`s is ever mounted regardless of `largeRows.length`; open
 * devtools and watch the DOM node count stay flat while scrolling. `Notes`
 * wraps, so rows measure genuinely different heights rather than a uniform
 * assumed one.
 */
export function VirtualizedGrid() {
  return (
    <DataGridComponent<LargeRow>
      columns={[
        { field: "Id", width: 70 },
        { field: "Name", width: 140 },
        { field: "Region", width: 110 },
        { field: "Status", width: 110 },
        { field: "Amount", width: 120, type: "currency" },
        { field: "Notes", width: 320, wrap: { cells: true } },
      ]}
      dataSource={largeRows}
      getRowId={(row) => String(row.Id)}
      label={`Virtualized, ${String(largeRows.length)} rows`}
      borders="all"
      sortableColumns
      height={420}
      virtualized
    />
  );
}
