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
});
