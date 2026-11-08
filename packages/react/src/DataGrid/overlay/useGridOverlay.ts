import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { GridOptions } from "@gridkitjs/core";
import type { OpenContextMenu } from "../contextMenu/useContextMenu";
import type { OpenPanel } from "../panels/useGridPanels";
import type { GridNavigationApi } from "../useGridNavigation";

/** Which of the grid's top-level overlays is open: one at most. */
export type GridOverlayState =
  | { readonly kind: "closed" }
  | { readonly kind: "contextMenu"; readonly menu: OpenContextMenu }
  | { readonly kind: "panel"; readonly panel: OpenPanel };

export type OpenGridOverlay = Exclude<GridOverlayState, { kind: "closed" }>;

const CLOSED: GridOverlayState = { kind: "closed" };

interface UseGridOverlayOptions<Row> {
  nav: GridNavigationApi;
  onContextMenuOpenChange: GridOptions<Row>["onContextMenuOpenChange"];
}

export interface GridOverlayApi {
  /** The overlay as the last render drew it. */
  drawn: GridOverlayState;
  /**
   * The overlay open as of the last change, ahead of the render that draws
   * it: what a call acting on the open overlay reads.
   */
  current: () => GridOverlayState;
  /** Opens `next` in place of whatever is open. */
  open: (next: OpenGridOverlay) => void;
  /** Closes the overlay open if it is a `kind` one, and leaves any other. */
  close: (kind: OpenGridOverlay["kind"]) => void;
  /**
   * Where focus goes when an overlay closes and the element it returns focus
   * to has gone with what it did, as a header goes with its hidden column:
   * the cell now holding the grid's tab stop.
   */
  returnFocusFallback: () => HTMLElement | null;
}

/**
 * The grid's top-level overlays — the context menu and the panels — held as
 * one state, so opening one closes the other, whether from the grid or the
 * ref. Every change goes through here, which tells `onContextMenuOpenChange`
 * when a context menu opens or closes: the one closing first.
 *
 * `open` and `close` keep their identity across renders, so an effect can
 * close an overlay on its way out.
 */
export default function useGridOverlay<Row>({
  nav,
  onContextMenuOpenChange,
}: UseGridOverlayOptions<Row>): GridOverlayApi {
  const [drawn, setDrawn] = useState(CLOSED);
  const current = useRef(CLOSED);
  // Read through a ref, so a menu closing as the grid unmounts tells the
  // latest callback.
  const reportOpenChange = useRef(onContextMenuOpenChange);
  useLayoutEffect(() => {
    reportOpenChange.current = onContextMenuOpenChange;
  });

  const show = useCallback((next: GridOverlayState): void => {
    const previous = current.current;
    current.current = next;
    setDrawn(next);
    if (previous.kind === "contextMenu") {
      reportOpenChange.current?.({ open: false, target: previous.menu.target });
    }
    if (next.kind === "contextMenu") {
      reportOpenChange.current?.({ open: true, target: next.menu.target });
    }
  }, []);

  const close = useCallback(
    (kind: OpenGridOverlay["kind"]): void => {
      if (current.current.kind === kind) {
        show(CLOSED);
      }
    },
    [show],
  );

  return {
    drawn,
    current: () => current.current,
    open: show,
    close,
    returnFocusFallback: nav.tabStopCell,
  };
}
