import { useState } from "react";
import type { ColumnDefinition, FilterState } from "@gridkitjs/core";
import { DataGrid, type DataGridProps } from "@gridkitjs/react";

export interface FilterMenuRow {
  id: string;
  name: string;
  score: number;
}

const rows: FilterMenuRow[] = [
  { id: "row-c", name: "Charlie", score: 30 },
  { id: "row-a", name: "Alice", score: 9 },
  { id: "row-b", name: "Bravo", score: 21 },
];

/** `Id` sorts but has no filter menu; `Score` has one but does not sort. */
const columns: readonly ColumnDefinition<FilterMenuRow>[] = [
  { field: "id", header: "Id", width: 100, filterable: false },
  { field: "name", header: "Name", width: 160 },
  {
    field: "score",
    header: "Score",
    width: 100,
    type: "number",
    sortable: false,
  },
];

export type FilterMenuGridProps = Omit<
  DataGridProps<FilterMenuRow>,
  "columns" | "dataSource" | "getRowId" | "onCommand" | "onFilterChange" | "ref"
>;

/**
 * A grid whose headers sort, open the context menu and have filter menus,
 * writing what `onCommand` hears to `commands` and each filter
 * `onFilterChange` reports to `filter` as JSON — the callbacks a spec cannot
 * pass, since a function from a spec never reaches the browser. `props`
 * override the defaults.
 */
export default function FilterMenuGrid(props: FilterMenuGridProps) {
  const [heard, setHeard] = useState<readonly string[]>([]);
  const [filter, setFilter] = useState<FilterState<FilterMenuRow> | null>(null);

  return (
    <div>
      <DataGrid
        label="Filter menu"
        sortableColumns
        filterableColumns
        contextMenu
        {...props}
        columns={columns}
        dataSource={rows}
        getRowId={(row) => row.id}
        onCommand={({ commandId, target, source }) => {
          setHeard((current) => [
            ...current,
            `${source} ${commandId} ${JSON.stringify(target)}`,
          ]);
        }}
        onFilterChange={(event) => {
          setFilter(event.filter);
        }}
      />
      <output data-testid="commands">{heard.join("; ")}</output>
      <output data-testid="filter">
        {filter === null ? "" : JSON.stringify(filter)}
      </output>
    </div>
  );
}
