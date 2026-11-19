import { useState } from "react";
import type { ColumnDefinition } from "@gridkitjs/core";
import { DataGrid, type DataGridProps } from "@gridkitjs/react";

export interface LoadingRow {
  id: string;
  name: string;
}

const columns: readonly ColumnDefinition<LoadingRow>[] = [
  { field: "id", header: "Id", width: 100 },
  { field: "name", header: "Name", width: 160 },
];

/**
 * A grid whose `loading` the buttons beside it turn on and off, defined here
 * because CT cannot carry a render function across from a spec. "Redraw"
 * hands the grid a new copy of its rows, a render that keeps `loading` as it
 * is; `withTemplate` gives it a `loadingTemplate`.
 */
export default function LoadingGrid({
  rows,
  defaultLoading = false,
  withTemplate = false,
  ...props
}: Omit<
  DataGridProps<LoadingRow>,
  "columns" | "dataSource" | "getRowId" | "loading" | "loadingTemplate" | "ref"
> & {
  rows: readonly LoadingRow[];
  defaultLoading?: boolean;
  withTemplate?: boolean;
}) {
  const [loading, setLoading] = useState(defaultLoading);
  const [dataSource, setDataSource] = useState(rows);

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          setLoading(true);
        }}
      >
        Start loading
      </button>
      <button
        type="button"
        onClick={() => {
          setLoading(false);
        }}
      >
        Stop loading
      </button>
      <button
        type="button"
        onClick={() => {
          setDataSource((current) => [...current]);
        }}
      >
        Redraw
      </button>
      <DataGrid
        label="Loading grid"
        {...props}
        columns={columns}
        dataSource={dataSource}
        getRowId={(row) => row.id}
        loading={loading}
        {...(withTemplate && {
          loadingTemplate: () => (
            <span data-testid="loading-template">Fetching page…</span>
          ),
        })}
      />
    </div>
  );
}
