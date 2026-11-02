import { useState, type ReactNode } from "react";
import type { ColumnDefinition } from "@gridkitjs/core";
import { DataGrid, type DataGridProps } from "@gridkitjs/react";

export interface RowPropsRow {
  id: string;
  name: string;
  status: "open" | "overdue";
}

/**
 * How many times each row's cells have been drawn, by row id. Kept across
 * mounts, so a spec reads it before and after an action and compares the two
 * rather than expecting a count from zero.
 */
const renders = new Map<string, number>();

const columns: readonly ColumnDefinition<RowPropsRow, ReactNode>[] = [
  {
    field: "id",
    width: 80,
    // Counts once per row render: `GridRow` calls each template as it draws.
    cellTemplate: ({ value, rowId }) => {
      const count = (renders.get(rowId) ?? 0) + 1;
      renders.set(rowId, count);
      return <span data-renders={count}>{String(value)}</span>;
    },
  },
  { field: "name", width: 160 },
];

/**
 * `getRowProps` and `cellTemplate` are called during render, which a function
 * passed across Playwright CT's bridge from a spec cannot answer — the
 * limitation `RowIdentifiedGrid` describes — so both live here.
 *
 * `getRowProps` is an inline arrow, new on every render of this component,
 * which is the case `GridRow`'s `memo` has to survive: the "rerender" button
 * re-renders this parent without changing anything the grid shows.
 */
export default function RowPropsGrid(
  props: Omit<
    DataGridProps<RowPropsRow>,
    "columns" | "getRowId" | "getRowProps"
  >,
) {
  const [parentRenders, setParentRenders] = useState(1);
  return (
    <div>
      <button
        type="button"
        data-testid="rerender"
        onClick={() => {
          setParentRenders((count) => count + 1);
        }}
      >
        rerender
      </button>
      <output data-testid="parent-renders">{parentRenders}</output>
      <DataGrid
        {...props}
        columns={columns}
        getRowId={(row) => row.id}
        getRowProps={({ row }) => ({
          className: row.status === "overdue" ? "is-overdue" : "",
          attributes: { "data-status": row.status },
        })}
      />
    </div>
  );
}
