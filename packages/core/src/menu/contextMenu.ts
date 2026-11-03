import type { BuiltInCommandId } from "../commands/builtInCommands";
import type { GridCommandTarget } from "../commands/types";
import type { MenuEntry } from "./types";

/** The parts of a grid that open a context menu of their own. */
export type GridContextMenuArea = "header" | "cell" | "group" | "body";

/**
 * Where a context menu opens: a command target in one of the context menu
 * areas — a column header, a data cell, a group header row, or empty space
 * in the body.
 */
export type GridContextMenuTarget = Extract<
  GridCommandTarget,
  { readonly area: GridContextMenuArea }
>;

/**
 * A grid's context menus, by area — each the entries of its menu, in the
 * vocabulary every grid menu is written in. An area left out shows its
 * defaults; one given `[]` shows no grid menu, so the browser's own menu
 * shows there.
 */
export interface GridContextMenuOptions<Row> {
  /** A column header's menu. */
  readonly header?: readonly MenuEntry<Row>[] | undefined;
  /** A data cell's menu, acting on its row and cell. */
  readonly cell?: readonly MenuEntry<Row>[] | undefined;
  /** A group header row's menu. */
  readonly group?: readonly MenuEntry<Row>[] | undefined;
  /** The menu of the body's empty space, below the last row or in a grid with none. */
  readonly body?: readonly MenuEntry<Row>[] | undefined;
}

/**
 * The menu each area shows unless the grid says otherwise — built-in
 * commands only, each hidden where it has nothing to act on, so the menu a
 * column header shows holds only what that column can do. The body has
 * none: empty space keeps the browser's menu until a grid gives it one.
 */
export const defaultContextMenu: {
  readonly [Area in GridContextMenuArea]: readonly (
    BuiltInCommandId | "separator"
  )[];
} = {
  header: [
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
  ],
  cell: [
    "selection.selectAllRows",
    "selection.clear",
    "separator",
    "group.expandAll",
    "group.collapseAll",
  ],
  group: ["group.expandAll", "group.collapseAll", "separator", "group.remove"],
  body: [],
};

/**
 * The entries a grid's `contextMenu` option gives `area`, to resolve with
 * `resolveMenu`: none while the option is off — left out or `false` — the
 * area's defaults under `true` or when the option leaves the area out, and
 * otherwise the entries it lists. No entries means no grid menu there.
 */
export function contextMenuEntries<Row>(
  contextMenu: boolean | GridContextMenuOptions<Row> | undefined,
  area: GridContextMenuArea,
): readonly MenuEntry<Row>[] {
  if (contextMenu === undefined || contextMenu === false) {
    return [];
  }
  if (contextMenu === true) {
    return defaultContextMenu[area];
  }
  return contextMenu[area] ?? defaultContextMenu[area];
}
