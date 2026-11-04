import { describe, expect, test, vi } from "vitest";

import { createGridController } from "../controller/createGridController";
import type {
  GridController,
  GridControllerOptions,
} from "../controller/gridController";
import { defaultMessages } from "../messages";
import type { ColumnDefinition } from "../types";
import { builtInCommands, type BuiltInCommandId } from "./builtInCommands";
import { createCommandContext } from "./context";
import { isCommandEnabled, isCommandVisible, runCommand } from "./registry";
import type { GridCommandHost, GridCommandTarget } from "./types";

interface Order {
  Id: number;
  Region: string;
  Amount: number;
  Notes: string;
}

const rows: readonly Order[] = [
  { Id: 1, Region: "West", Amount: 10, Notes: "a" },
  { Id: 2, Region: "East", Amount: 20, Notes: "b" },
  { Id: 3, Region: "West", Amount: 30, Notes: "c" },
];

/**
 * `Id` opts out of sorting and hiding, `Region` into grouping and `Amount`
 * into resizing; `Notes` starts hidden, and resizable, so it shows what a
 * hidden column is left out of.
 */
const columns: readonly ColumnDefinition<Order>[] = [
  { field: "Id", type: "number", sortable: false, hideable: false },
  { field: "Region", header: "Sales region", groupable: true },
  { field: "Amount", type: "number", resizable: true },
  { field: "Notes", hidden: true, resizable: true },
];

function create(options: GridControllerOptions<Order> = {}) {
  return createGridController<Order>({
    dataSource: rows,
    getRowId: (row) => String(row.Id),
    columns,
    sortableColumns: true,
    ...options,
  });
}

const GRID: GridCommandTarget = { area: "grid" };
const TOOLBAR: GridCommandTarget = { area: "toolbar", itemId: "item" };
const BODY: GridCommandTarget = { area: "body" };

function header(columnId: string): GridCommandTarget {
  return { area: "header", columnId };
}

function cell(rowId: string, columnId: string): GridCommandTarget {
  return { area: "cell", rowId, columnId };
}

function group(columnId: string): GridCommandTarget {
  return { area: "group", groupId: "West", columnId };
}

function inertHost(): GridCommandHost {
  return {
    autoFitColumns: vi.fn(),
    openPanel: vi.fn(),
    announce: vi.fn(),
    saveFile: vi.fn(),
  };
}

/**
 * One built-in, read against `controller` on `target`: each question asks
 * on a fresh context, so a check after `run` sees the state it left.
 */
function builtIn(
  id: BuiltInCommandId,
  controller: GridController<Order>,
  target: GridCommandTarget,
) {
  const command = builtInCommands<Order>().find((entry) => entry.id === id);
  if (command === undefined) {
    throw new Error(`no built-in ${id}`);
  }
  const host = inertHost();
  const context = () =>
    createCommandContext({
      controller,
      target,
      messages: defaultMessages,
      host,
    });
  return {
    host,
    visible: () => isCommandVisible(command, context()),
    enabled: () => isCommandEnabled(command, context()),
    checked: () => command.isChecked?.(context()),
    label: () =>
      typeof command.label === "string"
        ? command.label
        : command.label(context()),
    run: () => runCommand(command, context()),
  };
}

