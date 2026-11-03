import { reportError } from "../util/report";
import { builtInCommands } from "./builtInCommands";
import type { GridCommand, GridCommandContext } from "./types";

/** Whether `command` shows on `context`'s target. */
export function isCommandVisible<Row>(
  command: GridCommand<Row>,
  context: GridCommandContext<Row>,
): boolean {
  return command.isVisible?.(context) ?? true;
}

/** Whether `command` can run on `context`'s target. */
export function isCommandEnabled<Row>(
  command: GridCommand<Row>,
  context: GridCommandContext<Row>,
): boolean {
  return command.isEnabled?.(context) ?? true;
}

/**
 * Every command a grid knows, by id: the built-ins, then `commands` — an app
 * command with a built-in's id replacing it, so every menu and toolbar
 * listing that id gets the app's version (translated, gated by a privilege,
 * or doing something else) without being changed itself.
 *
 * A fresh map per call; a renderer resolves it once per change to
 * `commands`, not per menu.
 */
export function resolveCommands<Row>(
  commands: readonly GridCommand<Row>[] | undefined,
): ReadonlyMap<string, GridCommand<Row>> {
  const registry = new Map(
    builtInCommands<Row>().map((command) => [command.id, command]),
  );
  for (const command of commands ?? []) {
    if (command.id === "separator") {
      reportError(
        "a command cannot have the id `separator`, which a menu reads as a separator, so it is left out.",
      );
      continue;
    }
    registry.set(command.id, command);
  }
  return registry;
}

/**
 * Runs `command` when it is visible and enabled on `context`'s target, and
 * says whether it did — so a renderer reports only a command that ran, and a
 * stale button or a call through the API cannot run one the grid's state no
 * longer allows.
 */
export function runCommand<Row>(
  command: GridCommand<Row>,
  context: GridCommandContext<Row>,
): boolean {
  if (
    !isCommandVisible(command, context) ||
    !isCommandEnabled(command, context)
  ) {
    return false;
  }
  command.execute(context);
  return true;
}
