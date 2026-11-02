import { useLayoutEffect, useState, type RefObject } from "react";
import { observeElementWidth } from "@gridkitjs/dom";

/**
 * The inner width of `ref`'s element, tracked as it changes by
 * `@gridkitjs/dom`'s `observeElementWidth`.
 *
 * A layout effect rather than an effect so the first measurement lands before
 * paint — otherwise columns show at their natural width for a frame and then
 * visibly jump once auto-fit runs. Server rendering would want the usual
 * isomorphic-layout-effect shim here.
 *
 * @param enabled Whether to observe at all. A caller that does not read the
 * width passes `false` rather than paying a re-render of the whole grid on
 * every frame of a window resize.
 */
export default function useElementWidth(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
): number | null {
  const [width, setWidth] = useState<number | null>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (element === null || !enabled) {
      return undefined;
    }
    return observeElementWidth(element, setWidth);
  }, [ref, enabled]);

  return width;
}
