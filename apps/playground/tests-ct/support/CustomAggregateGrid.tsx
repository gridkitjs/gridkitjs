import type { AggregateState, ColumnDefinition } from "@gridkitjs/core";
import { DataGridComponent, type DataGridProps } from "@gridkitjs/react";

export interface AggregateRow {
  id: string;
  region: string;
  amount: number;
}

const columns: readonly ColumnDefinition<AggregateRow>[] = [
  { field: "id", width: 80 },
  { field: "region", width: 100 },
  { field: "amount", width: 100, type: "number" },
];

/** Row count via a custom fn — asserts a reducer receives every leaf row in its own group's scope, not a partial reduction. */
const aggregates: AggregateState<AggregateRow> = [
  { columnId: "amount", fn: (rows) => rows.length },
];

/**
 * An `AggregateSpec.fn` closure is called synchronously during render, the
 * same cross-process bridge limitation `ButtonCellGrid` documents for
 * `cellTemplate` and `RowIdentifiedGrid` documents for `getRowId` — a
 * function prop passed from a test file only arrives as a pending-promise
 * placeholder, not the real function. Defining it here instead keeps it
 * entirely browser-side.
 */
export default function CustomAggregateGrid(
  props: Omit<
    DataGridProps<AggregateRow>,
    "columns" | "aggregates" | "getRowId"
  >,
) {
  return (
    <DataGridComponent
      {...props}
      columns={columns}
      aggregates={aggregates}
      getRowId={(row) => row.id}
    />
  );
}
