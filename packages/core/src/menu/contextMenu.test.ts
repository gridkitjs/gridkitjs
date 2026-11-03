import { describe, expect, test } from "vitest";

import { contextMenuEntries, defaultContextMenu } from "./contextMenu";
import type { MenuEntry } from "./types";

describe("contextMenuEntries", () => {
  test("gives no entries while the option is left out or off", () => {
    expect(contextMenuEntries(undefined, "header")).toEqual([]);
    expect(contextMenuEntries(false, "header")).toEqual([]);
  });

  test("gives an area its defaults under true, or when the option leaves it out", () => {
    expect(contextMenuEntries(true, "header")).toBe(defaultContextMenu.header);
    expect(contextMenuEntries({}, "header")).toBe(defaultContextMenu.header);
  });

  test("gives an area the entries the option lists, none included", () => {
    const header: readonly MenuEntry<unknown>[] = ["column.hide"];

    expect(contextMenuEntries({ header }, "header")).toBe(header);
    expect(contextMenuEntries({ header: [] }, "header")).toEqual([]);
  });

  test("keeps each area apart, an area left out keeping its defaults", () => {
    const cell: readonly MenuEntry<unknown>[] = ["selection.clear"];

    expect(contextMenuEntries({ cell }, "cell")).toBe(cell);
    expect(contextMenuEntries({ cell }, "group")).toBe(
      defaultContextMenu.group,
    );
    expect(contextMenuEntries(true, "body")).toEqual([]);
  });
});

describe("defaultContextMenu", () => {
  test("a header sorts, groups, fits and hides its column", () => {
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
    ]);
  });

  test("a cell selects and expands or collapses, a group row also ungroups", () => {
    expect(defaultContextMenu.cell).toEqual([
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
