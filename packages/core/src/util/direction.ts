/**
 * The way a line runs: left to right, or right to left as in Arabic and
 * Hebrew. Rows, toolbars and the group-by bar run this way, so in `"rtl"`
 * the first column sits at the right edge.
 */
export type WritingDirection = "ltr" | "rtl";

/**
 * Which way a horizontal arrow key moves along a line in `direction`: `1`
 * to the next column, chip or toolbar control, `-1` to the previous one, or
 * `null` for any other key. The arrows point the way they move, so in
 * `"rtl"`, where the next one is to the left, `ArrowLeft` moves forward.
 */
export function inlineStep(
  key: string,
  direction: WritingDirection = "ltr",
): 1 | -1 | null {
  const forward = direction === "rtl" ? "ArrowLeft" : "ArrowRight";
  const backward = direction === "rtl" ? "ArrowRight" : "ArrowLeft";
  if (key === forward) {
    return 1;
  }
  if (key === backward) {
    return -1;
  }
  return null;
}
