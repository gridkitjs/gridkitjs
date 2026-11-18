import type { CSSProperties } from "react";
import type { ResolvedColumn } from "./DataGrid";
import { classNames } from "./classNames";

/** Where a column is pinned, as `core`'s view resolved it. */
type PinPlacement = Pick<
  ResolvedColumn<unknown>,
  "pinned" | "pinOffset" | "pinEdge"
>;

/**
 * The state classes of a pinned column's header, body, footer and summary
 * cells: its edge, and `is-pinned-edge` on the column beside the scrolling
 * ones. `""` for an unpinned column.
 */
export function pinnedCellClassNames({
  pinned,
  pinEdge,
}: PinPlacement): string {
  if (pinned === "none") return "";
  return classNames(
    pinned === "start" ? "is-pinned-start" : "is-pinned-end",
    pinEdge && "is-pinned-edge",
  );
}

/**
 * The one style a cell carries for pinning: its distance from its edge,
 * which the stylesheet's sticky inset reads. Per cell, so it cannot live in
 * the stylesheet. Nothing for an unpinned column.
 */
export function pinnedCellStyle({
  pinned,
  pinOffset,
}: PinPlacement): CSSProperties | undefined {
  if (pinned === "none") return undefined;
  return {
    "--gridkit-pin-offset": `${String(pinOffset)}px`,
  } as CSSProperties;
}
