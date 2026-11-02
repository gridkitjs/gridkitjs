export interface InfiniteScrollOptions {
  /**
   * The element whose approach triggers a load — the always-last row of the
   * body — or `null` while none is rendered.
   */
  readonly sentinel: Element | null;
  /** Whether a further load could still return more rows. `false` stops watching altogether. */
  readonly hasMore: boolean;
  /**
   * Called at most once per approach: when the sentinel comes within
   * `rootMargin` of the root's visible area, and not again until
   * `isLoadingMore` has gone from `true` back to `false`.
   */
  readonly onLoadMore?: (() => void) | undefined;
  /** Whether a load `onLoadMore` started is still in flight. */
  readonly isLoadingMore?: boolean | undefined;
  /** How far ahead of the sentinel scrolling into view a load starts, as CSS margins. Defaults to `"200px"`. */
  readonly rootMargin?: string | undefined;
}

export interface InfiniteScroll {
  /**
   * Takes the current options. Cheap when nothing changed, so a renderer may
   * call it after every render; a new sentinel or `rootMargin` restarts the
   * observer, and `isLoadingMore` going back to `false` re-checks at once.
   */
  update(options: InfiniteScrollOptions): void;
  /** Stops watching for good. */
  detach(): void;
}

/**
 * Turns a sentinel's approach to the bottom of the scrolling `root` into
 * `onLoadMore` calls, no more than one per "the sentinel is near and no load
 * is in flight since the last one finished".
 *
 * Three facts drive it: whether the sentinel is intersecting (as of the
 * observer's last report), whether `onLoadMore` has fired since the last
 * load finished, and whether a load was in flight at the last update. They
 * outlive the sentinel itself, which a renderer mounts and unmounts as
 * `hasMore` changes, so they live here rather than on any one observer.
 *
 * Off means off: with `hasMore` false, or no sentinel, no observer exists.
 */
export function attachInfiniteScroll(
  root: Element,
  options: InfiniteScrollOptions,
): InfiniteScroll {
  let latest = options;
  let intersecting = false;
  /** Set once `onLoadMore` fires, cleared only when a load finishes. */
  let fired = false;
  let wasLoading = options.isLoadingMore ?? false;
  let observer: IntersectionObserver | null = null;
  let observed: { sentinel: Element; rootMargin: string } | null = null;

  function maybeLoadMore(): void {
    if (
      !intersecting ||
      !latest.hasMore ||
      (latest.isLoadingMore ?? false) ||
      fired
    ) {
      return;
    }
    fired = true;
    latest.onLoadMore?.();
  }

  function disconnect(): void {
    observer?.disconnect();
    observer = null;
    observed = null;
    intersecting = false;
  }

  function observe(): void {
    const sentinel = latest.hasMore ? latest.sentinel : null;
    const rootMargin = latest.rootMargin ?? "200px";
    if (
      observed !== null &&
      observed.sentinel === sentinel &&
      observed.rootMargin === rootMargin
    ) {
      return;
    }
    disconnect();
    if (sentinel === null) {
      return;
    }
    observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (entry === undefined) {
          return;
        }
        intersecting = entry.isIntersecting;
        maybeLoadMore();
      },
      { root, rootMargin },
    );
    observer.observe(sentinel);
    observed = { sentinel, rootMargin };
  }

  observe();

  return {
    update(next) {
      latest = next;
      const loading = next.isLoadingMore ?? false;
      if (wasLoading && !loading) {
        fired = false;
        // The rows a finished load appended may not have pushed the sentinel
        // out of `rootMargin` at all, in which case it never leaves and
        // re-enters — no observer report would come to trigger the next load.
        maybeLoadMore();
      }
      wasLoading = loading;
      observe();
    },
    detach: disconnect,
  };
}
