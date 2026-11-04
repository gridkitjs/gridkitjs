import { afterEach, describe, expect, test, vi } from "vitest";

import { createCommandContext } from "../commands/context";
import { resolveCommands } from "../commands/registry";
import type { GridCommand } from "../commands/types";
import { createGridController } from "../controller/createGridController";
import type { GridControllerOptions } from "../controller/gridController";
import type { MenuItemEntry } from "../menu/types";
import { defaultMessages } from "../messages";
import type { ColumnDefinition } from "../types";
import { defaultToolbar, toolbarEntries } from "./options";
import { resolveToolbar } from "./resolveToolbar";
import type {
  GridToolbarTarget,
  ResolvedToolbarItem,
  ToolbarEntry,
} from "./types";

/** The global core's `lib` leaves out — see `util/report.ts`. */
declare const console: { error: (message: string) => void };

interface Order {
  Id: number;
  Region: string;
}

const columns: readonly ColumnDefinition<Order>[] = [
  { field: "Id", type: "number" },
  { field: "Region", groupable: true },
];

function create(options: GridControllerOptions<Order> = {}) {
  return createGridController<Order>({
    dataSource: [
      { Id: 1, Region: "West" },
      { Id: 2, Region: "East" },
    ],
    getRowId: (row) => String(row.Id),
    columns,
    sortableColumns: true,
    ...options,
  });
}

const host = {
  autoFitColumns: vi.fn(),
  openPanel: vi.fn(),
  announce: vi.fn(),
  saveFile: vi.fn(),
};

function resolve(
  entries: readonly ToolbarEntry<Order>[],
  { controller = create(), commands = resolveCommands<Order>(undefined) } = {},
) {
  return resolveToolbar(entries, {
    commands,
    contextFor: (target) =>
      createCommandContext({
        controller,
        target,
        messages: defaultMessages,
        host,
      }),
  });
}

/** What a resolved toolbar reads as: keys, with `---` for a separator and `<->` for a spacer. */
function outline(items: readonly ResolvedToolbarItem[]): string[] {
  return items.map((item) =>
    item.type === "separator"
      ? "---"
      : item.type === "spacer"
        ? "<->"
        : item.key,
  );
}

function item(
  id: string,
  overrides: Partial<MenuItemEntry<Order>> = {},
): MenuItemEntry<Order> {
  return { type: "item", id, label: id, onSelect: vi.fn(), ...overrides };
}

const hidden = (id: string) => item(id, { hidden: true });

afterEach(() => {
  vi.restoreAllMocks();
});

describe("resolveToolbar: buttons", () => {
  test("a command id becomes its command's button, keyed by its id", () => {
    const [clear] = resolve(["sort.clearAll"]);

    expect(clear).toMatchObject({
      type: "button",
      id: "sort.clearAll",
      key: "sort.clearAll",
      label: "Clear all sorting",
      disabled: true,
      pressed: undefined,
    });
  });

  test("follows the grid's state", () => {
    const controller = create({
      defaultColumnSort: [{ columnId: "Region", direction: "asc" }],
    });

    expect(resolve(["sort.clearAll"], { controller })[0]).toMatchObject({
      disabled: false,
    });
  });

  test("leaves out a hidden command", () => {
    expect(outline(resolve(["group.expandAll", "sort.clearAll"]))).toEqual([
      "sort.clearAll",
    ]);
  });

  test("a checkable command is a toggle, pressed while checked", () => {
    const pinned: GridCommand<Order> = {
      id: "app.pinned",
      label: "Pinned",
      isChecked: ({ state }) => state.columnSort.length > 0,
      execute: vi.fn(),
    };

    expect(
      resolve(["app.pinned"], { commands: resolveCommands([pinned]) })[0],
    ).toMatchObject({ type: "button", pressed: false });
  });

  test("an inline item is a button, its flags read from the context", () => {
    const onSelect = vi.fn();
    const [button] = resolve([
      item("app.refresh", {
        label: ({ target }) =>
          target.area === "toolbar" ? `Refresh ${target.itemId}` : "",
        icon: "refresh",
        shortcut: "F5",
        checked: true,
        onSelect,
      }),
    ]);

    expect(button).toMatchObject({
      type: "button",
      id: "app.refresh",
      key: "app.refresh",
      label: "Refresh app.refresh",
      icon: "refresh",
      shortcut: "F5",
      disabled: false,
      pressed: true,
    });
    expect(button?.type === "button" && button.run()).toBe(true);
    expect(onSelect).toHaveBeenCalledOnce();
  });

  test("hidden and disabled work as predicates or values", () => {
    const onSelect = vi.fn();
    const items = resolve([
      item("a", { hidden: () => true }),
      item("b", { hidden: false, disabled: () => true, onSelect }),
    ]);

    expect(outline(items)).toEqual(["b"]);
    expect(items[0]).toMatchObject({ disabled: true });
    expect(items[0]?.type === "button" && items[0].run()).toBe(false);
    expect(onSelect).not.toHaveBeenCalled();
  });

  test("runs a command with its toolbar item as the target", () => {
    const execute = vi.fn();
    const command: GridCommand<Order> = { id: "app.go", label: "Go", execute };
    const [button] = resolve(["app.go"], {
      commands: resolveCommands([command]),
    });

    expect(button?.type === "button" && button.run()).toBe(true);
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { area: "toolbar", itemId: "app.go" },
      }),
    );
  });

  test("leaves out an unknown id, reporting it once per command map", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {
      // Expected; keeps the test output clean.
    });
    const commands = resolveCommands<Order>(undefined);

    expect(
      outline(resolve(["filter.clearAl", "filter.clearAll"], { commands })),
    ).toEqual(["filter.clearAll"]);
    resolve(["filter.clearAl"], { commands });
    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining("`filter.clearAl` names no command"),
    );
  });
});

