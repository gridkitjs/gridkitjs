import { describe, expect, test } from "vitest";

import type {
  DisplayRow,
  GroupByState,
  ResolvedColumn,
  ResolvedRow,
} from "../types";
import { groupRows } from "./grouping";
import { paginateRows } from "./paging";

interface SampleRow {
  Id: number;
  Region: string;
}

function resolvedRow(rowIndex: number, row: SampleRow): ResolvedRow<SampleRow> {
  return { rowId: String(row.Id), row, rowIndex, datasetIndex: rowIndex };
}

function isGroup<Row>(
  entry: DisplayRow<Row>,
): entry is Extract<DisplayRow<Row>, { kind: "group" }> {
  return "kind" in entry;
}

function isDataRow<Row>(entry: DisplayRow<Row>): entry is ResolvedRow<Row> {
  return !isGroup(entry);
}

function ids(rows: readonly DisplayRow<SampleRow>[]): readonly number[] {
  return rows.filter(isDataRow).map((entry) => entry.row.Id);
}

function resolvedColumn(field: string): ResolvedColumn<SampleRow, unknown> {
  return {
    column: { field },
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

describe("paginateRows", () => {
  describe("plain (ungrouped) pagination", () => {
    const rows: readonly ResolvedRow<SampleRow>[] = Array.from(
      { length: 7 },
      (_unused, index) => resolvedRow(index, { Id: index + 1, Region: "West" }),
    );

    test("slices the first page's contents and reports the page count", () => {
      const result = paginateRows(rows, { pageIndex: 0, pageSize: 3 });

      expect(result.pageCount).toBe(3); // 7 rows / 3 per page, rounded up
      expect(result.pageIndex).toBe(0);
      expect(ids(result.rows)).toEqual([1, 2, 3]);
    });

    test("slices a middle page's contents", () => {
      const result = paginateRows(rows, { pageIndex: 1, pageSize: 3 });
      expect(ids(result.rows)).toEqual([4, 5, 6]);
    });

    test("the last page holds only the remaining, partial count of rows", () => {
      const result = paginateRows(rows, { pageIndex: 2, pageSize: 3 });
      expect(ids(result.rows)).toEqual([7]);
    });

    test("a pageSize evenly dividing the row count leaves no partial page", () => {
      const result = paginateRows(rows, { pageIndex: 0, pageSize: 7 });
      expect(result.pageCount).toBe(1);
      expect(result.rows).toHaveLength(7);
    });
  });

  describe("grouped input", () => {
    const columns = [resolvedColumn("Region")];

    const rows: readonly ResolvedRow<SampleRow>[] = [
      resolvedRow(0, { Id: 1, Region: "East" }),
      resolvedRow(1, { Id: 2, Region: "East" }),
      resolvedRow(2, { Id: 3, Region: "West" }),
      resolvedRow(3, { Id: 4, Region: "West" }),
      resolvedRow(4, { Id: 5, Region: "West" }),
    ];

    test("never splits a group across a page boundary", () => {
      const groupBy: GroupByState = [{ columnId: "Region" }];
      const displayRows = groupRows(rows, groupBy, [], columns);

      // One unit per top-level group (East, West). pageSize 1 puts East's
      // header+2 rows entirely on page 0 and West's header+3 rows entirely
      // on page 1, even though the two spans differ in length.
      const page0 = paginateRows(displayRows, { pageIndex: 0, pageSize: 1 });
      expect(page0.pageCount).toBe(2);
      expect(page0.rows.filter(isGroup).map((entry) => entry.value)).toEqual([
        "East",
      ]);
      expect(ids(page0.rows)).toEqual([1, 2]);

      const page1 = paginateRows(displayRows, { pageIndex: 1, pageSize: 1 });
      expect(page1.rows.filter(isGroup).map((entry) => entry.value)).toEqual([
        "West",
      ]);
      expect(ids(page1.rows)).toEqual([3, 4, 5]);
    });
  });

  describe("nested groups", () => {
    interface NestedRow {
      Id: number;
      Region: string;
      Status: string;
    }

    function nestedColumn(field: string): ResolvedColumn<NestedRow, unknown> {
      return {
        column: { field },
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

    const columns = [nestedColumn("Region"), nestedColumn("Status")];

    function nestedRow(
      rowIndex: number,
      row: NestedRow,
    ): ResolvedRow<NestedRow> {
      return { rowId: String(row.Id), row, rowIndex, datasetIndex: rowIndex };
    }

    test("a top-level group counts as one unit regardless of how many nested sub-groups or rows it contains", () => {
      // East nests two Status sub-groups (4 entries total incl. East's own
      // header); West nests only one (2 entries incl. West's own header).
      const rows: readonly ResolvedRow<NestedRow>[] = [
        nestedRow(0, { Id: 1, Region: "East", Status: "Open" }),
        nestedRow(1, { Id: 2, Region: "East", Status: "Closed" }),
        nestedRow(2, { Id: 3, Region: "West", Status: "Open" }),
      ];
      const groupBy: GroupByState = [
        { columnId: "Region" },
        { columnId: "Status" },
      ];
      const displayRows = groupRows(rows, groupBy, [], columns);

      // East: header + 2 nested Status headers + 2 rows = 5 entries.
      const page0 = paginateRows(displayRows, { pageIndex: 0, pageSize: 1 });
      expect(page0.pageCount).toBe(2);
      expect(page0.rows).toHaveLength(5);

      // West: header + 1 nested Status header + 1 row = 3 entries — a
      // different span length, still exactly one unit either way.
      const page1 = paginateRows(displayRows, { pageIndex: 1, pageSize: 1 });
      expect(page1.rows).toHaveLength(3);
    });
  });

  describe("pageIndex clamping", () => {
    const rows: readonly ResolvedRow<SampleRow>[] = Array.from(
      { length: 5 },
      (_unused, index) => resolvedRow(index, { Id: index + 1, Region: "West" }),
    );

    test("clamps a pageIndex beyond the last page down to the last page", () => {
      const result = paginateRows(rows, { pageIndex: 99, pageSize: 2 });
      expect(result.pageIndex).toBe(2); // pageCount 3, last index 2
      expect(ids(result.rows)).toEqual([5]);
    });

    test("clamps a negative pageIndex up to 0", () => {
      const result = paginateRows(rows, { pageIndex: -5, pageSize: 2 });
      expect(result.pageIndex).toBe(0);
    });

    test("a pageSize <= 0 is clamped to 1 rather than throwing", () => {
      const result = paginateRows(rows, { pageIndex: 0, pageSize: 0 });
      expect(result.pageCount).toBe(5);
      expect(result.rows).toHaveLength(1);
    });
  });

  describe("rowIndex/datasetIndex", () => {
    const rows: readonly ResolvedRow<SampleRow>[] = Array.from(
      { length: 5 },
      (_unused, index) => resolvedRow(index, { Id: index + 1, Region: "West" }),
    );

    test("rowIndex is page-relative, starting at 0 on every page", () => {
      const page1 = paginateRows(rows, { pageIndex: 1, pageSize: 2 });
      expect(page1.rows.map((entry) => entry.rowIndex)).toEqual([0, 1]);
    });

    test("datasetIndex is dataset-relative and does not reset per page", () => {
      const page1 = paginateRows(rows, { pageIndex: 1, pageSize: 2 });
      expect(
        page1.rows.filter(isDataRow).map((entry) => entry.datasetIndex),
      ).toEqual([2, 3]);
    });
  });

  describe("empty input", () => {
    test("returns pageCount 0 and an empty rows array", () => {
      const result = paginateRows([], { pageIndex: 0, pageSize: 10 });
      expect(result).toEqual({ rows: [], pageCount: 0, pageIndex: 0 });
    });
  });
});
