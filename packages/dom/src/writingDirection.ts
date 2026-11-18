import type { WritingDirection } from "@gridkitjs/core/renderer";

/**
 * The way `element`'s lines run, from its computed `direction`: what it
 * inherits from a `dir` attribute on it or an ancestor, or from the CSS
 * `direction` property. Read afresh on every call, never kept, so a page
 * whose direction changes is followed from the next key press, gesture or
 * overlay on.
 */
export function writingDirection(element: Element): WritingDirection {
  return getComputedStyle(element).direction === "rtl" ? "rtl" : "ltr";
}