describe("builtInCommands", () => {
  test("has every built-in id once", () => {
    expect(builtInCommands().map((command) => command.id)).toEqual([
      "sort.ascending",
      "sort.descending",
      "sort.clear",
      "sort.clearAll",
      "group.add",
      "group.remove",
      "group.clearAll",
      "group.expandAll",
      "group.collapseAll",
      "column.hide",
      "column.autoFit",
      "column.autoFitAll",
      "column.choose",
      "selection.selectAllRows",
      "selection.clear",
      "filter.clearAll",
    ]);
  });

  test("hides every one on empty body space, which has nothing to act on", () => {
    const context = createCommandContext({
      controller: create({
        selectable: { rows: "multiple" },
        defaultGroupBy: [{ columnId: "Region" }],
        resizableColumns: true,
      }),
      target: BODY,
      messages: defaultMessages,
      host: inertHost(),
    });

    expect(
      builtInCommands<Order>().filter((command) =>
        isCommandVisible(command, context),
      ),
    ).toEqual([]);
  });

  test("gives the sort, group, hide and autofit commands icon keys", () => {
    const icons = Object.fromEntries(
      builtInCommands()
        .filter((command) => command.icon !== undefined)
        .map((command) => [command.id, command.icon]),
    );

    expect(icons).toEqual({
      "sort.ascending": "sortAscending",
      "sort.descending": "sortDescending",
      "group.add": "group",
      "group.remove": "group",
      "column.hide": "hide",
      "column.autoFit": "autoFit",
      "column.autoFitAll": "autoFit",
    });
  });

  test("labels each from the messages it is given", () => {
    const context = createCommandContext({
      controller: create(),
      target: header("Region"),
      messages: { ...defaultMessages, sortAscending: "Aufsteigend" },
      host: inertHost(),
    });
    const [sortAscending] = builtInCommands<Order>();

    expect(
      typeof sortAscending?.label === "function"
        ? sortAscending.label(context)
        : sortAscending?.label,
    ).toBe("Aufsteigend");
  });
});

describe("sort.ascending", () => {
  test("shows on a sortable column's header, checked while it sorts ascending", () => {
    const controller = create();
    const command = builtIn("sort.ascending", controller, header("Amount"));

    expect(command.label()).toBe("Sort ascending");
    expect(command.visible()).toBe(true);
    expect(command.enabled()).toBe(true);
    expect(command.checked()).toBe(false);

    controller.setColumnSort([{ columnId: "Amount", direction: "asc" }]);
    expect(command.checked()).toBe(true);
    controller.setColumnSort([{ columnId: "Amount", direction: "desc" }]);
    expect(command.checked()).toBe(false);
  });

  test("is hidden for a column that cannot sort, and off a header", () => {
    const controller = create();

    expect(builtIn("sort.ascending", controller, header("Id")).visible()).toBe(
      false,
    );
    expect(
      builtIn(
        "sort.ascending",
        create({ sortableColumns: false }),
        header("Amount"),
      ).visible(),
    ).toBe(false);
    expect(builtIn("sort.ascending", controller, GRID).visible()).toBe(false);
    expect(
      builtIn("sort.ascending", controller, cell("1", "Amount")).visible(),
    ).toBe(false);
  });

  test("sorts by that column alone, ascending", () => {
    const onColumnSortChange = vi.fn();
    const controller = create({
      defaultColumnSort: [
        { columnId: "Region", direction: "asc" },
        { columnId: "Amount", direction: "desc" },
      ],
      onColumnSortChange,
    });

    expect(builtIn("sort.ascending", controller, header("Amount")).run()).toBe(
      true,
    );
    expect(controller.getState().columnSort).toEqual([
      { columnId: "Amount", direction: "asc" },
    ]);
    expect(onColumnSortChange).toHaveBeenCalledWith(
      expect.objectContaining({ columnId: "Amount" }),
    );
  });
});

describe("sort.descending", () => {
  test("shows on a sortable header, checked while it sorts descending", () => {
    const controller = create();
    const command = builtIn("sort.descending", controller, header("Region"));

    expect(command.label()).toBe("Sort descending");
    expect(command.visible()).toBe(true);
    expect(command.checked()).toBe(false);
    controller.setColumnSort([{ columnId: "Region", direction: "desc" }]);
    expect(command.checked()).toBe(true);
    expect(builtIn("sort.descending", controller, header("Id")).visible()).toBe(
      false,
    );
  });

  test("sorts by that column alone, descending", () => {
    const controller = create();
    builtIn("sort.descending", controller, header("Region")).run();

    expect(controller.getState().columnSort).toEqual([
      { columnId: "Region", direction: "desc" },
    ]);
  });
});

