import type { ReactNode } from "react";
import type { ColumnDefinition } from "@gridkitjs/core";
import { DataGrid, type DataGridProps } from "@gridkitjs/react";

export interface HeaderTextRow {
  id: string;
  cost: number;
}

const columns: readonly ColumnDefinition<HeaderTextRow, ReactNode>[] = [
  { field: "id", width: 80 },
  {
    field: "cost",
    header: "Cost",
    headerTemplate: <strong>Cost (EUR)</strong>,
    type: "number",
    width: 160,
  },
];

/**
 * A column whose header is markup, with a plain-text `header` beside it.
 * Defined browser-side because a JSX `headerTemplate` passed from a test
 * would have to cross Playwright CT's prop bridge, which is built for data,
 * not elements.
 */
export default function HeaderTextGrid(
  props: Omit<DataGridProps<HeaderTextRow>, "columns">,
) {
  return <DataGrid {...props} columns={columns} />;
}
