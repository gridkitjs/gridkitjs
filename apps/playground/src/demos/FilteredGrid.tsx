import type { FilterState } from "@gridkitjs/core";
import { DataGrid } from "@gridkitjs/react";
import { columns, rows, type Row } from "./applicationCosts";

/**
 * The same dataset as the grid above, seeded already filtered with
 * `defaultFilter`: the filter is just state, so this is what a grid that
 * starts filtered looks like. ANDs a text query against a
 * `GroupFilterEntry` that ORs a second text query with a predicate, to show
 * three of the five entry kinds working together.
 */
const costFilter: FilterState<Row> = [
  { kind: "text", columnId: "Application.Name", query: "%a%" },
  {
    kind: "group",
    combinator: "or",
    entries: [
      { kind: "text", columnId: "Status", query: "warn" },
      {
        kind: "predicate",
        columnId: "Cost",
        predicate: (value) => typeof value === "number" && value > 1000,
      },
    ],
  },
];

export function FilteredGrid() {
  return (
    <div>
      <p className="text-sm text-gray-600">
        A grid seeded already filtered with <code>defaultFilter</code> (the one
        below edits its filter from a popup). Application name contains{" "}
        <code>a</code>, and either Status is exactly <code>warn</code> or Cost
        is over 1000:
      </p>
      <pre className="mt-2 overflow-x-auto rounded border border-gray-300 bg-gray-50 p-2 text-xs">
        {`[
  { kind: "text", columnId: "Application.Name", query: "%a%" },
  {
    kind: "group",
    combinator: "or",
    entries: [
      { kind: "text", columnId: "Status", query: "warn" },
      { kind: "predicate", columnId: "Cost", predicate: (value) => value > 1000 },
    ],
  },
]`}
      </pre>
      <div className="mt-2">
        <DataGrid
          columns={columns}
          dataSource={rows}
          getRowId={(row) => String(row.Id)}
          label="Application costs, filtered"
          borders="all"
          defaultFilter={costFilter}
        />
      </div>
    </div>
  );
}
