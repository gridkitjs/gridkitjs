import { useRef, type RefObject } from "react";
import type { GridCommandTarget, GridPanelKind } from "@gridkitjs/core";
import type { OverlayAnchor, OverlayPlacement } from "@gridkitjs/dom";
import { overlayThemeClassName } from "../overlay/Overlay";
import type {
  GridOverlayApi,
  GridOverlayState,
} from "../overlay/useGridOverlay";

interface UseGridPanelsOptions {
  /** The grid's root element, holding the toolbar; a panel asked for from nowhere opens at its corner. */
  rootRef: RefObject<HTMLElement | null>;
  headerTableRef: RefObject<HTMLTableElement | null>;
  /** The grid's one open overlay, the panels among them. */
  overlay: GridOverlayApi;
}

/** The panel open now. */
export interface OpenPanel {
  /** Counts the openings, so one opened over another replaces it. */
  readonly key: number;
  readonly kind: GridPanelKind;
  /** Where it was asked for. */
  readonly target: GridCommandTarget;
  readonly anchor: OverlayAnchor;
  readonly placement: OverlayPlacement;
  /**
   * What gets focus back when it closes: the toolbar button or the header it
   * opened from, or, for `undefined`, whatever had focus as it opened.
   */
  readonly returnFocusTo: HTMLElement | undefined;
  readonly themeClassName: string;
}

export interface GridPanelsApi {
  /** The panel as the last render drew it. */
  panel: OpenPanel | null;
  /**
   * The panel open as of the last change, ahead of the render that draws it:
   * what a call acting on the open panel reads.
   */
  current: () => OpenPanel | null;
  /**
   * Opens the panel `kind` beside where `target` names, in place of any
   * panel or context menu open.
   */
  open: (kind: GridPanelKind, target: GridCommandTarget) => void;
  /** Closes the panel open, if any, and leaves a context menu open. */
  close: () => void;
  /** See `GridOverlayApi`. */
  returnFocusFallback: () => HTMLElement | null;
}

/** The element of the root's own toolbar whose `data-gridkit-toolbar-item` is `itemId`. */
function toolbarItem(root: HTMLElement, itemId: string): HTMLElement | null {
  const items = root.querySelectorAll<HTMLElement>(
    ":scope > .gridkit-toolbar > [data-gridkit-toolbar-item]",
  );
  return (
    Array.from(items).find(
      (item) => item.getAttribute("data-gridkit-toolbar-item") === itemId,
    ) ??
    // In "More" while the toolbar is narrow: the button it is chosen from.
    Array.from(items).find((item) =>
      item.hasAttribute("data-gridkit-toolbar-more"),
    ) ??
    null
  );
}

function panelOf(overlay: GridOverlayState): OpenPanel | null {
  return overlay.kind === "panel" ? overlay.panel : null;
}

function headerCell(
  headerTable: HTMLTableElement | null,
  columnId: string,
): HTMLTableCellElement | null {
  const cells = headerTable?.tHead?.rows[0]?.cells;
  return cells === undefined
    ? null
    : (Array.from(cells).find(
        (cell) => cell.getAttribute("data-gridkit-column") === columnId,
      ) ?? null);
}

/**
 * The grid's panels — the column chooser and a column's filter menu —
 * opened through the command host's `openPanel` as the grid's one overlay
 * (see `useGridOverlay`), so opening one closes a context menu. A panel
 * opens beside where it was asked for: below the toolbar button, below the
 * column header, or at the grid's top-end corner for a call from nowhere in
 * particular, as the ref's is.
 *
 * Opened from a menu, it opens as the menu closes, in the same render: the
 * menu hands focus back to where it was opened from, and the panel takes it
 * from there — and gives it back there when it closes.
 */
export default function useGridPanels({
  rootRef,
  headerTableRef,
  overlay,
}: UseGridPanelsOptions): GridPanelsApi {
  const openings = useRef(0);

  function placeFor(
    root: HTMLElement,
    target: GridCommandTarget,
  ): Pick<OpenPanel, "anchor" | "placement" | "returnFocusTo"> {
    const element =
      target.area === "toolbar"
        ? toolbarItem(root, target.itemId)
        : target.area === "header"
          ? headerCell(headerTableRef.current, target.columnId)
          : null;
    if (element !== null) {
      return {
        anchor: element,
        // The toolbar's own button sits at its far end.
        placement: target.area === "toolbar" ? "bottom-end" : "bottom-start",
        returnFocusTo: element,
      };
    }
    const { right, top } = root.getBoundingClientRect();
    return {
      anchor: { x: right, y: top },
      placement: "bottom-end",
      returnFocusTo: undefined,
    };
  }

  return {
    panel: panelOf(overlay.drawn),
    current: () => panelOf(overlay.current()),
    open: (kind, target) => {
      const root = rootRef.current;
      if (root === null) {
        return;
      }
      openings.current += 1;
      overlay.open({
        kind: "panel",
        panel: {
          key: openings.current,
          kind,
          target,
          ...placeFor(root, target),
          themeClassName: overlayThemeClassName(root),
        },
      });
    },
    close: () => {
      overlay.close("panel");
    },
    returnFocusFallback: overlay.returnFocusFallback,
  };
}
