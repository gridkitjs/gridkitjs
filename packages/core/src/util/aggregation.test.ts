import { describe, expect, test } from "vitest";

import type {
  AggregateState,
  DisplayRow,
  GroupByState,
  ResolvedColumn,
} from "../types";
import { computeAggregates, withGroupAggregates } from "./aggregation";
import { groupRows } from "./grouping";

interface SampleRow {
  Id: number;
  Region: string;
  Amount: number;
  Closed: Date | null;
}

function resolvedColumn(
  field: string,
  type?: ResolvedColumn<SampleRow, unknown>["column"]["type"],
): ResolvedColumn<SampleRow, unknown> {
  return {
    column: type === undefined ? { field } : { field, type },
    id: field,
    width: 100,
    sized: false,
    label: field,
    resizable: false,
    reorderable: false,
    groupByDraggable: false,
    alignment: "left",
  };
}

const columns: readonly ResolvedColumn<SampleRow, unknown>[] = [
  resolvedColumn("Id"),
  resolvedColumn("Region"),
  resolvedColumn("Amount", "currency"),
  resolvedColumn("Closed", "date"),
];

function row(
  Id: number,
  Region: string,
  Amount: number,
  Closed: Date | null = null,
): SampleRow {
  return { Id, Region, Amount, Closed };
}

function resolvedRow(rowIndex: number, data: SampleRow) {
  return {
    rowId: String(data.Id),
    row: data,
    rowIndex,
    datasetIndex: rowIndex,
  };
}

describe("computeAggregates", () => {
  const rows = [
    row(1, "West", 10, new Date(2020, 0, 1)),
    row(2, "West", 20, new Date(2021, 0, 1)),
    row(3, "East", 30, null),
  ];

  test("sum totals a numeric column", () => {
    const specs: AggregateState<SampleRow> = [
      { columnId: "Amount", fn: "sum" },
    ];
    expect(computeAggregates(rows, specs, columns).get("Amount")).toBe(60);
  });

  test("avg averages a numeric column, ignoring nothing since all values are present", () => {
    const specs: AggregateState<SampleRow> = [
      { columnId: "Amount", fn: "avg" },
    ];
    expect(computeAggregates(rows, specs, columns).get("Amount")).toBe(20);
  });

  test("count counts every row regardless of value", () => {
    const specs: AggregateState<SampleRow> = [
      { columnId: "Amount", fn: "count" },
    ];
    expect(computeAggregates(rows, specs, columns).get("Amount")).toBe(3);
  });

  test("countDistinct counts distinct non-empty values", () => {
    const specs: AggregateState<SampleRow> = [
      { columnId: "Region", fn: "countDistinct" },
    ];
    expect(computeAggregates(rows, specs, columns).get("Region")).toBe(2);
  });

  test("min/max over a number column", () => {
    const specs: AggregateState<SampleRow> = [
      { columnId: "Amount", fn: "min", id: "minAmount" },
      { columnId: "Amount", fn: "max", id: "maxAmount" },
    ];
    const result = computeAggregates(rows, specs, columns);
    expect(result.get("minAmount")).toBe(10);
    expect(result.get("maxAmount")).toBe(30);
  });

  test("min/max over a date column compare chronologically, ignoring null entries", () => {
    const specs: AggregateState<SampleRow> = [
      { columnId: "Closed", fn: "min", id: "earliest" },
      { columnId: "Closed", fn: "max", id: "latest" },
    ];
    const result = computeAggregates(rows, specs, columns);
    expect(result.get("earliest")).toEqual(new Date(2020, 0, 1));
    expect(result.get("latest")).toEqual(new Date(2021, 0, 1));
  });

  test("a custom fn receives exactly the rows handed to it, unreduced", () => {
    let receivedRows: readonly SampleRow[] | undefined;
    let receivedCount = -1;
    const specs: AggregateState<SampleRow> = [
      {
        columnId: "Amount",
        fn: (scopedRows) => {
          receivedRows = scopedRows;
          receivedCount = scopedRows.length;
          return "custom-result";
        },
      },
    ];
    const result = computeAggregates(rows, specs, columns);
    expect(receivedCount).toBe(3);
    expect(receivedRows).toBe(rows);
    expect(result.get("Amount")).toBe("custom-result");
  });

  test("empty rows still computes each spec (e.g. sum of nothing is 0), in a fresh map each call", () => {
    const specs: AggregateState<SampleRow> = [
      { columnId: "Amount", fn: "sum" },
    ];
    const a = computeAggregates([], specs, columns);
    const b = computeAggregates([], specs, columns);
    expect(a.get("Amount")).toBe(0);
    expect(a).not.toBe(b);
  });

  test("empty specs returns a fresh empty map", () => {
    const a = computeAggregates(rows, [], columns);
    expect(a.size).toBe(0);
  });

  test("id defaults to columnId, and an explicit id disambiguates two specs on the same column", () => {
    const specs: AggregateState<SampleRow> = [
      { columnId: "Amount", fn: "sum" },
      { columnId: "Amount", fn: "avg", id: "avgAmount" },
    ];
    const result = computeAggregates(rows, specs, columns);
    expect(result.get("Amount")).toBe(60);
    expect(result.get("avgAmount")).toBe(20);
  });
});

