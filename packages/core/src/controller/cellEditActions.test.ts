import { describe, expect, test, vi } from "vitest";

import type { CellEditCommitEvent, ColumnDefinition } from "../types";
import { serializeGridState } from "../util/serialize";
import { createGridController } from "./createGridController";
import type { GridControllerOptions } from "./gridController";

interface SampleRow {
  Id: number;
  Region: string;
  Amount: number;
  Locked: boolean;
}

const data: readonly SampleRow[] = [
  { Id: 1, Region: "West", Amount: 10, Locked: false },
  { Id: 2, Region: "East", Amount: 20, Locked: true },
  { Id: 3, Region: "West", Amount: 30, Locked: false },
];

const columns: readonly ColumnDefinition<SampleRow>[] = [
  { field: "Id", type: "number" },
  { field: "Region", editable: true },
  {
    field: "Amount",
    type: "number",
    editable: (row) => !row.Locked,
    validate: (value) =>
      typeof value === "number" && value < 0 ? "Must not be negative" : null,
  },
];

const amount = { rowId: "1", columnId: "Amount" } as const;
const region = { rowId: "3", columnId: "Region" } as const;

function create(options: GridControllerOptions<SampleRow> = {}) {
  const onCellEditCommit =
    vi.fn<(event: CellEditCommitEvent<SampleRow>) => void>();
  const base: GridControllerOptions<SampleRow> = {
    dataSource: data,
    getRowId: (row) => String(row.Id),
    columns,
    onCellEditCommit,
    ...options,
  };
  const controller = createGridController<SampleRow>(base);
  const listener = vi.fn();
  controller.subscribe(listener);
  return { controller, base, listener, onCellEditCommit };
}

