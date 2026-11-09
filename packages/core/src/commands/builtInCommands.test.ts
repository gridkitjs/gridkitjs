import { describe, expect, test, vi } from "vitest";

import { createGridController } from "../controller/createGridController";
import type {
  GridController,
  GridControllerOptions,
} from "../controller/gridController";
import type { ExportWriter } from "../export/writer";
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
    writeClipboard: vi.fn(),
    print: vi.fn(),
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
  host: GridCommandHost = inertHost(),
) {
  const command = builtInCommands<Order>().find((entry) => entry.id === id);
  if (command === undefined) {
    throw new Error(`no built-in ${id}`);
  }
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
      "filter.open",
      "filter.clear",
      "selection.selectAllRows",
      "selection.clear",
      "filter.clearAll",
      "export.csv",
      "export.json",
      "export.xlsx",
      "export.pdf",
      "exportSelection.csv",
      "exportSelection.json",
      "exportSelection.xlsx",
      "copy.cell",
      "copy.row",
      "copy.selection",
      "print",
    ]);
  });

  test("shows only the exports, the selection copy and print on empty body space, which act on the whole grid", () => {
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
      builtInCommands<Order>()
        .filter((command) => isCommandVisible(command, context))
        .map((command) => command.id),
    ).toEqual(["export.csv", "export.json", "copy.selection", "print"]);
  });

  test("gives the sort, group, hide, autofit, copy and print commands icon keys", () => {
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
      "copy.cell": "copy",
      "copy.row": "copy",
      "copy.selection": "copy",
      print: "print",
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

describe("filter.open", () => {
  test("shows on a filterable column's header, always enabled", () => {
    const controller = create({ filterableColumns: true });
    const command = builtIn("filter.open", controller, header("Region"));

    expect(command.label()).toBe("Filter…");
    expect(command.visible()).toBe(true);
    expect(command.enabled()).toBe(true);
    expect(command.checked()).toBeUndefined();
    for (const target of [
      GRID,
      TOOLBAR,
      cell("1", "Region"),
      group("Region"),
    ]) {
      expect(builtIn("filter.open", controller, target).visible()).toBe(false);
    }
    expect(builtIn("filter.open", create(), header("Region")).visible()).toBe(
      false,
    );
  });

  test("follows a column's own filterable over the grid's", () => {
    const controller = create({
      columns: columns.map((column) =>
        column.field === "Amount" ? { ...column, filterable: true } : column,
      ),
    });

    expect(builtIn("filter.open", controller, header("Amount")).visible()).toBe(
      true,
    );
    expect(builtIn("filter.open", controller, header("Region")).visible()).toBe(
      false,
    );
  });

  test("asks the host to open the filter menu below the header", () => {
    const command = builtIn(
      "filter.open",
      create({ filterableColumns: true }),
      header("Amount"),
    );

    expect(command.run()).toBe(true);
    expect(command.host.openPanel).toHaveBeenCalledExactlyOnceWith(
      "filter",
      header("Amount"),
    );
  });
});

describe("filter.clear", () => {
  test("shows on a filterable header, enabled while its column is filtered", () => {
    const controller = create({ filterableColumns: true });
    const command = builtIn("filter.clear", controller, header("Region"));

    expect(command.label()).toBe("Clear filter");
    expect(command.visible()).toBe(true);
    expect(command.enabled()).toBe(false);
    expect(builtIn("filter.clear", controller, GRID).visible()).toBe(false);
    expect(builtIn("filter.clear", create(), header("Region")).visible()).toBe(
      false,
    );

    // A search across every column filters none in particular.
    controller.setFilter([{ kind: "text", query: "%West%" }]);
    expect(command.enabled()).toBe(false);

    controller.setFilter([
      { kind: "operator", columnId: "Region", operator: "eq", value: "West" },
    ]);
    expect(command.enabled()).toBe(true);
  });

  test("takes out every entry about the column, keeping the rest in order", () => {
    const controller = create({
      filterableColumns: true,
      defaultFilter: [
        {
          kind: "operator",
          columnId: "Region",
          operator: "in",
          value: ["West"],
        },
        { kind: "text", query: "%a%" },
        {
          kind: "group",
          combinator: "or",
          entries: [
            { kind: "operator", columnId: "Region", operator: "isEmpty" },
            { kind: "operator", columnId: "Amount", operator: "gt", value: 15 },
          ],
        },
        { kind: "operator", columnId: "Amount", operator: "lt", value: 100 },
      ],
    });

    expect(builtIn("filter.clear", controller, header("Region")).run()).toBe(
      true,
    );
    expect(controller.getState().filter).toEqual([
      { kind: "text", query: "%a%" },
      { kind: "operator", columnId: "Amount", operator: "lt", value: 100 },
    ]);
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

    controller.setFilter([{ kind: "text", query: "%West%" }]);
    expect(command.enabled()).toBe(true);
  });

  test("empties the filter, search included", () => {
    const controller = create({
      defaultFilter: [
        { kind: "text", query: "%West%" },
        { kind: "value", columnId: "Id", value: 1 },
      ],
    });
    builtIn("filter.clearAll", controller, GRID).run();

    expect(controller.getState().filter).toEqual([]);
  });
});

/** A writer of `format` writing each data row's id, after `wait` when asynchronous. */
function idsWriter(format: string, wait = false): ExportWriter {
  return {
    format,
    fileExtension: format,
    mimeType: `application/x-${format}`,
    write: (table) => {
      const ids = table.rows.map((row) =>
        row.kind === "data" ? row.rowId : "",
      );
      return wait ? Promise.resolve(ids.join(" ")) : ids.join(" ");
    },
  };
}

/** The file a command's run handed its host. */
function savedFile(host: GridCommandHost): unknown {
  const save = vi.mocked(host.saveFile);
  expect(save).toHaveBeenCalledOnce();
  return save.mock.calls[0]?.[0];
}

describe("export.csv", () => {
  test("shows on the grid, the toolbar, the body and a cell, enabled while there are rows", () => {
    const controller = create();
    const command = builtIn("export.csv", controller, GRID);

    expect(command.label()).toBe("Export to CSV");
    expect(command.visible()).toBe(true);
    expect(command.enabled()).toBe(true);
    expect(command.checked()).toBeUndefined();
    for (const target of [TOOLBAR, BODY, cell("1", "Id")]) {
      expect(builtIn("export.csv", controller, target).visible()).toBe(true);
    }
    for (const target of [header("Id"), group("Region")]) {
      expect(builtIn("export.csv", controller, target).visible()).toBe(false);
    }

    controller.setFilter([{ kind: "text", query: "%North%" }]);
    expect(command.visible()).toBe(true);
    expect(command.enabled()).toBe(false);
  });

  test("did not run when the host drops the file", () => {
    const saveFile = vi.fn(() => false);
    const command = builtIn("export.csv", create(), GRID, {
      ...inertHost(),
      saveFile,
    });

    expect(command.run()).toBe(false);
    expect(saveFile).toHaveBeenCalledOnce();
  });

  test("builds nothing, and did not run, while the host cannot save", () => {
    const writer = idsWriter("csv");
    const write = vi.spyOn(writer, "write");
    const host: GridCommandHost = { ...inertHost(), canSave: () => false };
    const command = builtIn(
      "export.csv",
      create({ exportWriters: [writer] }),
      GRID,
      host,
    );

    expect(command.run()).toBe(false);
    expect(write).not.toHaveBeenCalled();
    expect(host.saveFile).not.toHaveBeenCalled();
  });

  test("builds and saves the file while the host can save", () => {
    const host: GridCommandHost = { ...inertHost(), canSave: () => true };
    const command = builtIn("export.csv", create(), GRID, host);

    expect(command.run()).toBe(true);
    expect(savedFile(host)).toMatchObject({ fileName: "export.csv" });
  });

  test("hands the host the view as a CSV file", () => {
    const command = builtIn("export.csv", create(), GRID);

    expect(command.run()).toBe(true);
    expect(savedFile(command.host)).toEqual({
      fileName: "export.csv",
      mimeType: "text/csv;charset=utf-8",
      content: `${String.fromCharCode(0xfeff)}Id,Sales region,Amount\r\n1,West,10\r\n2,East,20\r\n3,West,30`,
    });
  });

  test("exports under the grid's export defaults", () => {
    const command = builtIn(
      "export.csv",
      create({
        export: {
          fileName: "orders",
          columns: ["Id"],
          csv: { bom: false, eol: "\n" },
        },
      }),
      GRID,
    );
    command.run();

    expect(savedFile(command.host)).toMatchObject({
      fileName: "orders.csv",
      content: "Id\n1\n2\n3",
    });
  });

  test("uses a csv writer the grid registers in place of the built-in", () => {
    const command = builtIn(
      "export.csv",
      create({ exportWriters: [idsWriter("csv")] }),
      GRID,
    );
    command.run();

    expect(savedFile(command.host)).toMatchObject({ content: "1 2 3" });
  });
});

describe("export.json", () => {
  test("shows where export.csv does, and hands the host a JSON file", () => {
    const controller = create();
    const command = builtIn("export.json", controller, cell("1", "Id"));

    expect(command.label()).toBe("Export to JSON");
    expect(command.visible()).toBe(true);
    expect(builtIn("export.json", controller, header("Id")).visible()).toBe(
      false,
    );
    expect(command.run()).toBe(true);
    expect(savedFile(command.host)).toEqual({
      fileName: "export.json",
      mimeType: "application/json",
      content: JSON.stringify([
        { Id: 1, Region: "West", Amount: 10 },
        { Id: 2, Region: "East", Amount: 20 },
        { Id: 3, Region: "West", Amount: 30 },
      ]),
    });
  });
});

describe("export.xlsx and export.pdf", () => {
  test("show only once a writer for their format is registered", () => {
    for (const [id, format, label] of [
      ["export.xlsx", "xlsx", "Export to Excel"],
      ["export.pdf", "pdf", "Export to PDF"],
    ] as const) {
      expect(builtIn(id, create(), GRID).visible()).toBe(false);

      const command = builtIn(
        id,
        create({ exportWriters: [idsWriter(format)] }),
        TOOLBAR,
      );
      expect(command.label()).toBe(label);
      expect(command.visible()).toBe(true);
      expect(command.enabled()).toBe(true);
    }
  });

  test("hand the host a promise of the file from an asynchronous writer", async () => {
    const command = builtIn(
      "export.xlsx",
      create({ exportWriters: [idsWriter("xlsx", true)] }),
      GRID,
    );
    command.run();

    await expect(savedFile(command.host)).resolves.toEqual({
      fileName: "export.xlsx",
      mimeType: "application/x-xlsx",
      content: "1 2 3",
    });
  });
});

describe("exportSelection", () => {
  test("shows where the exports do while rows are selected, enabled while the filter leaves one", () => {
    const controller = create({ selectable: { rows: "multiple" } });
    const command = builtIn("exportSelection.csv", controller, cell("1", "Id"));

    expect(command.label()).toBe("Export selection to CSV");
    expect(command.visible()).toBe(false);

    controller.setRowSelection(["2"]);
    expect(command.visible()).toBe(true);
    expect(command.enabled()).toBe(true);
    expect(
      builtIn("exportSelection.csv", controller, header("Id")).visible(),
    ).toBe(false);

    controller.setFilter([{ kind: "text", query: "%West%" }]);
    expect(command.visible()).toBe(true);
    expect(command.enabled()).toBe(false);
  });

  test("exports only the selected rows, whatever scope the grid's defaults give", () => {
    const writer = idsWriter("csv");
    const command = builtIn(
      "exportSelection.csv",
      create({
        defaultRowSelection: ["3", "1"],
        export: { scope: "page" },
        exportWriters: [writer],
      }),
      GRID,
    );
    command.run();

    expect(savedFile(command.host)).toMatchObject({ content: "1 3" });
  });

  test("labels JSON and Excel, Excel showing only with an xlsx writer", () => {
    const controller = create({ defaultRowSelection: ["1"] });

    expect(builtIn("exportSelection.json", controller, GRID).label()).toBe(
      "Export selection to JSON",
    );
    expect(builtIn("exportSelection.json", controller, GRID).visible()).toBe(
      true,
    );
    expect(builtIn("exportSelection.xlsx", controller, GRID).visible()).toBe(
      false,
    );

    const withXlsx = builtIn(
      "exportSelection.xlsx",
      create({
        defaultRowSelection: ["1"],
        exportWriters: [idsWriter("xlsx")],
      }),
      GRID,
    );
    expect(withXlsx.label()).toBe("Export selection to Excel");
    expect(withXlsx.visible()).toBe(true);
  });
});

/** What a command's run handed its host to put on the clipboard. */
function copied(host: GridCommandHost): unknown {
  const write = vi.mocked(host.writeClipboard);
  expect(write).toHaveBeenCalledOnce();
  return write.mock.calls[0]?.[0];
}

describe("copy.cell", () => {
  test("shows on a cell only, and hands the host the cell's text", () => {
    const controller = create();
    const command = builtIn("copy.cell", controller, cell("2", "Region"));

    expect(command.label()).toBe("Copy cell");
    expect(command.visible()).toBe(true);
    expect(command.enabled()).toBe(true);
    for (const target of [GRID, TOOLBAR, BODY, header("Id"), group("Region")]) {
      expect(builtIn("copy.cell", controller, target).visible()).toBe(false);
    }

    expect(command.run()).toBe(true);
    expect(copied(command.host)).toEqual({
      text: "East",
      html: '<table class="gridkit-export-table"><tbody><tr><td>East</td></tr></tbody></table>',
      count: 1,
      unit: "cells",
    });
  });

  test("is disabled on a column that does not export", () => {
    const command = builtIn(
      "copy.cell",
      create({
        columns: [{ field: "Id" }, { field: "Notes", exportable: false }],
      }),
      cell("1", "Notes"),
    );

    expect(command.visible()).toBe(true);
    expect(command.enabled()).toBe(false);
    expect(command.run()).toBe(false);
  });
});

describe("copy.row", () => {
  test("shows on a cell only, and hands the host the row's shown cells", () => {
    const controller = create();
    const command = builtIn("copy.row", controller, cell("3", "Id"));

    expect(command.label()).toBe("Copy row");
    expect(command.visible()).toBe(true);
    expect(builtIn("copy.row", controller, GRID).visible()).toBe(false);

    command.run();
    expect(copied(command.host)).toMatchObject({
      text: "3\tWest\t30",
      count: 1,
      unit: "rows",
    });
  });
});

describe("copy.selection", () => {
  test("shows where the exports do once anything is selectable, enabled once something is", () => {
    expect(builtIn("copy.selection", create(), GRID).visible()).toBe(false);

    const controller = create({ selectable: { cells: "single" } });
    const command = builtIn("copy.selection", controller, cell("1", "Id"));

    expect(command.label()).toBe("Copy selection");
    expect(command.visible()).toBe(true);
    expect(command.enabled()).toBe(false);
    for (const target of [GRID, TOOLBAR, BODY]) {
      expect(builtIn("copy.selection", controller, target).visible()).toBe(
        true,
      );
    }
    for (const target of [header("Id"), group("Region")]) {
      expect(builtIn("copy.selection", controller, target).visible()).toBe(
        false,
      );
    }

    controller.setCellSelection({ rowId: "2", columnId: "Amount" });
    expect(command.enabled()).toBe(true);
  });

  test("hands the host the selected rows under a header", () => {
    const command = builtIn(
      "copy.selection",
      create({
        selectable: { rows: "multiple" },
        defaultRowSelection: ["3", "1"],
      }),
      GRID,
    );

    expect(command.run()).toBe(true);
    expect(copied(command.host)).toMatchObject({
      text: "Id\tSales region\tAmount\n1\tWest\t10\n3\tWest\t30",
      count: 2,
      unit: "rows",
    });
  });
});

function printed(host: GridCommandHost): Parameters<GridCommandHost["print"]> {
  const print = vi.mocked(host.print);
  expect(print).toHaveBeenCalledOnce();
  const [call] = print.mock.calls;
  if (call === undefined) {
    throw new Error("nothing printed");
  }
  return call;
}

describe("print", () => {
  test("shows where the exports do, enabled while a column is shown", () => {
    const controller = create();
    const command = builtIn("print", controller, GRID);

    expect(command.label()).toBe("Print");
    expect(command.visible()).toBe(true);
    expect(command.enabled()).toBe(true);
    for (const target of [TOOLBAR, BODY, cell("1", "Id")]) {
      expect(builtIn("print", controller, target).visible()).toBe(true);
    }
    for (const target of [header("Id"), group("Region")]) {
      expect(builtIn("print", controller, target).visible()).toBe(false);
    }

    controller.setFilter([{ kind: "text", query: "%North%" }]);
    expect(command.enabled()).toBe(true);

    controller.hideColumns(["Id", "Region", "Amount"]);
    expect(command.enabled()).toBe(false);
  });

  test("hands the host the view as a document titled with the grid's label", () => {
    const command = builtIn("print", create({ label: "Orders" }), GRID);

    expect(command.run()).toBe(true);
    const [document, options] = printed(command.host);
    expect(document).toMatchObject({
      title: "Orders",
      page: { orientation: "portrait", paperSize: "A4" },
    });
    expect(document.bodyHtml).toContain('<h1 class="print-title">Orders</h1>');
    expect(options).toEqual({});
  });

  test("prints under the grid's print defaults, and passes them to the host", () => {
    const print = {
      title: "Q1",
      columns: ["Id"],
      paperSize: "Letter",
      styles: "td { color: red }",
    };
    const command = builtIn("print", create({ label: "Orders", print }), GRID);
    command.run();

    const [document, options] = printed(command.host);
    expect(document).toMatchObject({
      title: "Q1",
      page: { paperSize: "Letter" },
    });
    expect(document.bodyHtml).toContain(">Id</th>");
    expect(document.bodyHtml).not.toContain("Sales region");
    expect(options).toBe(print);
  });
});
