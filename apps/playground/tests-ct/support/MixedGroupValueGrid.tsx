import type { ReactNode } from "react";
import type { ColumnDefinition } from "@gridkitjs/core";
import { DataGridComponent, type DataGridProps } from "@gridkitjs/react";

export interface MixedGroupValueRow {
  id: string;
  category: unknown;
}

const columns: readonly ColumnDefinition<MixedGroupValueRow, ReactNode>[] = [
  { field: "id", width: 80 },
  {
    field: "category",
    width: 160,
    // Body cells render `value` directly when no template is given, and a
    // plain object or Date isn't guaranteed to be a valid React child — this
    // grid's point is the group header's own `formatGroupValue`, not the
    // body cell's, so the template just stringifies whatever comes through.
    cellTemplate: ({ value }) => JSON.stringify(value),
  },
];

/**
 * `cellTemplate` is called synchronously by `GridRow` during render — the
 * same cross-process bridge limitation documented on `RowIdentifiedGrid` for
 * `getRowId` — so a `cellTemplate` closure passed from a test crashes
 * rendering instead of just misbehaving. Defining the column (and its
 * template) here keeps it entirely browser-side, never crossing that bridge.
 */
export default function MixedGroupValueGrid(
  props: Omit<DataGridProps<MixedGroupValueRow>, "columns">,
) {
  return <DataGridComponent {...props} columns={columns} />;
}
