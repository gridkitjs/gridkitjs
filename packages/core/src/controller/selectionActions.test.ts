import { describe, expect, test, vi } from "vitest";

import type {
  CellSelectionChangeEvent,
  ColumnDefinition,
  ColumnSelectionChangeEvent,
  RowSelectEvent,
  RowSelectionChangeEvent,
  RowsSelectEvent,
} from "../types";
import { createGridController } from "./createGridController";
import type {
  GridControllerOptions,
  SelectionDiffEvent,
} from "./gridController";

interface SampleRow {
  Id: number;
  Region: string;
}

const data: readonly SampleRow[] = [
  { Id: 1, Region: "West" },
  { Id: 2, Region: "East" },
  { Id: 3, Region: "West" },
  { Id: 4, Region: "North" },
];

const columns: readonly ColumnDefinition<SampleRow>[] = [
  { field: "Id", type: "number" },
  { field: "Region" },
];

function create(options: GridControllerOptions<SampleRow> = {}) {
  return createGridController<SampleRow>({
    dataSource: data,
    getRowId: (row) => String(row.Id),
    columns,
    selectable: { rows: "multiple", columns: "multiple", cells: "single" },
    ...options,
  });
}

function rowIdsOf(rows: readonly { rowId: string }[]): readonly string[] {
  return rows.map((entry) => entry.rowId);
}