describe("sort.clear", () => {
  test("shows on a sortable header, enabled while the column sorts", () => {
    const controller = create();
    const command = builtIn("sort.clear", controller, header("Amount"));

    expect(command.label()).toBe("Clear sort");
    expect(command.visible()).toBe(true);
    expect(command.enabled()).toBe(false);
    expect(command.checked()).toBeUndefined();

    controller.toggleColumnSort("Amount");
    expect(command.enabled()).toBe(true);
    expect(builtIn("sort.clear", controller, header("Id")).visible()).toBe(
      false,
    );
  });

  test("takes the column out of the sort, keeping the rest", () => {
    const controller = create({
      defaultColumnSort: [
        { columnId: "Region", direction: "asc" },
        { columnId: "Amount", direction: "desc" },
      ],
    });
    const command = builtIn("sort.clear", controller, header("Amount"));

    expect(command.run()).toBe(true);
    expect(controller.getState().columnSort).toEqual([
      { columnId: "Region", direction: "asc" },
    ]);
    expect(command.run()).toBe(false);
  });

  test("reports the column it cleared, even when it was the first key", () => {
    const onColumnSortChange = vi.fn();
    const controller = create({
      defaultColumnSort: [
        { columnId: "Region", direction: "asc" },
        { columnId: "Amount", direction: "desc" },
      ],
      onColumnSortChange,
    });

    builtIn("sort.clear", controller, header("Region")).run();

    expect(onColumnSortChange).toHaveBeenCalledWith({
      columnId: "Region",
      sort: [{ columnId: "Amount", direction: "desc" }],
    });
  });
});

describe("sort.clearAll", () => {
  test("shows on the grid, the toolbar and a header, enabled while anything sorts", () => {
    const controller = create();
    const command = builtIn("sort.clearAll", controller, GRID);

    expect(command.label()).toBe("Clear all sorting");
    expect(command.visible()).toBe(true);
    expect(command.enabled()).toBe(false);
    expect(builtIn("sort.clearAll", controller, TOOLBAR).visible()).toBe(true);
    // Shown on any header, even one that cannot sort itself.
    expect(builtIn("sort.clearAll", controller, header("Id")).visible()).toBe(
      true,
    );
    expect(
      builtIn("sort.clearAll", controller, cell("1", "Amount")).visible(),
    ).toBe(false);

    controller.toggleColumnSort("Amount");
    expect(command.enabled()).toBe(true);
  });

  test("empties the sort", () => {
    const controller = create({
      defaultColumnSort: [
        { columnId: "Region", direction: "asc" },
        { columnId: "Amount", direction: "desc" },
      ],
    });
    builtIn("sort.clearAll", controller, GRID).run();

    expect(controller.getState().columnSort).toEqual([]);
  });
});

describe("group.add", () => {
  test("shows on a groupable header not yet grouped, naming the column", () => {
    const controller = create();
    const command = builtIn("group.add", controller, header("Region"));

    expect(command.label()).toBe("Group by Sales region");
    expect(command.visible()).toBe(true);
    expect(command.enabled()).toBe(true);
    expect(builtIn("group.add", controller, header("Amount")).visible()).toBe(
      false,
    );
    expect(
      builtIn(
        "group.add",
        create({ groupableColumns: true }),
        header("Amount"),
      ).visible(),
    ).toBe(true);

    controller.toggleGroupBy("Region");
    expect(command.visible()).toBe(false);
  });

  test("adds the column to the end of the grouping", () => {
    const onGroupByChange = vi.fn();
    const controller = create({
      groupableColumns: true,
      defaultGroupBy: [{ columnId: "Amount" }],
      onGroupByChange,
    });
    builtIn("group.add", controller, header("Region")).run();

    expect(controller.getState().groupBy).toEqual([
      { columnId: "Amount" },
      { columnId: "Region" },
    ]);
    expect(onGroupByChange).toHaveBeenCalledWith(
      expect.objectContaining({ columnId: "Region" }),
    );
  });
});

