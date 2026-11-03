import { useState } from "react";
import type {
  AggregateState,
  BuiltInAggregate,
  GridContextMenuOptions,
} from "@gridkitjs/core";
import { DataGrid, type ColumnDefinition } from "@gridkitjs/react";

interface Row {
  Id: number;
  Customer: string;
  Region: string;
  Units: number;
  Amount: number;
}

const customers = ["Acme", "Globex", "Initech", "Umbrella", "Hooli", "Stark"];
const regions = ["North", "South", "East", "West"];

const rows: Row[] = Array.from({ length: 12 }, (_unused, index) => ({
  Id: index + 1,
  Customer: customers[index % customers.length] ?? "Acme",
  Region: regions[index % regions.length] ?? "North",
  Units: 1 + ((index * 7) % 20),
  Amount: 120 + ((index * 53) % 880),
}));

const columns: readonly ColumnDefinition<Row>[] = [
  { field: "Id", width: 70 },
  { field: "Customer", width: 140 },
  { field: "Region", width: 110 },
  { field: "Units", width: 90, type: "number" },
  { field: "Amount", width: 130, type: "currency" },
];

/** The column types an aggregate other than a count makes sense for. */
const numericColumns = new Set(["Units", "Amount"]);

const aggregateChoices: readonly {
  readonly fn: BuiltInAggregate;
  readonly label: string;
}[] = [
  { fn: "sum", label: "Sum" },
  { fn: "avg", label: "Average" },
  { fn: "min", label: "Min" },
  { fn: "max", label: "Max" },
  { fn: "count", label: "Count" },
];

/**
 * The grid's own context menus, shaped per place. A row's menu adds actions
 * of the app's — logged below — before the defaults; a header's adds an
 * "Aggregate" submenu of checkable Sum, Average, Min, Max and Count that
 * drives a controlled `aggregates`, for the column clicked or, when it is
 * in the column selection, every selected column.
 */
export function ContextMenuGrid() {
  const [aggregates, setAggregates] = useState<AggregateState<Row>>([]);
  const [log, setLog] = useState<readonly string[]>([]);

  function note(entry: string): void {
    setLog((current) => [entry, ...current].slice(0, 5));
  }

  function hasAggregate(columnId: string, fn: BuiltInAggregate): boolean {
    return aggregates.some(
      (spec) => spec.columnId === columnId && spec.fn === fn,
    );
  }

  /** Turns `fn` on for every one of `columnIds`, or off when the first has it. */
  function toggleAggregate(
    columnIds: readonly string[],
    fn: BuiltInAggregate,
  ): void {
    const [first] = columnIds;
    const turnOn = first !== undefined && !hasAggregate(first, fn);
    const label = aggregateChoices.find((choice) => choice.fn === fn)?.label;
    setAggregates((current) => [
      ...current.filter(
        (spec) => !(columnIds.includes(spec.columnId) && spec.fn === fn),
      ),
      ...(turnOn
        ? columnIds.map((columnId) => ({
            columnId,
            fn,
            // Two aggregates on one column need ids of their own.
            id: `${label ?? fn} of ${columnId}`,
          }))
        : []),
    ]);
  }

  const contextMenu: GridContextMenuOptions<Row> = {
    header: ({ target, defaults }) => [
      ...defaults,
      "separator",
      {
        type: "submenu",
        id: "aggregate",
        label: "Aggregate",
        items: aggregateChoices.map(({ fn, label }) => ({
          type: "item" as const,
          id: `aggregate.${fn}`,
          label,
          hidden: fn !== "count" && !numericColumns.has(target.columnId),
          checked: hasAggregate(target.columnId, fn),
          onSelect: ({ state }) => {
            toggleAggregate(
              state.columnSelection.includes(target.columnId)
                ? state.columnSelection
                : [target.columnId],
              fn,
            );
          },
        })),
      },
    ],
    cell: ({ defaults }) => [
      {
        type: "item",
        id: "order.open",
        label: "Open order",
        onSelect: ({ row }) => {
          note(`Open order ${String(row?.row.Id)}`);
        },
      },
      {
        type: "item",
        id: "order.duplicate",
        label: "Duplicate",
        onSelect: ({ row }) => {
          note(`Duplicate order ${String(row?.row.Id)}`);
        },
      },
      {
        type: "item",
        id: "order.delete",
        label: "Delete selected",
        onSelect: ({ selectedRows }) => {
          const ids = selectedRows().map((entry) => entry.row.Id);
          note(`Delete orders ${ids.join(", ")}`);
        },
      },
      "separator",
      ...defaults,
    ],
  };

  return (
    <div>
      <DataGrid
        columns={columns}
        dataSource={rows}
        getRowId={(row) => String(row.Id)}
        label="Orders, with context menus"
        borders="all"
        sortableColumns
        resizableColumns
        groupableColumns
        selectable={{ rows: "multiple", columns: "multiple" }}
        aggregates={aggregates}
        contextMenu={contextMenu}
      />
      <ol className="mt-2 text-sm text-gray-600" aria-label="Row actions">
        {log.length === 0 ? (
          <li>Row actions you choose are logged here.</li>
        ) : (
          log.map((entry, index) => <li key={index}>{entry}</li>)
        )}
      </ol>
    </div>
  );
}
