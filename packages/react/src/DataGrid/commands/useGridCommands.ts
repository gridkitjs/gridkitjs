import { useMemo } from "react";
import {
  createCommandContext,
  resolveCommands,
  runCommand,
  type GridCommand,
  type GridCommandContext,
  type GridCommandHost,
  type GridCommandSource,
  type GridCommandTarget,
  type GridMessages,
  type GridOptions,
} from "@gridkitjs/core";
import useSaveFile from "../export/useSaveFile";
import type { ColumnResizeApi } from "../useColumnResize";
import type { DataGridController } from "../useGridController";

interface UseGridCommandsOptions<Row> {
  controller: DataGridController<Row>;
  /** The app's commands, over the built-ins. */
  commands: GridOptions<Row>["commands"];
  onCommand: GridOptions<Row>["onCommand"];
  /** The grid's messages, over the defaults — what every built-in label reads. */
  messages: GridMessages;
  announce: (text: string) => void;
  resize: ColumnResizeApi<Row>;
  /** Opens one of the grid's panels — see `useGridPanels`. */
  openPanel: GridCommandHost["openPanel"];
}

export interface GridCommandsApi<Row> {
  /** Every command the grid knows, by id. */
  commands: ReadonlyMap<string, GridCommand<Row>>;
  /** What a command needs that only the grid has: its DOM, its live region. */
  host: GridCommandHost;
  /** A command context for `target`, over the grid as it is now. */
  contextFor: (target: GridCommandTarget) => GridCommandContext<Row>;
  /** Tells `onCommand` that a command, or an inline menu item, ran. */
  report: (
    commandId: string,
    target: GridCommandTarget,
    source: GridCommandSource,
  ) => void;
  /**
   * Runs the command `commandId` on `target` when it is visible and enabled
   * there, reports it, and says whether it ran.
   */
  run: (
    commandId: string,
    target: GridCommandTarget,
    source: GridCommandSource,
  ) => boolean;
}

/**
 * The commands behind the grid's menus — the built-ins and the app's own —
 * and the context they run in. Which command shows, is enabled or does what
 * is `@gridkitjs/core`'s; the grid lends them what needs a DOM — sizing a
 * column to its content, as double-clicking its resize handle does,
 * opening its panels and downloading an export — and its live region.
 */
export default function useGridCommands<Row>({
  controller,
  commands: appCommands,
  onCommand,
  messages,
  announce,
  resize,
  openPanel,
}: UseGridCommandsOptions<Row>): GridCommandsApi<Row> {
  const commands = useMemo(() => resolveCommands(appCommands), [appCommands]);
  const saveFile = useSaveFile({ messages, announce });

  const host: GridCommandHost = {
    autoFitColumns: (columnIds) => {
      const { columns } = controller.getView();
      let fitted = 0;
      for (const columnId of columnIds) {
        const entry = columns.find((candidate) => candidate.id === columnId);
        if (entry !== undefined && resize.sizeToContent(entry)) {
          fitted += 1;
        }
      }
      // Each resize announced itself, and the live region keeps only the
      // last; one message for them all replaces it before anything is read.
      if (fitted > 1) {
        announce(messages.columnsAutoFitted(fitted));
      }
    },
    openPanel,
    announce,
    saveFile,
  };

  function contextFor(target: GridCommandTarget): GridCommandContext<Row> {
    return createCommandContext({ controller, target, messages, host });
  }

  function report(
    commandId: string,
    target: GridCommandTarget,
    source: GridCommandSource,
  ): void {
    onCommand?.({ commandId, target, source });
  }

  // A new object each render, as the other hooks here return.
  return {
    commands,
    host,
    contextFor,
    report,
    run: (commandId, target, source) => {
      const command = commands.get(commandId);
      if (command === undefined) {
        console.error(`DataGrid: there is no command \`${commandId}\` to run.`);
        return false;
      }
      if (!runCommand(command, contextFor(target))) {
        return false;
      }
      report(commandId, target, source);
      return true;
    },
  };
}