describe("withGroupAggregates", () => {
  const groupBy: GroupByState = [{ columnId: "Region" }];
  const rows = [
    resolvedRow(0, row(1, "West", 10)),
    resolvedRow(1, row(2, "East", 20)),
    resolvedRow(2, row(3, "West", 30)),
    resolvedRow(3, row(4, "East", 40)),
  ];

  test("returns displayRows unchanged, by reference, for empty specs", () => {
    const displayRows = groupRows(rows, groupBy, [], columns);
    expect(withGroupAggregates(displayRows, rows, groupBy, [], columns)).toBe(
      displayRows,
    );
  });

  test("attaches each group's subtotal computed over its own leaf rows", () => {
    const specs: AggregateState<SampleRow> = [
      { columnId: "Amount", fn: "sum" },
    ];
    const displayRows = groupRows(rows, groupBy, [], columns);
    const result = withGroupAggregates(
      displayRows,
      rows,
      groupBy,
      specs,
      columns,
    );
    const groups = result.filter(
      (entry): entry is Extract<DisplayRow<SampleRow>, { kind: "group" }> =>
        "kind" in entry && entry.kind === "group",
    );
    expect(groups).toHaveLength(2);
    const east = groups.find((entry) => entry.value === "East");
    const west = groups.find((entry) => entry.value === "West");
    expect(east?.aggregates.get("Amount")).toBe(60);
    expect(west?.aggregates.get("Amount")).toBe(40);
  });

  test("a collapsed group still carries a correct aggregates value", () => {
    const specs: AggregateState<SampleRow> = [
      { columnId: "Amount", fn: "sum" },
    ];
    const displayRows = groupRows(rows, groupBy, ['["East"]'], columns);
    const result = withGroupAggregates(
      displayRows,
      rows,
      groupBy,
      specs,
      columns,
    );
    const east = result.find(
      (entry): entry is Extract<DisplayRow<SampleRow>, { kind: "group" }> =>
        "kind" in entry && entry.kind === "group" && entry.value === "East",
    );
    expect(east?.expanded).toBe(false);
    expect(east?.aggregates.get("Amount")).toBe(60);
  });

  test("a nested group's subtotal is independently correct, not derived from combining children's pre-computed aggregates", () => {
    // A "distinct count" custom aggregate exposes the bug a naive
    // combine-the-children implementation would produce: East/Open and
    // East/Closed both see the single value "X" as their own distinct
    // count of 1, but the parent's *true* distinct count over its full
    // leaf set is 2 ("X" and "Y") — summing 1 + 1 would coincidentally
    // also read 2 here, so the assertion instead checks a case where
    // children only ever see one shared value each and the parent should
    // report that same single distinct value, not the child count doubled.
    interface NestedRow {
      Region: string;
      Status: string;
      Tag: string;
    }
    const nestedColumns: readonly ResolvedColumn<NestedRow, unknown>[] = [
      { ...resolvedColumn("Region"), column: { field: "Region" } },
      { ...resolvedColumn("Status"), column: { field: "Status" } },
      { ...resolvedColumn("Tag"), column: { field: "Tag" } },
    ];
    const nestedRows = [
      { Region: "West", Status: "Open", Tag: "X" },
      { Region: "West", Status: "Closed", Tag: "X" },
    ].map((data, index) => ({
      rowId: String(index),
      row: data,
      rowIndex: index,
      datasetIndex: index,
    }));
    const nestedGroupBy: GroupByState = [
      { columnId: "Region" },
      { columnId: "Status" },
    ];
    const specs: AggregateState<NestedRow> = [
      {
        columnId: "Tag",
        fn: (scoped) => new Set(scoped.map((r) => r.Tag)).size,
      },
    ];
    const displayRows = groupRows(nestedRows, nestedGroupBy, [], nestedColumns);
    const result = withGroupAggregates(
      displayRows,
      nestedRows,
      nestedGroupBy,
      specs,
      nestedColumns,
    );
    const west = result.find(
      (entry): entry is Extract<DisplayRow<NestedRow>, { kind: "group" }> =>
        "kind" in entry && entry.kind === "group" && entry.level === 0,
    );
    // Both children see only "X" (distinct count 1 each); the parent's own
    // full leaf set is also just "X" (distinct count 1) — correct only if
    // recomputed from the parent's own leaves rather than summing 1 + 1.
    expect(west?.aggregates.get("Tag")).toBe(1);
  });

  describe('display: "row"', () => {
    test('emits no summary rows under the default display: "inline"', () => {
      const specs: AggregateState<SampleRow> = [
        { columnId: "Amount", fn: "sum" },
      ];
      const displayRows = groupRows(rows, groupBy, [], columns);
      const result = withGroupAggregates(
        displayRows,
        rows,
        groupBy,
        specs,
        columns,
      );
      expect(
        result.some(
          (entry) => "kind" in entry && entry.kind === "group-summary",
        ),
      ).toBe(false);
    });

    test("emits one summary row per group, immediately after that group's last leaf row, carrying the same aggregates as its header", () => {
      const specs: AggregateState<SampleRow> = [
        { columnId: "Amount", fn: "sum" },
      ];
      const displayRows = groupRows(rows, groupBy, [], columns);
      const result = withGroupAggregates(
        displayRows,
        rows,
        groupBy,
        specs,
        columns,
        "row",
      );

      // rows (pre-group): West/10, East/20, West/30, East/40 — groups sort
      // alphabetically by default (`compareValues`'s lexical string
      // comparison), so East precedes West here despite West appearing
      // first in the ungrouped input.
      const kinds = result.map((entry) =>
        "kind" in entry ? entry.kind : "data",
      );
      expect(kinds).toEqual([
        "group", // East header
        "data", // Id 2
        "data", // Id 4
        "group-summary", // East summary
        "group", // West header
        "data", // Id 1
        "data", // Id 3
        "group-summary", // West summary
      ]);

      const westHeader = result[4];
      const westSummary = result[7];
      if (
        westHeader === undefined ||
        westSummary === undefined ||
        !("kind" in westHeader) ||
        westHeader.kind !== "group" ||
        !("kind" in westSummary) ||
        westSummary.kind !== "group-summary"
      ) {
        throw new Error("unexpected shape");
      }
      expect(westSummary.groupId).toBe(westHeader.groupId);
      expect(westSummary.level).toBe(westHeader.level);
      expect(westSummary.aggregates.get("Amount")).toBe(40); // 10 + 30
      expect(westHeader.aggregates.get("Amount")).toBe(40);
    });

    test("a collapsed group's summary row sits directly after its own header, with no descendants between them", () => {
      const specs: AggregateState<SampleRow> = [
        { columnId: "Amount", fn: "sum" },
      ];
      const displayRows = groupRows(rows, groupBy, ['["East"]'], columns);
      const result = withGroupAggregates(
        displayRows,
        rows,
        groupBy,
        specs,
        columns,
        "row",
      );

      const kinds = result.map((entry) =>
        "kind" in entry ? entry.kind : "data",
      );
      expect(kinds).toEqual([
        "group", // East header (collapsed — no descendants follow)
        "group-summary", // East summary, immediately after its own header
        "group", // West header (expanded)
        "data",
        "data",
        "group-summary", // West summary
      ]);
    });

    test("a nested group gets its own summary row at its own level, and the parent's summary row follows every nested one", () => {
      interface NestedRow {
        Region: string;
        Status: string;
        Amount: number;
      }
      const nestedColumns: readonly ResolvedColumn<NestedRow, unknown>[] = [
        { ...resolvedColumn("Region"), column: { field: "Region" } },
        { ...resolvedColumn("Status"), column: { field: "Status" } },
        {
          ...resolvedColumn("Amount", "currency"),
          column: { field: "Amount", type: "currency" },
        },
      ];
      const nestedData = [
        { Region: "West", Status: "Open", Amount: 10 },
        { Region: "West", Status: "Closed", Amount: 30 },
      ];
      const nestedRows = nestedData.map((data, index) => ({
        rowId: String(index),
        row: data,
        rowIndex: index,
        datasetIndex: index,
      }));
      const nestedGroupBy: GroupByState = [
        { columnId: "Region" },
        { columnId: "Status" },
      ];
      const specs: AggregateState<NestedRow> = [
        { columnId: "Amount", fn: "sum" },
      ];
      const displayRows = groupRows(
        nestedRows,
        nestedGroupBy,
        [],
        nestedColumns,
      );
      const result = withGroupAggregates(
        displayRows,
        nestedRows,
        nestedGroupBy,
        specs,
        nestedColumns,
        "row",
      );

      const kinds = result.map((entry) =>
        "kind" in entry ? entry.kind : "data",
      );
      expect(kinds).toEqual([
        "group", // West (level 0)
        "group", // Open (level 1)
        "data",
        "group-summary", // Open summary (level 1)
        "group", // Closed (level 1)
        "data",
        "group-summary", // Closed summary (level 1)
        "group-summary", // West summary (level 0) — after every nested one
      ]);

      const westSummary = result[7];
      if (
        westSummary === undefined ||
        !("kind" in westSummary) ||
        westSummary.kind !== "group-summary"
      ) {
        throw new Error("unexpected shape");
      }
      expect(westSummary.level).toBe(0);
      expect(westSummary.aggregates.get("Amount")).toBe(40); // 10 + 30
    });

    test("rowIndex/datasetIndex are renumbered across the whole output including the new summary rows", () => {
      const specs: AggregateState<SampleRow> = [
        { columnId: "Amount", fn: "sum" },
      ];
      const displayRows = groupRows(rows, groupBy, [], columns);
      const result = withGroupAggregates(
        displayRows,
        rows,
        groupBy,
        specs,
        columns,
        "row",
      );
      result.forEach((entry, index) => {
        expect(entry.rowIndex).toBe(index);
        if ("kind" in entry) {
          expect(entry.datasetIndex).toBe(index);
        }
      });
    });
  });
});
