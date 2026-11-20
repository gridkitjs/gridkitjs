import { describe, expect, test, vi } from "vitest";

import { defaultMessages } from "../messages";
import type {
  CellEditDraft,
  CellEditState,
  ColumnDefinition,
  GridViewInput,
  ResolvedRow,
} from "../types";
import type { CellEditAction } from "./cellEdit";
import {
  cellEditReducer,
  isCellEditable,
  isColumnEditable,
  NO_CELL_EDIT,
} from "./cellEdit";
import { resolveGridView } from "./view";

interface SampleRow {
  Id: number;
  Region: string | null;
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

describe("cellEditReducer", () => {
  const cell = { rowId: "1", columnId: "Amount" } as const;
  const westRow: ResolvedRow<SampleRow> = {
    kind: "data",
    rowId: "1",
    row: west,
    rowIndex: 0,
    datasetIndex: 0,
  };
  const typed: CellEditDraft = { kind: "text", text: "15" };

  type OpenEdit = Exclude<CellEditState, { kind: "idle" }>;

  function editing(draft: CellEditDraft): OpenEdit {
    return { kind: "editing", ...cell, draft };
  }

  function invalid(draft: CellEditDraft, message: string): OpenEdit {
    return { kind: "invalid", ...cell, draft, message };
  }

  function commit(
    column: ColumnDefinition<SampleRow, unknown> = amountColumn,
    row: ResolvedRow<SampleRow> = westRow,
  ): CellEditAction<SampleRow> {
    return {
      type: "commit",
      row,
      column: { id: column.id ?? column.field, column },
      messages: defaultMessages,
    };
  }

  function reduce(state: CellEditState, action: CellEditAction<SampleRow>) {
    return cellEditReducer(state, action);
  }

  describe("idle", () => {
    test("start opens an edit on the cell with the draft", () => {
      expect(
        reduce(NO_CELL_EDIT, { type: "start", ...cell, draft: typed }),
      ).toEqual({ state: editing(typed), committed: null });
    });

    test.each<CellEditAction<SampleRow>>([
      { type: "setDraft", draft: typed },
      commit(),
      { type: "cancel" },
    ])("$type keeps the same idle object", (action) => {
      const result = reduce(NO_CELL_EDIT, action);
      expect(result.state).toBe(NO_CELL_EDIT);
      expect(result.committed).toBeNull();
    });
  });

  describe.each([
    ["editing", editing(typed)],
    ["invalid", invalid(typed, "Too small")],
  ] as const)("%s", (_, open) => {
    test.each([
      ["the same cell", cell],
      ["another cell", { rowId: "3", columnId: "Region" }],
    ])("start on %s leaves the edit as it is", (__, target) => {
      const result = reduce(open, {
        type: "start",
        ...target,
        draft: { kind: "current" },
      });
      expect(result.state).toBe(open);
      expect(result.committed).toBeNull();
    });

    test("setDraft replaces the draft and clears any message", () => {
      const draft: CellEditDraft = { kind: "text", text: "16" };
      expect(reduce(open, { type: "setDraft", draft })).toEqual({
        state: editing(draft),
        committed: null,
      });
    });

    test("cancel closes it, reporting nothing", () => {
      expect(reduce(open, { type: "cancel" })).toEqual({
        state: NO_CELL_EDIT,
        committed: null,
      });
    });

    test("commit of an untouched draft closes it, reporting nothing", () => {
      const validate = vi.fn(() => "never");
      const state: OpenEdit = { ...open, draft: { kind: "current" } };
      expect(reduce(state, commit({ ...amountColumn, validate }))).toEqual({
        state: NO_CELL_EDIT,
        committed: null,
      });
      expect(validate).not.toHaveBeenCalled();
    });

    test("commit of the cell's own value closes it without validating", () => {
      const validate = vi.fn(() => "never");
      const state: OpenEdit = {
        ...open,
        draft: { kind: "text", text: " 10 " },
      };
      expect(reduce(state, commit({ ...amountColumn, validate }))).toEqual({
        state: NO_CELL_EDIT,
        committed: null,
      });
      expect(validate).not.toHaveBeenCalled();
    });

    test("commit of unreadable text refuses with the column's request", () => {
      const draft: CellEditDraft = { kind: "text", text: "12abc" };
      expect(reduce({ ...open, draft }, commit())).toEqual({
        state: invalid(draft, "Enter a number"),
        committed: null,
      });
    });

    test("commit of input the editor could not read refuses it", () => {
      const draft: CellEditDraft = { kind: "unreadable" };
      expect(reduce({ ...open, draft }, commit())).toEqual({
        state: invalid(draft, "Enter a number"),
        committed: null,
      });
    });

    test("commit validate refuses keeps it open with that message", () => {
      const validate = vi.fn(() => "Must be over 20");
      expect(reduce(open, commit({ ...amountColumn, validate }))).toEqual({
        state: invalid(typed, "Must be over 20"),
        committed: null,
      });
      expect(validate).toHaveBeenCalledWith(15, west);
    });

    test("commit of a changed, accepted value closes it and reports it", () => {
      expect(reduce(open, commit())).toEqual({
        state: NO_CELL_EDIT,
        committed: {
          rowId: "1",
          columnId: "Amount",
          field: "Amount",
          row: west,
          value: 15,
          previousValue: 10,
        },
      });
    });
  });

  test("a commit refused again keeps it invalid with the new message", () => {
    const validate = (value: unknown) => (value === 15 ? "Not fifteen" : null);
    expect(
      reduce(
        invalid(typed, "Too small"),
        commit({ ...amountColumn, validate }),
      ),
    ).toEqual({ state: invalid(typed, "Not fifteen"), committed: null });
  });

  test("reads text through the column's valueParser over its type", () => {
    const valueParser = vi.fn((text: string) => text.length);
    const { committed } = reduce(
      editing({ kind: "text", text: "abc" }),
      commit({ ...amountColumn, valueParser }),
    );
    expect(valueParser).toHaveBeenCalledWith("abc", west);
    expect(committed?.value).toBe(3);
  });

  test("commits a value draft as it is, unparsed", () => {
    const { committed } = reduce(
      editing({ kind: "value", value: "15" }),
      commit(),
    );
    expect(committed?.value).toBe("15");
  });

  test("reads the previous value as the row holds it at commit time", () => {
    const { committed } = reduce(
      editing(typed),
      commit(amountColumn, { ...westRow, row: { ...west, Amount: 12 } }),
    );
    expect(committed).toMatchObject({ value: 15, previousValue: 12 });
  });

  test("reads empty text over a blank text cell as unchanged", () => {
    const blank: ResolvedRow<SampleRow> = {
      ...westRow,
      row: { ...west, Region: null },
    };
    const state: CellEditState = {
      kind: "editing",
      rowId: "1",
      columnId: "Region",
      draft: { kind: "text", text: "" },
    };
    expect(reduce(state, commit(regionColumn, blank))).toEqual({
      state: NO_CELL_EDIT,
      committed: null,
    });
  });

  test("reads a date column's typed day as the same as its day string", () => {
    interface Dated {
      Due: string;
    }
    const column: ColumnDefinition<Dated, unknown> = {
      field: "Due",
      type: "date",
      editable: true,
    };
    const row: Dated = { Due: "2024-03-01" };
    const result = cellEditReducer<Dated>(
      {
        kind: "editing",
        rowId: "0",
        columnId: "Due",
        draft: { kind: "text", text: "2024-03-01" },
      },
      {
        type: "commit",
        row: { kind: "data", rowId: "0", row, rowIndex: 0, datasetIndex: 0 },
        column: { id: "Due", column },
        messages: defaultMessages,
      },
    );
    expect(result).toEqual({ state: NO_CELL_EDIT, committed: null });
  });

  test("reports a dotted field's value and the field itself", () => {
    interface Nested {
      Owner: { Name: string };
    }
    const column: ColumnDefinition<Nested, unknown> = {
      field: "Owner.Name",
      editable: true,
    };
    const row: Nested = { Owner: { Name: "Ada" } };
    const result = cellEditReducer<Nested>(
      {
        kind: "editing",
        rowId: "0",
        columnId: "Owner.Name",
        draft: { kind: "text", text: "Grace" },
      },
      {
        type: "commit",
        row: { kind: "data", rowId: "0", row, rowIndex: 0, datasetIndex: 0 },
        column: { id: "Owner.Name", column },
        messages: defaultMessages,
      },
    );
    expect(result.committed).toMatchObject({
      field: "Owner.Name",
      value: "Grace",
      previousValue: "Ada",
    });
  });
});
