import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { visibleRange, type VisibleRange } from "@gridkitjs/core";

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
  /** Whether virtualization is active at all. `false` short-circuits to the full range with no observer attached — no behavioral or performance difference from not virtualizing. */
  enabled: boolean;
  /** The full row array — only its `.length` and reference identity matter here; the identity is what resets the height cache (see module doc). */
  rows: readonly unknown[];
  /** The `.gridkit-data-grid-body` scroll wrapper introduced by the scrollable-layout feature. */
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

/**
 * Windows `rows` down to the slice actually near the current scroll
 * position, measuring each rendered row's real height rather than assuming a
 * uniform one — rows here are not uniform (`.is-wrapped` cells, group
 * header/summary rows), so a fixed-height virtualizer would either break
 * wrapping or force it out of scope.
 *
 * The height cache is a mutable array in a ref, not an immutable structure
 * threaded through React state — recomputing an immutable structure on every
 * single-row height measurement (which can happen many times per second
 * while scrolling) is real, avoidable overhead, the same reason
 * `useColumnResize`'s drag-move phase bypasses `commitIfChanged`. The pure
 * math over a snapshot of that cache lives in `@gridkitjs/core`'s
 * `visibleRange`; this hook owns only the mutability around it.
 *
 * Every read or write of that cache (and of the scroll position, and of the
 * DOM element lookups below) happens inside an effect, a `ResizeObserver`
 * callback, or an event handler — never inline during render, which this
 * codebase's lint config treats as a hard error (refs are for imperative
 * escape hatches, not render-time state). `range` is accordingly real
 * `useState`, pushed from whichever of those triggered a change, rather than
 * a `useMemo` computed by reading the ref during render.
 *
 * The cache resets whenever `rows` becomes a new reference (filter, sort,
 * groupBy, or `dataSource` itself changing) rather than tracking each of
 * those individually — the simplest rule that stays correct, at the cost of
 * one visible remeasurement flash on those already-big operations. Keying
 * the cache by row id instead of index, to survive a pure reorder without
 * remeasuring, is a considered, deliberately deferred enhancement.
 */
