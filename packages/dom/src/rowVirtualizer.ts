import { visibleRange, type VisibleRange } from "@gridkitjs/core";

export interface RowVirtualizerOptions {
  /** The height assumed for a row not yet measured. */
  readonly estimatedRowHeight: number;
  /** Rows rendered beyond each edge of the visible area. */
  readonly overscan: number;
  /**
   * The window of rows to render moved: called whenever a scroll, a resize
   * of the scroll element, a measured row height or a change of rows moves
   * it, and never with a window equal to the last.
   */
  readonly onRange: (range: VisibleRange) => void;
}

export interface RowVirtualizer {
  /** How many rows there are. Measured heights of the rows that remain are kept. */
  readonly setRowCount: (count: number) => void;
  /**
   * Forgets every measured height, for rows that are no longer the ones
   * measured. A `scrollToIndex` still waiting for its row is dropped too:
   * the row it asked for is no longer at that index.
   */
  readonly resetHeights: () => void;
  /**
   * A ref callback for the element of row `index` (its place among all the
   * rows, not among those rendered): measured while mounted, forgotten once
   * called with `null`. The same function for the same index every time, so
   * a renderer re-attaching it on every render costs nothing.
   */
  readonly measureRow: (index: number) => (element: HTMLElement | null) => void;
  /**
   * Scrolls so row `index` is in view. A mounted row is scrolled to directly;
   * one outside the window is jumped to at its estimated offset, then
   * scrolled to properly once it mounts and can be measured. A later call
   * replaces one still waiting for its row; a row count that no longer holds
   * that row, or `resetHeights`, drops it.
   */
  readonly scrollToIndex: (
    index: number,
    options?: ScrollIntoViewOptions,
  ) => void;
  /**
   * Stops listening, measuring and scrolling, for good: every method does
   * nothing after it.
   */
  readonly destroy: () => void;
}

/**
 * Where the virtualizer is in its life: `ready`, `awaiting-row` while a
 * `scrollToIndex` waits for its row to mount to scroll to it properly, and
 * `destroyed` for good.
 */
type VirtualizerPhase =
  | { readonly kind: "ready" }
  | {
      readonly kind: "awaiting-row";
      readonly index: number;
      readonly options: ScrollIntoViewOptions | undefined;
    }
  | { readonly kind: "destroyed" };

const READY: VirtualizerPhase = { kind: "ready" };

function sameRange(a: VisibleRange, b: VisibleRange): boolean {
  return (
    a.startIndex === b.startIndex &&
    a.endIndex === b.endIndex &&
    a.offsetBefore === b.offsetBefore &&
    a.offsetAfter === b.offsetAfter
  );
}

/**
 * Windows a long list of rows inside `scrollElement` down to those near its
 * scroll position, measuring each rendered row's real height rather than
 * assuming a uniform one — rows are not uniform (`.is-wrapped` cells, group
 * header and summary rows), so a fixed-height virtualizer would either break
 * wrapping or rule it out. The renderer draws `onRange`'s window, with
 * spacers of `offsetBefore`/`offsetAfter` around it, and hands each row's
 * element to `measureRow`.
 *
 * The heights are a mutable array, not a structure rebuilt per measurement:
 * one can arrive many times a second while scrolling. The pure arithmetic
 * over them is `@gridkitjs/core`'s `visibleRange`; this owns only the
 * mutability around it and the listeners that feed it — the scroll position,
 * the scroll element's height, and one `ResizeObserver` shared by every
 * mounted row.
 */
export function createRowVirtualizer(
  scrollElement: HTMLElement,
  options: RowVirtualizerOptions,
): RowVirtualizer {
  const { estimatedRowHeight, overscan, onRange } = options;

  let heights: (number | undefined)[] = [];
  let scrollTop = scrollElement.scrollTop;
  let viewportHeight = scrollElement.clientHeight;
  let range: VisibleRange | null = null;
  let phase: VirtualizerPhase = READY;

  const elements = new Map<number, HTMLElement>();
  const indexByElement = new Map<Element, number>();
  const refCallbacks = new Map<number, (element: HTMLElement | null) => void>();

  function recompute(): void {
    if (phase.kind === "destroyed") {
      return;
    }
    const next = visibleRange(
      heights,
      estimatedRowHeight,
      scrollTop,
      viewportHeight,
      overscan,
    );
    if (range !== null && sameRange(range, next)) {
      return;
    }
    range = next;
    onRange(next);
  }

  const rowObserver = new ResizeObserver((entries) => {
    let changed = false;
    for (const entry of entries) {
      const index = indexByElement.get(entry.target);
      if (index === undefined) continue;
      const height = entry.target.getBoundingClientRect().height;
      if (heights[index] !== height) {
        heights[index] = height;
        changed = true;
      }
    }
    if (changed) {
      recompute();
    }
  });

  // Kept current here rather than read on each recompute: a scroll can fire
  // many times a second, and each one only needs to feed the next window.
  const viewportObserver = new ResizeObserver(() => {
    viewportHeight = scrollElement.clientHeight;
    recompute();
  });
  viewportObserver.observe(scrollElement);

  function handleScroll(): void {
    scrollTop = scrollElement.scrollTop;
    recompute();
  }
  scrollElement.addEventListener("scroll", handleScroll, { passive: true });

  function estimateOffsetBefore(index: number): number {
    let total = 0;
    for (let current = 0; current < index; current++) {
      total += heights[current] ?? estimatedRowHeight;
    }
    return total;
  }

  recompute();

  return {
    setRowCount(count) {
      if (phase.kind === "awaiting-row" && phase.index >= count) {
        phase = READY;
      }
      heights = Array.from({ length: count }, (_, index) => heights[index]);
      recompute();
    },
    resetHeights() {
      if (phase.kind === "awaiting-row") {
        phase = READY;
      }
      heights = new Array<number | undefined>(heights.length).fill(undefined);
      recompute();
    },
    measureRow(index) {
      let callback = refCallbacks.get(index);
      if (callback === undefined) {
        callback = (element) => {
          const previous = elements.get(index);
          if (previous !== undefined) {
            rowObserver.unobserve(previous);
            indexByElement.delete(previous);
            elements.delete(index);
          }
          if (element === null || phase.kind === "destroyed") {
            return;
          }
          elements.set(index, element);
          indexByElement.set(element, index);
          rowObserver.observe(element);
          if (phase.kind === "awaiting-row" && phase.index === index) {
            element.scrollIntoView(phase.options);
            phase = READY;
          }
        };
        refCallbacks.set(index, callback);
      }
      return callback;
    },
    scrollToIndex(index, scrollOptions) {
      if (phase.kind === "destroyed" || heights.length === 0) {
        return;
      }
      const clamped = Math.max(0, Math.min(index, heights.length - 1));
      const mounted = elements.get(clamped);
      if (mounted !== undefined) {
        phase = READY;
        mounted.scrollIntoView(scrollOptions);
        return;
      }
      phase = { kind: "awaiting-row", index: clamped, options: scrollOptions };
      scrollElement.scrollTop = estimateOffsetBefore(clamped);
    },
    destroy() {
      phase = { kind: "destroyed" };
      scrollElement.removeEventListener("scroll", handleScroll);
      viewportObserver.disconnect();
      rowObserver.disconnect();
      elements.clear();
      indexByElement.clear();
    },
  };
}