describe("group.remove", () => {
  test("shows on a grouped column's header or group row, naming it", () => {
    const controller = create();
    const command = builtIn("group.remove", controller, header("Region"));

    expect(command.visible()).toBe(false);
    controller.setGroupBy([{ columnId: "Region" }]);
    expect(command.label()).toBe("Stop grouping by Sales region");
    expect(command.visible()).toBe(true);
    expect(builtIn("group.remove", controller, group("Region")).visible()).toBe(
      true,
    );
    expect(builtIn("group.remove", controller, GRID).visible()).toBe(false);
  });

  test("takes the column out of the grouping, reporting that column", () => {
    const onGroupByChange = vi.fn();
    const controller = create({
      defaultGroupBy: [{ columnId: "Region" }, { columnId: "Amount" }],
      onGroupByChange,
    });
    builtIn("group.remove", controller, group("Region")).run();

    expect(controller.getState().groupBy).toEqual([{ columnId: "Amount" }]);
    expect(onGroupByChange).toHaveBeenCalledWith({
      columnId: "Region",
      groupBy: [{ columnId: "Amount" }],
    });
  });
});

describe("group.clearAll", () => {
  test("shows on the grid and the toolbar while anything is grouped", () => {
    const controller = create();
    const command = builtIn("group.clearAll", controller, TOOLBAR);

    expect(command.label()).toBe("Ungroup all");
    expect(command.visible()).toBe(false);
    controller.setGroupBy([{ columnId: "Region" }]);
    expect(command.visible()).toBe(true);
    expect(command.enabled()).toBe(true);
    expect(builtIn("group.clearAll", controller, GRID).visible()).toBe(true);
    expect(
      builtIn("group.clearAll", controller, header("Region")).visible(),
    ).toBe(false);
  });

  test("empties the grouping", () => {
    const controller = create({ defaultGroupBy: [{ columnId: "Region" }] });
    builtIn("group.clearAll", controller, GRID).run();

    expect(controller.getState().groupBy).toEqual([]);
  });
});

describe("group.expandAll", () => {
  test("shows on the grid, the toolbar, a group row and a cell while grouped", () => {
    const controller = create();
    const command = builtIn("group.expandAll", controller, group("Region"));

    expect(command.label()).toBe("Expand all groups");
    expect(command.visible()).toBe(false);
    controller.setGroupBy([{ columnId: "Region" }]);
    for (const target of [GRID, TOOLBAR, group("Region"), cell("1", "Id")]) {
      expect(builtIn("group.expandAll", controller, target).visible()).toBe(
        true,
      );
    }
    expect(
      builtIn("group.expandAll", controller, header("Region")).visible(),
    ).toBe(false);
  });

  test("expands every group", () => {
    const controller = create({
      defaultGroupBy: [{ columnId: "Region" }],
      defaultGroupExpansion: ["West"],
    });
    builtIn("group.expandAll", controller, GRID).run();

    expect(controller.getState().groupExpansion).toEqual([]);
  });
});

describe("group.collapseAll", () => {
  test("shows where expandAll does", () => {
    const controller = create({ defaultGroupBy: [{ columnId: "Region" }] });
    const command = builtIn("group.collapseAll", controller, cell("1", "Id"));

    expect(command.label()).toBe("Collapse all groups");
    expect(command.visible()).toBe(true);
    expect(builtIn("group.collapseAll", create(), GRID).visible()).toBe(false);
  });

  test("collapses every group", () => {
    const controller = create({ defaultGroupBy: [{ columnId: "Region" }] });
    builtIn("group.collapseAll", controller, GRID).run();

    expect(controller.getState().groupExpansion).toHaveLength(2);
  });
});

