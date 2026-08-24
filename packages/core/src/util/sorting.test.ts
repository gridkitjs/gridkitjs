import { describe, expect, test } from "vitest";

import type { ColumnSortState, ResolvedColumn, ResolvedRow } from "../types";
import {
  compareValues,
  sortDirectionFor,
  sortPriorityFor,
  sortRows,
  toggleColumnSort,
} from "./sorting";

describe("compareValues", () => {
  test("compares every numeric type numerically", () => {
    expect(compareValues(2, 10, "number")).toBeLessThan(0);
    expect(compareValues(10, 2, "decimal")).toBeGreaterThan(0);
    expect(compareValues(5, 5, "currency")).toBe(0);
    expect(compareValues(1, 2, "percent")).toBeLessThan(0);
  });

  test("compares strings lexically, and defaults to it when type is absent", () => {
    expect(compareValues("b", "a")).toBeGreaterThan(0);
    expect(compareValues("a", "a", "string")).toBe(0);
  });

  test("compares booleans with false before true", () => {
    expect(compareValues(false, true, "boolean")).toBeLessThan(0);
    expect(compareValues(true, false, "boolean")).toBeGreaterThan(0);
  });

  test("compares dates chronologically, for Date instances and date strings alike", () => {
    expect(
      compareValues(new Date(2020, 0, 1), new Date(2021, 0, 1), "date"),
    ).toBeLessThan(0);
    expect(
      compareValues("2021-01-01", "2020-01-01", "dateTime"),
    ).toBeGreaterThan(0);
  });

  test("sorts null and undefined after every value, on either side", () => {
    expect(compareValues(null, 1, "number")).toBeGreaterThan(0);
    expect(compareValues(1, null, "number")).toBeLessThan(0);
    expect(compareValues(undefined, "a")).toBeGreaterThan(0);
    expect(compareValues(null, undefined)).toBe(0);
  });

  test("treats equal values as equal", () => {
    expect(compareValues("a", "a")).toBe(0);
  });
});

describe("sortDirectionFor", () => {
  const sort: ColumnSortState = [{ columnId: "Id", direction: "asc" }];

  test("gives the direction a column sorts by", () => {
    expect(sortDirectionFor(sort, "Id")).toBe("asc");
  });

  test("is null for a column outside the sort", () => {
    expect(sortDirectionFor(sort, "Name")).toBeNull();
  });
});

describe("sortPriorityFor", () => {
  const sort: ColumnSortState = [
    { columnId: "Id", direction: "asc" },
    { columnId: "Name", direction: "desc" },
  ];

  test("gives a column's 1-based place in the stack", () => {
    expect(sortPriorityFor(sort, "Id")).toBe(1);
    expect(sortPriorityFor(sort, "Name")).toBe(2);
  });

  test("is null for a column outside the sort", () => {
    expect(sortPriorityFor(sort, "Status")).toBeNull();
  });
});

describe("toggleColumnSort", () => {
  test("starts an empty sort at ascending", () => {
    expect(toggleColumnSort([], "Id", { stack: false })).toEqual([
      { columnId: "Id", direction: "asc" },
    ]);
  });

  test("cycles the sole entry through its own direction: asc -> desc -> none", () => {
    const asc: ColumnSortState = [{ columnId: "Id", direction: "asc" }];
    const desc = toggleColumnSort(asc, "Id", { stack: false });

    expect(desc).toEqual([{ columnId: "Id", direction: "desc" }]);
    expect(toggleColumnSort(desc, "Id", { stack: false })).toEqual([]);
  });

  test("a plain click on a different column replaces the sole entry", () => {
    const sort: ColumnSortState = [{ columnId: "Id", direction: "desc" }];

    expect(toggleColumnSort(sort, "Name", { stack: false })).toEqual([
      { columnId: "Name", direction: "asc" },
    ]);
  });

  test("a plain click on a secondary key collapses the stack to just that column, at asc", () => {
    const sort: ColumnSortState = [
      { columnId: "Id", direction: "asc" },
      { columnId: "Name", direction: "desc" },
    ];

    expect(toggleColumnSort(sort, "Name", { stack: false })).toEqual([
      { columnId: "Name", direction: "asc" },
    ]);
  });

  test("a plain click on the primary key of a stack also collapses it to asc", () => {
    const sort: ColumnSortState = [
      { columnId: "Id", direction: "desc" },
      { columnId: "Name", direction: "asc" },
    ];

    expect(toggleColumnSort(sort, "Id", { stack: false })).toEqual([
      { columnId: "Id", direction: "asc" },
    ]);
  });

  test("a stacked click appends a new column at the end", () => {
    const sort: ColumnSortState = [{ columnId: "Id", direction: "asc" }];

    expect(toggleColumnSort(sort, "Name", { stack: true })).toEqual([
      { columnId: "Id", direction: "asc" },
      { columnId: "Name", direction: "asc" },
    ]);
  });

  test("a stacked click cycles an existing entry's direction in place, without moving it", () => {
    const sort: ColumnSortState = [
      { columnId: "Id", direction: "asc" },
      { columnId: "Name", direction: "asc" },
    ];

    expect(toggleColumnSort(sort, "Id", { stack: true })).toEqual([
      { columnId: "Id", direction: "desc" },
      { columnId: "Name", direction: "asc" },
    ]);
  });

  test("a stacked click cycling to none removes only that column, closing the gap", () => {
    const sort: ColumnSortState = [
      { columnId: "Id", direction: "desc" },
      { columnId: "Name", direction: "desc" },
      { columnId: "Status", direction: "desc" },
    ];

    expect(toggleColumnSort(sort, "Name", { stack: true })).toEqual([
      { columnId: "Id", direction: "desc" },
      { columnId: "Status", direction: "desc" },
    ]);
  });
});