describe("resolveToolbar: dropdowns", () => {
  test("a submenu is a dropdown, its items resolved as a menu's", () => {
    const controller = create({ defaultGroupBy: [{ columnId: "Region" }] });
    const [menu] = resolve(
      [
        {
          type: "submenu",
          id: "groups",
          label: "Groups",
          icon: "group",
          items: [
            "group.expandAll",
            "separator",
            hidden("a"),
            "group.collapseAll",
          ],
        },
      ],
      { controller },
    );

    expect(menu).toMatchObject({
      type: "menu",
      id: "groups",
      key: "groups",
      label: "Groups",
      icon: "group",
      items: [
        { type: "item", id: "group.expandAll" },
        { type: "separator" },
        { type: "item", id: "group.collapseAll" },
      ],
    });
  });

  test("its items run with the dropdown as their target", () => {
    const onSelect = vi.fn();
    const [menu] = resolve([
      {
        type: "submenu",
        id: "actions",
        label: "Actions",
        items: [item("app.export", { onSelect })],
      },
    ]);
    const exportItem = menu?.type === "menu" ? menu.items[0] : undefined;

    expect(exportItem?.type === "item" && exportItem.run()).toBe(true);
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { area: "toolbar", itemId: "actions" },
      }),
    );
  });

  test("is left out when nothing in it shows", () => {
    expect(
      resolve([
        {
          type: "submenu",
          id: "groups",
          label: "Groups",
          items: ["group.expandAll", "group.collapseAll"],
        },
      ]),
    ).toEqual([]);
  });
});

describe("resolveToolbar: toolbar entries", () => {
  test("search, spacer and custom entries stay, keyed", () => {
    expect(
      resolve(["search", "spacer", { type: "custom", id: "app.status" }]),
    ).toEqual([
      { type: "search", key: "search" },
      { type: "spacer", key: "spacer-1" },
      { type: "custom", id: "app.status", key: "app.status" },
    ]);
  });

  test("separators are keyed by their place among the entries", () => {
    expect(resolve(["search", "separator", "filter.clearAll"])[1]).toEqual({
      type: "separator",
      key: "separator-1",
    });
  });

  test("context is asked for each item by its own target", () => {
    const targets: GridToolbarTarget[] = [];
    const controller = create();
    resolveToolbar<Order>(
      ["search", "separator", "sort.clearAll", item("app.go")],
      {
        commands: resolveCommands<Order>(undefined),
        contextFor: (target) => {
          targets.push(target);
          return createCommandContext({
            controller,
            target,
            messages: defaultMessages,
            host,
          });
        },
      },
    );

    expect(targets).toEqual([
      { area: "toolbar", itemId: "sort.clearAll" },
      { area: "toolbar", itemId: "app.go" },
    ]);
  });
});

describe("resolveToolbar: separators", () => {
  test("never lead, trail or double up", () => {
    expect(
      outline(
        resolve([
          "separator",
          "search",
          "separator",
          "separator",
          "filter.clearAll",
          "separator",
        ]),
      ),
    ).toEqual(["search", "---", "filter.clearAll"]);
  });

  test("collapse around a spacer", () => {
    expect(
      outline(
        resolve([
          "search",
          "separator",
          "spacer",
          "separator",
          "filter.clearAll",
        ]),
      ),
    ).toEqual(["search", "<->", "filter.clearAll"]);
  });

  test("collapse once the items between them are hidden", () => {
    expect(
      outline(
        resolve([
          "search",
          "separator",
          "group.expandAll",
          "separator",
          hidden("a"),
          "spacer",
          "filter.clearAll",
        ]),
      ),
    ).toEqual(["search", "<->", "filter.clearAll"]);
  });

  test("leave spacers alone, leading, trailing or doubled", () => {
    expect(outline(resolve(["spacer", "search", "spacer", "spacer"]))).toEqual([
      "<->",
      "search",
      "<->",
      "<->",
    ]);
  });
});

describe("toolbarEntries", () => {
  test("lists nothing while the toolbar is off", () => {
    expect(toolbarEntries<Order>(undefined)).toEqual([]);
    expect(toolbarEntries<Order>(false)).toEqual([]);
  });

  test("lists the defaults under true, or without items", () => {
    expect(toolbarEntries<Order>(true)).toBe(defaultToolbar);
    expect(toolbarEntries<Order>({ label: "Orders" })).toBe(defaultToolbar);
    expect(defaultToolbar).toEqual([
      "search",
      "spacer",
      "filter.clearAll",
      "column.choose",
    ]);
  });

  test("lists the items given", () => {
    const items = ["sort.clearAll", "search"] as const;

    expect(toolbarEntries<Order>({ items })).toBe(items);
    expect(toolbarEntries<Order>({ items: [] })).toEqual([]);
  });
});

test("the default toolbar resolves to a search box, a spacer, Clear filters and Choose columns", () => {
  expect(outline(resolve(toolbarEntries(true)))).toEqual([
    "search",
    "<->",
    "filter.clearAll",
    "column.choose",
  ]);
});
