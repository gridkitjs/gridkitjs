import { afterEach, describe, expect, test, vi } from "vitest";

import { createCommandContext } from "../commands/context";
import { resolveCommands } from "../commands/registry";
import type { GridCommand, GridCommandTarget } from "../commands/types";
import { createGridController } from "../controller/createGridController";
import type { GridControllerOptions } from "../controller/gridController";
import { defaultMessages } from "../messages";
import type { ColumnDefinition } from "../types";
import { resolveMenu } from "./resolveMenu";
import type { MenuEntry, MenuItemEntry, ResolvedMenuEntry } from "./types";

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

function contextFor(
  controller = create(),
  target: GridCommandTarget = { area: "header", columnId: "Region" },
) {
  return createCommandContext({
    controller,
    target,
    messages: defaultMessages,
    host: { autoFitColumns: vi.fn(), openPanel: vi.fn(), announce: vi.fn() },
  });
}

function resolve(
  entries: readonly MenuEntry<Order>[],
  { commands = resolveCommands<Order>(undefined), context = contextFor() } = {},
) {
  return resolveMenu(entries, { commands, context });
}

/** What a resolved menu reads as: item ids, `---` for a separator, submenus nested. */
function outline(entries: readonly ResolvedMenuEntry[]): unknown[] {
  return entries.map((entry) =>
    entry.type === "separator"
      ? "---"
      : entry.type === "submenu"
        ? { [entry.id]: outline(entry.items) }
        : entry.id,
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

describe("resolveMenu: commands", () => {
  test("a command id becomes its command's item, labelled and flagged", () => {
    const controller = create({
      defaultColumnSort: [{ columnId: "Region", direction: "asc" }],
    });
    const [ascending, clear] = resolve(["sort.ascending", "sort.clear"], {
      context: contextFor(controller),
    });

    expect(ascending).toMatchObject({
      type: "item",
      id: "sort.ascending",
      label: "Sort ascending",
      icon: "sortAscending",
      shortcut: undefined,
      disabled: false,
      checked: true,
    });
    expect(clear).toMatchObject({
      id: "sort.clear",
      label: "Clear sort",
      disabled: false,
      checked: undefined,
    });
  });

  test("carries a command's icon and shortcut", () => {
    const command: GridCommand<Order> = {
      id: "app.refresh",
      label: "Refresh",
      icon: "refresh",
      shortcut: "F5",
      execute: vi.fn(),
    };

    expect(
      resolve(["app.refresh"], { commands: resolveCommands([command]) })[0],
    ).toMatchObject({ icon: "refresh", shortcut: "F5" });
  });

  test("leaves out a hidden command", () => {
    expect(outline(resolve(["group.remove", "group.add"]))).toEqual([
      "group.add",
    ]);
  });

  test("a disabled command shows, and does not run", () => {
    const [clear] = resolve(["sort.clear"]);

    expect(clear).toMatchObject({ disabled: true });
    expect(clear?.type === "item" && clear.run()).toBe(false);
  });

  test("run() runs the command against the context, and says it did", () => {
    const controller = create();
    const [ascending] = resolve(["sort.ascending"], {
      context: contextFor(controller),
    });

    expect(ascending?.type === "item" && ascending.run()).toBe(true);
    expect(controller.getState().columnSort).toEqual([
      { columnId: "Region", direction: "asc" },
    ]);
  });

  test("leaves out an unknown id, reporting it once per command map", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {
      // Expected; keeps the test output clean.
    });
    const commands = resolveCommands<Order>(undefined);

    expect(
      outline(resolve(["sort.ascneding", "sort.ascending"], { commands })),
    ).toEqual(["sort.ascending"]);
    resolve(["sort.ascneding"], { commands });
    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining("`sort.ascneding` names no command"),
    );

    resolve(["sort.ascneding"]);
    expect(error).toHaveBeenCalledTimes(2);
  });
});