export default function useRowVirtualizer({
  enabled,
  rows,
  bodyScrollRef,
  estimatedRowHeight,
  overscan,
}: UseRowVirtualizerOptions): RowVirtualizerApi {
  const rowCount = rows.length;

  const heightsRef = useRef<(number | undefined)[]>([]);
  const scrollTopRef = useRef(0);
  const viewportHeightRef = useRef(0);
  const elementsRef = useRef(new Map<number, HTMLTableRowElement>());
  const indexByElementRef = useRef(new Map<Element, number>());
  const refCallbacksRef = useRef(
    new Map<number, (element: HTMLTableRowElement | null) => void>(),
  );
  const observerRef = useRef<ResizeObserver | null>(null);
  const pendingScrollRef = useRef<
    { index: number; options: ScrollIntoViewOptions | undefined } | undefined
  >(undefined);

  const [range, setRange] = useState<VisibleRange>(EMPTY_RANGE);

  /**
   * Reads the height cache and current scroll/viewport measurements fresh at
   * call time (all ref-backed, so never stale regardless of which render
   * defined this particular closure) and pushes the result into state. Only
   * ever called from inside an effect or a DOM callback below, never during
   * render. `useCallback`-wrapped purely so the effects below can list it as
   * a dependency instead of repeating its own inputs in each of theirs.
   */
  const recompute = useCallback((): void => {
    setRange(
      enabled
        ? visibleRange(
            heightsRef.current,
            estimatedRowHeight,
            scrollTopRef.current,
            viewportHeightRef.current,
            overscan,
          )
        : rowCount === 0
          ? EMPTY_RANGE
          : {
              startIndex: 0,
              endIndex: rowCount - 1,
              offsetBefore: 0,
              offsetAfter: 0,
            },
    );
  }, [enabled, rowCount, estimatedRowHeight, overscan]);

  // Resets the height cache whenever `rows` becomes a new reference,
  // including on mount. `useLayoutEffect` so this settles before paint
  // rather than briefly showing the previous data's range for a frame — the
  // same reason `useElementWidth` measures in a layout effect.
  useLayoutEffect(() => {
    heightsRef.current = new Array<number | undefined>(rowCount).fill(
      undefined,
    );
    recompute();
  }, [rows, rowCount, recompute]);

  // Tracks the scroll box itself: its current scroll position and size, kept
  // in refs (not state) since a scroll event can fire many times a second
  // and each one only needs to feed the next `recompute()`, not force this
  // hook's own render.
  useLayoutEffect(() => {
    if (!enabled) {
      return undefined;
    }
    const element = bodyScrollRef.current;
    if (element === null) {
      return undefined;
    }

    scrollTopRef.current = element.scrollTop;
    viewportHeightRef.current = element.clientHeight;
    recompute();

    const handleScroll = (): void => {
      scrollTopRef.current = element.scrollTop;
      recompute();
    };
    element.addEventListener("scroll", handleScroll, { passive: true });

    const resizeObserver = new ResizeObserver(() => {
      viewportHeightRef.current = element.clientHeight;
      recompute();
    });
    resizeObserver.observe(element);

    return () => {
      element.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
    };
  }, [enabled, bodyScrollRef, recompute]);

  // Measures each rendered row via one shared observer instance, mirroring
  // `measureColumnContent`'s precedent for DOM measurement living in
  // `packages/react` rather than `packages/core`. Re-observes whatever is
  // already mounted (tracked in `elementsRef`, maintained independently by
  // `measureRow`'s own mount/unmount below) whenever this effect is
  // recreated, since a fresh `ResizeObserver` instance starts with nothing
  // observed.
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    const observer = new ResizeObserver((entries) => {
      let changed = false;
      for (const entry of entries) {
        const index = indexByElementRef.current.get(entry.target);
        if (index === undefined) continue;
        const height = entry.target.getBoundingClientRect().height;
        if (heightsRef.current[index] !== height) {
          heightsRef.current[index] = height;
          changed = true;
        }
      }
      if (changed) {
        recompute();
      }
    });
    observerRef.current = observer;
    for (const element of elementsRef.current.values()) {
      observer.observe(element);
    }
    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [enabled, recompute]);

  function measureRow(
    index: number,
  ): (element: HTMLTableRowElement | null) => void {
    let callback = refCallbacksRef.current.get(index);
    if (callback === undefined) {
      callback = (element) => {
        const observer = observerRef.current;
        const previous = elementsRef.current.get(index);
        if (previous !== undefined) {
          observer?.unobserve(previous);
          indexByElementRef.current.delete(previous);
          elementsRef.current.delete(index);
        }
        if (element === null) {
          return;
        }
        elementsRef.current.set(index, element);
        indexByElementRef.current.set(element, index);
        observer?.observe(element);
      };
      refCallbacksRef.current.set(index, callback);
    }
    return callback;
  }

  // Corrects a pending `scrollToIndex` for a row that wasn't mounted at call
  // time, once the mounted window (and therefore `elementsRef`) has changed
  // enough that it might now be.
  useEffect(() => {
    const pending = pendingScrollRef.current;
    if (pending === undefined) {
      return;
    }
    const element = elementsRef.current.get(pending.index);
    if (element === undefined) {
      return;
    }
    element.scrollIntoView(pending.options);
    pendingScrollRef.current = undefined;
  }, [range]);

  function estimateOffsetBefore(index: number): number {
    let total = 0;
    for (let current = 0; current < index; current++) {
      total += heightsRef.current[current] ?? estimatedRowHeight;
    }
    return total;
  }

  function scrollToIndex(index: number, options?: ScrollIntoViewOptions): void {
    const element = bodyScrollRef.current;
    if (element === null || rowCount === 0) {
      return;
    }
    const clamped = Math.max(0, Math.min(index, rowCount - 1));
    const mounted = elementsRef.current.get(clamped);
    if (mounted !== undefined) {
      mounted.scrollIntoView(options);
      return;
    }
    // Not mounted yet: jump to an estimate now, then let the effect above
    // correct the position once this row mounts and reports its real height.
    pendingScrollRef.current = { index: clamped, options };
    element.scrollTop = estimateOffsetBefore(clamped);
  }

  return {
    startIndex: range.startIndex,
    endIndex: range.endIndex,
    offsetBefore: range.offsetBefore,
    offsetAfter: range.offsetAfter,
    measureRow,
    scrollToIndex,
  };
}
