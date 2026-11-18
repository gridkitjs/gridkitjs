import { useLayoutEffect, useState, type RefObject } from "react";
import { observeElementHeight } from "@gridkitjs/dom";

/**
 * The height of `ref`'s element, tracked as it changes by
 * `@gridkitjs/dom`'s `observeElementHeight`, or `null` while `enabled` is
 * off or the element is not mounted.
 *
 * A layout effect, as in `useElementWidth`, so the first measurement lands
 * before paint.
 */
export default function useElementHeight(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
): number | null {
  const [height, setHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (element === null || !enabled) {
      return undefined;
    }
    const disconnect = observeElementHeight(element, setHeight);
    return () => {
      disconnect();
      setHeight(null);
    };
  }, [ref, enabled]);

  return enabled ? height : null;
}
