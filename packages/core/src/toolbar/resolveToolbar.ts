import type { GridCommand, GridCommandContext } from "../commands/types";
import { collapseSeparators, resolveMenuEntry } from "../menu/resolveMenu";
import type { MenuSubmenuEntry } from "../menu/types";
import type {
  GridToolbarTarget,
  ResolvedToolbarItem,
  ToolbarEntry,
  ToolbarItemAttributes,
} from "./types";

/** What `resolveToolbar` resolves a toolbar's entries against. */
export interface ToolbarResolveOptions<Row> {
  /** Every command the grid knows, by id — see `resolveCommands`. */
  readonly commands: ReadonlyMap<string, GridCommand<Row>>;
  /**
   * The context an item resolves and runs in, for its target — the item
   * itself, or the dropdown an item in one is listed under. A command that
   * opens a panel anchors it there.
   */
  readonly contextFor: (target: GridToolbarTarget) => GridCommandContext<Row>;
  /** Attributes for entries' elements, by key — see `GridToolbarOptions`. */
  readonly itemAttributes?:
    Readonly<Record<string, ToolbarItemAttributes>> | undefined;
}

function isSpacer(entry: ResolvedToolbarItem): boolean {
  return entry.type === "spacer";
}

/**
 * What the `"export"` entry stands for: a dropdown of every export
 * built-in, the selection exports after a separator. Each command hides
 * where it cannot act — xlsx and PDF until a writer is registered, the
 * selection exports while nothing is selected — so the dropdown lists what
 * the grid can export now, and is left out when that is nothing.
 */
function exportMenu<Row>(): MenuSubmenuEntry<Row> {
  return {
    type: "submenu",
    id: "export",
    label: ({ messages }) => messages.exportMenu,
    items: [
      "export.csv",
      "export.json",
      "export.xlsx",
      "export.pdf",
      "separator",
      "exportSelection.csv",
      "exportSelection.json",
      "exportSelection.xlsx",
    ],
  };
}

/**
 * A toolbar's entries resolved against the grid, ready to draw, by the
 * rules `resolveMenu` follows:
 *
 * - A command id becomes its command's button, and an inline item a button
 *   of its own; either is a toggle, with `pressed`, when it is checkable. A
 *   hidden one is left out, and so is an id naming no command, reported
 *   once per command map through `console.error`.
 * - A submenu becomes a dropdown, its items resolved as a menu's, and is
 *   left out when nothing in it shows. `"export"` is one too, of the export
 *   commands, keyed `"export"`.
 * - `"search"`, `"spacer"` and custom entries stay as they are.
 * - Separators never lead, trail, double up or sit next to a spacer, which
 *   already parts what is on either side of it.
 * - A button, dropdown, search box or custom entry whose key
 *   `itemAttributes` names carries those `attributes`.
 *
 * Resolve again whenever the grid changes, so each button's label, flags
 * and `run` follow its state.
 */
export function resolveToolbar<Row>(
  entries: readonly ToolbarEntry<Row>[],
  options: ToolbarResolveOptions<Row>,
): readonly ResolvedToolbarItem[] {
  const { commands, contextFor, itemAttributes } = options;

  function withAttributes(item: ResolvedToolbarItem): ResolvedToolbarItem {
    // An own key only: an entry id such as "toString" must not pick up an
    // `Object.prototype` member of the map.
    if (
      item.type === "separator" ||
      item.type === "spacer" ||
      itemAttributes === undefined ||
      !Object.hasOwn(itemAttributes, item.key)
    ) {
      return item;
    }
    const attributes = itemAttributes[item.key];
    return attributes === undefined ? item : { ...item, attributes };
  }

  function resolveEntry(
    entry: ToolbarEntry<Row>,
    index: number,
  ): ResolvedToolbarItem | null {
    if (entry === "search") {
      return { type: "search", key: "search" };
    }
    if (entry === "spacer") {
      return { type: "spacer", key: `spacer-${String(index)}` };
    }
    if (typeof entry === "object" && entry.type === "custom") {
      return { type: "custom", id: entry.id, key: entry.id };
    }
    if (entry === "separator") {
      return { type: "separator", key: `separator-${String(index)}` };
    }
    const menuEntry = entry === "export" ? exportMenu<Row>() : entry;
    const resolved = resolveMenuEntry(menuEntry, index, {
      commands,
      context: contextFor({
        area: "toolbar",
        itemId: typeof menuEntry === "string" ? menuEntry : menuEntry.id,
      }),
    });
    if (resolved === null || resolved.type === "separator") {
      return resolved;
    }
    if (resolved.type === "submenu") {
      return { ...resolved, type: "menu", key: resolved.id };
    }
    const { checked, ...item } = resolved;
    return { ...item, type: "button", key: item.id, pressed: checked };
  }

  return collapseSeparators(
    entries
      .map(resolveEntry)
      .filter((entry) => entry !== null)
      .map(withAttributes),
    isSpacer,
  );
}
