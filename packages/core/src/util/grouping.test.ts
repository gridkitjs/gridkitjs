import { describe, expect, test } from "vitest";

import type {
  DisplayRow,
  GroupByState,
  GroupExpansionState,
  ResolvedColumn,
  ResolvedRow,
} from "../types";
import {
  ALL_COLLAPSED,
  ALL_EXPANDED,
  collapseAllGroups,
  expandAllGroups,
  groupRowId,
  groupRows,
  isGroupExpanded,
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
  return {
    kind: "data",
    rowId: String(row.Id),
    row,
    rowIndex,
    datasetIndex: rowIndex,
  };
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
  return entry.kind === "group";
}

describe("groupRows", () => {
  test("returns rows unchanged for an empty groupBy", () => {
    expect(groupRows(rows, [], ALL_EXPANDED, columns)).toBe(rows);
  });

  test("returns rows unchanged for a groupBy naming only a removed column", () => {
    const groupBy: GroupByState = [{ columnId: "Removed" }];

    expect(groupRows(rows, groupBy, ALL_EXPANDED, columns)).toBe(rows);
  });

  test("groups by a single column, ordering groups and preserving row order within each", () => {
    const groupBy: GroupByState = [{ columnId: "Region" }];
    const result = groupRows(rows, groupBy, ALL_EXPANDED, columns);

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
    const result = groupRows(rows, groupBy, ALL_EXPANDED, columns);

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
    const result = groupRows(rows, groupBy, ALL_EXPANDED, columns);
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
    const expansion: GroupExpansionState = {
      mode: "allExpanded",
      except: [groupRowId(["East"])],
    };
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

  test("rowIndex and datasetIndex are contiguous across the flattened output, header rows included", () => {
    const groupBy: GroupByState = [
      { columnId: "Region" },
      { columnId: "Status" },
    ];
    const result = groupRows(rows, groupBy, ALL_EXPANDED, columns);

    expect(result.map((entry) => entry.rowIndex)).toEqual(
      result.map((_entry, index) => index),
    );
    expect(result.map((entry) => entry.datasetIndex)).toEqual(
      result.map((_entry, index) => index),
    );
  });
});

describe("isGroupExpanded", () => {
  test("under allExpanded, every group but the exceptions is expanded", () => {
    const expansion: GroupExpansionState = {
      mode: "allExpanded",
      except: ["g1"],
    };

    expect(isGroupExpanded(expansion, "g1")).toBe(false);
    expect(isGroupExpanded(expansion, "g2")).toBe(true);
  });

  test("under allCollapsed, only the exceptions are expanded", () => {
    const expansion: GroupExpansionState = {
      mode: "allCollapsed",
      except: ["g1"],
    };

    expect(isGroupExpanded(expansion, "g1")).toBe(true);
    expect(isGroupExpanded(expansion, "g2")).toBe(false);
  });
});

describe("toggleGroupExpansion", () => {
  test.each(["allExpanded", "allCollapsed"] as const)(
    "under %s, adds a group to the exceptions, then takes it out",
    (mode) => {
      const toggled = toggleGroupExpansion({ mode, except: ["g2"] }, "g1");

      expect(toggled).toEqual({ mode, except: ["g2", "g1"] });
      expect(toggleGroupExpansion(toggled, "g1")).toEqual({
        mode,
        except: ["g2"],
      });
    },
  );

  test.each(["allExpanded", "allCollapsed"] as const)(
    "under %s, flips whether the group shows expanded",
    (mode) => {
      const before: GroupExpansionState = { mode, except: [] };
      const after = toggleGroupExpansion(before, "g1");

      expect(isGroupExpanded(after, "g1")).toBe(!isGroupExpanded(before, "g1"));
    },
  );
});

describe("expandAllGroups", () => {
  test("expands every group, dropping the exceptions", () => {
    expect(
      expandAllGroups({ mode: "allCollapsed", except: ["g1", "g2"] }),
    ).toBe(ALL_EXPANDED);
    expect(expandAllGroups({ mode: "allExpanded", except: ["g1"] })).toBe(
      ALL_EXPANDED,
    );
  });

  test("returns the same reference when every group is already expanded", () => {
    const expansion: GroupExpansionState = { mode: "allExpanded", except: [] };

    expect(expandAllGroups(expansion)).toBe(expansion);
  });
});

describe("collapseAllGroups", () => {
  const groupBy: GroupByState = [
    { columnId: "Region" },
    { columnId: "Status" },
  ];

  function headers(
    displayRows: readonly DisplayRow<SampleRow>[],
  ): readonly string[] {
    return displayRows
      .filter(isGroup)
      .map((entry) => `${entry.groupId}:${String(entry.expanded)}`);
  }

  test("collapses every group, dropping the exceptions", () => {
    expect(
      collapseAllGroups({ mode: "allExpanded", except: ["g1", "g2"] }),
    ).toBe(ALL_COLLAPSED);
  });

  test("returns the same reference when every group is already collapsed", () => {
    const expansion: GroupExpansionState = {
      mode: "allCollapsed",
      except: [],
    };

    expect(collapseAllGroups(expansion)).toBe(expansion);
  });

  test("collapses a nested group hidden under a collapsed parent", () => {
    const parentCollapsed: GroupExpansionState = {
      mode: "allExpanded",
      except: [groupRowId(["East"])],
    };

    const collapsed = collapseAllGroups(parentCollapsed);
    const reopened = toggleGroupExpansion(collapsed, groupRowId(["East"]));

    expect(headers(groupRows(rows, groupBy, reopened, columns))).toEqual([
      `${groupRowId(["East"])}:true`,
      `${groupRowId(["East", "Closed"])}:false`,
      `${groupRowId(["East", "Open"])}:false`,
      `${groupRowId(["West"])}:false`,
    ]);
  });

  test("collapses a group that appears after the call", () => {
    const byRegion: GroupByState = [{ columnId: "Region" }];
    const collapsed = collapseAllGroups(ALL_EXPANDED);
    const north = resolvedRow(5, { Id: 6, Region: "North", Status: "Open" });

    expect(
      headers(groupRows([...rows, north], byRegion, collapsed, columns)),
    ).toEqual([
      `${groupRowId(["East"])}:false`,
      `${groupRowId(["North"])}:false`,
      `${groupRowId(["West"])}:false`,
    ]);
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
