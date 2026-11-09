import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { VisibleRange } from "@gridkitjs/core";
import {
  attachChecklist,
  createRowVirtualizer,
  type AttachedChecklist,
  type RowVirtualizer,
} from "@gridkitjs/dom";

/** Eight items show whole in the list, and a ninth only in part. */
const ITEM_HEIGHT = 24;
const listStyle: CSSProperties = {
  height: ITEM_HEIGHT * 8 + 12,
  width: 200,
  overflow: "auto",
};
const itemStyle: CSSProperties = { height: ITEM_HEIGHT };

const INITIAL_RANGE: VisibleRange = {
  startIndex: 0,
  endIndex: -1,
  offsetBefore: 0,
  offsetAfter: 0,
};

/**
 * `attachChecklist` wired up the way a renderer would: a `role="listbox"`
 * of `size` values, windowed by `createRowVirtualizer` with the list as its
 * scroll element, inside a form with a search box before it and an Apply
 * button after it. The callbacks are functions the checklist calls and this
 * component answers, which a callback passed from a spec cannot do, so they
 * live here: a toggle flips the value's `aria-checked`, and the last index
 * toggled and focused are written where a spec can read them.
 *
 * Enter anywhere in the form submits it, as a filter popup's Enter applies,
 * unless something already took the key; the submissions are counted.
 *
 * "End, then narrow" asks for the last value and narrows the list to
 * `narrowTo` values in the same task, before the last value can mount, as
 * a search changing the list mid-move would; "Show all" brings every value
 * back. "Detach, then End" detaches the checklist and asks the detached one
 * for the last value; "Show all" afterwards gives the detached one a count.
 * None of the buttons takes focus from the list.
 */
export interface ChecklistHarnessProps {
  /** How many values the list holds: far more than its window mounts. */
  size: number;
  /** How many values "End, then narrow" leaves. */
  narrowTo?: number;
}

export default function ChecklistHarness({
  size,
  narrowTo = 100,
}: ChecklistHarnessProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const checklistRef = useRef<AttachedChecklist | null>(null);
  const [virtualizer, setVirtualizer] = useState<RowVirtualizer | null>(null);
  const [count, setCount] = useState(size);
  const [range, setRange] = useState(INITIAL_RANGE);
  const [checked, setChecked] = useState<ReadonlySet<number>>(new Set());
  const [toggled, setToggled] = useState("none");
  const [focused, setFocused] = useState("none");
  const [submitted, setSubmitted] = useState(0);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (list === null) {
      return undefined;
    }
    const rows = createRowVirtualizer(list, {
      estimatedRowHeight: ITEM_HEIGHT,
      overscan: 2,
      onRange: setRange,
    });
    rows.setRowCount(size);
    const checklist = attachChecklist(list, {
      onToggle: (index) => {
        setToggled(String(index));
        setChecked((current) => {
          const next = new Set(current);
          if (!next.delete(index)) {
            next.add(index);
          }
          return next;
        });
      },
      onFocusChange: (index) => {
        setFocused(String(index));
      },
      scrollToIndex: (index) => {
        rows.scrollToIndex(index, { block: "nearest" });
      },
    });
    checklist.setCount(size);
    checklistRef.current = checklist;
    setVirtualizer(rows);
    setCount(size);
    return () => {
      checklistRef.current = null;
      checklist.detach();
      rows.destroy();
    };
  }, [size]);

  function resize(next: number): void {
    virtualizer?.setRowCount(next);
    checklistRef.current?.setCount(next);
    setCount(next);
  }

  const indexes = Array.from(
    { length: Math.max(0, range.endIndex - range.startIndex + 1) },
    (_, offset) => range.startIndex + offset,
  );

  return (
    <div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted((count) => count + 1);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.defaultPrevented) {
            event.preventDefault();
            event.currentTarget.requestSubmit();
          }
        }}
      >
        <input type="search" aria-label="Search" />
        <div
          ref={listRef}
          role="listbox"
          aria-multiselectable="true"
          aria-label="Values"
          style={listStyle}
        >
          <div role="presentation" style={{ height: range.offsetBefore }} />
          {indexes.map((index) => (
            <div
              key={index}
              ref={virtualizer?.measureRow(index)}
              role="option"
              data-gridkit-checklist-item=""
              data-gridkit-checklist-index={index}
              aria-checked={checked.has(index)}
              aria-setsize={count}
              aria-posinset={index + 1}
              style={itemStyle}
            >
              Value {index + 1}
            </div>
          ))}
          <div role="presentation" style={{ height: range.offsetAfter }} />
        </div>
        <button type="submit">Apply</button>
      </form>
      <button
        type="button"
        onMouseDown={(event) => {
          event.preventDefault();
        }}
        onClick={() => {
          checklistRef.current?.focusItem(count - 1);
          resize(narrowTo);
        }}
      >
        End, then narrow
      </button>
      <button
        type="button"
        onMouseDown={(event) => {
          event.preventDefault();
        }}
        onClick={() => {
          resize(size);
        }}
      >
        Show all
      </button>
      <button
        type="button"
        onMouseDown={(event) => {
          event.preventDefault();
        }}
        onClick={() => {
          checklistRef.current?.detach();
          checklistRef.current?.focusItem(count - 1);
        }}
      >
        Detach, then End
      </button>
      <output data-testid="toggled">{toggled}</output>
      <output data-testid="focused">{focused}</output>
      <output data-testid="submitted">{submitted}</output>
    </div>
  );
}
