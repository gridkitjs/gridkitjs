import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import type { VisibleRange } from "@gridkitjs/core/renderer";
import {
  bodyRowFrom,
  createRowVirtualizer,
  type RowVirtualizer,
} from "@gridkitjs/dom";

export interface RowVirtualizerApi extends VisibleRange {
  /** Ref callback `GridBody` attaches to each rendered row's `<tr>`, keyed by that row's index in the full array. */
  measureRow: (index: number) => (element: HTMLTableRowElement | null) => void;
  /**
   * Scrolls so `index` is visible. Two-pass for a row not currently mounted:
   * jumps to an estimated offset immediately, then — once that row mounts and
   * its real height is measured — corrects the scroll position via the
   * mounted element's own `scrollIntoView`. A row already mounted is scrolled
   * to directly, in one pass. Works from a layout effect in the commit that
   * turns `enabled` on.
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
  /** The body's `<table>`, whose mounted rows a new virtualizer measures before its first window. */
  bodyTableRef: RefObject<HTMLTableElement | null>;
  estimatedRowHeight: number;
  overscan: number;
}

/**
 * The rows the body draws: `allRows` while `enabled` is off, when the body
 * draws every row, and from the moment it turns on until the new virtualizer
 * reports; otherwise the `range` it reported last.
 */
type RowWindow =
  | { readonly kind: "allRows" }
  | { readonly kind: "range"; readonly range: VisibleRange };

const ALL_ROWS: RowWindow = { kind: "allRows" };

/** A grid mounted with `enabled` on draws no rows until its virtualizer reports, which it does before paint. */
const NO_ROWS: RowWindow = {
  kind: "range",
  range: { startIndex: 0, endIndex: -1, offsetBefore: 0, offsetAfter: 0 },
};

function rangeOf(rowWindow: RowWindow, rowCount: number): VisibleRange {
  if (rowWindow.kind === "range") {
    return rowWindow.range;
  }
  return {
    startIndex: 0,
    endIndex: rowCount - 1,
    offsetBefore: 0,
    offsetAfter: 0,
  };
}

/** The body rows mounted in `table`, each with its index among all the rows; spacer and sentinel rows carry none. */
function* mountedRows(
  table: HTMLTableElement | null,
): Generator<readonly [number, HTMLTableRowElement]> {
  for (const row of table?.tBodies[0]?.rows ?? []) {
    const target = bodyRowFrom(row);
    if (target !== null) {
      yield [target.rowIndex, row];
    }
  }
}

/** What a row is measured with before the first virtualizer is created. */
function ignoreRow(): () => void {
  return () => undefined;
}

/**
 * `@gridkitjs/dom`'s `createRowVirtualizer` on the body, with the window of
 * rows it reports held as state for `GridBody` to render. The virtualizer is
 * state too, because `measureRow` is read while rendering: a new one —
 * `estimatedRowHeight` or `overscan` changed — re-renders every row with its
 * own ref callbacks, so the rows already mounted are measured anew. It is
 * also a ref, which `scrollToIndex` reads: in the commit that turns
 * `enabled` on, a parent's layout effect runs after the one here that
 * creates the virtualizer but before the render that puts it in state.
 *
 * Once `enabled` goes off, the destroyed virtualizer stays in state, where
 * it measures and scrolls nothing. The window goes back to every row, and
 * stays there when `enabled` comes back on until the new virtualizer
 * reports: the rows mounted then stay mounted, the focused one and the
 * browser's focus with it, and the body keeps its height, and so its scroll
 * position. An empty window, or the last one reported, would unmount them
 * for a pass, and could collapse the body and send its scroll to the top.
 * The new virtualizer measures every mounted row before it reports, so its
 * first window is the rows on screen: one placed by `estimatedRowHeight`
 * could miss them when real heights differ from it, unmounting the focused
 * row all the same.
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
  bodyTableRef,
  estimatedRowHeight,
  overscan,
}: UseRowVirtualizerOptions): RowVirtualizerApi {
  const [virtualizer, setVirtualizer] = useState<RowVirtualizer | null>(null);
  const instance = useRef<RowVirtualizer | null>(null);
  const rowCount = useRef(rows.length);
  const [rowWindow, setRowWindow] = useState(enabled ? NO_ROWS : ALL_ROWS);

  // While rendering, as state that follows a prop is adjusted: the render
  // that turns `enabled` back on must already draw every row.
  if (!enabled && rowWindow.kind !== "allRows") {
    setRowWindow(ALL_ROWS);
  }

  useLayoutEffect(() => {
    rowCount.current = rows.length;
    instance.current?.setRowCount(rows.length);
    instance.current?.resetHeights();
  }, [rows]);

  useLayoutEffect(() => {
    const element = bodyScrollRef.current;
    if (!enabled || element === null) {
      return undefined;
    }
    const created = createRowVirtualizer(element, {
      estimatedRowHeight,
      overscan,
      onRange: (range) => {
        setRowWindow({ kind: "range", range });
      },
    });
    // Before its first window is drawn, which would otherwise be empty, and
    // placed from the rows on screen rather than from estimated heights.
    created.setRowCount(rowCount.current);
    created.measureRows(mountedRows(bodyTableRef.current));
    instance.current = created;
    setVirtualizer(created);
    return () => {
      created.destroy();
    };
  }, [enabled, bodyScrollRef, bodyTableRef, estimatedRowHeight, overscan]);

  const range = rangeOf(rowWindow, rows.length);
  return {
    startIndex: range.startIndex,
    endIndex: range.endIndex,
    offsetBefore: range.offsetBefore,
    offsetAfter: range.offsetAfter,
    measureRow: virtualizer?.measureRow ?? ignoreRow,
    scrollToIndex: (index, options) => {
      instance.current?.scrollToIndex(index, options);
    },
  };
}
