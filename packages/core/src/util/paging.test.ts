import { describe, expect, test } from "vitest";

import type {
  AggregateState,
  DisplayRow,
  GroupByState,
  ResolvedColumn,
  ResolvedRow,
} from "../types";
import { withGroupAggregates } from "./aggregation";
import { ALL_EXPANDED, groupRowId, groupRows } from "./grouping";
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
  return "kind" in entry && entry.kind === "group";
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
      const displayRows = groupRows(rows, groupBy, ALL_EXPANDED, columns);

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
      const displayRows = groupRows(rows, groupBy, ALL_EXPANDED, columns);

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

  describe('group-summary rows (groupAggregateDisplay: "row")', () => {
    const columns = [resolvedColumn("Region")];

    const rows: readonly ResolvedRow<SampleRow>[] = [
      resolvedRow(0, { Id: 1, Region: "East" }),
      resolvedRow(1, { Id: 2, Region: "East" }),
      resolvedRow(2, { Id: 3, Region: "West" }),
      resolvedRow(3, { Id: 4, Region: "West" }),
      resolvedRow(4, { Id: 5, Region: "West" }),
    ];

    test("a top-level group's own summary row stays inside that group's unit, not treated as a new top-level boundary", () => {
      const groupBy: GroupByState = [{ columnId: "Region" }];
      const specs: AggregateState<SampleRow> = [
        { columnId: "Id", fn: "count" },
      ];
      const displayRows = groupRows(rows, groupBy, ALL_EXPANDED, columns);
      const aggregatedRows = withGroupAggregates(
        displayRows,
        rows,
        groupBy,
        specs,
        columns,
        "row",
      );

      // East: header + 2 rows + its own summary row = 4 entries, all one
      // unit. Without the paging fix, the summary row (level 0, like a
      // top-level header) would incorrectly start a second unit of its own.
      const page0 = paginateRows(aggregatedRows, { pageIndex: 0, pageSize: 1 });
      expect(page0.pageCount).toBe(2);
      expect(page0.rows).toHaveLength(4);
      expect(
        page0.rows.filter(
          (entry) => "kind" in entry && entry.kind === "group-summary",
        ),
      ).toHaveLength(1);

      const page1 = paginateRows(aggregatedRows, { pageIndex: 1, pageSize: 1 });
      expect(page1.rows).toHaveLength(5); // West: header + 3 rows + summary
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

describe('paginateRows with unit "row"', () => {
  interface OrderRow {
    Id: number;
    Region: string;
    Status: string;
  }

  function orderColumn(field: string): ResolvedColumn<OrderRow, unknown> {
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

  const columns = [orderColumn("Region"), orderColumn("Status")];

  // East: Closed (3), Open (1, 2). West: Open (4, 5, 6).
  const rows: readonly ResolvedRow<OrderRow>[] = [
    { Id: 1, Region: "East", Status: "Open" },
    { Id: 2, Region: "East", Status: "Open" },
    { Id: 3, Region: "East", Status: "Closed" },
    { Id: 4, Region: "West", Status: "Open" },
    { Id: 5, Region: "West", Status: "Open" },
    { Id: 6, Region: "West", Status: "Open" },
  ].map((row, index) => ({
    rowId: String(row.Id),
    row,
    rowIndex: index,
    datasetIndex: index,
  }));

  const byRegion: GroupByState = [{ columnId: "Region" }];
  const byRegionAndStatus: GroupByState = [
    { columnId: "Region" },
    { columnId: "Status" },
  ];

  /** Each row as a label: its id, its group's path, or `total` for a summary row. */
  function labels(page: readonly DisplayRow<OrderRow>[]): readonly string[] {
    return page.map((entry) => {
      if (!("kind" in entry)) {
        return String(entry.row.Id);
      }
      return entry.kind === "group" ? entry.path.join("/") : "total";
    });
  }

  function page(
    displayRows: readonly DisplayRow<OrderRow>[],
    pageIndex: number,
    pageSize: number,
  ) {
    return paginateRows(displayRows, { pageIndex, pageSize }, { unit: "row" });
  }

  test("counts data rows, repeating the header of a group continued from the page before", () => {
    const displayRows = groupRows(rows, byRegion, ALL_EXPANDED, columns);

    expect(page(displayRows, 0, 4).pageCount).toBe(2);
    expect(labels(page(displayRows, 0, 4).rows)).toEqual([
      "East",
      "1",
      "2",
      "3",
      "West",
      "4",
    ]);
    expect(labels(page(displayRows, 1, 4).rows)).toEqual(["West", "5", "6"]);
  });

  test("a repeated header is the same group row, renumbered to the top of its page", () => {
    const displayRows = groupRows(rows, byRegion, ALL_EXPANDED, columns);
    const [first] = page(displayRows, 1, 4).rows;
    const original = displayRows.find(
      (entry) => isGroup(entry) && entry.value === "West",
    );

    expect(first).toEqual({ ...original, rowIndex: 0 });
    expect(
      page(displayRows, 1, 4).rows.map((entry) => entry.datasetIndex),
    ).toEqual([4, 6, 7]);
  });

  test("repeats every enclosing header of nested groups, outermost first", () => {
    const displayRows = groupRows(
      rows,
      byRegionAndStatus,
      ALL_EXPANDED,
      columns,
    );

    expect(page(displayRows, 0, 2).pageCount).toBe(3);
    expect(labels(page(displayRows, 0, 2).rows)).toEqual([
      "East",
      "East/Closed",
      "3",
      "East/Open",
      "1",
    ]);
    expect(labels(page(displayRows, 1, 2).rows)).toEqual([
      "East",
      "East/Open",
      "2",
      "West",
      "West/Open",
      "4",
    ]);
    expect(labels(page(displayRows, 2, 2).rows)).toEqual([
      "West",
      "West/Open",
      "5",
      "6",
    ]);
  });

  test("a collapsed group takes one place on a page, under its own enclosing headers", () => {
    const displayRows = groupRows(
      rows,
      byRegionAndStatus,
      {
        mode: "allExpanded",
        except: [groupRowId(["East", "Closed"]), groupRowId(["West"])],
      },
      columns,
    );

    expect(page(displayRows, 0, 2).pageCount).toBe(2);
    expect(labels(page(displayRows, 0, 2).rows)).toEqual([
      "East",
      "East/Closed",
      "East/Open",
      "1",
    ]);
    expect(labels(page(displayRows, 1, 2).rows)).toEqual([
      "East",
      "East/Open",
      "2",
      "West",
    ]);
  });

  test("puts a group's summary row on the page holding its last row", () => {
    const specs: AggregateState<OrderRow> = [{ columnId: "Id", fn: "count" }];
    const displayRows = withGroupAggregates(
      groupRows(rows, byRegionAndStatus, ALL_EXPANDED, columns),
      rows,
      byRegionAndStatus,
      specs,
      columns,
      "row",
    );

    expect(labels(page(displayRows, 0, 3).rows)).toEqual([
      "East",
      "East/Closed",
      "3",
      "total",
      "East/Open",
      "1",
      "2",
      "total",
      "total",
    ]);
    expect(labels(page(displayRows, 1, 3).rows)).toEqual([
      "West",
      "West/Open",
      "4",
      "5",
      "6",
      "total",
      "total",
    ]);
    // East/Open and East continue onto the next page, so their totals wait.
    expect(labels(page(displayRows, 0, 2).rows)).toEqual([
      "East",
      "East/Closed",
      "3",
      "total",
      "East/Open",
      "1",
    ]);
  });

  test("clamps a stale pageIndex to the last page, headers included", () => {
    const displayRows = groupRows(rows, byRegion, ALL_EXPANDED, columns);
    const result = page(displayRows, 99, 4);

    expect(result.pageIndex).toBe(1);
    expect(labels(result.rows)).toEqual(["West", "5", "6"]);
  });

  test("pages an ungrouped grid exactly as the group unit does", () => {
    for (const pageIndex of [0, 1, 2, 9]) {
      expect(page(rows, pageIndex, 4)).toEqual(
        paginateRows(rows, { pageIndex, pageSize: 4 }),
      );
    }
  });
});
