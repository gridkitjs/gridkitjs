import { useEffect, useRef, useState } from "react";
import { attachInfiniteScroll, type InfiniteScroll } from "@gridkitjs/dom";

interface InfiniteScrollHarnessProps {
  /**
   * Whether each load adds a 20px row in front of the sentinel within the
   * same render and without `isLoadingMore`, as a load answered from memory
   * would. The sentinel moves down with each row and stays in view until the
   * third.
   */
  readonly appendOnLoad?: boolean;
}

/**
 * `attachInfiniteScroll` on a scrolling box whose sentinel is in view from
 * the start, driven directly rather than through `DataGrid`, whose own
 * caller never updates a detached instance. It starts with `hasMore` false;
 * "Has more" turns it on and "Detach" detaches. Every render hands the
 * current options to `update`, detached or not, and
 * `data-testid="load-count"` counts the `onLoadMore` calls.
 */
export default function InfiniteScrollHarness({
  appendOnLoad = false,
}: InfiniteScrollHarnessProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scroll = useRef<InfiniteScroll | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadCount, setLoadCount] = useState(0);

  useEffect(() => {
    const root = rootRef.current;
    if (root === null) {
      return undefined;
    }
    const attached = attachInfiniteScroll(root, {
      sentinel: null,
      hasMore: false,
    });
    scroll.current = attached;
    return attached.detach;
  }, []);

  useEffect(() => {
    scroll.current?.update({
      sentinel: sentinelRef.current,
      hasMore,
      onLoadMore: () => {
        setLoadCount((count) => count + 1);
      },
      rootMargin: "0px",
    });
  });

  return (
    <div>
      <div ref={rootRef} style={{ height: 100, overflowY: "auto" }}>
        <div style={{ height: 50 }} />
        {Array.from({ length: appendOnLoad ? loadCount : 0 }, (_, index) => (
          <div key={index} style={{ height: 20 }} />
        ))}
        <div ref={sentinelRef} style={{ height: 1 }} />
      </div>
      <button
        type="button"
        onClick={() => {
          setHasMore(true);
        }}
      >
        Has more
      </button>
      <button
        type="button"
        onClick={() => {
          scroll.current?.detach();
        }}
      >
        Detach
      </button>
      <output data-testid="load-count">{loadCount}</output>
    </div>
  );
}
