import { describe, expect, test } from "vitest";

import type {
  ColumnDefinition,
  ColumnPin,
  DataColumn,
  ResolvedColumn,
} from "../types";
import { resolveDataColumns } from "./ordering";
import {
  applyColumnPinning,
  partitionPinnedColumns,
  pinnedWidths,
  placePinnedColumns,
  resolveColumnPin,
  setColumnPin,
} from "./pinning";
import { resolveColumnWidths } from "./sizing";

interface SampleRow {
  Id: number;
  Name: string;
  Region: string;
  Notes: string;
}

const definitions: readonly ColumnDefinition<SampleRow>[] = [
  { field: "Id" },
  { field: "Name", pinned: "end" },
  { field: "Region" },
  { field: "Notes", pinned: "start" },
];

const columns: readonly DataColumn<SampleRow>[] = resolveDataColumns(
  definitions,
  [],
);

function idsOf(entries: readonly { id: string }[]): readonly string[] {
  return entries.map((entry) => entry.id);
}

/** Columns of the given widths and pins, in that order. */
function sized(
  spec: readonly (readonly [string, number, ColumnPin])[],
): readonly ResolvedColumn<SampleRow>[] {
  return spec.map(([id, width, pinned]) => ({
    column: { field: id },
    id,
    width,
    sized: false,
    label: id,
    resizable: false,
    reorderable: false,
    groupByDraggable: false,
    alignment: "left",
    pinned,
    pinOffset: 0,
    pinEdge: false,
  }));
}

describe("resolveColumnPin", () => {
  test("leaves a column unpinned by default", () => {
    expect(resolveColumnPin({ field: "Id" }, {})).toBe("none");
  });

  test("pins a column its definition pins", () => {
    expect(resolveColumnPin({ field: "Notes", pinned: "start" }, {})).toBe(
      "start",
    );
  });

  test("lets state unpin a column its definition pins", () => {
    expect(
      resolveColumnPin({ field: "Notes", pinned: "start" }, { Notes: "none" }),
    ).toBe("none");
  });

  test("lets state move a column to the other edge", () => {
    expect(
      resolveColumnPin({ field: "Notes", pinned: "start" }, { Notes: "end" }),
    ).toBe("end");
  });

  test("keys state by the column id, not its field", () => {
    expect(
      resolveColumnPin({ field: "Id", id: "Id.copy" }, { Id: "start" }),
    ).toBe("none");
    expect(
      resolveColumnPin({ field: "Id", id: "Id.copy" }, { "Id.copy": "start" }),
    ).toBe("start");
  });
});

describe("partitionPinnedColumns", () => {
  test("splits by pin, keeping the given order inside each part", () => {
    const parts = partitionPinnedColumns(columns, { Id: "start" });

    expect(idsOf(parts.start)).toEqual(["Id", "Notes"]);
    expect(idsOf(parts.unpinned)).toEqual(["Region"]);
    expect(idsOf(parts.end)).toEqual(["Name"]);
  });

  test("puts a column pinned in its definition and unpinned in state with the rest", () => {
    const parts = partitionPinnedColumns(columns, { Notes: "none" });

    expect(idsOf(parts.start)).toEqual([]);
    expect(idsOf(parts.unpinned)).toEqual(["Id", "Region", "Notes"]);
  });
});

describe("applyColumnPinning", () => {
  test("lists start-pinned columns first and end-pinned ones last", () => {
    expect(idsOf(applyColumnPinning(columns, {}))).toEqual([
      "Notes",
      "Id",
      "Region",
      "Name",
    ]);
  });

  test("hands back the same array when the columns are already in pinned order", () => {
    const unpinned = resolveDataColumns<SampleRow, string>(
      [{ field: "Id" }, { field: "Region" }],
      [],
    );

    expect(applyColumnPinning(unpinned, {})).toBe(unpinned);
    expect(applyColumnPinning(unpinned, { Id: "start" })).toBe(unpinned);
  });
});

describe("setColumnPin", () => {
  test("records a column pinned by the user", () => {
    expect(setColumnPin(columns, {}, "Id", "end")).toEqual({ Id: "end" });
  });

  test("records a column unpinned over its definition", () => {
    expect(setColumnPin(columns, {}, "Notes", "none")).toEqual({
      Notes: "none",
    });
  });

  test("keeps the other entries", () => {
    expect(setColumnPin(columns, { Notes: "none" }, "Id", "start")).toEqual({
      Notes: "none",
      Id: "start",
    });
  });

  test("hands back the same state when nothing changes", () => {
    const pinning = { Id: "start" } as const;

    expect(setColumnPin(columns, pinning, "Id", "start")).toBe(pinning);
    expect(setColumnPin(columns, pinning, "Notes", "start")).toBe(pinning);
    expect(setColumnPin(columns, pinning, "Region", "none")).toBe(pinning);
    expect(setColumnPin(columns, pinning, "Missing", "end")).toBe(pinning);
  });
});

describe("placePinnedColumns", () => {
  test("measures each pinned column from its own edge", () => {
    const placed = placePinnedColumns(
      sized([
        ["a", 50, "start"],
        ["b", 70, "start"],
        ["c", 100, "none"],
        ["d", 80, "end"],
        ["e", 60, "end"],
      ]),
    );

    expect(placed.map((entry) => entry.pinOffset)).toEqual([0, 50, 0, 60, 0]);
  });

  test("marks the start column nearest the scrolling ones, and the end one", () => {
    const placed = placePinnedColumns(
      sized([
        ["a", 50, "start"],
        ["b", 70, "start"],
        ["c", 100, "none"],
        ["d", 80, "end"],
        ["e", 60, "end"],
      ]),
    );

    expect(placed.map((entry) => entry.pinEdge)).toEqual([
      false,
      true,
      false,
      true,
      false,
    ]);
  });

  test("leaves every column unplaced when none is pinned", () => {
    const placed = placePinnedColumns(
      sized([
        ["a", 50, "none"],
        ["b", 70, "none"],
      ]),
    );

    expect(placed.map((entry) => [entry.pinOffset, entry.pinEdge])).toEqual([
      [0, false],
      [0, false],
    ]);
  });
});

describe("pinnedWidths", () => {
  test("sums the widths pinned to each edge", () => {
    expect(
      pinnedWidths(
        sized([
          ["a", 50, "start"],
          ["b", 70, "start"],
          ["c", 100, "none"],
          ["d", 80, "end"],
        ]),
      ),
    ).toEqual({ start: 120, end: 80 });
  });

  test("is zero on both sides with nothing pinned", () => {
    expect(pinnedWidths(sized([["a", 50, "none"]]))).toEqual({
      start: 0,
      end: 0,
    });
  });
});

describe("resolveColumnWidths", () => {
  test("resolves each column's pin from the state over its definition", () => {
    const resolved = resolveColumnWidths(
      definitions,
      {},
      {
        pinning: { Id: "start", Name: "none" },
      },
    );

    expect(resolved.map((entry) => entry.pinned)).toEqual([
      "start",
      "none",
      "none",
      "start",
    ]);
  });
});
