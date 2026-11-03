import { useState } from "react";
import type { ToolbarEntry } from "@gridkitjs/core";
import { DataGrid, type ColumnDefinition } from "@gridkitjs/react";

interface Row {
  Id: number;
  Customer: string;
  Region: string;
  Units: number;
  Amount: number;
  Notes: string;
}

const customers = ["Acme", "Globex", "Initech", "Umbrella", "Hooli", "Stark"];
const regions = ["North", "South", "East", "West"];
const notes = ["Rush", "Gift wrap", "", "Call first"];

const rows: Row[] = Array.from({ length: 24 }, (_unused, index) => ({
  Id: index + 1,
  Customer: customers[index % customers.length] ?? "Acme",
  Region: regions[(index * 3) % regions.length] ?? "North",
  Units: 1 + ((index * 7) % 20),
  Amount: 120 + ((index * 53) % 880),
  Notes: notes[index % notes.length] ?? "",
}));

const columns: readonly ColumnDefinition<Row>[] = [
  { field: "Id", width: 70, hideable: false },
  { field: "Customer", width: 140 },
  { field: "Region", width: 110 },
  { field: "Units", width: 90, type: "number" },
  { field: "Amount", width: 130, type: "currency" },
  { field: "Notes", width: 140, hidden: true },
];

/**
 * The grid's own toolbar: the search box, "Clear all sorting", "Clear
 * filters" and "Choose columns" — where Id cannot be unchecked and Notes,
 * hidden to start with, can be shown — a "By region" toggle that groups the rows, a "Groups" dropdown
 * of the built-in group commands, an "Orders" dropdown of the app's own
 * actions — logged below — and, at the far end, a custom entry counting the
 * rows selected. Narrow the window to see items move into "More".
 */
export function ToolbarGrid() {
  const [selected, setSelected] = useState(0);
  const [log, setLog] = useState<readonly string[]>([]);

  function note(entry: string): void {
    setLog((current) => [entry, ...current].slice(0, 5));
  }

  const items: readonly ToolbarEntry<Row>[] = [
    "search",
    "separator",
    "sort.clearAll",
    "filter.clearAll",
    "column.choose",
    "separator",
    {
      type: "item",
      id: "view.byRegion",
      label: "By region",
      checked: ({ state }) =>
        state.groupBy.some((entry) => entry.columnId === "Region"),
      onSelect: ({ actions }) => {
        actions.toggleGroupBy("Region");
      },
    },
    {
      type: "submenu",
      id: "groups",
      label: "Groups",
      items: ["group.expandAll", "group.collapseAll", "group.clearAll"],
    },
    {
      type: "submenu",
      id: "orders",
      label: "Orders",
      items: [
        {
          type: "item",
          id: "orders.export",
          label: "Export rows shown",
          onSelect: ({ view }) => {
            note(`Export ${String(view.rows.length)} orders`);
          },
        },
        {
          type: "item",
          id: "orders.archive",
          label: "Archive selected",
          disabled: ({ state }) => state.rowSelection.length === 0,
          onSelect: ({ selectedRows }) => {
            const ids = selectedRows().map((entry) => entry.row.Id);
            note(`Archive orders ${ids.join(", ")}`);
          },
        },
      ],
    },
    "spacer",
    { type: "custom", id: "selection" },
  ];

  return (
    <div>
      <DataGrid
        columns={columns}
        dataSource={rows}
        getRowId={(row) => String(row.Id)}
        label="Orders, with a toolbar"
        borders="horizontal"
        sortableColumns
        groupableColumns
        selectable={{ rows: "multiple" }}
        height={320}
        toolbar={{ items }}
        renderToolbarItem={(id) =>
          id === "selection" ? (
            <span className="text-gray-500">{selected} selected</span>
          ) : null
        }
        onRowSelectionChange={({ selection }) => {
          setSelected(selection.length);
        }}
      />
      <ol className="mt-2 text-sm text-gray-600" aria-label="Order actions">
        {log.length === 0 ? (
          <li>Order actions you choose are logged here.</li>
        ) : (
          log.map((entry, index) => <li key={index}>{entry}</li>)
        )}
      </ol>
    </div>
  );
}
