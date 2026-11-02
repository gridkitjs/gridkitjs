import { describe, expect, test } from "vitest";

import type { ColumnDefinition, DataColumn } from "../types";
import { resolveDataColumns } from "./ordering";
import {
  applyColumnVisibility,
  isColumnVisible,
  setColumnVisibility,
} from "./visibility";

interface SampleRow {
  Id: number;
  Name: string;
  Notes: string;
}

const definitions: readonly ColumnDefinition<SampleRow>[] = [
  { field: "Id" },
  { field: "Name" },
  { field: "Notes", hidden: true },
];

const columns: readonly DataColumn<SampleRow>[] = resolveDataColumns(
  definitions,
  [],
);

function idsOf(entries: readonly DataColumn<SampleRow>[]): readonly string[] {
  return entries.map((entry) => entry.id);
}

describe("isColumnVisible", () => {
  test("shows a column by default", () => {
    expect(isColumnVisible({ field: "Id" }, {})).toBe(true);
  });

  test("hides a column hidden by its definition", () => {
    expect(isColumnVisible({ field: "Notes", hidden: true }, {})).toBe(false);
  });

  test("lets state show a column its definition hides", () => {
    expect(
      isColumnVisible({ field: "Notes", hidden: true }, { Notes: true }),
    ).toBe(true);
  });

  test("lets state hide a column its definition shows", () => {
    expect(isColumnVisible({ field: "Id" }, { Id: false })).toBe(false);
  });

  test("keys state by the column id, not its field", () => {
    expect(isColumnVisible({ field: "Id", id: "Id.copy" }, { Id: false })).toBe(
      true,
    );
    expect(
      isColumnVisible({ field: "Id", id: "Id.copy" }, { "Id.copy": false }),
    ).toBe(false);
  });
});

describe("applyColumnVisibility", () => {
  test("drops hidden columns and keeps the rest in order", () => {
    expect(idsOf(applyColumnVisibility(columns, {}))).toEqual(["Id", "Name"]);
    expect(
      idsOf(applyColumnVisibility(columns, { Name: false, Notes: true })),
    ).toEqual(["Id", "Notes"]);
  });

  test("hands back the same array when every column is shown", () => {
    expect(applyColumnVisibility(columns, { Notes: true })).toBe(columns);
  });
});

describe("setColumnVisibility", () => {
  test("records a column hidden by the user", () => {
    expect(setColumnVisibility(columns, {}, ["Name"], false)).toEqual({
      Name: false,
    });
  });

  test("records a column shown over its definition", () => {
    expect(setColumnVisibility(columns, {}, ["Notes"], true)).toEqual({
      Notes: true,
    });
  });

  test("changes several columns at once, keeping existing entries", () => {
    expect(
      setColumnVisibility(columns, { Notes: true }, ["Id", "Name"], false),
    ).toEqual({ Notes: true, Id: false, Name: false });
  });

  test("hands back the same state when nothing changes", () => {
    const visibility = { Name: false };

    expect(setColumnVisibility(columns, visibility, ["Name"], false)).toBe(
      visibility,
    );
    expect(setColumnVisibility(columns, visibility, ["Id"], true)).toBe(
      visibility,
    );
    expect(setColumnVisibility(columns, visibility, ["Missing"], false)).toBe(
      visibility,
    );
  });
});
