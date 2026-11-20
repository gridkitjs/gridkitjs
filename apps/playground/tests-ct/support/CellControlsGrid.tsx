import { useState, type ReactNode } from "react";
import type { ColumnDefinition } from "@gridkitjs/core";
import { DataGrid, type DataGridProps } from "@gridkitjs/react";

export interface CellControlsRow {
  id: string;
  note: string;
}

/** A button that counts its own activations, so a test can see Space and Enter reach it. */
function CountingButton() {
  const [presses, setPresses] = useState(0);
  return (
    <button
      type="button"
      onClick={() => {
        setPresses((count) => count + 1);
      }}
    >
      Pressed {presses}
    </button>
  );
}

const columns: readonly ColumnDefinition<CellControlsRow, ReactNode>[] = [
  { field: "id", width: 80 },
  {
    field: "note",
    width: 160,
    headerTemplate: <input aria-label="Filter notes" />,
    cellTemplate: ({ value }) => (
      <input aria-label="Note" defaultValue={String(value)} />
    ),
  },
  {
    field: "size",
    width: 120,
    cellTemplate: () => (
      <select aria-label="Size" defaultValue="small">
        <option value="small">Small</option>
        <option value="medium">Medium</option>
        <option value="large">Large</option>
      </select>
    ),
  },
  {
    field: "done",
    width: 80,
    cellTemplate: () => <input type="checkbox" aria-label="Done" />,
  },
  {
    field: "act",
    width: 120,
    cellTemplate: () => <CountingButton />,
  },
];

/**
 * A grid whose cells hold their own controls: a text field, a select, a
 * checkbox and a button, with a text field in one header. Defined here
 * rather than in a spec because a `cellTemplate` closure cannot cross from a
 * test into the browser (see `ButtonCellGrid`).
 */
export default function CellControlsGrid(
  props: Omit<DataGridProps<CellControlsRow>, "columns">,
) {
  return <DataGrid {...props} columns={columns} />;
}
