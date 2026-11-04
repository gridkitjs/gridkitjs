import { describe, expect, test, vi } from "vitest";

import { createCommandContext } from "../commands/context";
import type { GridCommandTarget } from "../commands/types";
import { createGridController } from "../controller/createGridController";
import { defaultMessages } from "../messages";
import {
  contextMenuEntries,
  defaultContextMenu,
  hasContextMenu,
  type GridContextMenuRequest,
} from "./contextMenu";
import type { MenuEntry } from "./types";

interface Person {
  id: string;
  name: string;
}

function contextOn(target: GridCommandTarget) {
  return createCommandContext({
    controller: createGridController<Person>({
      dataSource: [{ id: "p-1", name: "Ada" }],
      getRowId: (row) => row.id,
      columns: [{ field: "name" }],
    }),
    target,
    messages: defaultMessages,
    host: {
      autoFitColumns: vi.fn(),
      openPanel: vi.fn(),
      announce: vi.fn(),
      saveFile: vi.fn(),
      writeClipboard: vi.fn(),
    },
  });
}

const header = contextOn({ area: "header", columnId: "name" });
const cell = contextOn({ area: "cell", rowId: "p-1", columnId: "name" });

describe("contextMenuEntries", () => {
  test("gives no entries while the option is left out or off", () => {
    expect(contextMenuEntries(undefined, header)).toEqual([]);
    expect(contextMenuEntries(false, header)).toEqual([]);
  });

  test("gives an area its defaults under true, or when the option leaves it out", () => {
    expect(contextMenuEntries(true, header)).toBe(defaultContextMenu.header);
    expect(contextMenuEntries({}, header)).toBe(defaultContextMenu.header);
  });

  test("gives an area the entries the option lists, none included", () => {
    const entries: readonly MenuEntry<Person>[] = ["column.hide"];

    expect(contextMenuEntries({ header: entries }, header)).toBe(entries);
    expect(contextMenuEntries({ header: [] }, header)).toEqual([]);
  });

  test("keeps each area apart, an area left out keeping its defaults", () => {
    const entries: readonly MenuEntry<Person>[] = ["selection.clear"];
    const group = contextOn({ area: "group", groupId: "g", columnId: "name" });

    expect(contextMenuEntries({ cell: entries }, cell)).toBe(entries);
    expect(contextMenuEntries({ cell: entries }, group)).toBe(
      defaultContextMenu.group,
    );
    expect(contextMenuEntries(true, contextOn({ area: "body" }))).toEqual([]);
  });

  test("asks an area's function, with its target, defaults and context", () => {
    const requests: GridContextMenuRequest<Person, "cell">[] = [];
    const entries = contextMenuEntries(
      {
        cell: (request) => {
          requests.push(request);
          return ["separator", ...request.defaults.slice(0, 1)];
        },
      },
      cell,
    );

    expect(entries).toEqual(["separator", "copy.cell"]);
    expect(requests).toEqual([
      {
        target: { area: "cell", rowId: "p-1", columnId: "name" },
        defaults: defaultContextMenu.cell,
        context: cell,
      },
    ]);
  });

  test("reads a function giving null as no grid menu", () => {
    expect(contextMenuEntries({ header: () => null }, header)).toEqual([]);
  });

  test("gives a target no context menu opens on nothing", () => {
    expect(contextMenuEntries(true, contextOn({ area: "grid" }))).toEqual([]);
    expect(
      contextMenuEntries(true, contextOn({ area: "toolbar", itemId: "x" })),
    ).toEqual([]);
  });
});

describe("hasContextMenu", () => {
  test("is off while the option is, and for an area given []", () => {
    expect(hasContextMenu(undefined, "header")).toBe(false);
    expect(hasContextMenu(false, "cell")).toBe(false);
    expect(hasContextMenu({ header: [] }, "header")).toBe(false);
  });

  test("is on for an area with entries, defaults or a function", () => {
    expect(hasContextMenu(true, "header")).toBe(true);
    expect(hasContextMenu({ header: [] }, "cell")).toBe(true);
    expect(hasContextMenu<Person>({ group: () => null }, "group")).toBe(true);
  });

  test("is off for the body until it is given entries", () => {
    expect(hasContextMenu(true, "body")).toBe(false);
    expect(hasContextMenu({ body: ["sort.clearAll"] }, "body")).toBe(true);
  });
});

describe("defaultContextMenu", () => {
  test("a header sorts, groups, fits and hides its column, and chooses columns", () => {
    expect(defaultContextMenu.header).toEqual([
      "sort.ascending",
      "sort.descending",
      "sort.clear",
      "separator",
      "group.add",
      "group.remove",
      "separator",
      "column.autoFit",
      "column.autoFitAll",
      "separator",
      "column.hide",
      "column.choose",
    ]);
  });

  test("a cell copies, selects and expands or collapses, a group row also ungroups", () => {
    expect(defaultContextMenu.cell).toEqual([
      "copy.cell",
      "copy.row",
      "copy.selection",
      "separator",
      "selection.selectAllRows",
      "selection.clear",
      "separator",
      "group.expandAll",
      "group.collapseAll",
    ]);
    expect(defaultContextMenu.group).toEqual([
      "group.expandAll",
      "group.collapseAll",
      "separator",
      "group.remove",
    ]);
  });

  test("the body keeps the browser's menu", () => {
    expect(defaultContextMenu.body).toEqual([]);
  });
});
