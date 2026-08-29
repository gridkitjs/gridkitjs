import { useCallback, useEffect, useRef, type RefObject } from "react";
import type { InfiniteScrollConfig } from "./DataGrid";

interface UseInfiniteScrollOptions {
  /** The `.gridkit-data-grid-body` scroll wrapper — `IntersectionObserver`'s `root`. */
  rootRef: RefObject<HTMLDivElement | null>;
  /** The always-last `<tr>` `GridBody` renders while `config?.hasMore` is true. */
  sentinelRef: RefObject<HTMLTableRowElement | null>;
  config: InfiniteScrollConfig | undefined;
}

/**
 * Turns a sentinel row's visibility into `config.onLoadMore()` calls, no more
 * than one per "the sentinel is intersecting and no load is already in
 * flight since the last one finished."
 *
 * No-ops entirely (no observer created) when `config` is `undefined` or
 * `hasMore` is `false` — the same "off means truly off" principle
 * `useRowVirtualizer`'s `enabled` flag follows. `hasMore` also gates whether
 * `GridBody` renders a sentinel at all, so there is nothing to observe in
 * that case regardless.
 */
export default function useInfiniteScroll({
  rootRef,
  sentinelRef,
  config,
}: UseInfiniteScrollOptions): void {
  const hasMore = config?.hasMore ?? false;
  const isLoadingMore = config?.isLoadingMore ?? false;
  const rootMargin = config?.rootMargin ?? "200px";

  /**
   * Read fresh inside the observer callback rather than closed over, so a
   * newer `config` (a newer `onLoadMore` closure, an `isLoadingMore` flip)
   * is honored without tearing down and recreating the observer for it —
   * only `hasMore`/`rootMargin` do that (see the effect below). Written from
   * its own effect rather than inline during render — every ref write here
   * happens inside an effect or a DOM callback, never during render itself,
   * the same discipline `useRowVirtualizer`'s height cache follows — and
   * declared first so it runs, and is current, before the two effects below
   * it on every commit.
   */
  const latestRef = useRef({
    hasMore,
    isLoadingMore,
    onLoadMore: config?.onLoadMore,
  });
  useEffect(() => {
    latestRef.current = {
      hasMore,
      isLoadingMore,
      onLoadMore: config?.onLoadMore,
    };
  });

  /** Set once `onLoadMore` fires, cleared only on an `isLoadingMore` true → false transition — see the effect below. */
  const firedRef = useRef(false);
  /** The sentinel's intersection state as of the observer's last callback — read back once a load finishes, since that alone produces no new intersection event to hang a re-check on. */
  const intersectingRef = useRef(false);

  /**
   * `useCallback`-wrapped with no deps — every input it reads comes through
   * a ref, so its identity never needs to change — purely so the effect
   * below can list it as a dependency instead of disabling the lint rule
   * that would otherwise (correctly) ask for it.
   */
  const maybeLoadMore = useCallback(() => {
    const current = latestRef.current;
    if (
      !intersectingRef.current ||
      !current.hasMore ||
      current.isLoadingMore ||
      firedRef.current
    ) {
      return;
    }
    firedRef.current = true;
    current.onLoadMore?.();
  }, []);

  const wasLoadingRef = useRef(isLoadingMore);
  useEffect(() => {
    if (wasLoadingRef.current && !isLoadingMore) {
      firedRef.current = false;
      // The rows a just-finished load appended may not have pushed the
      // sentinel out of `rootMargin` at all, in which case it never leaves
      // and re-enters "intersecting" — no further observer callback would
      // otherwise fire to trigger the next load.
      maybeLoadMore();
    }
    wasLoadingRef.current = isLoadingMore;
  }, [isLoadingMore, maybeLoadMore]);

  useEffect(() => {
    if (!hasMore) {
      return undefined;
    }
    const root = rootRef.current;
    const sentinel = sentinelRef.current;
    if (root === null || sentinel === null) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (entry === undefined) {
          return;
        }
        intersectingRef.current = entry.isIntersecting;
        maybeLoadMore();
      },
      { root, rootMargin },
    );
    observer.observe(sentinel);

    return () => {
      observer.disconnect();
      intersectingRef.current = false;
    };
  }, [hasMore, rootMargin, rootRef, sentinelRef, maybeLoadMore]);
}
