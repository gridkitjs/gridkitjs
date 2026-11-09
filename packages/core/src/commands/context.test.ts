import { describe, expect, expectTypeOf, test, vi } from "vitest";

import { createGridController } from "../controller/createGridController";
import type {
  GridController,
  GridControllerOptions,
} from "../controller/gridController";
import { defaultMessages } from "../messages";
import type { ColumnDefinition } from "../types";
import { createCommandContext } from "./context";
import type { GridCommandHost, GridCommandTarget } from "./types";

interface Order {
  Id: number;
  Region: string;
  Notes: string;
}

const rows: readonly Order[] = [
  { Id: 1, Region: "West", Notes: "a" },
  { Id: 2, Region: "East", Notes: "b" },
  { Id: 3, Region: "West", Notes: "c" },
];

const columns: readonly ColumnDefinition<Order>[] = [
  { field: "Id", type: "number" },
  { field: "Region" },
  { field: "Notes", hidden: true },
];

function create(options: GridControllerOptions<Order> = {}) {
  return createGridController<Order>({
    dataSource: rows,
    getRowId: (row) => String(row.Id),
    columns,
    ...options,
  });
}

const host: GridCommandHost = {
  autoFitColumns: vi.fn(),
  openPanel: vi.fn(),
  announce: vi.fn(),
  saveFile: vi.fn(),
  writeClipboard: vi.fn(),
  print: vi.fn(),
};

function contextFor<Node>(
  controller: GridController<Order, Node>,
  target: GridCommandTarget,
) {
  return createCommandContext({
    controller,
    target,
    messages: defaultMessages,
    host,
  });
}

/**
 * `controller` with its view's `rows` counted each time they are read — the
 * walk `selectedRows` must not make until it is asked.
 */
function countingRowReads(controller: GridController<Order>) {
  let reads = 0;
  const counted: GridController<Order> = {
    ...controller,
    getView: () => {
      const view = controller.getView();
      return {
        ...view,
        get rows() {
          reads += 1;
          return view.rows;
        },
      };
    },
  };
  return { controller: counted, reads: () => reads };
}

describe("createCommandContext", () => {
  test("carries the controller's state, view and options as they are now", () => {
    const controller = create({ sortableColumns: true });
    const context = contextFor(controller, { area: "grid" });

    expect(context.state).toBe(controller.getState());
    expect(context.view).toBe(controller.getView());
    expect(context.options).toBe(controller.getOptions());
    expect(context.messages).toBe(defaultMessages);
    expect(context.host).toBe(host);
  });

  test("acts through the controller's actions", () => {
    const controller = create();
    contextFor(controller, { area: "grid" }).actions.toggleColumnSort("Id");

    expect(controller.getState().columnSort).toEqual([
      { columnId: "Id", direction: "asc" },
    ]);
  });

  test("a header target resolves its column, hidden or not", () => {
    const controller = create();

    const region = contextFor(controller, {
      area: "header",
      columnId: "Region",
    });
    expect(region.column?.id).toBe("Region");
    expect(region.row).toBeNull();

    const notes = contextFor(controller, { area: "header", columnId: "Notes" });
    expect(notes.column?.column.hidden).toBe(true);
  });

  test("a cell target resolves its row and column", () => {
    const context = contextFor(create(), {
      area: "cell",
      rowId: "2",
      columnId: "Region",
    });

    expect(context.row?.row).toEqual(rows[1]);
    expect(context.column?.id).toBe("Region");
  });

  test("a cell target on a row the filter hides has no row", () => {
    const context = contextFor(
      create({
        defaultFilter: [{ kind: "text", columnId: "Region", query: "West" }],
      }),
      { area: "cell", rowId: "2", columnId: "Region" },
    );

    expect(context.row).toBeNull();
    expect(context.column?.id).toBe("Region");
  });

  test("a group target resolves its column and no row", () => {
    const context = contextFor(
      create({ defaultGroupBy: [{ columnId: "Region" }] }),
      { area: "group", groupId: "West", columnId: "Region" },
    );

    expect(context.column?.id).toBe("Region");
    expect(context.row).toBeNull();
  });

  test("a target naming no column has none", () => {
    expect(
      contextFor(create(), { area: "header", columnId: "Missing" }).column,
    ).toBeNull();
  });

  test.each<GridCommandTarget>([
    { area: "body" },
    { area: "toolbar", itemId: "search" },
    { area: "grid" },
  ])("a $area target has neither row nor column", (target) => {
    const context = contextFor(create(), target);

    expect(context.target).toBe(target);
    expect(context.row).toBeNull();
    expect(context.column).toBeNull();
  });

  describe("selectedRows", () => {
    test("is not resolved until it is called, and then only once", () => {
      const counting = countingRowReads(
        create({ defaultRowSelection: ["3", "1"] }),
      );
      const context = contextFor(counting.controller, {
        area: "header",
        columnId: "Region",
      });
      expect(counting.reads()).toBe(0);

      const selected = context.selectedRows();
      expect(counting.reads()).toBe(1);
      expect(context.selectedRows()).toBe(selected);
      expect(counting.reads()).toBe(1);
    });

    test("lists the selected rows in the order they are shown, on every page", () => {
      const context = contextFor(
        create({
          defaultRowSelection: ["1", "3"],
          defaultColumnSort: [{ columnId: "Id", direction: "desc" }],
          paginated: true,
          defaultPagination: { pageIndex: 0, pageSize: 1 },
        }),
        { area: "grid" },
      );

      expect(context.selectedRows().map((entry) => entry.rowId)).toEqual([
        "3",
        "1",
      ]);
    });

    test("leaves out a selected row the filter hides", () => {
      const context = contextFor(
        create({
          defaultRowSelection: ["1", "2"],
          defaultFilter: [{ kind: "text", columnId: "Region", query: "West" }],
        }),
        { area: "grid" },
      );

      expect(context.selectedRows().map((entry) => entry.rowId)).toEqual(["1"]);
    });
  });

  test("takes a controller of any node type, and exposes none of its setup", () => {
    const controller = createGridController<Order, { readonly tag: string }>({
      dataSource: rows,
      columns: [{ field: "Id", headerTemplate: { tag: "b" } }],
    });
    const context = contextFor(controller, { area: "grid" });

    expect(context.view.columns[0]?.label).toEqual({ tag: "b" });
    expectTypeOf(context.actions).not.toHaveProperty("setOptions");
    expectTypeOf(context.actions).not.toHaveProperty("subscribe");
  });
});