describe("createGridController: row selection", () => {
  test("a click, a toggle and a range fan out to every row callback from one diff", () => {
    const onRowSelect = vi.fn<(event: RowSelectEvent<SampleRow>) => void>();
    const onRowsSelect = vi.fn<(event: RowsSelectEvent<SampleRow>) => void>();
    const onRowDeselect = vi.fn<(event: RowSelectEvent<SampleRow>) => void>();
    const onRowSelectionChange =
      vi.fn<(event: RowSelectionChangeEvent<SampleRow>) => void>();
    const controller = create({
      onRowSelect,
      onRowsSelect,
      onRowDeselect,
      onRowSelectionChange,
    });

    controller.selectRow("2", "replace");
    controller.selectRow("4", "range");

    expect(controller.getState().rowSelection).toEqual(["2", "3", "4"]);
    expect(onRowSelect.mock.calls.map(([event]) => event.row.rowId)).toEqual([
      "2",
      "3",
      "4",
    ]);
    expect(
      onRowsSelect.mock.calls.map(([event]) => rowIdsOf(event.rows)),
    ).toEqual([["2"], ["3", "4"]]);

    controller.selectRow("3", "toggle");
    controller.selectRow("1", "range");

    expect(controller.getState().rowSelection).toEqual(["1", "2", "3"]);
    expect(onRowDeselect.mock.calls.map(([event]) => event.row.rowId)).toEqual([
      "3",
      "4",
    ]);
    const last = onRowSelectionChange.mock.calls.at(-1)?.[0];
    expect(last && rowIdsOf(last.added)).toEqual(["1", "3"]);
    expect(last && rowIdsOf(last.removed)).toEqual(["4"]);
    expect(last && rowIdsOf(last.selected)).toEqual(["1", "2", "3"]);
  });

  test("re-selecting the sole selected row reports nothing", () => {
    const onRowSelectionChange = vi.fn();
    const controller = create({
      defaultRowSelection: ["2"],
      onRowSelectionChange,
    });

    controller.selectRow("2", "replace");

    expect(onRowSelectionChange).not.toHaveBeenCalled();
  });

  test("selectAllRows selects the data rows on the current page", () => {
    const controller = create({
      paginated: true,
      defaultPagination: { pageIndex: 1, pageSize: 2 },
    });

    controller.selectAllRows();

    expect(controller.getState().rowSelection).toEqual(["3", "4"]);
  });

  test("onSelectionDiff counts ids no row on screen answers to", () => {
    const onSelectionDiff = vi.fn<(event: SelectionDiffEvent) => void>();
    const onRowSelectionChange =
      vi.fn<(event: RowSelectionChangeEvent<SampleRow>) => void>();
    const controller = create({
      paginated: true,
      defaultPagination: { pageIndex: 1, pageSize: 2 },
      defaultRowSelection: ["1", "3"],
      onSelectionDiff,
      onRowSelectionChange,
    });

    controller.clearSelection();

    expect(onRowSelectionChange.mock.calls[0]?.[0].removed).toHaveLength(1);
    expect(onSelectionDiff.mock.calls).toEqual([
      [{ target: "rows", added: [], removed: ["1", "3"], selection: [] }],
    ]);
  });

  test("selectRows replaces within the mode, and toggles each id", () => {
    const controller = create();

    controller.selectRows(["3", "1", "3"]);
    expect(controller.getState().rowSelection).toEqual(["3", "1"]);

    controller.selectRows(["1", "4"], "toggle");
    expect(controller.getState().rowSelection).toEqual(["3", "4"]);

    controller.selectRow("1", "range");
    expect(controller.getState().rowSelection).toEqual(["1", "2", "3", "4"]);
  });

  test("selectRows keeps only the last id under single, and does nothing when rows are off", () => {
    const single = create({ selectable: { rows: "single" } });
    single.selectRows(["1", "2"]);
    expect(single.getState().rowSelection).toEqual(["2"]);

    const off = create({ selectable: {} });
    off.selectRows(["1"]);
    expect(off.getState().rowSelection).toEqual([]);
  });

  test("selectRows naming what is already selected reports nothing", () => {
    const onRowSelectionChange = vi.fn();
    const controller = create({
      defaultRowSelection: ["1", "2"],
      onRowSelectionChange,
    });

    controller.selectRows(["1", "2"]);

    expect(onRowSelectionChange).not.toHaveBeenCalled();
  });

  test("setRowSelection applies ids as given, even ones selectable would refuse", () => {
    const onRowSelectionChange = vi.fn();
    const controller = create({
      selectable: { rows: "single" },
      onRowSelectionChange,
    });

    controller.setRowSelection(["1", "2"]);
    controller.setRowSelection(["1", "2"]);

    expect(controller.getState().rowSelection).toEqual(["1", "2"]);
    expect(onRowSelectionChange).toHaveBeenCalledTimes(1);
  });

  test("a range after clearSelection starts afresh at the row clicked", () => {
    const controller = create();
    controller.selectRow("1", "replace");

    controller.clearSelection();
    controller.selectRow("3", "range");

    expect(controller.getState().rowSelection).toEqual(["3"]);
  });

  test("a range from an anchor paged away selects the row clicked and anchors there", () => {
    const controller = create({
      paginated: true,
      defaultPagination: { pageIndex: 0, pageSize: 2 },
    });
    controller.selectRow("1", "replace");
    controller.nextPage();

    controller.selectRow("4", "range");
    expect(controller.getState().rowSelection).toEqual(["4"]);

    controller.selectRow("3", "range");
    expect(controller.getState().rowSelection).toEqual(["3", "4"]);
  });

  test("a range from an anchor filtered away selects the row clicked", () => {
    const controller = create();
    controller.selectRow("2", "replace");
    controller.setFilter([{ columnId: "Region", query: "West" }]);

    controller.selectRow("3", "range");

    expect(controller.getState().rowSelection).toEqual(["3"]);
  });

  test("a range after setRowSelection starts afresh at the row clicked", () => {
    const controller = create();
    controller.selectRow("1", "replace");

    controller.setRowSelection([]);
    controller.selectRow("3", "range");

    expect(controller.getState().rowSelection).toEqual(["3"]);
  });

  test("a range after restoreState sets the rows starts afresh at the row clicked", () => {
    const controller = create();
    controller.selectRow("1", "replace");

    controller.restoreState({ rowSelection: ["4"] });
    controller.selectRow("3", "range");

    expect(controller.getState().rowSelection).toEqual(["3"]);
  });

  test("a click while rows can't be selected leaves the anchor where it was", () => {
    const options: GridControllerOptions<SampleRow> = {
      dataSource: data,
      getRowId: (row) => String(row.Id),
      columns,
      selectable: { rows: false },
    };
    const controller = createGridController(options);
    controller.selectRow("1", "replace");

    controller.setOptions({ ...options, selectable: { rows: "multiple" } });
    controller.selectRow("3", "range");

    expect(controller.getState().rowSelection).toEqual(["3"]);
  });

  test("a controlled row selection only asks", () => {
    const onRowSelectionChange =
      vi.fn<(event: RowSelectionChangeEvent<SampleRow>) => void>();
    const controller = create({ rowSelection: [], onRowSelectionChange });

    controller.selectRow("2", "replace");

    expect(onRowSelectionChange.mock.calls[0]?.[0].selection).toEqual(["2"]);
    expect(controller.getState().rowSelection).toEqual([]);
  });
});

