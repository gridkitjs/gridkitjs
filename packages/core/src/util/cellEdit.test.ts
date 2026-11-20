import { describe, expect, test } from "vitest";

import type { ColumnDefinition, GridViewInput } from "../types";
import { isCellEditable, isColumnEditable } from "./cellEdit";
import { resolveGridView } from "./view";

interface SampleRow {
  Id: number;
  Region: string;
  Amount: number;
  Locked: boolean;
}

const west: SampleRow = { Id: 1, Region: "West", Amount: 10, Locked: false };
const locked: SampleRow = { Id: 2, Region: "East", Amount: 20, Locked: true };

const rows: readonly SampleRow[] = [
  west,
  locked,
  { Id: 3, Region: "West", Amount: 30, Locked: false },
];

const idColumn: ColumnDefinition<SampleRow> = { field: "Id", type: "number" };
const regionColumn: ColumnDefinition<SampleRow> = {
  field: "Region",
  editable: true,
};
const amountColumn: ColumnDefinition<SampleRow> = {
  field: "Amount",
  type: "number",
  editable: (row) => !row.Locked,
};
const columns = [idColumn, regionColumn, amountColumn];

function view(
  state: GridViewInput<SampleRow>["state"] = {},
  options: GridViewInput<SampleRow>["options"] = {},
) {
  return resolveGridView<SampleRow>({
    rows,
    getRowId: (row) => String(row.Id),
    columns,
    state,
    options,
  });
}

describe("isColumnEditable", () => {
  test("reads a boolean, and is false when left out", () => {
    expect(isColumnEditable(idColumn, west)).toBe(false);
    expect(isColumnEditable(regionColumn, west)).toBe(true);
    expect(isColumnEditable({ field: "Region", editable: false }, west)).toBe(
      false,
    );
  });

  test("asks a function about the row", () => {
    expect(isColumnEditable(amountColumn, west)).toBe(true);
    expect(isColumnEditable(amountColumn, locked)).toBe(false);
  });
});

describe("isCellEditable", () => {
  test("accepts a shown data row and a column editable for it", () => {
    const shown = view();
    expect(isCellEditable(shown, { rowId: "1", columnId: "Region" })).toBe(
      true,
    );
    expect(isCellEditable(shown, { rowId: "1", columnId: "Amount" })).toBe(
      true,
    );
  });

  test("rejects a column not editable, for every row or for this one", () => {
    const shown = view();
    expect(isCellEditable(shown, { rowId: "1", columnId: "Id" })).toBe(false);
    expect(isCellEditable(shown, { rowId: "2", columnId: "Amount" })).toBe(
      false,
    );
  });

  test("rejects a hidden column", () => {
    const hidden = view({ columnVisibility: { Region: false } });
    expect(isCellEditable(hidden, { rowId: "1", columnId: "Region" })).toBe(
      false,
    );
  });

  test("rejects a row or column that does not exist", () => {
    const shown = view();
    expect(isCellEditable(shown, { rowId: "9", columnId: "Region" })).toBe(
      false,
    );
    expect(isCellEditable(shown, { rowId: "1", columnId: "Nope" })).toBe(false);
  });

  test("rejects a group row, and a row under a collapsed group", () => {
    const grouped = view({ groupBy: [{ columnId: "Region" }] });
    const group = grouped.pageRows.find((entry) => entry.kind === "group");
    expect(group).toBeDefined();
    expect(
      isCellEditable(grouped, {
        rowId: group?.kind === "group" ? group.groupId : "",
        columnId: "Region",
      }),
    ).toBe(false);
    expect(isCellEditable(grouped, { rowId: "1", columnId: "Region" })).toBe(
      true,
    );

    const collapsed = view({
      groupBy: [{ columnId: "Region" }],
      groupExpansion: { mode: "allCollapsed", except: [] },
    });
    expect(isCellEditable(collapsed, { rowId: "1", columnId: "Region" })).toBe(
      false,
    );
  });

  test("rejects a row filtered out or on another page", () => {
    const filtered = view({
      filter: [{ kind: "text", columnId: "Region", query: "East" }],
    });
    expect(isCellEditable(filtered, { rowId: "1", columnId: "Region" })).toBe(
      false,
    );

    const paged = view(
      { pagination: { pageIndex: 1, pageSize: 2 } },
      { paginated: true },
    );
    expect(isCellEditable(paged, { rowId: "1", columnId: "Region" })).toBe(
      false,
    );
    expect(isCellEditable(paged, { rowId: "3", columnId: "Region" })).toBe(
      true,
    );
  });
});
