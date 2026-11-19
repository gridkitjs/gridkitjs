import type { CSSProperties, ReactNode } from "react";

interface GridEmptyRowProps {
  columnCount: number;
  /** The scroll area's inner width, so the content centres in the part of the row in view. `null` until measured. */
  viewportWidth: number | null;
  children: ReactNode;
}

/**
 * Stands in for the rows when there are none to show.
 *
 * A row the grid owns, so a screen reader reading the grid reaches it, but
 * not one of its rows: it has no `aria-rowindex`, `aria-rowcount` leaves it
 * out, and it carries neither `data-gridkit-row-index` nor
 * `data-gridkit-column`, so navigation, selection and the row events never
 * address it. Nothing in it takes focus unless the app's template puts it
 * there.
 */
export default function GridEmptyRow({
  columnCount,
  viewportWidth,
  children,
}: GridEmptyRowProps) {
  const contentStyle =
    viewportWidth === null
      ? undefined
      : ({
          "--gridkit-empty-width": `${String(viewportWidth)}px`,
        } as CSSProperties);
  return (
    <tr role="row" className="gridkit-grid-empty-row">
      <td
        role="gridcell"
        colSpan={columnCount}
        className="gridkit-grid-empty-cell"
      >
        <div className="gridkit-grid-empty-content" style={contentStyle}>
          {children}
        </div>
      </td>
    </tr>
  );
}
