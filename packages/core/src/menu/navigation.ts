import type { ResolvedMenuEntry } from "./types";

/** Where an arrow, Home or End key moves a menu's focus. */
export type MenuMove = "next" | "previous" | "first" | "last";

/** Where the search for the next item begins, before skipping separators. */
function startIndex(count: number, from: number, move: MenuMove): number {
  const focused = from >= 0 && from < count;
  switch (move) {
    case "first":
      return 0;
    case "last":
      return count - 1;
    case "next":
      return focused ? from + 1 : 0;
    case "previous":
      return focused ? from - 1 : count - 1;
  }
}

/**
 * The index of the item focus moves to from `from` — `-1` when nothing is
 * focused yet, so `"next"` lands on the first item and `"previous"` on the
 * last. Separators are skipped and `"next"`/`"previous"` wrap round the
 * ends; disabled items count, since they stay focusable for a screen reader
 * to find. `-1` when there is no item at all.
 *
 * Takes anything with a `type`, so a behaviour that reads its items off the
 * page can pass `{ type: "item" }` for each.
 */
export function nextMenuIndex(
  entries: readonly Pick<ResolvedMenuEntry, "type">[],
  from: number,
  move: MenuMove,
): number {
  const count = entries.length;
  const step = move === "next" || move === "first" ? 1 : -1;
  const start = startIndex(count, from, move);
  for (let offset = 0; offset < count; offset++) {
    const index = (((start + step * offset) % count) + count) % count;
    if (entries[index]?.type !== "separator") {
      return index;
    }
  }
  return -1;
}

/**
 * The index of the item `query` — what was typed, buffered for a moment —
 * picks, matched case-insensitively against the start of each label and
 * wrapping round the end; `-1` when none matches.
 *
 * `from` is the item focused now. A single letter, or the same letter
 * typed again and again, searches from the item after it, so repeating a
 * letter steps through every item it starts. A longer query searches from
 * `from` itself, so the item already found stays put while what is typed
 * still matches it.
 */
export function typeaheadIndex(
  labels: readonly string[],
  from: number,
  query: string,
): number {
  const typed = query.toLowerCase();
  const firstCodePoint = typed.codePointAt(0);
  if (firstCodePoint === undefined) {
    return -1;
  }
  const first = String.fromCodePoint(firstCodePoint);
  const repeated = typed.replaceAll(first, "") === "";
  const prefix = repeated ? first : typed;
  const start = repeated ? from + 1 : Math.max(from, 0);
  for (let offset = 0; offset < labels.length; offset++) {
    const index = (start + offset) % labels.length;
    if (labels[index]?.toLowerCase().startsWith(prefix) === true) {
      return index;
    }
  }
  return -1;
}
