import { useRef, type ReactNode } from "react";
import type { ColumnDefinition } from "@gridkitjs/core";
import {
  DataGrid,
  type DataGridApi,
  type DataGridProps,
} from "@gridkitjs/react";

interface Row {
  id: string;
  name: string;
  region: string;
  score: number;
  code: string;
  notes: string;
  comment: string;
}

const rows: Row[] = [
  {
    id: "r1",
    name: "Alice",
    region: "West",
    score: 30,
    code: "A1",
    notes: "x",
    comment: "first",
  },
  {
    id: "r2",
    name: "Bravo",
    region: "East",
    score: 9,
    code: "B2",
    notes: "y",
    comment: "second",
  },
  {
    id: "r3",
    name: "Charlie",
    region: "West",
    score: 21,
    code: "C3",
    notes: "z",
    comment: "third",
  },
];

/**
 * Name, Region and Score copy; Code is hidden, Notes and Comment never
 * leave the grid. Comment's cells are text fields, whose own Ctrl+C the grid
 * must leave alone.
 */
const columns: readonly ColumnDefinition<Row, ReactNode>[] = [
  { field: "name", header: "Name", width: 110 },
  { field: "region", header: "Region", width: 90 },
  { field: "score", header: "Score", width: 70, type: "number" },
  { field: "code", header: "Code", width: 70, hidden: true },
  { field: "notes", header: "Notes", width: 70, exportable: false },
  {
    field: "comment",
    header: "Comment",
    width: 140,
    exportable: false,
    cellTemplate: ({ value, row }) => (
      <input
        aria-label={`Comment on ${row.name}`}
        defaultValue={String(value)}
      />
    ),
  },
];

/**
 * A grid of three rows whose columns — a template among them — a spec
 * cannot pass, with a "Copy row Bravo" button running `copy.row` through
 * the ref, as an app's own button would.
 */
export default function ClipboardGrid(
  props: Omit<
    DataGridProps<Row>,
    "columns" | "dataSource" | "getRowId" | "ref"
  >,
) {
  const gridRef = useRef<DataGridApi<Row>>(null);
  return (
    <div>
      <DataGrid
        label="Clipboard grid"
        {...props}
        ref={gridRef}
        columns={columns}
        dataSource={rows}
        getRowId={(row) => row.id}
      />
      <button
        type="button"
        onClick={() => {
          gridRef.current?.runCommand("copy.row", {
            area: "cell",
            rowId: "r2",
            columnId: "name",
          });
        }}
      >
        Copy row Bravo
      </button>
    </div>
  );
}
