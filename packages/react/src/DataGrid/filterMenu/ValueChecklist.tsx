import { useLayoutEffect, useRef, useState } from "react";
import type {
  FilterChecklistItem,
  VisibleRange,
} from "@gridkitjs/core/renderer";
import {
  attachChecklist,
  createRowVirtualizer,
  type AttachedChecklist,
  type RowVirtualizer,
} from "@gridkitjs/dom";
import { CheckIcon } from "../menu/menuIcons";

/**
 * The height assumed for an item not yet measured: the theme's, a line of
 * text and its padding. Every mounted item is measured, so it only places
 * those scrolled past.
 */
const ESTIMATED_ITEM_HEIGHT = 28;

/** Items mounted beyond each edge of the list's visible part. */
const OVERSCAN = 4;

const NO_RANGE: VisibleRange = {
  startIndex: 0,
  endIndex: -1,
  offsetBefore: 0,
  offsetAfter: 0,
};

interface ValueChecklistProps {
  /** Every item of the list, in order — only a window of them is mounted. */
  readonly items: readonly FilterChecklistItem[];
  readonly showCounts: boolean;
  /** The list's accessible name. */
  readonly label: string;
  /** An item asks to be checked or unchecked: Space on it, or a click. */
  readonly onToggle: (item: FilterChecklistItem) => void;
}

/**
 * A filter checklist's values: a `role="listbox"` with one tab stop, each
 * value an option whose `aria-checked` says whether the filter keeps it.
 * A column can hold thousands of values, so the list is windowed by
 * `@gridkitjs/dom`'s `createRowVirtualizer` — the list is its own scroll
 * element, holding only the items near its scroll position between two
 * spacers — and made to behave by `attachChecklist`, which moves focus by
 * the arrow keys, Home, End, PageUp and PageDown and reports Space or a
 * click on an item by its place in the whole list.
 *
 * An item's key holds characters no DOM attribute may, so it keys React's
 * list only; the DOM knows an item by its place, `aria-posinset` one past it.
 */
export default function ValueChecklist({
  items,
  showCounts,
  label,
  onToggle,
}: ValueChecklistProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const checklistRef = useRef<AttachedChecklist | null>(null);
  const [virtualizer, setVirtualizer] = useState<RowVirtualizer | null>(null);
  const [range, setRange] = useState(NO_RANGE);

  /**
   * What the behaviour's callbacks read. They are handed over once, when it
   * attaches, so they read the props of the latest render here.
   */
  const latest = useRef({ items, onToggle });
  useLayoutEffect(() => {
    latest.current = { items, onToggle };
  });

  useLayoutEffect(() => {
    const list = listRef.current;
    if (list === null) {
      return undefined;
    }
    const rows = createRowVirtualizer(list, {
      estimatedRowHeight: ESTIMATED_ITEM_HEIGHT,
      overscan: OVERSCAN,
      onRange: setRange,
    });
    const checklist = attachChecklist(list, {
      onToggle: (index) => {
        const item = latest.current.items[index];
        if (item !== undefined) {
          latest.current.onToggle(item);
        }
      },
      scrollToIndex: (index) => {
        rows.scrollToIndex(index, { block: "nearest" });
      },
    });
    checklistRef.current = checklist;
    setVirtualizer(rows);
    return () => {
      checklistRef.current = null;
      checklist.detach();
      rows.destroy();
    };
  }, []);

  useLayoutEffect(() => {
    virtualizer?.setRowCount(items.length);
    checklistRef.current?.setCount(items.length);
  }, [virtualizer, items.length]);

  const shown = items.slice(range.startIndex, range.endIndex + 1);

  return (
    <div
      ref={listRef}
      role="listbox"
      aria-multiselectable="true"
      aria-label={label}
      className="gridkit-filter-menu-checklist"
    >
      <div role="presentation" style={{ height: range.offsetBefore }} />
      {shown.map((item, offset) => {
        const index = range.startIndex + offset;
        return (
          <div
            key={item.key}
            ref={virtualizer?.measureRow(index)}
            role="option"
            data-gridkit-checklist-item=""
            data-gridkit-checklist-index={index}
            aria-checked={item.checked}
            aria-setsize={items.length}
            aria-posinset={index + 1}
            className="gridkit-filter-menu-option"
          >
            <span
              className="gridkit-filter-menu-option-check"
              aria-hidden="true"
            >
              <CheckIcon />
            </span>
            <span className="gridkit-filter-menu-option-label">
              {item.label}
            </span>
            {/* Spaced, so the option's name reads "Alice 3", not "Alice3". */}
            {showCounts && (
              <>
                {" "}
                <span className="gridkit-filter-menu-option-count">
                  {String(item.count)}
                </span>
              </>
            )}
          </div>
        );
      })}
      <div role="presentation" style={{ height: range.offsetAfter }} />
    </div>
  );
}
