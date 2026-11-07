import { afterEach, describe, expect, test, vi } from "vitest";

import { createCommandContext } from "../commands/context";
import { resolveCommands } from "../commands/registry";
import type { GridCommand } from "../commands/types";
import { createGridController } from "../controller/createGridController";
import type { GridControllerOptions } from "../controller/gridController";
import type { MenuItemEntry } from "../menu/types";
import type { ExportWriter } from "../export/writer";
import { defaultMessages } from "../messages";
import type { ColumnDefinition } from "../types";
import { defaultToolbar, toolbarEntries } from "./options";
import { resolveToolbar, type ToolbarResolveOptions } from "./resolveToolbar";
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
  writeClipboard: vi.fn(),
  print: vi.fn(),
};

function resolve(
  entries: readonly ToolbarEntry<Order>[],
  {
    controller = create(),
    commands = resolveCommands<Order>(undefined),
    itemAttributes,
  }: Pick<ToolbarResolveOptions<Order>, "itemAttributes"> & {
    controller?: ReturnType<typeof create>;
    commands?: ToolbarResolveOptions<Order>["commands"];
  } = {},
) {
  return resolveToolbar(entries, {
    commands,
    itemAttributes,
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

describe("resolveToolbar: the export entry", () => {
  /** A dropdown's items, as ids with `---` for a separator. */
  function menuOutline(entry: ResolvedToolbarItem | undefined): string[] {
    return entry?.type === "menu"
      ? entry.items.map((item) => (item.type === "separator" ? "---" : item.id))
      : [];
  }

  const xlsxWriter: ExportWriter = {
    format: "xlsx",
    fileExtension: "xlsx",
    mimeType: "application/octet-stream",
    write: () => new Uint8Array(),
  };

  test("is a dropdown keyed export, of the exports that show", () => {
    const [menu] = resolve(["export"]);

    expect(menu).toMatchObject({
      type: "menu",
      id: "export",
      key: "export",
      label: "Export",
    });
    expect(menuOutline(menu)).toEqual(["export.csv", "export.json"]);
  });

  test("lists xlsx with a writer for it, and the selection exports while rows are selected", () => {
    const controller = create({
      defaultRowSelection: ["2"],
      exportWriters: [xlsxWriter],
    });

    expect(menuOutline(resolve(["export"], { controller })[0])).toEqual([
      "export.csv",
      "export.json",
      "export.xlsx",
      "---",
      "exportSelection.csv",
      "exportSelection.json",
      "exportSelection.xlsx",
    ]);
  });

  test("its items run with the dropdown as their target", () => {
    const context = vi.fn((target: GridToolbarTarget) =>
      createCommandContext({
        controller: create(),
        target,
        messages: defaultMessages,
        host,
      }),
    );
    const [menu] = resolveToolbar<Order>(["export"], {
      commands: resolveCommands(undefined),
      contextFor: context,
    });
    const csv = menu?.type === "menu" ? menu.items[0] : undefined;

    expect(context).toHaveBeenCalledExactlyOnceWith({
      area: "toolbar",
      itemId: "export",
    });
    expect(csv?.type === "item" && csv.run()).toBe(true);
    expect(host.saveFile).toHaveBeenCalledWith(
      expect.objectContaining({ fileName: "export.csv" }),
    );
  });

  test("is left out when no export shows", () => {
    const hiddenExport = (id: string): GridCommand<Order> => ({
      id,
      label: id,
      isVisible: () => false,
      execute: vi.fn(),
    });
    const commands = resolveCommands([
      hiddenExport("export.csv"),
      hiddenExport("export.json"),
    ]);

    expect(outline(resolve(["search", "export"], { commands }))).toEqual([
      "search",
    ]);
  });

  test("is not among the defaults", () => {
    expect(defaultToolbar).not.toContain("export");
  });
});

describe("resolveToolbar: item attributes", () => {
  test("a command's button carries the attributes keyed by its id", () => {
    const [clear] = resolve(["sort.clearAll"], {
      itemAttributes: { "sort.clearAll": { id: "clear-sort" } },
    });

    expect(clear).toMatchObject({
      type: "button",
      key: "sort.clearAll",
      attributes: { id: "clear-sort" },
    });
  });

  test("an inline item's button carries them by the item's id", () => {
    const [go] = resolve([item("app.go")], {
      itemAttributes: { "app.go": { "data-test": "go" } },
    });

    expect(go).toMatchObject({ attributes: { "data-test": "go" } });
  });

  test("the search box, export dropdown and custom entries carry them by key", () => {
    const attributes = {
      search: { "data-test": "search" },
      export: { id: "export-button", "data-test": "export" },
      "app.status": { id: "status" },
    };

    expect(
      resolve(["search", "export", { type: "custom", id: "app.status" }], {
        itemAttributes: attributes,
      }).map((entry) => [
        entry.type,
        "attributes" in entry && entry.attributes,
      ]),
    ).toEqual([
      ["search", attributes.search],
      ["menu", attributes.export],
      ["custom", attributes["app.status"]],
    ]);
  });

  test("an entry no key names carries none, and a key naming no entry is ignored", () => {
    const items = resolve(["search", "spacer", "filter.clearAll"], {
      itemAttributes: {
        "filter.clearAll": { id: "clear-filters" },
        "group.expandAll": { id: "expand" },
        "spacer-1": { id: "gap" },
      },
    });

    expect(items[0]).toEqual({ type: "search", key: "search" });
    expect(items[1]).toEqual({ type: "spacer", key: "spacer-1" });
    expect(items[2]).toMatchObject({ attributes: { id: "clear-filters" } });
    expect(items).toHaveLength(3);
  });
});

describe("resolveToolbar: print", () => {
  test("is a button of its own, opt-in, that hands the host a document", () => {
    const [print] = resolve(["print"]);

    expect(print).toMatchObject({
      type: "button",
      id: "print",
      label: "Print",
      icon: "print",
      disabled: false,
    });
    expect(print?.type === "button" && print.run()).toBe(true);
    expect(host.print).toHaveBeenCalledOnce();
    expect(defaultToolbar).not.toContain("print");
  });
});
