import type { CSSProperties, ReactNode } from "react";
import { classNames } from "../classNames";

interface GridLoadingOverlayProps {
  /** Whether the body has no rows beneath it, so the overlay sets the body's height rather than covering it. */
  empty: boolean;
  /** The scroll area's inner width, so the content centres in the part of the body in view. `null` until measured. */
  viewportWidth: number | null;
  children: ReactNode;
}

/**
 * Covers the body while the grid's `loading` option is on, over the rows
 * already drawn, which keep their places beneath it; pointer input on the
 * body lands on it rather than on them.
 *
 * Like the empty row, a row the grid owns, so a screen reader reading the
 * grid reaches its message, but not one of its rows: it has no
 * `aria-rowindex`, `aria-rowcount` leaves it out, and navigation, selection
 * and the row events never address it.
 */
export default function GridLoadingOverlay({
  empty,
  viewportWidth,
  children,
}: GridLoadingOverlayProps) {
  const contentStyle =
    viewportWidth === null
      ? undefined
      : ({
          "--gridkit-loading-width": `${String(viewportWidth)}px`,
        } as CSSProperties);
  return (
    <div
      role="row"
      className={classNames(
        "gridkit-grid-loading-overlay",
        empty && "is-empty",
      )}
    >
      <div
        role="gridcell"
        className="gridkit-grid-loading-overlay-content"
        style={contentStyle}
      >
        {children}
      </div>
    </div>
  );
}