describe("resolveMenu: inline items", () => {
  test("resolves its label, flags and run against the context", () => {
    const onSelect = vi.fn();
    const context = contextFor();
    const [resolved] = resolveMenu(
      [
        item("app.pin", {
          label: ({ column }) => `Pin ${column?.id ?? ""}`,
          icon: "pin",
          shortcut: "Alt+P",
          checked: ({ state }) => state.columnSort.length > 0,
          onSelect,
        }),
      ],
      { commands: resolveCommands<Order>(undefined), context },
    );

    expect(resolved).toMatchObject({
      type: "item",
      id: "app.pin",
      label: "Pin Region",
      icon: "pin",
      shortcut: "Alt+P",
      disabled: false,
      checked: false,
    });
    expect(resolved?.type === "item" && resolved.run()).toBe(true);
    expect(onSelect).toHaveBeenCalledWith(context);
  });

  test("is not checkable without `checked`", () => {
    expect(resolve([item("app.plain")])[0]).toMatchObject({
      checked: undefined,
    });
  });

  test("hidden as a value or a predicate leaves it out", () => {
    expect(
      outline(
        resolve([
          item("a", { hidden: true }),
          item("b", { hidden: ({ target }) => target.area === "header" }),
          item("c", { hidden: false }),
        ]),
      ),
    ).toEqual(["c"]);
  });

  test("a disabled item shows, and its run does nothing", () => {
    const onSelect = vi.fn();
    const [resolved] = resolve([
      item("app.pin", { disabled: () => true, onSelect }),
    ]);

    expect(resolved).toMatchObject({ disabled: true });
    expect(resolved?.type === "item" && resolved.run()).toBe(false);
    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe("resolveMenu: separators", () => {
  test("never lead, trail or double up", () => {
    expect(
      outline(
        resolve([
          "separator",
          "separator",
          "sort.ascending",
          "separator",
          "separator",
          "sort.descending",
          "separator",
        ]),
      ),
    ).toEqual(["sort.ascending", "---", "sort.descending"]);
  });

  test("collapse once the items between them are hidden", () => {
    expect(
      outline(
        resolve([
          "sort.ascending",
          "separator",
          hidden("a"),
          "separator",
          hidden("b"),
          "separator",
          "sort.descending",
        ]),
      ),
    ).toEqual(["sort.ascending", "---", "sort.descending"]);
  });

  test("one between two hidden items leaves nothing", () => {
    expect(resolve([hidden("a"), "separator", hidden("b")])).toEqual([]);
  });

  test("are keyed by their place among the entries, whatever is hidden", () => {
    const shown = resolve(["sort.ascending", "separator", "sort.descending"]);
    const withHidden = resolve([
      hidden("a"),
      "sort.ascending",
      "separator",
      "sort.descending",
    ]);

    expect(shown[1]).toEqual({ type: "separator", key: "separator-1" });
    expect(withHidden[1]).toEqual({ type: "separator", key: "separator-2" });
  });
});

describe("resolveMenu: submenus", () => {
  test("resolves its items the same way", () => {
    const [submenu] = resolve([
      {
        type: "submenu",
        id: "sort",
        label: ({ messages }) => messages.sortAscending.split(" ")[0] ?? "",
        icon: "sort",
        items: ["separator", "sort.ascending", hidden("a"), "sort.descending"],
      },
    ]);

    expect(submenu).toMatchObject({
      type: "submenu",
      id: "sort",
      label: "Sort",
      icon: "sort",
    });
    expect(outline(submenu === undefined ? [] : [submenu])).toEqual([
      { sort: ["sort.ascending", "sort.descending"] },
    ]);
  });

  test("is left out once nothing in it shows, and its separators collapse", () => {
    expect(
      outline(
        resolve([
          "sort.ascending",
          "separator",
          {
            type: "submenu",
            id: "more",
            label: "More",
            items: [hidden("a"), "separator", "group.remove"],
          },
          "separator",
          "sort.descending",
        ]),
      ),
    ).toEqual(["sort.ascending", "---", "sort.descending"]);
  });

  test("nests", () => {
    expect(
      outline(
        resolve([
          {
            type: "submenu",
            id: "outer",
            label: "Outer",
            items: [
              {
                type: "submenu",
                id: "inner",
                label: "Inner",
                items: ["group.add"],
              },
              {
                type: "submenu",
                id: "empty",
                label: "Empty",
                items: ["separator"],
              },
            ],
          },
        ]),
      ),
    ).toEqual([{ outer: [{ inner: ["group.add"] }] }]);
  });
});

test("an empty result means no grid menu here", () => {
  expect(
    resolve(["sort.ascending", "column.autoFit"], {
      context: contextFor(create(), { area: "body" }),
    }),
  ).toEqual([]);
});