describe("column.hide", () => {
  test("shows on a hideable column's header, enabled while another column shows", () => {
    const controller = create();
    const command = builtIn("column.hide", controller, header("Amount"));

    expect(command.label()).toBe("Hide column");
    expect(command.visible()).toBe(true);
    expect(command.enabled()).toBe(true);
    expect(builtIn("column.hide", controller, header("Id")).visible()).toBe(
      false,
    );
    expect(builtIn("column.hide", controller, GRID).visible()).toBe(false);

    controller.hideColumns(["Id", "Region"]);
    expect(command.enabled()).toBe(false);
  });

  test("hides the column", () => {
    const onColumnVisibilityChange = vi.fn();
    const controller = create({ onColumnVisibilityChange });
    builtIn("column.hide", controller, header("Amount")).run();

    expect(controller.getView().columns.map((entry) => entry.id)).toEqual([
      "Id",
      "Region",
    ]);
    expect(onColumnVisibilityChange).toHaveBeenCalledWith(
      expect.objectContaining({ columnIds: ["Amount"] }),
    );
  });

  test("hideable gates the command only: hideColumns still hides", () => {
    const controller = create();
    controller.hideColumns(["Id"]);

    expect(controller.getView().columns.map((entry) => entry.id)).toEqual([
      "Region",
      "Amount",
    ]);
  });
});

describe("column.autoFit", () => {
  test("shows on a resizable column's header", () => {
    const controller = create();
    const command = builtIn("column.autoFit", controller, header("Amount"));

    expect(command.label()).toBe("Autofit column");
    expect(command.visible()).toBe(true);
    expect(command.enabled()).toBe(true);
    expect(
      builtIn("column.autoFit", controller, header("Region")).visible(),
    ).toBe(false);
    expect(
      builtIn(
        "column.autoFit",
        create({ resizableColumns: true }),
        header("Region"),
      ).visible(),
    ).toBe(true);
    expect(
      builtIn("column.autoFit", controller, header("Notes")).visible(),
    ).toBe(false);
  });

  test("asks the host to fit the column", () => {
    const command = builtIn("column.autoFit", create(), header("Amount"));
    command.run();

    expect(command.host.autoFitColumns).toHaveBeenCalledWith(["Amount"]);
  });
});

describe("column.autoFitAll", () => {
  test("shows on the grid, the toolbar and a header while a shown column is resizable", () => {
    const controller = create();
    const command = builtIn("column.autoFitAll", controller, GRID);

    expect(command.label()).toBe("Autofit all columns");
    expect(command.visible()).toBe(true);
    expect(command.enabled()).toBe(true);
    expect(builtIn("column.autoFitAll", controller, TOOLBAR).visible()).toBe(
      true,
    );
    expect(
      builtIn("column.autoFitAll", controller, header("Id")).visible(),
    ).toBe(true);
    expect(
      builtIn("column.autoFitAll", controller, cell("1", "Id")).visible(),
    ).toBe(false);

    controller.hideColumns(["Amount"]);
    expect(command.visible()).toBe(false);
  });

  test("asks the host to fit every shown resizable column", () => {
    const command = builtIn(
      "column.autoFitAll",
      create({ resizableColumns: true }),
      GRID,
    );
    command.run();

    expect(command.host.autoFitColumns).toHaveBeenCalledWith([
      "Id",
      "Region",
      "Amount",
    ]);
  });
});

describe("column.choose", () => {
  test("shows on the grid, the toolbar and any header, always enabled", () => {
    const controller = create();
    const command = builtIn("column.choose", controller, GRID);

    expect(command.label()).toBe("Choose columns");
    expect(command.visible()).toBe(true);
    expect(command.enabled()).toBe(true);
    expect(command.checked()).toBeUndefined();
    expect(builtIn("column.choose", controller, TOOLBAR).visible()).toBe(true);
    // Even on a column that cannot be hidden: the chooser shows the rest.
    expect(builtIn("column.choose", controller, header("Id")).visible()).toBe(
      true,
    );
    expect(
      builtIn("column.choose", controller, cell("1", "Id")).visible(),
    ).toBe(false);
    expect(
      builtIn("column.choose", controller, group("Region")).visible(),
    ).toBe(false);
  });

  test("asks the host to open the column chooser where it was asked for", () => {
    const controller = create();
    for (const target of [GRID, TOOLBAR, header("Amount")]) {
      const command = builtIn("column.choose", controller, target);

      expect(command.run()).toBe(true);
      expect(command.host.openPanel).toHaveBeenCalledExactlyOnceWith(
        "columnChooser",
        target,
      );
    }
  });
});

