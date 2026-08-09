import { describe, expect, test } from "vitest";

import type { ColumnDefinition, ResolvedColumn } from "../types";
import {
  applyColumnResize,
  beginColumnResize,
  clampColumnWidth,
  DEFAULT_COLUMN_SIZES,
  fitColumnsToWidth,
  resolveColumnConstraints,
  resolveColumnWidths,
  revertColumnSize,
  sizeColumnToContent,
  totalColumnWidth,
} from "./sizing";

interface SampleRow {
  Id: number;
  Name: string;
  Status: string;
}

function widthsOf(resolved: readonly ResolvedColumn<SampleRow>[]): number[] {
  return resolved.map((entry) => entry.width);
}

/** Three equal columns, the shape most auto-fit cases start from. */
const equalColumns: readonly ColumnDefinition<SampleRow>[] = [
  { field: "Id", width: 100 },
  { field: "Name", width: 100 },
  { field: "Status", width: 100 },
];

describe("resolveColumnConstraints", () => {
  test("prefers the column's own bounds over the defaults", () => {
    const constraints = resolveColumnConstraints<SampleRow>({
      field: "Id",
      minWidth: 80,
    });

    expect(constraints).toEqual({
      minWidth: 80,
      maxWidth: DEFAULT_COLUMN_SIZES.maxWidth,
    });
  });

  test("takes overridden defaults for bounds the column omits", () => {
    const constraints = resolveColumnConstraints<SampleRow>(
      { field: "Id" },
      { minWidth: 10, maxWidth: 500 },
    );

    expect(constraints).toEqual({ minWidth: 10, maxWidth: 500 });
  });
});

describe("clampColumnWidth", () => {
  test("holds a width within its bounds", () => {
    const constraints = { minWidth: 50, maxWidth: 200 };

    expect(clampColumnWidth(20, constraints)).toBe(50);
    expect(clampColumnWidth(120, constraints)).toBe(120);
    expect(clampColumnWidth(900, constraints)).toBe(200);
  });
});

describe("resolveColumnWidths", () => {
  test("takes the sizing state over the column, and the column over the default", () => {
    const columns: readonly ColumnDefinition<SampleRow>[] = [
      { field: "Id", width: 90 },
      { field: "Name" },
      { field: "Status", width: 120 },
    ];

    const resolved = resolveColumnWidths(columns, { Status: 300 });

    expect(widthsOf(resolved)).toEqual([90, DEFAULT_COLUMN_SIZES.width, 300]);
  });

  test("clamps every source, including a width that came from the state", () => {
    const columns: readonly ColumnDefinition<SampleRow>[] = [
      { field: "Id", minWidth: 100 },
      { field: "Name", maxWidth: 120 },
    ];

    const resolved = resolveColumnWidths(columns, { Id: 10, Name: 900 });

    expect(widthsOf(resolved)).toEqual([100, 120]);
  });

  test("falls back to an overridden default width", () => {
    const resolved = resolveColumnWidths<SampleRow, string>(
      [{ field: "Id" }, { field: "Name", width: 90 }],
      {},
      { sizes: { width: 60 } },
    );

    expect(widthsOf(resolved)).toEqual([60, 90]);
  });

  test("marks only the columns whose width came from the state", () => {
    const resolved = resolveColumnWidths(equalColumns, { Name: 200 });

    expect(resolved.map((entry) => entry.sized)).toEqual([false, true, false]);
  });

  test("keys the state by id when a column carries one", () => {
    const columns: readonly ColumnDefinition<SampleRow>[] = [
      { field: "Name", id: "name-short" },
      { field: "Name", id: "name-long" },
    ];

    const resolved = resolveColumnWidths(columns, { "name-long": 400 });

    expect(widthsOf(resolved)).toEqual([DEFAULT_COLUMN_SIZES.width, 400]);
  });

  test("returns nothing for no columns", () => {
    expect(resolveColumnWidths([], {})).toEqual([]);
    expect(totalColumnWidth([])).toBe(0);
  });

  test("resolves each column's label, eagerly or lazily", () => {
    const columns: readonly ColumnDefinition<SampleRow>[] = [
      { field: "Id", headerTemplate: "Identifier" },
      { field: "Name", headerTemplate: () => "Full name" },
      { field: "Status" },
    ];

    const resolved = resolveColumnWidths(columns, {});

    expect(resolved.map((entry) => entry.label)).toEqual([
      "Identifier",
      "Full name",
      "Status",
    ]);
  });

  test("takes the column's own resizable over the grid default", () => {
    const columns: readonly ColumnDefinition<SampleRow>[] = [
      { field: "Id", resizable: false },
      { field: "Name" },
      { field: "Status", resizable: true },
    ];

    const enabled = resolveColumnWidths(columns, {}, { resizable: true });
    const disabled = resolveColumnWidths(columns, {}, { resizable: false });

    expect(enabled.map((entry) => entry.resizable)).toEqual([
      false,
      true,
      true,
    ]);
    expect(disabled.map((entry) => entry.resizable)).toEqual([
      false,
      false,
      true,
    ]);
  });

  test("leaves columns unresizable when neither side says otherwise", () => {
    const resolved = resolveColumnWidths(equalColumns, {});

    expect(resolved.map((entry) => entry.resizable)).toEqual([
      false,
      false,
      false,
    ]);
  });

  test("takes the column's own groupByDraggable over the grid default", () => {
    const columns: readonly ColumnDefinition<SampleRow>[] = [
      { field: "Id", groupByDraggable: false },
      { field: "Name" },
      { field: "Status", groupByDraggable: true },
    ];

    const enabled = resolveColumnWidths(
      columns,
      {},
      { groupByDraggable: true },
    );
    const disabled = resolveColumnWidths(
      columns,
      {},
      { groupByDraggable: false },
    );

    expect(enabled.map((entry) => entry.groupByDraggable)).toEqual([
      false,
      true,
      true,
    ]);
    expect(disabled.map((entry) => entry.groupByDraggable)).toEqual([
      false,
      false,
      true,
    ]);
  });

  test("aligns from the column's type, letting an explicit alignment win", () => {
    const columns: readonly ColumnDefinition<SampleRow>[] = [
      { field: "Id", type: "number" },
      { field: "Name", type: "currency", alignment: "center" },
      { field: "Status", type: "string" },
    ];

    const resolved = resolveColumnWidths(columns, {});

    expect(resolved.map((entry) => entry.alignment)).toEqual([
      "right",
      "center",
      "left",
    ]);
  });

  test("aligns a column left when it states neither alignment nor type", () => {
    const resolved = resolveColumnWidths(equalColumns, {});

    expect(resolved.map((entry) => entry.alignment)).toEqual([
      "left",
      "left",
      "left",
    ]);
  });
});

