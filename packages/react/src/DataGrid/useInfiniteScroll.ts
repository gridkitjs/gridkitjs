import { useEffect, useRef, type RefObject } from "react";
import { attachInfiniteScroll, type InfiniteScroll } from "@gridkitjs/dom";
import type { InfiniteScrollConfig } from "./DataGrid";

interface UseInfiniteScrollOptions {
  /** The `.gridkit-data-grid-body` scroll wrapper. */
  rootRef: RefObject<HTMLDivElement | null>;
  /** The always-last `<tr>` `GridBody` renders while `config?.hasMore` is true. */
  sentinelRef: RefObject<HTMLTableRowElement | null>;
  config: InfiniteScrollConfig | undefined;
}

/**
 * `@gridkitjs/dom`'s `attachInfiniteScroll` on the body, idle until the
 * effect below hands it the props. That runs after every commit: the
 * sentinel row mounts and unmounts with `hasMore`, so only after a commit is
 * `sentinelRef` current, and an update that changes nothing does nothing.
 */
export default function useInfiniteScroll({
  rootRef,
  sentinelRef,
  config,
}: UseInfiniteScrollOptions): void {
  const scroll = useRef<InfiniteScroll | null>(null);

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
    return () => {
      attached.detach();
      scroll.current = null;
    };
  }, [rootRef]);

  useEffect(() => {
    scroll.current?.update({
      sentinel: sentinelRef.current,
      hasMore: config?.hasMore ?? false,
      onLoadMore: config?.onLoadMore,
      isLoadingMore: config?.isLoadingMore,
      rootMargin: config?.rootMargin,
    });
  });
}
