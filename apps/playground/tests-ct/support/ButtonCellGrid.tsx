import type { ReactNode } from "react";
import type { ColumnDefinition } from "@gridkitjs/core";
import { DataGrid, type DataGridProps } from "@gridkitjs/react";

export interface ButtonCellRow {
  id: string;
  name: string;
}

const columns: readonly ColumnDefinition<ButtonCellRow, ReactNode>[] = [
  { field: "id", width: 80 },
  {
    field: "name",
    width: 160,
    cellTemplate: ({ value }) => <button type="button">{String(value)}</button>,
  },
];

/**
 * `cellTemplate` is called synchronously by `GridRow` during render — the
 * same cross-process bridge limitation documented on `RowIdentifiedGrid` for
 * `getRowId` — so a `cellTemplate` closure passed from a test crashes
 * rendering instead of just misbehaving. Defining the column (and its
 * template) here keeps it entirely browser-side, never crossing that bridge.
 */
export default function ButtonCellGrid(
  props: Omit<DataGridProps<ButtonCellRow>, "columns">,
) {
  return <DataGrid {...props} columns={columns} />;
}