interface SampleRow {
  Id: number;
  Name: string;
  Score: number | null;
  Application: { Name: string };
}

function resolvedColumn(
  field: string,
  type?: "number",
): ResolvedColumn<SampleRow, unknown> {
  return {
    column: { field, ...(type !== undefined && { type }) },
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
  resolvedColumn("Id", "number"),
  resolvedColumn("Name"),
  resolvedColumn("Score", "number"),
  resolvedColumn("Application.Name"),
];

function resolvedRow(rowIndex: number, row: SampleRow): ResolvedRow<SampleRow> {
  return { rowId: String(row.Id), row, rowIndex, datasetIndex: rowIndex };
}

const rows: readonly ResolvedRow<SampleRow>[] = [
  resolvedRow(0, {
    Id: 3,
    Name: "Charlie",
    Score: null,
    Application: { Name: "Beta" },
  }),
  resolvedRow(1, {
    Id: 1,
    Name: "Alice",
    Score: 10,
    Application: { Name: "Alpha" },
  }),
  resolvedRow(2, {
    Id: 2,
    Name: "Alice",
    Score: 5,
    Application: { Name: "Gamma" },
  }),
];

function idsOf(sorted: readonly ResolvedRow<SampleRow>[]): number[] {
  return sorted.map((entry) => entry.row.Id);
}

describe("sortRows", () => {
  test("returns rows unchanged for an empty sort", () => {
    expect(sortRows(rows, [], columns)).toBe(rows);
  });

  test("returns rows unchanged for a sort naming only a removed column", () => {
    const sort: ColumnSortState = [{ columnId: "Removed", direction: "asc" }];

    expect(sortRows(rows, sort, columns)).toBe(rows);
  });

  test("sorts by a single ascending key", () => {
    const sorted = sortRows(
      rows,
      [{ columnId: "Id", direction: "asc" }],
      columns,
    );

    expect(idsOf(sorted)).toEqual([1, 2, 3]);
  });

  test("sorts by a single descending key", () => {
    const sorted = sortRows(
      rows,
      [{ columnId: "Id", direction: "desc" }],
      columns,
    );

    expect(idsOf(sorted)).toEqual([3, 2, 1]);
  });

  test("breaks ties with a second key", () => {
    const sorted = sortRows(
      rows,
      [
        { columnId: "Name", direction: "asc" },
        { columnId: "Id", direction: "desc" },
      ],
      columns,
    );

    // Both Alices (Id 1 and 2) sort before Charlie; Id descending breaks their tie.
    expect(idsOf(sorted)).toEqual([2, 1, 3]);
  });

  test("is stable for rows equal under every active key", () => {
    const tied: readonly ResolvedRow<SampleRow>[] = [
      resolvedRow(0, {
        Id: 1,
        Name: "Same",
        Score: 1,
        Application: { Name: "A" },
      }),
      resolvedRow(1, {
        Id: 2,
        Name: "Same",
        Score: 1,
        Application: { Name: "A" },
      }),
    ];

    const sorted = sortRows(
      tied,
      [{ columnId: "Name", direction: "asc" }],
      columns,
    );

    expect(idsOf(sorted)).toEqual([1, 2]);
  });

  test("sorts through a dotted field path", () => {
    const sorted = sortRows(
      rows,
      [{ columnId: "Application.Name", direction: "asc" }],
      columns,
    );

    // Alpha (Id 1), Beta (Id 3), Gamma (Id 2).
    expect(idsOf(sorted)).toEqual([1, 3, 2]);
  });

  test("renumbers rowIndex to match the new positions", () => {
    const sorted = sortRows(
      rows,
      [{ columnId: "Id", direction: "asc" }],
      columns,
    );

    expect(sorted.map((entry) => entry.rowIndex)).toEqual([0, 1, 2]);
  });

  test("sorts nulls last, under either direction", () => {
    const ascending = sortRows(
      rows,
      [{ columnId: "Score", direction: "asc" }],
      columns,
    );
    const descending = sortRows(
      rows,
      [{ columnId: "Score", direction: "desc" }],
      columns,
    );

    // Scores: Charlie=null, Alice(1)=10, Alice(2)=5.
    expect(idsOf(ascending)).toEqual([2, 1, 3]);
    expect(idsOf(descending)).toEqual([1, 2, 3]);
  });
});
