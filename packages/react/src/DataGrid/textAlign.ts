import type { ColumnAlignment } from "@gridkitjs/core";

/**
 * The `text-align` a column's `alignment` renders with. `"left"` and
 * `"right"` name the reading-start and reading-end sides, which `start` and
 * `end` follow: they render exactly as `left` and `right` in a left-to-right
 * page and mirror under `dir="rtl"`.
 */
export function textAlignFor(
  alignment: ColumnAlignment,
): "start" | "center" | "end" {
  switch (alignment) {
    case "left":
      return "start";
    case "right":
      return "end";
    case "center":
      return "center";
  }
}
