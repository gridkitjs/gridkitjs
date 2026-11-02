import { useCallback, useLayoutEffect, useRef, type RefObject } from "react";
import { createLiveAnnouncer, type LiveAnnouncer } from "@gridkitjs/dom";

/**
 * The grid's live region, added as the last child of `containerRef`'s element
 * once it mounts. `@gridkitjs/dom` owns the element, so React never renders
 * it and an announcement re-renders nothing.
 *
 * A layout effect, so the region is in place from the first paint — where it
 * was when React rendered it. The returned `announce` keeps its identity for
 * the grid's whole life.
 */
export default function useLiveAnnouncer(
  containerRef: RefObject<HTMLElement | null>,
): (text: string) => void {
  const announcer = useRef<LiveAnnouncer | null>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (container === null) {
      return undefined;
    }
    const created = createLiveAnnouncer(container);
    announcer.current = created;
    return () => {
      created.destroy();
      announcer.current = null;
    };
  }, [containerRef]);

  return useCallback((text: string) => {
    announcer.current?.announce(text);
  }, []);
}
