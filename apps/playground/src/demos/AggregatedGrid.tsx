import { useState } from "react";
import type { AggregateState } from "@gridkitjs/core";
import { DataGridComponent } from "@gridkitjs/react";
import type { ColumnDefinition } from "@gridkitjs/react";

interface Row {
  Id: number;
  Region: string;
  Rep: string;
  Status: string;
  Amount: number;
  Closed: Date;
}

const regions = ["North", "South", "East", "West"];
const reps = ["Alex", "Bailey", "Casey", "Drew", "Elliot"];
const statuses = ["Open", "Pending", "Closed"];

const rows: Row[] = Array.from({ length: 24 }, (_unused, index) => ({
  Id: index + 1,
  Region: regions[index % regions.length] ?? "North",
  Rep: reps[index % reps.length] ?? "Alex",
  Status: statuses[index % statuses.length] ?? "Open",
  Amount: 100 + ((index * 37) % 900),
  Closed: new Date(2024, 0, 1 + index * 3),
}));

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const columns: readonly ColumnDefinition<Row>[] = [
  { field: "Id", width: 80 },
  { field: "Region", width: 100 },
  { field: "Rep", width: 100 },
  { field: "Status", width: 100 },
  {
    field: "Amount",
    width: 140,
    type: "currency",
    cellTemplate: ({ value }) => currency.format(Number(value)),
    // Renders this column's own aggregate result in place of the plain,
    // locale-formatted number `formatAggregateValue` would otherwise fall
    // back to — every aggregate on this column (sum/avg/min/max) uses it.
    footerTemplate: ({ value }) =>
      typeof value === "number" ? currency.format(value) : "",
  },
  {
    field: "Closed",
    width: 120,
    type: "date",
    cellTemplate: ({ value }) =>
      value instanceof Date ? value.toLocaleDateString() : "",
    // min/max on this column resolve to Date instances, not numbers —
    // formatAggregateValue already renders a Date via toLocaleString, but
    // toLocaleDateString matches this column's own cellTemplate exactly.
    footerTemplate: ({ value }) =>
      value instanceof Date ? value.toLocaleDateString() : "",
  },
];

const aggregates: AggregateState<Row> = [
  // sum / avg — numeric total and mean of Amount.
  { columnId: "Amount", fn: "sum" },
  // `id` disambiguates a second spec on the same column — it also doubles
  // as the label rendered next to the value.
  { columnId: "Amount", fn: "avg", id: "Average" },
  // min / max — over Amount (numeric) and over Closed (chronological,
  // via the same type-aware comparator column sorting uses).
  { columnId: "Amount", fn: "min", id: "Lowest" },
  { columnId: "Amount", fn: "max", id: "Highest" },
  { columnId: "Closed", fn: "min", id: "Earliest" },
  { columnId: "Closed", fn: "max", id: "Latest" },
  // count — every row in scope, regardless of its own values. `alignment`
  // overrides Id's own left alignment for just this aggregate, since a
  // plain count reads better centered than flush with the row numbers
  // above it.
  { columnId: "Id", fn: "count", alignment: "center" },
  // countDistinct — distinct non-empty Rep values in scope.
  { columnId: "Rep", fn: "countDistinct", id: "Reps" },
  // A custom aggregate function: the fraction of rows in scope still Open,
  // computed once per group (and once for the grand total) rather than
  // combined from any pre-reduced child values.
  {
    columnId: "Status",
    id: "% Open",
    fn: (scopedRows) => {
      if (scopedRows.length === 0) return 0;
      const open = scopedRows.filter((row) => row.Status === "Open").length;
      return `${String(Math.round((open / scopedRows.length) * 100))}%`;
    },
  },
];

const displayModes: readonly {
  value: "inline" | "row";
  description: string;
}[] = [
  { value: "inline", description: "subtotal as text in the group header" },
  { value: "row", description: "subtotal as its own row, per-column cells" },
];

/**
 * Grouped by Region with every built-in aggregate active at once, plus a
 * custom function: `sum`/`avg`/`min`/`max` of Amount, `min`/`max` of the
 * Closed date (chronological, not numeric), `count` of every row in
 * scope, `countDistinct` of Rep, and a custom `fn` computing the percent
 * of rows still Open. Each region's own results render either inline in
 * its header or as its own summary row, per `groupAggregateDisplay` — and
 * a grand-total footer below the grid totals every row the same way,
 * regardless of grouping, collapse state, or which display mode is
 * selected. `Amount`/`Closed`'s own `footerTemplate` format their results
 * the same way their `cellTemplate` formats the plain cells; every other
 * footer/summary cell aligns the same way its column's own data cells do,
 * except `count`, whose `AggregateSpec.alignment: "center"` overrides
 * Id's own left alignment for just that one aggregate.
 */
export function AggregatedGrid() {
  const [groupAggregateDisplay, setGroupAggregateDisplay] = useState<
    "inline" | "row"
  >("inline");

  return (
    <div>
      <fieldset className="flex gap-4 text-sm">
        <legend className="sr-only">Group aggregate display</legend>
        {displayModes.map((mode) => (
          <label key={mode.value} className="flex items-center gap-1.5">
            <input
              type="radio"
              name="group-aggregate-display"
              value={mode.value}
              checked={groupAggregateDisplay === mode.value}
              onChange={() => {
                setGroupAggregateDisplay(mode.value);
              }}
            />
            <code>{mode.value}</code>
            <span className="text-gray-600">{mode.description}</span>
          </label>
        ))}
      </fieldset>
      <div className="mt-4">
        <DataGridComponent
          columns={columns}
          dataSource={rows}
          getRowId={(row) => String(row.Id)}
          label="Sales, grouped by region with every aggregate type and a grand total"
          borders="all"
          groupableColumns
          defaultGroupBy={[{ columnId: "Region" }]}
          sortableColumns
          aggregates={aggregates}
          groupAggregateDisplay={groupAggregateDisplay}
        />
      </div>
    </div>
  );
}
