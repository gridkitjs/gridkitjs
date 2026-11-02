import type { FilterState } from "@gridkitjs/core";
import { DataGrid } from "@gridkitjs/react";
import { columns, rows, type Row } from "./applicationCosts";

/**
 * The same dataset as the grid above, `defaultFilter`-seeded rather than
 * driven by a header/toolbar — there's no built-in filter UI yet, so this
 * is what "seed a grid already filtered" looks like today. ANDs a text
 * query against a `GroupFilterEntry` that ORs a second text query with a
 * predicate, to show three of the four entry kinds working together.
 */
const costFilter: FilterState<Row> = [
  { columnId: "Application.Name", query: "%a%" },
  {
    combinator: "or",
    entries: [
      { columnId: "Status", query: "warn" },
      {
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
        No header or toolbar filter UI yet — this is what seeding a grid already
        filtered looks like today. Application name contains <code>a</code>, and
        either Status is exactly <code>warn</code> or Cost is over 1000:
      </p>
      <pre className="mt-2 overflow-x-auto rounded border border-gray-300 bg-gray-50 p-2 text-xs">
        {`[
  { columnId: "Application.Name", query: "%a%" },
  {
    combinator: "or",
    entries: [
      { columnId: "Status", query: "warn" },
      { columnId: "Cost", predicate: (value) => value > 1000 },
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
