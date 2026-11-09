import { applyColumnResize, type ColumnResizeSession } from "@gridkitjs/core";
import {
  mayStartGesture,
  startPointerGesture,
  type PointerPress,
} from "./pointerGesture";

export interface ColumnResizeGestureHandlers {
  /** Every pointer move, with the width the column takes there. */
  readonly onMove: (width: number) => void;
  /**
   * The pointer was released. `width` is the width to commit, even when a
   * drag brought it back to where it started, or `null` when the width never
   * changed: a click on the handle — as each half of a double-click is — is
   * not a resize, and reporting one would fire a spurious resize on every
   * click.
   */
  readonly onEnd: (width: number | null) => void;
  /**
   * Escape, a cancelled pointer or an aborted `signal`: the column goes back
   * to `session.startWidth`.
   */
  readonly onCancel: () => void;
  /**
   * Cancels the resize when aborted, as Escape does. For a renderer whose
   * handle goes away mid-drag, so what it draws for the resize ends with it.
   * Already aborted, no resize starts.
   */
  readonly signal?: AbortSignal;
}

/**
 * Drags a column's edge from `press` on its resize `handle`, turning pointer
 * positions into widths through `@gridkitjs/core`'s `session` — begun with
 * `beginColumnResize` — and reporting them. Returns whether a resize began:
 * only the primary button of the primary pointer starts one, and not once
 * `handlers.signal` has aborted.
 *
 * Captures the pointer on `handle`, so the drag keeps reporting wherever the
 * pointer goes, and prevents the press's default, so it does not select the
 * header text it started on. No minimum distance, unlike a reorder drag: the
 * handle does nothing else a press could have meant.
 */
export function startColumnResizeGesture(
  handle: HTMLElement,
  press: PointerPress,
  session: ColumnResizeSession,
  handlers: ColumnResizeGestureHandlers,
): boolean {
  if (!mayStartGesture(press, handlers.signal)) {
    return false;
  }
  press.preventDefault();

  let width = session.startWidth;
  let resized = false;
  startPointerGesture(
    handle,
    press.pointerId,
    {
      onMove(event) {
        width = applyColumnResize(session, event.clientX);
        resized ||= width !== session.startWidth;
        handlers.onMove(width);
      },
      onEnd() {
        handlers.onEnd(resized ? width : null);
      },
      onCancel() {
        handlers.onCancel();
      },
    },
    handlers.signal,
  );
  return true;
}

/**
 * The width the widest cell in `columnId` needs to show its content in full,
 * or `null` when the column has no cells — what double-clicking a resize
 * handle sizes the column to, through `sizeColumnToContent`.
 *
 * Measured with a `Range` over each cell's contents rather than the cell's own
 * `scrollWidth`. A range shrink-wraps what is actually laid out, so a column
 * far wider than its content reports the content width and can be sized *down*;
 * `scrollWidth` never reports less than the cell it is read from and so can
 * only ever grow a column.
 *
 * Only rendered rows are measured — on a paged or virtualized grid, the ones
 * on screen.
 */
export function measureColumnContent(
  table: HTMLTableElement,
  columnId: string,
): number | null {
  const cells = table.querySelectorAll<HTMLElement>(
    `td[data-gridkit-column="${CSS.escape(columnId)}"]`,
  );
  const range = document.createRange();
  let widest: number | null = null;

  for (const cell of cells) {
    range.selectNodeContents(cell);
    const style = getComputedStyle(cell);
    // The range covers the content box only, so the cell's own spacing has to
    // be added back or the column would clip by exactly its padding.
    const width =
      range.getBoundingClientRect().width +
      parseFloat(style.paddingLeft) +
      parseFloat(style.paddingRight) +
      parseFloat(style.borderLeftWidth) +
      parseFloat(style.borderRightWidth);

    if (widest === null || width > widest) {
      widest = width;
    }
  }

  return widest;
}
