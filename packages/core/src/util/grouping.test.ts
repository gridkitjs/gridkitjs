import { describe, expect, test } from "vitest";

import type {
  DisplayRow,
  GroupByState,
  GroupExpansionState,
  ResolvedColumn,
  ResolvedRow,
} from "../types";
import {
  collapseAllGroups,
  expandAllGroups,
  groupRowId,
  groupRows,
  moveGroupByBefore,
  movesGroupBy,
  toggleGroupExpansion,
} from "./grouping";

describe("groupRowId", () => {
  test("does not collide when a value itself contains characters a naive delimiter join might use", () => {
    // A naive "::" (or "/") join of ["a::b"] and ["a", "b"] would both read
    // "a::b"; JSON.stringify keeps every segment quoted and comma-separated,
    // so the two stay distinct.
    expect(groupRowId(["a::b"])).not.toBe(groupRowId(["a", "b"]));
    expect(groupRowId(["a/b"])).not.toBe(groupRowId(["a", "b"]));
  });

  test("is deterministic for the same path", () => {
    expect(groupRowId(["West", "Open"])).toBe(groupRowId(["West", "Open"]));
  });
});

interface SampleRow {
  Id: number;
  Region: string;
  Status: string;
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

const columns: readonly ResolvedColumn<SampleRow, unknown>[] = [
  resolvedColumn("Id"),
  resolvedColumn("Region"),
  resolvedColumn("Status"),
];

function resolvedRow(rowIndex: number, row: SampleRow): ResolvedRow<SampleRow> {
  return { rowId: String(row.Id), row, rowIndex, datasetIndex: rowIndex };
}

const rows: readonly ResolvedRow<SampleRow>[] = [
  resolvedRow(0, { Id: 1, Region: "West", Status: "Open" }),
  resolvedRow(1, { Id: 2, Region: "East", Status: "Open" }),
  resolvedRow(2, { Id: 3, Region: "West", Status: "Closed" }),
  resolvedRow(3, { Id: 4, Region: "East", Status: "Closed" }),
  resolvedRow(4, { Id: 5, Region: "West", Status: "Open" }),
];

function isGroup<Row>(
  entry: DisplayRow<Row>,
): entry is Extract<DisplayRow<Row>, { kind: "group" }> {
  return "kind" in entry;
}

describe("groupRows", () => {
  test("returns rows unchanged for an empty groupBy", () => {
    expect(groupRows(rows, [], [], columns)).toBe(rows);
  });

  test("returns rows unchanged for a groupBy naming only a removed column", () => {
    const groupBy: GroupByState = [{ columnId: "Removed" }];

    expect(groupRows(rows, groupBy, [], columns)).toBe(rows);
  });

  test("groups by a single column, ordering groups and preserving row order within each", () => {
    const groupBy: GroupByState = [{ columnId: "Region" }];
    const result = groupRows(rows, groupBy, [], columns);

    const groups = result.filter(isGroup);
    expect(groups.map((entry) => entry.value)).toEqual(["East", "West"]);
    expect(groups.map((entry) => entry.count)).toEqual([2, 3]);
    expect(groups.every((entry) => entry.level === 0)).toBe(true);
    expect(groups.every((entry) => entry.path.length === 1)).toBe(true);

    const ids = result
      .filter((entry): entry is ResolvedRow<SampleRow> => !isGroup(entry))
      .map((entry) => entry.row.Id);
    // East's rows (2, 4) keep their relative order; then West's (1, 3, 5).
    expect(ids).toEqual([2, 4, 1, 3, 5]);
  });

  test("orders group values by direction", () => {
    const groupBy: GroupByState = [{ columnId: "Region", direction: "desc" }];
    const result = groupRows(rows, groupBy, [], columns);

    expect(result.filter(isGroup).map((entry) => entry.value)).toEqual([
      "West",
      "East",
    ]);
  });

  test("nests a second level inside the first, with path/level/count at each depth", () => {
    const groupBy: GroupByState = [
      { columnId: "Region" },
      { columnId: "Status" },
    ];
    const result = groupRows(rows, groupBy, [], columns);
    const groups = result.filter(isGroup);

    expect(
      groups.map((entry) => ({
        level: entry.level,
        path: entry.path,
        count: entry.count,
      })),
    ).toEqual([
      { level: 0, path: ["East"], count: 2 },
      { level: 1, path: ["East", "Closed"], count: 1 },
      { level: 1, path: ["East", "Open"], count: 1 },
      { level: 0, path: ["West"], count: 3 },
      { level: 1, path: ["West", "Closed"], count: 1 },
      { level: 1, path: ["West", "Open"], count: 2 },
    ]);

    const ids = result
      .filter((entry): entry is ResolvedRow<SampleRow> => !isGroup(entry))
      .map((entry) => entry.row.Id);
    expect(ids).toEqual([4, 2, 3, 1, 5]);
  });

  test("a collapsed group's descendants are absent, but its header still reports the full count", () => {
    const groupBy: GroupByState = [
      { columnId: "Region" },
      { columnId: "Status" },
    ];
    const expansion: GroupExpansionState = [groupRowId(["East"])];
    const result = groupRows(rows, groupBy, expansion, columns);

    const eastHeader = result.find(
      (entry) => isGroup(entry) && entry.groupId === groupRowId(["East"]),
    );
    expect(eastHeader).toMatchObject({ expanded: false, count: 2 });

    // Nothing with "East" in its path survives: neither its nested Status
    // headers nor its leaf rows.
    expect(
      result.some(
        (entry) =>
          isGroup(entry) && entry.path[0] === "East" && entry.level > 0,
      ),
    ).toBe(false);
    const ids = result
      .filter((entry): entry is ResolvedRow<SampleRow> => !isGroup(entry))
      .map((entry) => entry.row.Id);
    // West still nests by Status (Closed before Open): 3, then 1 and 5.
    expect(ids).toEqual([3, 1, 5]);
  });

  test("rowIndex is contiguous across the flattened output, header rows included", () => {
    const groupBy: GroupByState = [
      { columnId: "Region" },
      { columnId: "Status" },
    ];
    const result = groupRows(rows, groupBy, [], columns);

    expect(result.map((entry) => entry.rowIndex)).toEqual(
      result.map((_entry, index) => index),
    );
  });
});

describe("toggleGroupExpansion", () => {
  test("collapses an expanded group by adding its id", () => {
    expect(toggleGroupExpansion([], "g1")).toEqual(["g1"]);
  });

  test("expands a collapsed group by removing its id", () => {
    expect(toggleGroupExpansion(["g1", "g2"], "g1")).toEqual(["g2"]);
  });
});

describe("expandAllGroups", () => {
  test("reduces expansion to empty", () => {
    expect(expandAllGroups(["g1", "g2"])).toEqual([]);
  });

  test("returns the same reference when already empty", () => {
    const expansion: GroupExpansionState = [];
    expect(expandAllGroups(expansion)).toBe(expansion);
  });
});

describe("collapseAllGroups", () => {
  test("collects every group id present in the given display rows", () => {
    const groupBy: GroupByState = [
      { columnId: "Region" },
      { columnId: "Status" },
    ];
    const displayRows = groupRows(rows, groupBy, [], columns);

    expect(new Set(collapseAllGroups(displayRows))).toEqual(
      new Set([
        groupRowId(["East"]),
        groupRowId(["East", "Closed"]),
        groupRowId(["East", "Open"]),
        groupRowId(["West"]),
        groupRowId(["West", "Closed"]),
        groupRowId(["West", "Open"]),
      ]),
    );
  });
});

describe("moveGroupByBefore", () => {
  const groupBy: GroupByState = [
    { columnId: "Region" },
    { columnId: "Status", direction: "desc" },
  ];

  test("repositions an existing entry leftwards", () => {
    expect(moveGroupByBefore(groupBy, "Status", "Region")).toEqual([
      { columnId: "Status", direction: "desc" },
      { columnId: "Region" },
    ]);
  });

  test("repositions an existing entry rightwards, via a null target", () => {
    expect(moveGroupByBefore(groupBy, "Region", null)).toEqual([
      { columnId: "Status", direction: "desc" },
      { columnId: "Region" },
    ]);
  });

  test("keeps an existing entry's own object when repositioning it, preserving its direction", () => {
    const next = moveGroupByBefore(groupBy, "Status", "Region");

    expect(next[0]).toBe(groupBy[1]);
  });

  test("inserts a column not yet in the stack, at the front, in the middle, or appended", () => {
    expect(moveGroupByBefore(groupBy, "Amount", "Region")).toEqual([
      { columnId: "Amount" },
      { columnId: "Region" },
      { columnId: "Status", direction: "desc" },
    ]);
    expect(moveGroupByBefore(groupBy, "Amount", "Status")).toEqual([
      { columnId: "Region" },
      { columnId: "Amount" },
      { columnId: "Status", direction: "desc" },
    ]);
    expect(moveGroupByBefore(groupBy, "Amount", null)).toEqual([
      { columnId: "Region" },
      { columnId: "Status", direction: "desc" },
      { columnId: "Amount" },
    ]);
  });

  test("returns the same stack when dropped on itself", () => {
    expect(moveGroupByBefore(groupBy, "Region", "Region")).toBe(groupBy);
  });

  test("returns the same stack when dropped in the gap it already occupies", () => {
    expect(moveGroupByBefore(groupBy, "Region", "Status")).toBe(groupBy);
    expect(moveGroupByBefore(groupBy, "Status", null)).toBe(groupBy);
  });

  test("returns the same stack for a beforeColumnId naming no entry", () => {
    expect(moveGroupByBefore(groupBy, "Region", "Missing")).toBe(groupBy);
  });
});

describe("movesGroupBy", () => {
  const groupBy: GroupByState = [
    { columnId: "Region" },
    { columnId: "Status", direction: "desc" },
  ];

  test("is false for a drop on the entry itself", () => {
    expect(movesGroupBy(groupBy, "Region", "Region")).toBe(false);
  });

  test("is false for either gap the entry already sits in", () => {
    expect(movesGroupBy(groupBy, "Region", "Status")).toBe(false);
    expect(movesGroupBy(groupBy, "Status", null)).toBe(false);
  });

  test("is true for a gap the entry does not sit in", () => {
    expect(movesGroupBy(groupBy, "Status", "Region")).toBe(true);
    expect(movesGroupBy(groupBy, "Region", null)).toBe(true);
  });

  test("is true for inserting a column not yet grouped, at every position", () => {
    expect(movesGroupBy(groupBy, "Amount", "Region")).toBe(true);
    expect(movesGroupBy(groupBy, "Amount", "Status")).toBe(true);
    expect(movesGroupBy(groupBy, "Amount", null)).toBe(true);
  });

  test("agrees with moveGroupByBefore on every gap, for both an existing and a not-yet-grouped columnId", () => {
    for (const columnId of ["Region", "Status", "Amount"]) {
      for (const beforeColumnId of ["Region", "Status", null]) {
        expect(movesGroupBy(groupBy, columnId, beforeColumnId)).toBe(
          moveGroupByBefore(groupBy, columnId, beforeColumnId) !== groupBy,
        );
      }
    }
  });
});