describe("applyColumnResize", () => {
  const column: ColumnDefinition<SampleRow> = {
    field: "Id",
    minWidth: 60,
    maxWidth: 300,
  };
  const session = beginColumnResize(column, 100, 500);

  test("moves the width by the distance the pointer travelled", () => {
    expect(applyColumnResize(session, 560)).toBe(160);
  });

  test("returns the starting width for a pointer that has not moved", () => {
    expect(applyColumnResize(session, 500)).toBe(100);
  });

  test("shrinks on a leftward drag and stops at the minimum", () => {
    expect(applyColumnResize(session, 470)).toBe(70);
    expect(applyColumnResize(session, 100)).toBe(60);
  });

  test("stops at the maximum on a rightward drag", () => {
    expect(applyColumnResize(session, 5000)).toBe(300);
  });

  test("captures the column's id, so the drag survives a reorder", () => {
    expect(beginColumnResize({ field: "Name", id: "n" }, 10, 0).columnId).toBe(
      "n",
    );
  });
});

describe("fitColumnsToWidth", () => {
  function fit(
    columns: readonly ColumnDefinition<SampleRow>[],
    sizing: Readonly<Record<string, number>>,
    available: number,
  ): number[] {
    return widthsOf(
      fitColumnsToWidth(resolveColumnWidths(columns, sizing), available),
    );
  }

  test("shares the surplus in proportion to the current widths", () => {
    const columns: readonly ColumnDefinition<SampleRow>[] = [
      { field: "Id", width: 100 },
      { field: "Name", width: 200 },
      { field: "Status", width: 100 },
    ];

    expect(fit(columns, {}, 800)).toEqual([200, 400, 200]);
  });

  test("fills the width exactly when the share does not divide evenly", () => {
    const widths = fit(equalColumns, {}, 401);

    expect(widths.reduce((total, width) => total + width, 0)).toBe(401);
    expect(widths).toEqual([134, 134, 133]);
  });

  test("shrinks columns proportionally when they exceed the width", () => {
    expect(fit(equalColumns, {}, 210)).toEqual([70, 70, 70]);
  });

  test("fills the width exactly when shrinking and the share does not divide evenly", () => {
    const widths = fit(equalColumns, {}, 200);

    expect(widths.reduce((total, width) => total + width, 0)).toBe(200);
    expect(widths).toEqual([66, 67, 67]);
  });

  test("redistributes what a column clamped at its maximum could not take", () => {
    const columns: readonly ColumnDefinition<SampleRow>[] = [
      { field: "Id", width: 100 },
      { field: "Name", width: 100, maxWidth: 120 },
      { field: "Status", width: 100 },
    ];

    expect(fit(columns, {}, 600)).toEqual([240, 120, 240]);
  });

  test("stops shrinking a column at its minimum and redistributes the rest", () => {
    const columns: readonly ColumnDefinition<SampleRow>[] = [
      { field: "Id", width: 100 },
      { field: "Name", width: 100, minWidth: 90 },
      { field: "Status", width: 100 },
    ];

    expect(fit(columns, {}, 240)).toEqual([75, 90, 75]);
  });

  test("leaves columns the user has sized alone when shrinking", () => {
    const columns: readonly ColumnDefinition<SampleRow>[] = [
      { field: "Id", width: 100 },
      { field: "Name", width: 100 },
      { field: "Status", width: 100 },
    ];

    expect(fit(columns, { Name: 100 }, 220)).toEqual([60, 100, 60]);
  });

  test("leaves the columns alone when shrinking to every minimum still does not fit", () => {
    expect(fit(equalColumns, {}, 50)).toEqual([100, 100, 100]);
  });

  test("leaves a fully user-sized set of columns alone when they exceed the width", () => {
    const columns: readonly ColumnDefinition<SampleRow>[] = [
      { field: "Id", width: 100 },
      { field: "Name", width: 100 },
      { field: "Status", width: 100 },
    ];

    expect(fit(columns, { Id: 100, Name: 100, Status: 100 }, 200)).toEqual([
      100, 100, 100,
    ]);
  });

  test("holds a column the user sized and grows only the rest", () => {
    expect(fit(equalColumns, { Name: 100 }, 400)).toEqual([150, 100, 150]);
  });

  test("stops short rather than growing columns that are all sized", () => {
    const widths = fit(equalColumns, { Id: 100, Name: 100, Status: 100 }, 900);

    expect(widths).toEqual([100, 100, 100]);
  });

  test("stops short when every column has reached its maximum", () => {
    const columns = equalColumns.map((column) => ({
      ...column,
      maxWidth: 120,
    }));

    expect(fit(columns, {}, 900)).toEqual([120, 120, 120]);
  });

  test("returns nothing for no columns", () => {
    expect(fitColumnsToWidth([], 500)).toEqual([]);
  });

  test("carries everything but the width through untouched", () => {
    const columns: readonly ColumnDefinition<SampleRow>[] = [
      { field: "Id", width: 100, type: "number", headerTemplate: "Identifier" },
      { field: "Name", width: 100, resizable: false },
    ];

    const [id, name] = fitColumnsToWidth(
      resolveColumnWidths(columns, {}, { resizable: true }),
      600,
    );

    expect(id).toMatchObject({
      label: "Identifier",
      alignment: "right",
      resizable: true,
      width: 300,
    });
    expect(name).toMatchObject({
      label: "Name",
      alignment: "left",
      resizable: false,
      width: 300,
    });
  });
});

describe("sizeColumnToContent", () => {
  const constraints = { minWidth: 60, maxWidth: 300 };

  test("adds the padding allowance and rounds up", () => {
    expect(sizeColumnToContent(120.2, constraints)).toBe(123);
  });

  test("stays within the column's bounds", () => {
    expect(sizeColumnToContent(10, constraints)).toBe(60);
    expect(sizeColumnToContent(900, constraints)).toBe(300);
  });
});

describe("revertColumnSize", () => {
  test("restores the column's width from base", () => {
    expect(revertColumnSize({ Id: 200 }, { Id: 100 }, "Id")).toEqual({
      Id: 100,
    });
  });

  test("omits the column rather than pinning it, when base had no width for it", () => {
    expect(revertColumnSize({ Id: 200 }, {}, "Id")).toEqual({});
  });

  test("leaves every other column's width untouched", () => {
    expect(revertColumnSize({ Id: 200, Name: 150 }, { Id: 100 }, "Id")).toEqual(
      { Id: 100, Name: 150 },
    );
  });
});