describe("selection.selectAllRows", () => {
  test("shows on the grid and a cell when many rows may be selected, enabled while there are rows", () => {
    const controller = create({ selectable: { rows: "multiple" } });
    const command = builtIn("selection.selectAllRows", controller, GRID);

    expect(command.label()).toBe("Select all rows");
    expect(command.visible()).toBe(true);
    expect(command.enabled()).toBe(true);
    expect(
      builtIn("selection.selectAllRows", controller, cell("1", "Id")).visible(),
    ).toBe(true);
    expect(
      builtIn("selection.selectAllRows", controller, header("Id")).visible(),
    ).toBe(false);
    expect(
      builtIn(
        "selection.selectAllRows",
        create({ selectable: { rows: "single" } }),
        GRID,
      ).visible(),
    ).toBe(false);
    expect(
      builtIn(
        "selection.selectAllRows",
        create({ selectable: { rows: "multiple" }, dataSource: [] }),
        GRID,
      ).enabled(),
    ).toBe(false);
  });

  test("selects every row", () => {
    const controller = create({ selectable: { rows: "multiple" } });
    builtIn("selection.selectAllRows", controller, GRID).run();

    expect(controller.getState().rowSelection).toEqual(["1", "2", "3"]);
  });
});

describe("selection.clear", () => {
  test("shows on the grid, a cell and a header when anything is selectable, enabled while anything is selected", () => {
    const controller = create({ selectable: { cells: "single" } });
    const command = builtIn("selection.clear", controller, header("Id"));

    expect(command.label()).toBe("Clear selection");
    expect(command.visible()).toBe(true);
    expect(command.enabled()).toBe(false);
    expect(builtIn("selection.clear", controller, GRID).visible()).toBe(true);
    expect(
      builtIn("selection.clear", controller, cell("1", "Id")).visible(),
    ).toBe(true);
    expect(builtIn("selection.clear", controller, TOOLBAR).visible()).toBe(
      false,
    );
    expect(builtIn("selection.clear", create(), GRID).visible()).toBe(false);

    controller.setCellSelection({ rowId: "1", columnId: "Id" });
    expect(command.enabled()).toBe(true);
    controller.setCellSelection(null);
    controller.setColumnSelection(["Id"]);
    expect(command.enabled()).toBe(true);
    controller.setColumnSelection([]);
    controller.setRowSelection(["2"]);
    expect(command.enabled()).toBe(true);
  });

  test("lets go of every selection", () => {
    const controller = create({
      selectable: { rows: "multiple", columns: "multiple" },
      defaultRowSelection: ["1"],
      defaultColumnSelection: ["Id"],
    });
    builtIn("selection.clear", controller, GRID).run();

    expect(controller.getState()).toMatchObject({
      rowSelection: [],
      columnSelection: [],
      cellSelection: null,
    });
  });
});

describe("filter.clearAll", () => {
  test("shows on the grid, the toolbar and a header, enabled while anything filters", () => {
    const controller = create();
    const command = builtIn("filter.clearAll", controller, TOOLBAR);

    expect(command.label()).toBe("Clear filters");
    expect(command.visible()).toBe(true);
    expect(command.enabled()).toBe(false);
    expect(builtIn("filter.clearAll", controller, GRID).visible()).toBe(true);
    expect(builtIn("filter.clearAll", controller, header("Id")).visible()).toBe(
      true,
    );
    expect(
      builtIn("filter.clearAll", controller, group("Region")).visible(),
    ).toBe(false);

    controller.setFilter([{ query: "%West%" }]);
    expect(command.enabled()).toBe(true);
  });

  test("empties the filter, search included", () => {
    const controller = create({
      defaultFilter: [{ query: "%West%" }, { columnId: "Id", value: 1 }],
    });
    builtIn("filter.clearAll", controller, GRID).run();

    expect(controller.getState().filter).toEqual([]);
  });
});
