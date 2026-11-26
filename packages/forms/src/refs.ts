import type { Ref } from "react";

/** Points `ref` at `element`, and returns what lets go of it again. */
export function setRef<T>(
  ref: Ref<T> | undefined,
  element: T,
): (() => void) | null {
  if (typeof ref === "function") {
    const cleanup = ref(element);
    return typeof cleanup === "function"
      ? cleanup
      : () => {
          ref(null);
        };
  }
  if (ref === undefined || ref === null) {
    return null;
  }
  ref.current = element;
  return () => {
    ref.current = null;
  };
}
