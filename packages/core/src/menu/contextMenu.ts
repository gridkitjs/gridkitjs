import type { BuiltInCommandId } from "../commands/builtInCommands";
import type { GridCommandContext, GridCommandTarget } from "../commands/types";
import type { MenuEntry } from "./types";

/** The parts of a grid that open a context menu of their own. */
export type GridContextMenuArea = "header" | "cell" | "group" | "body";

/**
 * Where a context menu opens: a command target in one of the context menu
 * areas — a column header, a data cell, a group header row, or empty space
 * in the body — or in `Area` alone.
 */
export type GridContextMenuTarget<
  Area extends GridContextMenuArea = GridContextMenuArea,
> = Extract<GridCommandTarget, { readonly area: Area }>;

/** What `onContextMenuOpenChange` is told as a context menu opens or closes. */
export interface ContextMenuOpenChangeEvent {
  readonly open: boolean;
  /** Where the menu opened, or where the one closing had. */
  readonly target: GridContextMenuTarget;
}

/** What a function given for an area is asked, each time its menu opens. */
export interface GridContextMenuRequest<
  Row,
  Area extends GridContextMenuArea = GridContextMenuArea,
> {
  /** Where the menu opens. */
  readonly target: GridContextMenuTarget<Area>;
  /** The area's default entries, to keep, trim, reorder or add to. */
  readonly defaults: readonly MenuEntry<Row>[];
  /** The grid as the menu sees it — the context its items run in. */
  readonly context: GridCommandContext<Row>;
}

/**
 * An area's menu: its entries, or a function that works them out each time
 * the menu opens — from where it opens, the area's defaults and the grid's
 * state. A function giving `null` or `[]` shows no grid menu there, so the
 * browser's own menu shows.
 */
export type GridContextMenuEntries<
  Row,
  Area extends GridContextMenuArea = GridContextMenuArea,
> =
  | readonly MenuEntry<Row>[]
  | ((
      request: GridContextMenuRequest<Row, Area>,
    ) => readonly MenuEntry<Row>[] | null);

/**
 * A grid's context menus, by area, in the vocabulary every grid menu is
 * written in. An area left out shows its defaults; one given `[]` shows no
 * grid menu, so the browser's own menu shows there.
 */
export interface GridContextMenuOptions<Row> {
  /** A column header's menu. */
  readonly header?: GridContextMenuEntries<Row, "header"> | undefined;
  /** A data cell's menu, acting on its row and cell. */
  readonly cell?: GridContextMenuEntries<Row, "cell"> | undefined;
  /** A group header row's menu. */
  readonly group?: GridContextMenuEntries<Row, "group"> | undefined;
  /** The menu of the body's empty space, below the last row or in a grid with none. */
  readonly body?: GridContextMenuEntries<Row, "body"> | undefined;
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
 * Whether the `contextMenu` option opens a grid menu on `area` at all: it is
 * on, and gives the area entries or a function rather than `[]`. A function
 * may still give no menu for one place or another; this answers for the
 * area, as a cell's `aria-keyshortcuts` needs to before anything is asked.
 */
export function hasContextMenu<Row>(
  contextMenu: boolean | GridContextMenuOptions<Row> | undefined,
  area: GridContextMenuArea,
): boolean {
  if (contextMenu === undefined || contextMenu === false) {
    return false;
  }
  const entries =
    (contextMenu === true ? undefined : contextMenu[area]) ??
    defaultContextMenu[area];
  return typeof entries === "function" || entries.length > 0;
}

/** What an area's option gives one request: its defaults when left out. */
function entriesFor<Row, Area extends GridContextMenuArea>(
  given: GridContextMenuEntries<Row, Area> | undefined,
  request: GridContextMenuRequest<Row, Area>,
): readonly MenuEntry<Row>[] {
  if (given === undefined) {
    return request.defaults;
  }
  return typeof given === "function" ? (given(request) ?? []) : given;
}

/**
 * The entries a grid's `contextMenu` option gives the place `context.target`
 * names, to resolve with `resolveMenu` in that same context: none while the
 * option is off — left out or `false` — or for a target no context menu
 * opens on; the area's defaults under `true` or when the option leaves the
 * area out; the entries it lists; or what its function gives this request.
 * No entries means no grid menu there.
 */
export function contextMenuEntries<Row>(
  contextMenu: boolean | GridContextMenuOptions<Row> | undefined,
  context: GridCommandContext<Row>,
): readonly MenuEntry<Row>[] {
  if (contextMenu === undefined || contextMenu === false) {
    return [];
  }
  const options: GridContextMenuOptions<Row> =
    contextMenu === true ? {} : contextMenu;
  const { target } = context;
  switch (target.area) {
    case "header":
      return entriesFor(options.header, {
        target,
        defaults: defaultContextMenu.header,
        context,
      });
    case "cell":
      return entriesFor(options.cell, {
        target,
        defaults: defaultContextMenu.cell,
        context,
      });
    case "group":
      return entriesFor(options.group, {
        target,
        defaults: defaultContextMenu.group,
        context,
      });
    case "body":
      return entriesFor(options.body, {
        target,
        defaults: defaultContextMenu.body,
        context,
      });
    default:
      return [];
  }
}