describe("createGridController: column and cell selection", () => {
  test("selectColumn reports resolved columns at their displayed position", () => {
    const onColumnSelectionChange =
      vi.fn<(event: ColumnSelectionChangeEvent<SampleRow>) => void>();
    const controller = create({ onColumnSelectionChange });

    controller.selectColumn("Region", "replace");

    const event = onColumnSelectionChange.mock.calls[0]?.[0];
    expect(event?.added.map((entry) => entry.columnIndex)).toEqual([1]);
    expect(event?.selection).toEqual(["Region"]);
  });

  test("a column range after setColumnSelection starts afresh at the column clicked", () => {
    const controller = create();
    controller.selectColumn("Id", "replace");

    controller.setColumnSelection([]);
    controller.selectColumn("Region", "range");

    expect(controller.getState().columnSelection).toEqual(["Region"]);
  });

  test("selectCell moves between cells as one change, and a toggle lets go", () => {
    const onCellSelectionChange =
      vi.fn<(event: CellSelectionChangeEvent<SampleRow>) => void>();
    const controller = create({ onCellSelectionChange });

    controller.selectCell({ rowId: "1", columnId: "Id" }, "replace");
    controller.selectCell({ rowId: "2", columnId: "Region" }, "replace");
    controller.selectCell({ rowId: "2", columnId: "Region" }, "toggle");

    const events = onCellSelectionChange.mock.calls.map(([event]) => ({
      selected: event.selected?.value ?? null,
      deselected: event.deselected?.value ?? null,
    }));
    expect(events).toEqual([
      { selected: 1, deselected: null },
      { selected: "East", deselected: 1 },
      { selected: null, deselected: "East" },
    ]);
  });

  test("a controlled null cell selection stays null", () => {
    const onCellSelectionChange = vi.fn();
    const controller = create({ cellSelection: null, onCellSelectionChange });

    controller.selectCell({ rowId: "1", columnId: "Id" }, "replace");

    expect(onCellSelectionChange).toHaveBeenCalledTimes(1);
    expect(controller.getState().cellSelection).toBeNull();
  });

  test("clearSelection lets go of rows, columns and the cell, and setCellSelection skips an equal cell", () => {
    const onCellSelectionChange = vi.fn();
    const controller = create({
      defaultRowSelection: ["1"],
      defaultColumnSelection: ["Id"],
      onCellSelectionChange,
    });
    controller.setCellSelection({ rowId: "1", columnId: "Id" });
    controller.setCellSelection({ rowId: "1", columnId: "Id" });

    controller.clearSelection();

    expect(controller.getState()).toMatchObject({
      rowSelection: [],
      columnSelection: [],
      cellSelection: null,
    });
    expect(onCellSelectionChange).toHaveBeenCalledTimes(2);
  });
});
