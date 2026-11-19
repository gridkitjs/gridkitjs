import { useState } from "react";
import type { ColumnDefinition } from "@gridkitjs/core";
import { DataGrid, type DataGridProps } from "@gridkitjs/react";

interface Row {
  id: string;
  name: string;
}

const columns: readonly ColumnDefinition<Row>[] = [
  { field: "id", header: "Id", width: 100 },
  { field: "name", header: "Name", width: 160 },
];

/**
 * A grid with no rows and an `emptyTemplate`, defined here because CT
 * cannot carry a render function across from a spec. The template reads
 * back its context's `filtered` and holds an "Add a row" button that adds
 * one to `dataSource`.
 */
export default function EmptyTemplateGrid(
  props: Omit<
    DataGridProps<Row>,
    "columns" | "dataSource" | "getRowId" | "emptyTemplate" | "ref"
  >,
) {
  const [rows, setRows] = useState<readonly Row[]>([]);

  return (
    <DataGrid
      label="Empty template grid"
      {...props}
      columns={columns}
      dataSource={rows}
      getRowId={(row) => row.id}
      emptyTemplate={({ filtered }) => (
        <div data-testid="empty-template">
          <span>{filtered ? "Filtered out" : "Nothing yet"}</span>
          <button
            type="button"
            onClick={() => {
              setRows((current) => [
                ...current,
                { id: `row-${String(current.length)}`, name: "Added" },
              ]);
            }}
          >
            Add a row
          </button>
        </div>
      )}
    />
  );
}