describe("createGridController: a cell edit", () => {
  test("starts idle", () => {
    expect(create().controller.getCellEdit()).toEqual({ kind: "idle" });
  });

  test("runs start, draft and commit, reporting the commit once", () => {
    const { controller, listener, onCellEditCommit } = create();

    expect(controller.startCellEdit(amount)).toBe(true);
    expect(controller.getCellEdit()).toEqual({
      kind: "editing",
      ...amount,
      draft: { kind: "current" },
    });

    controller.setCellEditDraft({ kind: "text", text: "15" });
    expect(controller.getCellEdit()).toEqual({
      kind: "editing",
      ...amount,
      draft: { kind: "text", text: "15" },
    });

    expect(controller.commitCellEdit()).toBe(true);
    expect(controller.getCellEdit()).toEqual({ kind: "idle" });
    expect(onCellEditCommit).toHaveBeenCalledTimes(1);
    expect(onCellEditCommit).toHaveBeenCalledWith({
      rowId: "1",
      columnId: "Amount",
      field: "Amount",
      row: data[0],
      value: 15,
      previousValue: 10,
    });
    expect(listener).toHaveBeenCalledTimes(3);
  });

  test("reports a commit after the edit has closed", () => {
    const { controller, onCellEditCommit } = create();
    onCellEditCommit.mockImplementation(() => {
      expect(controller.getCellEdit()).toEqual({ kind: "idle" });
    });
    controller.startCellEdit(amount, { kind: "text", text: "15" });
    controller.commitCellEdit();
    expect(onCellEditCommit).toHaveBeenCalledTimes(1);
  });

  test("keeps a refused commit open as invalid, reporting nothing", () => {
    const { controller, listener, onCellEditCommit } = create();
    controller.startCellEdit(amount, { kind: "text", text: "-5" });

    expect(controller.commitCellEdit()).toBe(false);
    expect(controller.getCellEdit()).toEqual({
      kind: "invalid",
      ...amount,
      draft: { kind: "text", text: "-5" },
      message: "Must not be negative",
    });
    expect(onCellEditCommit).not.toHaveBeenCalled();
    expect(listener).toHaveBeenCalledTimes(2);

    controller.setCellEditDraft({ kind: "text", text: "5" });
    expect(controller.getCellEdit().kind).toBe("editing");
    expect(controller.commitCellEdit()).toBe(true);
    expect(onCellEditCommit).toHaveBeenCalledWith(
      expect.objectContaining({ value: 5 }),
    );
  });

  test("refuses unreadable text in the grid's messages", () => {
    const { controller } = create({
      messages: { cellEditUnreadable: (family) => `Need a ${family}` },
    });
    controller.startCellEdit(amount, { kind: "text", text: "abc" });
    controller.commitCellEdit();
    expect(controller.getCellEdit()).toMatchObject({
      kind: "invalid",
      message: "Need a number",
    });
  });

  test("cancels without reporting", () => {
    const { controller, listener, onCellEditCommit } = create();
    controller.startCellEdit(amount, { kind: "text", text: "15" });
    controller.cancelCellEdit();
    expect(controller.getCellEdit()).toEqual({ kind: "idle" });
    expect(onCellEditCommit).not.toHaveBeenCalled();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  test("closes an unchanged commit without reporting", () => {
    const { controller, onCellEditCommit } = create();
    controller.startCellEdit(amount, { kind: "text", text: "10" });
    expect(controller.commitCellEdit()).toBe(true);
    expect(controller.getCellEdit()).toEqual({ kind: "idle" });
    expect(onCellEditCommit).not.toHaveBeenCalled();
  });

  test("does nothing, and calls no one, with no edit open", () => {
    const { controller, listener } = create();
    const idle = controller.getCellEdit();
    expect(controller.commitCellEdit()).toBe(false);
    controller.setCellEditDraft({ kind: "text", text: "1" });
    controller.cancelCellEdit();
    expect(controller.getCellEdit()).toBe(idle);
    expect(listener).not.toHaveBeenCalled();
  });

  test("refuses to start on a cell that cannot be edited", () => {
    const { controller, listener } = create({
      defaultColumnVisibility: { Region: false },
    });
    expect(controller.startCellEdit({ rowId: "1", columnId: "Id" })).toBe(
      false,
    );
    expect(controller.startCellEdit({ rowId: "2", columnId: "Amount" })).toBe(
      false,
    );
    expect(controller.startCellEdit({ rowId: "1", columnId: "Region" })).toBe(
      false,
    );
    expect(controller.startCellEdit({ rowId: "9", columnId: "Amount" })).toBe(
      false,
    );
    expect(controller.getCellEdit()).toEqual({ kind: "idle" });
    expect(listener).not.toHaveBeenCalled();
  });

  test("leaves an open edit alone when a start is refused", () => {
    const { controller } = create();
    controller.startCellEdit(amount, { kind: "text", text: "15" });
    const open = controller.getCellEdit();
    expect(controller.startCellEdit({ rowId: "2", columnId: "Amount" })).toBe(
      false,
    );
    expect(controller.getCellEdit()).toBe(open);
  });

  test("keeps the draft of an edit started again on its own cell", () => {
    const { controller } = create();
    controller.startCellEdit(amount, { kind: "text", text: "15" });
    const open = controller.getCellEdit();
    expect(controller.startCellEdit(amount)).toBe(true);
    expect(controller.getCellEdit()).toBe(open);
  });

  test("commits an edit on another cell before starting", () => {
    const { controller, onCellEditCommit } = create();
    controller.startCellEdit(amount, { kind: "text", text: "15" });
    expect(controller.startCellEdit(region)).toBe(true);
    expect(onCellEditCommit).toHaveBeenCalledWith(
      expect.objectContaining({ rowId: "1", value: 15 }),
    );
    expect(controller.getCellEdit()).toMatchObject({
      kind: "editing",
      ...region,
    });
  });

  test("cancels an edit on another cell whose commit is refused", () => {
    const { controller, onCellEditCommit } = create();
    controller.startCellEdit(amount, { kind: "text", text: "-5" });
    expect(controller.startCellEdit(region)).toBe(true);
    expect(onCellEditCommit).not.toHaveBeenCalled();
    expect(controller.getCellEdit()).toMatchObject({
      kind: "editing",
      ...region,
    });
  });

  test("returns the same object until the edit changes", () => {
    const { controller } = create();
    controller.startCellEdit(amount);
    const open = controller.getCellEdit();
    controller.setColumnSort([{ columnId: "Region", direction: "asc" }]);
    expect(controller.getCellEdit()).toBe(open);
  });

  test("stays out of getState and the saved state", () => {
    const { controller } = create();
    const before = controller.getState();
    controller.startCellEdit(amount, { kind: "text", text: "15" });
    const state = controller.getState();
    expect(state).toBe(before);
    expect(JSON.stringify(state)).not.toContain("15");
    expect(Object.keys(serializeGridState(state))).not.toContain("cellEdit");
    expect(JSON.stringify(serializeGridState(state))).not.toContain(
      '"editing"',
    );
  });
});

describe("createGridController: an edit whose cell goes", () => {
  test("is cancelled, unreported, when setOptions drops the row", () => {
    const { controller, base, listener, onCellEditCommit } = create();
    controller.startCellEdit(amount, { kind: "text", text: "15" });
    listener.mockClear();

    controller.setOptions({ ...base, dataSource: data.slice(1) });
    expect(controller.getCellEdit()).toEqual({ kind: "idle" });
    expect(onCellEditCommit).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
  });

  test("is cancelled when setOptions removes or hides the column", () => {
    const removed = create();
    removed.controller.startCellEdit(amount);
    removed.controller.setOptions({
      ...removed.base,
      columns: columns.slice(0, 2),
    });
    expect(removed.controller.getCellEdit()).toEqual({ kind: "idle" });

    const hidden = create();
    hidden.controller.startCellEdit(amount);
    hidden.controller.setOptions({
      ...hidden.base,
      columnVisibility: { Amount: false },
    });
    expect(hidden.controller.getCellEdit()).toEqual({ kind: "idle" });
  });

  test("is cancelled when the cell stops being editable", () => {
    const { controller, base } = create();
    controller.startCellEdit(amount);
    controller.setOptions({
      ...base,
      dataSource: data.map((row) =>
        row.Id === 1 ? { ...row, Locked: true } : row,
      ),
    });
    expect(controller.getCellEdit()).toEqual({ kind: "idle" });
  });

  test("is kept, draft and all, when other fields of its row change", () => {
    const { controller, base, onCellEditCommit } = create();
    controller.startCellEdit(amount, { kind: "text", text: "15" });
    const open = controller.getCellEdit();
    const changed = data.map((row) =>
      row.Id === 1 ? { ...row, Region: "North", Amount: 12 } : row,
    );
    controller.setOptions({ ...base, dataSource: changed });
    expect(controller.getCellEdit()).toBe(open);

    controller.commitCellEdit();
    expect(onCellEditCommit).toHaveBeenCalledWith(
      expect.objectContaining({
        row: changed[0],
        value: 15,
        previousValue: 12,
      }),
    );
  });

  test("is cancelled, telling subscribers, when a filter hides the row", () => {
    const { controller, listener } = create();
    controller.startCellEdit(amount);
    listener.mockClear();
    controller.setFilter([{ kind: "text", columnId: "Region", query: "East" }]);
    expect(controller.getCellEdit()).toEqual({ kind: "idle" });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  test("is cancelled when the page changes under it", () => {
    const { controller } = create({
      paginated: true,
      defaultPagination: { pageIndex: 0, pageSize: 2 },
    });
    controller.startCellEdit(amount);
    controller.goToPage(1);
    expect(controller.getCellEdit()).toEqual({ kind: "idle" });
  });

  test("is cancelled when its row's group collapses", () => {
    const { controller } = create({ defaultGroupBy: [{ columnId: "Region" }] });
    controller.startCellEdit(region);
    const group = controller
      .getView()
      .pageRows.find(
        (entry) => entry.kind === "group" && entry.value === "West",
      );
    expect(group?.kind).toBe("group");
    if (group?.kind === "group") {
      controller.toggleGroupExpansion(group.groupId);
    }
    expect(controller.getCellEdit()).toEqual({ kind: "idle" });
  });

  test("is cancelled when its column is hidden, and kept for another", () => {
    const { controller } = create();
    controller.startCellEdit(amount);
    const open = controller.getCellEdit();
    controller.hideColumns(["Region"]);
    expect(controller.getCellEdit()).toBe(open);
    controller.hideColumns(["Amount"]);
    expect(controller.getCellEdit()).toEqual({ kind: "idle" });
  });

  test("is kept when a sort moves its row on the page", () => {
    const { controller } = create();
    controller.startCellEdit(amount);
    const open = controller.getCellEdit();
    controller.setColumnSort([{ columnId: "Amount", direction: "desc" }]);
    controller.moveColumn("Amount", "Id");
    controller.pinColumn("Amount", "end");
    expect(controller.getCellEdit()).toBe(open);
  });

  test("is judged once at the end of a restore", () => {
    const { controller, listener } = create({
      paginated: true,
      defaultPagination: { pageIndex: 0, pageSize: 2 },
    });
    controller.startCellEdit(amount);
    listener.mockClear();
    // The sort alone would move row 1 to the second page; the restored page
    // follows it there, so the edit stays.
    controller.restoreState({
      columnSort: [{ columnId: "Amount", direction: "desc" }],
      pagination: { pageIndex: 1, pageSize: 2 },
    });
    expect(controller.getCellEdit()).toMatchObject({ kind: "editing" });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
