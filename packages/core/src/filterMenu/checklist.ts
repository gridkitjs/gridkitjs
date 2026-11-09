import type { FilterScalar } from "../types";
import type { ValuesDraft } from "../util/filterEditor";
import {
  keyOf,
  selectAllCoversBlanks,
  visibleFilterOptions,
} from "../util/filterEditor";

/** One row of a checklist: a value the column holds, or its blank cells. */
export type FilterChecklistItem = {
  /**
   * Tells the item apart from every other in the list: a value's key is the
   * one `draft.checked` holds it under, and the blanks have their own.
   */
  readonly key: string;
  /** The value as its cells print it, or the blanks' label. */
  readonly label: string;
  /** How many rows hold it, among those the other columns' filters keep. */
  readonly count: number;
  readonly checked: boolean;
} & (
  | {
      /** Toggled with `filterEditorReducer`'s `toggleValue`. */
      readonly kind: "value";
      readonly value: Exclude<FilterScalar, null>;
    }
  | {
      /** Toggled with `filterEditorReducer`'s `setIncludeBlanks`. */
      readonly kind: "blanks";
    }
);

export interface FilterChecklistOptions {
  /** How many values the list shows at most: the column's resolved `valueLimit`. */
  readonly valueLimit: number;
  /** The blanks item's label: the grid's `filterBlanks` message. */
  readonly blanksLabel: string;
}

/** What a checklist editor draws below its search box and select-all. */
export interface FilterChecklist {
  /**
   * The rows to draw, in order: the values the search shows, cut to
   * `valueLimit`, then the blanks while nothing is searched and some cells
   * are blank. Empty while `needsSearch`.
   */
  readonly items: readonly FilterChecklistItem[];
  /**
   * Whether the list waits for a search: the column holds more values than
   * `valueLimit` and nothing is searched yet — `filterSearchFirst(total)`.
   */
  readonly needsSearch: boolean;
  /**
   * How many of the values the search matches `valueLimit` left out of
   * `items` — `filterMoreValues(hiddenCount)`. `0` while `needsSearch`, so
   * the two notes never show together.
   */
  readonly hiddenCount: number;
  /** How many values the search matches — every value while nothing is searched. Blanks aside. */
  readonly total: number;
}

/**
 * The list a checklist editor draws for `draft`: the window of values its
 * search shows, as items carrying what each row says and whether it is
 * checked. A draft on its conditions draws through `toValuesDraft`.
 *
 * A column can hold far more values than a list is worth scrolling, so the
 * list shows at most `valueLimit` of them. Past that, it shows nothing until
 * something is searched (`needsSearch`) — every value is still in the draft,
 * and select-all still covers them all — and a search matching more shows
 * the first `valueLimit` of its matches in sort order, with the rest counted
 * in `hiddenCount`.
 *
 * The blanks item comes last, as in Excel's, and only while nothing is
 * searched: exactly when select-all counts the blanks, so the checkbox acts
 * on what the list shows.
 */
export function filterChecklist<Row>(
  draft: ValuesDraft<Row>,
  { valueLimit, blanksLabel }: FilterChecklistOptions,
): FilterChecklist {
  const visible = visibleFilterOptions(draft);
  const total = visible.length;
  if (draft.search === "" && total > valueLimit) {
    return { items: [], needsSearch: true, hiddenCount: 0, total };
  }
  const items = visible
    .slice(0, valueLimit)
    .map(({ value, label, count }): FilterChecklistItem => {
      const key = keyOf(draft, value);
      const checked = draft.checked.has(key);
      return { kind: "value", key, value, label, count, checked };
    });
  const hiddenCount = total - items.length;
  if (selectAllCoversBlanks(draft)) {
    items.push({
      kind: "blanks",
      // Blank cells' own key, which no offered value has.
      key: keyOf(draft, null),
      label: blanksLabel,
      count: draft.blanks,
      checked: draft.includeBlanks,
    });
  }
  return { items, needsSearch: false, hiddenCount, total };
}
