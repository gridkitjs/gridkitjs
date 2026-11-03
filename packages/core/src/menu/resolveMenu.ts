import {
  isCommandEnabled,
  isCommandVisible,
  runCommand,
} from "../commands/registry";
import type { GridCommand, GridCommandContext } from "../commands/types";
import { reportError } from "../util/report";
import type {
  MenuEntry,
  MenuItemEntry,
  MenuSubmenuEntry,
  ResolvedMenuEntry,
  ResolvedMenuItem,
  ResolvedMenuSubmenu,
} from "./types";

/** What `resolveMenu` resolves a menu's entries against. */
export interface MenuResolveOptions<Row> {
  /** Every command the grid knows, by id — see `resolveCommands`. */
  readonly commands: ReadonlyMap<string, GridCommand<Row>>;
  readonly context: GridCommandContext<Row>;
}

/**
 * Unknown ids already reported, per command map. A toolbar is resolved again
 * on every change to the grid, and one typo should say so once, not every
 * time; keyed weakly, so a map the renderer drops takes its ids with it.
 */
const reportedUnknownIds = new WeakMap<object, Set<string>>();

function reportUnknownId(commands: object, id: string): void {
  let reported = reportedUnknownIds.get(commands);
  if (reported === undefined) {
    reported = new Set();
    reportedUnknownIds.set(commands, reported);
  }
  if (reported.has(id)) {
    return;
  }
  reported.add(id);
  reportError(
    `the menu or toolbar entry \`${id}\` names no command, so it is left out.`,
  );
}

/** A label or flag an entry gives outright, or as a function of the context. */
function evaluate<Row, Value>(
  value: Value | ((context: GridCommandContext<Row>) => Value),
  context: GridCommandContext<Row>,
): Value {
  // `Value` is never itself a function here — a label is a string, a flag a
  // boolean — so a function is always the form that reads the context.
  return typeof value === "function"
    ? (value as (context: GridCommandContext<Row>) => Value)(context)
    : value;
}

function commandItem<Row>(
  command: GridCommand<Row>,
  context: GridCommandContext<Row>,
): ResolvedMenuItem | null {
  if (!isCommandVisible(command, context)) {
    return null;
  }
  return {
    type: "item",
    id: command.id,
    label: evaluate(command.label, context),
    icon: command.icon,
    shortcut: command.shortcut,
    disabled: !isCommandEnabled(command, context),
    checked: command.isChecked?.(context),
    run: () => runCommand(command, context),
  };
}

function inlineItem<Row>(
  entry: MenuItemEntry<Row>,
  context: GridCommandContext<Row>,
): ResolvedMenuItem | null {
  if (evaluate(entry.hidden ?? false, context)) {
    return null;
  }
  const disabled = evaluate(entry.disabled ?? false, context);
  return {
    type: "item",
    id: entry.id,
    label: evaluate(entry.label, context),
    icon: entry.icon,
    shortcut: entry.shortcut,
    disabled,
    checked:
      entry.checked === undefined
        ? undefined
        : evaluate(entry.checked, context),
    run: () => {
      if (disabled) {
        return false;
      }
      entry.onSelect(context);
      return true;
    },
  };
}

/**
 * `entries` with no separator first, last, or next to another — what is
 * left once the items between two separators have all been dropped. An
 * entry `isEdge` picks out — a toolbar's spacer — already parts what is on
 * either side of it, so a separator next to one goes too, as at the ends.
 */
export function collapseSeparators<Entry extends { readonly type: string }>(
  entries: readonly Entry[],
  isEdge: (entry: Entry) => boolean = () => false,
): readonly Entry[] {
  const collapsed: Entry[] = [];
  for (const entry of entries) {
    const previous = collapsed.at(-1);
    if (entry.type !== "separator") {
      if (isEdge(entry) && previous?.type === "separator") {
        collapsed.pop();
      }
      collapsed.push(entry);
    } else if (
      previous !== undefined &&
      previous.type !== "separator" &&
      !isEdge(previous)
    ) {
      collapsed.push(entry);
    }
  }
  if (collapsed.at(-1)?.type === "separator") {
    collapsed.pop();
  }
  return collapsed;
}

/**
 * One entry resolved, `null` when it shows nothing — what `resolveMenu` does
 * to each of its entries, and a toolbar to each it shares with menus.
 * `index` is the entry's place among those it was listed with, which keys a
 * separator.
 */
export function resolveMenuEntry<Row>(
  entry: MenuEntry<Row>,
  index: number,
  options: MenuResolveOptions<Row>,
): ResolvedMenuEntry | null {
  const { commands, context } = options;
  if (entry === "separator") {
    return { type: "separator", key: `separator-${String(index)}` };
  }
  if (typeof entry === "string") {
    const command = commands.get(entry);
    if (command === undefined) {
      reportUnknownId(commands, entry);
      return null;
    }
    return commandItem(command, context);
  }
  return entry.type === "item"
    ? inlineItem(entry, context)
    : resolveSubmenu(entry, options);
}

function resolveSubmenu<Row>(
  entry: MenuSubmenuEntry<Row>,
  options: MenuResolveOptions<Row>,
): ResolvedMenuSubmenu | null {
  const items = resolveMenu(entry.items, options);
  return items.length === 0
    ? null
    : {
        type: "submenu",
        id: entry.id,
        label: evaluate(entry.label, options.context),
        icon: entry.icon,
        items,
      };
}

/**
 * A menu's entries resolved against the grid as `context` sees it, ready to
 * draw:
 *
 * - A command id becomes its command's item, and a hidden command or item
 *   is left out. An id naming no command is left out too, and reported once
 *   per command map through `console.error`.
 * - Labels become strings and flags booleans; `checked` stays `undefined`
 *   for an item that is not checkable.
 * - A submenu is resolved the same way, and left out when nothing in it
 *   shows.
 * - Separators never lead, trail or double up, however the items around
 *   them came and went.
 *
 * An empty result means there is nothing to show — no grid menu at all
 * here.
 */
export function resolveMenu<Row>(
  entries: readonly MenuEntry<Row>[],
  options: MenuResolveOptions<Row>,
): readonly ResolvedMenuEntry[] {
  return collapseSeparators(
    entries
      .map((entry, index) => resolveMenuEntry(entry, index, options))
      .filter((entry) => entry !== null),
  );
}
