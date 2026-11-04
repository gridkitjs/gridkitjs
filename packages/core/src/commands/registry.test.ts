import { afterEach, describe, expect, test, vi } from "vitest";

import { createGridController } from "../controller/createGridController";
import { defaultMessages } from "../messages";
import { builtInCommands } from "./builtInCommands";
import { createCommandContext } from "./context";
import { resolveCommands, runCommand } from "./registry";
import type { GridCommand, GridCommandContext } from "./types";

/** The global core's `lib` leaves out — see `util/report.ts`. */
declare const console: { error: (message: string) => void };

interface Row {
  Id: number;
}

function context(): GridCommandContext<Row> {
  return createCommandContext({
    controller: createGridController<Row>({ dataSource: [{ Id: 1 }] }),
    target: { area: "grid" },
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

function command(overrides: Partial<GridCommand<Row>> = {}): GridCommand<Row> {
  return { id: "app.export", label: "Export", execute: vi.fn(), ...overrides };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("resolveCommands", () => {
  test("holds every built-in by id", () => {
    const registry = resolveCommands<Row>(undefined);

    expect([...registry.keys()]).toEqual(
      builtInCommands().map((entry) => entry.id),
    );
  });

  test("adds the app's commands after the built-ins", () => {
    const exportCommand = command();
    const registry = resolveCommands([exportCommand]);

    expect(registry.get("app.export")).toBe(exportCommand);
    expect([...registry.keys()].at(-1)).toBe("app.export");
  });

  test("an app command replaces the built-in of the same id, in its place", () => {
    const hide = command({ id: "column.hide", label: "Spalte ausblenden" });
    const registry = resolveCommands([hide]);
    const ids = [...registry.keys()];

    expect(registry.get("column.hide")).toBe(hide);
    expect(ids).toHaveLength(builtInCommands().length);
    expect(ids.indexOf("column.hide")).toBe(
      builtInCommands().findIndex((entry) => entry.id === "column.hide"),
    );
  });

  test("leaves out and reports a command with the id `separator`", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {
      // Expected; keeps the test output clean.
    });
    const registry = resolveCommands([command({ id: "separator" })]);

    expect(registry.has("separator")).toBe(false);
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining("the id `separator`"),
    );
  });
});

describe("runCommand", () => {
  test("runs a command with no predicates, and says it ran", () => {
    const execute = vi.fn();
    const grid = context();

    expect(runCommand(command({ execute }), grid)).toBe(true);
    expect(execute).toHaveBeenCalledWith(grid);
  });

  test("refuses a disabled command", () => {
    const execute = vi.fn();

    expect(
      runCommand(command({ execute, isEnabled: () => false }), context()),
    ).toBe(false);
    expect(execute).not.toHaveBeenCalled();
  });

  test("refuses a hidden command, even an enabled one", () => {
    const execute = vi.fn();

    expect(
      runCommand(
        command({ execute, isVisible: () => false, isEnabled: () => true }),
        context(),
      ),
    ).toBe(false);
    expect(execute).not.toHaveBeenCalled();
  });

  test("refuses a built-in the grid's state does not allow", () => {
    const clearSorting = builtInCommands<Row>().find(
      (entry) => entry.id === "sort.clearAll",
    );

    expect(clearSorting && runCommand(clearSorting, context())).toBe(false);
  });
});
