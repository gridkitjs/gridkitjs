import type { AggregateState } from "@gridkitjs/core";
import { DataGridComponent } from "@gridkitjs/react";
import type { ColumnDefinition } from "@gridkitjs/react";

interface Row {
  Id: number;
  Region: string;
  Rep: string;
  Amount: number;
}

const regions = ["North", "South", "East", "West"];
const reps = ["Alex", "Bailey", "Casey", "Drew", "Elliot"];

const rows: Row[] = Array.from({ length: 24 }, (_unused, index) => ({
  Id: index + 1,
  Region: regions[index % regions.length] ?? "North",
  Rep: reps[index % reps.length] ?? "Alex",
  Amount: 100 + ((index * 37) % 900),
}));

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const columns: readonly ColumnDefinition<Row>[] = [
  { field: "Id", width: 80 },
  { field: "Region", width: 120 },
  { field: "Rep", width: 120 },
  {
    field: "Amount",
    width: 140,
    type: "currency",
    cellTemplate: ({ value }) => currency.format(Number(value)),
    // Renders this column's own aggregate result in place of the plain,
    // locale-formatted number `formatAggregateValue` would otherwise fall
    // back to — both the grand-total footer and each group's inline
    // subtotal use it.
    footerTemplate: ({ value }) =>
      typeof value === "number" ? currency.format(value) : "",
  },
];

const aggregates: AggregateState<Row> = [
  { columnId: "Amount", fn: "sum" },
  // `id` disambiguates this from the `sum` spec above, since both name the
  // same column — it also doubles as the label rendered next to the value.
  { columnId: "Amount", fn: "avg", id: "Average" },
];

/**
 * Grouped by Region with `aggregates` computing both a `sum` and an `avg`
 * of Amount: each region's header shows its own subtotal inline, and a
 * grand-total footer below the grid totals every row regardless of
 * grouping or collapse state. `Amount`'s `footerTemplate` formats both as
 * currency, the same way its `cellTemplate` formats the plain cells.
 */
export function AggregatedGrid() {
  return (
    <DataGridComponent
      columns={columns}
      dataSource={rows}
      getRowId={(row) => String(row.Id)}
      label="Sales, grouped by region with subtotals and a grand total"
      borders="all"
      groupableColumns
      defaultGroupBy={[{ columnId: "Region" }]}
      sortableColumns
      aggregates={aggregates}
    />
  );
}
