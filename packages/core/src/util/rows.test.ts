import { describe, expect, test } from "vitest";

import type {
  ColumnSortState,
  ColumnType,
  FilterState,
  ResolvedColumn,
  ResolvedRow,
} from "../types";
import { filterRows } from "./filtering";
import {
  resolveCell,
  resolveColumns,
  resolveRows,
  resolveShownRows,
} from "./rows";
import { sortRows } from "./sorting";

interface SampleRow {
  Id: number;
  Name: string;
  Score: number;
}

function resolvedColumn(
  field: string,
  type?: ColumnType,
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
];

function resolvedRow(rowIndex: number, row: SampleRow): ResolvedRow<SampleRow> {
  return { rowId: String(row.Id), row, rowIndex };
}

const rows: readonly ResolvedRow<SampleRow>[] = [
  resolvedRow(0, { Id: 1, Name: "Dave", Score: 5 }),
  resolvedRow(1, { Id: 2, Name: "Alice", Score: 20 }),
  resolvedRow(2, { Id: 3, Name: "Bob", Score: 10 }),
];

describe("resolveShownRows", () => {
  test("filters and sorts together, matching manual filter-then-sort", () => {
    const filter: FilterState<SampleRow> = [{ columnId: "Name", query: "%a%" }];
    const sort: ColumnSortState = [{ columnId: "Score", direction: "desc" }];

    const composed = resolveShownRows(rows, filter, sort, columns);
    const manual = sortRows(filterRows(rows, filter, columns), sort, columns);

    expect(composed).toEqual(manual);
    expect(composed.map((entry) => entry.row.Id)).toEqual([2, 1]);
  });

  test("empty filter and empty sort return rows itself", () => {
    expect(resolveShownRows(rows, [], [], columns)).toBe(rows);
  });

  test("excludes a filtered-out row before ordering the remainder", () => {
    const filter: FilterState<SampleRow> = [
      {
        columnId: "Score",
        predicate: (value) => typeof value === "number" && value >= 10,
      },
    ];
    const sort: ColumnSortState = [{ columnId: "Score", direction: "asc" }];

    expect(
      resolveShownRows(rows, filter, sort, columns).map(
        (entry) => entry.row.Id,
      ),
    ).toEqual([3, 2]);
    // Unfiltered, the excluded row (the lowest score) would have sorted first.
    expect(sortRows(rows, sort, columns).map((entry) => entry.row.Id)).toEqual([
      1, 3, 2,
    ]);
  });

  test("only sort given behaves exactly like sortRows alone", () => {
    const sort: ColumnSortState = [{ columnId: "Score", direction: "asc" }];

    expect(resolveShownRows(rows, [], sort, columns)).toEqual(
      sortRows(rows, sort, columns),
    );
  });

  test("only filter given behaves exactly like filterRows alone", () => {
    const filter: FilterState<SampleRow> = [{ columnId: "Name", query: "%a%" }];

    expect(resolveShownRows(rows, filter, [], columns)).toEqual(
      filterRows(rows, filter, columns),
    );
  });
});

const rowsById = new Map(rows.map((row) => [row.rowId, row]));
const aliceRow = { Id: 2, Name: "Alice", Score: 20 };

describe("resolveRows", () => {
  test("resolves ids back to the rows behind them", () => {
    expect(
      resolveRows(rowsById, ["2", "1"]).map((row) => row.row.Name),
    ).toEqual(["Alice", "Dave"]);
  });

  test("drops a stale id rather than returning it as undefined", () => {
    expect(resolveRows(rowsById, ["1", "missing"])).toEqual([
      resolvedRow(0, { Id: 1, Name: "Dave", Score: 5 }),
    ]);
  });

  test("resolves to an empty array for no ids", () => {
    expect(resolveRows(rowsById, [])).toEqual([]);
  });
});

describe("resolveColumns", () => {
  test("resolves ids back to their column and position", () => {
    expect(resolveColumns(columns, ["Score", "Id"])).toEqual([
      {
        columnId: "Score",
        column: resolvedColumn("Score", "number"),
        columnIndex: 2,
      },
      {
        columnId: "Id",
        column: resolvedColumn("Id", "number"),
        columnIndex: 0,
      },
    ]);
  });

  test("drops a stale id rather than returning it as undefined", () => {
    expect(resolveColumns(columns, ["Id", "missing"])).toEqual([
      {
        columnId: "Id",
        column: resolvedColumn("Id", "number"),
        columnIndex: 0,
      },
    ]);
  });
});

describe("resolveCell", () => {
  test("resolves a cell to its row, column and value", () => {
    expect(
      resolveCell(rowsById, columns, { rowId: "2", columnId: "Name" }),
    ).toEqual({
      rowId: "2",
      columnId: "Name",
      row: aliceRow,
      column: resolvedColumn("Name"),
      rowIndex: 1,
      columnIndex: 1,
      value: "Alice",
    });
  });

  test("is null for a null cell", () => {
    expect(resolveCell(rowsById, columns, null)).toBeNull();
  });

  test("is null when the row no longer exists", () => {
    expect(
      resolveCell(rowsById, columns, { rowId: "missing", columnId: "Name" }),
    ).toBeNull();
  });

  test("is null when the column no longer exists", () => {
    expect(
      resolveCell(rowsById, columns, { rowId: "1", columnId: "missing" }),
    ).toBeNull();
  });
});
