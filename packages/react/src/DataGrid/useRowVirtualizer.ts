import { useLayoutEffect, useState, type RefObject } from "react";
import type { VisibleRange } from "@gridkitjs/core";
import { createRowVirtualizer, type RowVirtualizer } from "@gridkitjs/dom";

export interface RowVirtualizerApi extends VisibleRange {
  /** Ref callback `GridBody` attaches to each rendered row's `<tr>`, keyed by that row's index in the full array. */
  measureRow: (index: number) => (element: HTMLTableRowElement | null) => void;
  /**
   * Scrolls so `index` is visible. Two-pass for a row not currently mounted:
   * jumps to an estimated offset immediately, then — once that row mounts and
   * its real height is measured — corrects the scroll position via the
   * mounted element's own `scrollIntoView`. A row already mounted is scrolled
   * to directly, in one pass.
   */
  scrollToIndex: (index: number, options?: ScrollIntoViewOptions) => void;
}

interface UseRowVirtualizerOptions {
  /** Whether virtualization is active at all. `false` attaches nothing — no behavioral or performance difference from not virtualizing. */
  enabled: boolean;
  /** The full row array — only its `.length` and reference identity matter here; a new reference resets the measured heights (see below). */
  rows: readonly unknown[];
  /** The `.gridkit-data-grid-body` scroll wrapper. */
  bodyScrollRef: RefObject<HTMLDivElement | null>;
  estimatedRowHeight: number;
  overscan: number;
}

const EMPTY_RANGE: VisibleRange = {
  startIndex: 0,
  endIndex: -1,
  offsetBefore: 0,
  offsetAfter: 0,
};

/** What a row is measured with before the virtualizer exists — while nothing is rendered. */
function ignoreRow(): () => void {
  return () => undefined;
}

/**
 * `@gridkitjs/dom`'s `createRowVirtualizer` on the body, with the window of
 * rows it reports held as state for `GridBody` to render. The virtualizer is
 * state too, not a ref, because `measureRow` is read while rendering: a new
 * one — `estimatedRowHeight` or `overscan` changed — re-renders every row
 * with its own ref callbacks, so the rows already mounted are measured anew.
 *
 * Layout effects, so the window settles before paint rather than showing the
 * previous one for a frame — the same reason `useElementWidth` measures in a
 * layout effect.
 *
 * The measured heights reset whenever `rows` becomes a new reference
 * (filter, sort, groupBy, or `dataSource` itself changing) rather than
 * tracking each of those individually — the simplest rule that stays
 * correct, at the cost of one remeasurement on those already-big operations.
 * Keying heights by row id instead, to survive a pure reorder, is a
 * considered, deliberately deferred enhancement.
 */
export default function useRowVirtualizer({
  enabled,
  rows,
  bodyScrollRef,
  estimatedRowHeight,
  overscan,
}: UseRowVirtualizerOptions): RowVirtualizerApi {
  const [virtualizer, setVirtualizer] = useState<RowVirtualizer | null>(null);
  const [range, setRange] = useState<VisibleRange>(EMPTY_RANGE);

  useLayoutEffect(() => {
    const element = bodyScrollRef.current;
    if (!enabled || element === null) {
      return undefined;
    }
    const created = createRowVirtualizer(element, {
      estimatedRowHeight,
      overscan,
      onRange: setRange,
    });
    setVirtualizer(created);
    return () => {
      created.destroy();
    };
  }, [enabled, bodyScrollRef, estimatedRowHeight, overscan]);

  useLayoutEffect(() => {
    virtualizer?.setRowCount(rows.length);
    virtualizer?.resetHeights();
  }, [virtualizer, rows]);

  return {
    startIndex: range.startIndex,
    endIndex: range.endIndex,
    offsetBefore: range.offsetBefore,
    offsetAfter: range.offsetAfter,
    measureRow: virtualizer?.measureRow ?? ignoreRow,
    scrollToIndex: (index, options) => {
      virtualizer?.scrollToIndex(index, options);
    },
  };
}
