import type { KeyboardEvent } from "react";
import { runCommand, type GridCommandTarget } from "@gridkitjs/core";
import { isNativeCopy } from "@gridkitjs/dom";
import type { GridCommandsApi } from "../commands/useGridCommands";
import type { DataGridController } from "../useGridController";
import type { GridNavigationApi } from "../useGridNavigation";

interface UseGridCopyOptions<Row> {
  controller: DataGridController<Row>;
  commands: GridCommandsApi<Row>;
  nav: GridNavigationApi;
}

function isCopyKey(event: KeyboardEvent): boolean {
  return (
    (event.ctrlKey || event.metaKey) &&
    !event.altKey &&
    (event.key === "c" || event.key === "C")
  );
}

/**
 * Ctrl+C (Cmd+C on a Mac) on the grid: copies the selection, else the
 * focused cell, through the same `copy.selection` and `copy.cell` commands
 * the context menu runs — so an app that overrides one changes both. The
 * returned handler belongs on the grid root's `onKeyDown`, for keys the
 * grid itself received.
 *
 * A press in a text field inside a cell, or with text highlighted on the
 * page, is the browser's, and so is one with nothing to copy: the default
 * is prevented only once a copy ran. Like the grid's other keys, it is not
 * reported to `onCommand`, which hears of menu and API runs.
 */
export default function useGridCopy<Row>({
  controller,
  commands,
  nav,
}: UseGridCopyOptions<Row>): (event: KeyboardEvent) => void {
  function run(commandId: string, target: GridCommandTarget): boolean {
    const command = commands.commands.get(commandId);
    return (
      command !== undefined && runCommand(command, commands.contextFor(target))
    );
  }

  /** The focused data cell as a command target, or `null` on a header or a group row. */
  function focusedCell(): GridCommandTarget | null {
    const { focus } = nav;
    if (focus.area === "header") {
      return null;
    }
    const { pageRows, columns } = controller.getView();
    const entry = pageRows[focus.rowIndex];
    const column = columns[focus.columnIndex];
    return entry === undefined || "kind" in entry || column === undefined
      ? null
      : { area: "cell", rowId: entry.rowId, columnId: column.id };
  }

  return (event) => {
    if (!isCopyKey(event) || isNativeCopy(event.target)) {
      return;
    }
    const cell = focusedCell();
    if (
      run("copy.selection", { area: "grid" }) ||
      (cell !== null && run("copy.cell", cell))
    ) {
      event.preventDefault();
    }
  };
}
