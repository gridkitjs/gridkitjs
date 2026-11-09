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
   * `rootMargin` of the root's visible area. Not again until that load has
   * finished (`isLoadingMore` back to `false`), `hasMore` has changed, rows
   * have been added or removed in front of the sentinel, or the sentinel has
   * left `rootMargin` and come back.
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
   * observer, and a load finishing or `hasMore` changing re-checks at once.
   * While a load it asked for has not reported `isLoadingMore`, it measures
   * where the sentinel sits, to tell whether rows answered it.
   */
  readonly update: (options: InfiniteScrollOptions) => void;
  /** Stops watching for good: a later `update` does nothing. */
  readonly detach: () => void;
}

/**
 * Where the next load stands. `requested` is `onLoadMore` called with no
 * `isLoadingMore: true` seen since, which a load that starts nothing, or
 * finishes within one render, never leaves on its own. It keeps where the
 * sentinel sat when the load was asked for, so rows added in front of it
 * show as an answer even while it stays in range.
 */
type LoadState =
  | { readonly kind: "idle" }
  | { readonly kind: "requested"; readonly sentinelOffset: number }
  | { readonly kind: "loading" }
  | { readonly kind: "detached" };

const IDLE: LoadState = { kind: "idle" };
const LOADING: LoadState = { kind: "loading" };
const DETACHED: LoadState = { kind: "detached" };

/**
 * The state after an `update`: `loading` while a load is in flight, and
 * `idle` again once one finishes or `hasMore` changes, either of which
 * means no load can still be pending.
 */
function afterUpdate(
  state: LoadState,
  loading: boolean,
  hasMoreChanged: boolean,
): LoadState {
  if (loading) {
    return LOADING;
  }
  return state.kind === "loading" || hasMoreChanged ? IDLE : state;
}

/**
 * How far into `root`'s scrolled content `sentinel` sits. Scrolling leaves
 * it alone; rows added or removed in front of the sentinel change it.
 */
function contentOffset(root: Element, sentinel: Element): number {
  return (
    sentinel.getBoundingClientRect().top -
    root.getBoundingClientRect().top +
    root.scrollTop
  );
}

/**
 * Turns a sentinel's approach to the bottom of the scrolling `root` into
 * `onLoadMore` calls, no more than one per approach while no load is in
 * flight.
 *
 * Two facts drive it: whether the sentinel is intersecting (as of the
 * observer's last report), and the `LoadState`. Both outlive the sentinel
 * itself, which a renderer mounts and unmounts as `hasMore` changes, so they
 * live here rather than on any one observer.
 *
 * Off means off: with `hasMore` false, no sentinel, or once detached, no
 * observer exists.
 */
export function attachInfiniteScroll(
  root: Element,
  options: InfiniteScrollOptions,
): InfiniteScroll {
  let latest = options;
  let intersecting = false;
  let state: LoadState = (options.isLoadingMore ?? false) ? LOADING : IDLE;
  let observer: IntersectionObserver | null = null;
  let observed: { sentinel: Element; rootMargin: string } | null = null;

  function maybeLoadMore(): void {
    if (
      state.kind !== "idle" ||
      !intersecting ||
      observed === null ||
      !latest.hasMore
    ) {
      return;
    }
    state = {
      kind: "requested",
      sentinelOffset: contentOffset(root, observed.sentinel),
    };
    latest.onLoadMore?.();
  }

  /**
   * Whether rows were added or removed in front of the sentinel since the
   * outstanding request: its answer, even when it left the sentinel in range,
   * where the observer, seeing no change, reports nothing. Less than a pixel
   * is a fractional scroll position rounding, not a row.
   */
  function requestAnswered(): boolean {
    if (state.kind !== "requested" || observed === null) {
      return false;
    }
    const moved = contentOffset(root, observed.sentinel) - state.sentinelOffset;
    return Math.abs(moved) >= 1;
  }

  function report(isIntersecting: boolean): void {
    intersecting = isIntersecting;
    // The sentinel left the range, so its next entry is a fresh approach.
    if (!intersecting && state.kind === "requested") {
      state = IDLE;
    }
    maybeLoadMore();
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
        if (entry !== undefined) {
          report(entry.isIntersecting);
        }
      },
      { root, rootMargin },
    );
    observer.observe(sentinel);
    observed = { sentinel, rootMargin };
  }

  observe();

  return {
    update(next) {
      if (state.kind === "detached") {
        return;
      }
      const hasMoreChanged = next.hasMore !== latest.hasMore;
      latest = next;
      state = afterUpdate(state, next.isLoadingMore ?? false, hasMoreChanged);
      observe();
      if (requestAnswered()) {
        // Where the sentinel is now is the observer's to say: a new one
        // reports at once, and the last report predates the new rows.
        state = IDLE;
        disconnect();
        observe();
      }
      // After a load finishes, or `hasMore` changes, the sentinel may still be
      // in range: then it never leaves and re-enters, and no observer report
      // would come to trigger the next load.
      maybeLoadMore();
    },
    detach() {
      disconnect();
      state = DETACHED;
    },
  };
}
