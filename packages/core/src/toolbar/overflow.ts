import { collapseSeparators } from "../menu/resolveMenu";
import type { ResolvedMenuEntry } from "../menu/types";
import type { ResolvedToolbarItem } from "./types";

/** What `fitToolbarItems` fits: a toolbar's entries, by width, into its space. */
export interface ToolbarFitInput {
  /** Each entry's width, in order — `0` for a spacer, whose width is only the space left over. */
  readonly widths: readonly number[];
  /** The width the entries share. */
  readonly available: number;
  /** The width of the "More" button the entries that do not fit go into. */
  readonly moreWidth: number;
  /** Whether each entry, in order, stays however little room there is. */
  readonly pinned: readonly boolean[];
}

/**
 * How many of a toolbar's entries fit, from the start: the first `count`
 * stay in the toolbar, with every pinned entry after them, and the rest go
 * into a "More" menu.
 *
 * Pinned entries take their room first, wherever they are. Room for "More"
 * is kept only when something does not fit — when everything does, the
 * result is every entry and no "More" is drawn. Entries are taken in order
 * and the first that does not fit ends the count, so the toolbar keeps its
 * order rather than filling gaps with later, narrower entries; one with no
 * width, a spacer, fits wherever the entries before it did.
 */
export function fitToolbarItems({
  widths,
  available,
  moreWidth,
  pinned,
}: ToolbarFitInput): number {
  const total = widths.reduce((sum, width) => sum + width, 0);
  if (total <= available) {
    return widths.length;
  }
  let used =
    moreWidth +
    widths.reduce((sum, width, index) => sum + (pinned[index] ? width : 0), 0);
  for (const [index, width] of widths.entries()) {
    if (!pinned[index]) {
      used += width;
      if (used > available) {
        return index;
      }
    }
  }
  return widths.length;
}

/**
 * Whether a toolbar entry stays in the toolbar however narrow it gets: the
 * search box and custom entries, which have no menu item to become.
 */
export function isPinnedToolbarItem(
  item: Pick<ResolvedToolbarItem, "type">,
): boolean {
  return item.type === "search" || item.type === "custom";
}

/** A toolbar split at the count `fitToolbarItems` gave — see `splitToolbarItems`. */
export interface ToolbarSplit {
  /** What stays in the toolbar. */
  readonly shown: readonly ResolvedToolbarItem[];
  /** The "More" menu's entries, empty when everything fits. */
  readonly overflow: readonly ResolvedMenuEntry[];
}

/** An entry that did not fit, as the "More" menu lists it; `null` for a spacer. */
function asMenuEntry(item: ResolvedToolbarItem): ResolvedMenuEntry | null {
  switch (item.type) {
    case "button":
      return {
        type: "item",
        id: item.id,
        label: item.label,
        icon: item.icon,
        shortcut: item.shortcut,
        disabled: item.disabled,
        checked: item.pressed,
        run: item.run,
      };
    case "menu":
      return {
        type: "submenu",
        id: item.id,
        label: item.label,
        icon: item.icon,
        items: item.items,
      };
    case "separator":
      return item;
    default:
      return null;
  }
}

/**
 * `items` split at the first `fit`: those before it, and every pinned item,
 * stay in the toolbar; the rest become the "More" menu's entries — a button
 * an item, checked where it was pressed, and a dropdown a submenu. Neither
 * side keeps a separator at its ends, doubled, or beside a spacer.
 */
export function splitToolbarItems(
  items: readonly ResolvedToolbarItem[],
  fit: number,
): ToolbarSplit {
  const fits = (item: ResolvedToolbarItem, index: number) =>
    index < fit || isPinnedToolbarItem(item);
  return {
    shown: collapseSeparators(
      items.filter(fits),
      (item) => item.type === "spacer",
    ),
    overflow: collapseSeparators(
      items
        .filter((item, index) => !fits(item, index))
        .map(asMenuEntry)
        .filter((entry) => entry !== null),
    ),
  };
}
