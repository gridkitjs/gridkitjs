import { useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import type { WritingDirection } from "@gridkitjs/core/renderer";
import {
  attachOverlay,
  writingDirection,
  type OverlayAnchor,
  type OverlayDismissReason,
  type OverlayInitialFocus,
  type OverlayPlacement,
} from "@gridkitjs/dom";
import { classNames } from "../classNames";

/**
 * What an overlay copies from the element it opens from, rendering into
 * `document.body` out of reach of what that element inherits: the palette
 * class (`gridkit-light`, `gridkit-dark` or none, to follow the page) and
 * the writing direction, which lays out its content and places it.
 */
export interface OverlayScope {
  readonly themeClassName: string;
  readonly direction: WritingDirection;
}

interface OverlayProps {
  /**
   * What the overlay opens beside: an element, or a point. It and the
   * options after it are read when the overlay attaches, and a change to any
   * of them attaches it afresh — moving focus back in — so each should stay
   * the same for as long as the overlay is open.
   */
  anchor: OverlayAnchor;
  placement?: OverlayPlacement | undefined;
  gap?: number | undefined;
  offset?: number | undefined;
  /**
   * Where focus goes on attaching — see `attachOverlay`'s option — or a ref
   * to the control it goes to, read as the overlay attaches, once its
   * children have mounted, so that it can be one of theirs. A ref holding
   * nothing sends it to the first control.
   */
  initialFocus?:
    OverlayInitialFocus | RefObject<HTMLElement | null> | undefined;
  returnFocusTo?: HTMLElement | null | undefined;
  /**
   * See `attachOverlay`'s option: where focus goes once `returnFocusTo` has
   * left the page. Read as the overlay detaches, so it need not stay the same.
   */
  returnFocusFallback?: (() => HTMLElement | null) | undefined;
  /** See `attachOverlay`'s option: a panel whose controls change the grid under it. */
  ignoreScrollAfterInput?: boolean | undefined;
  /** See `attachOverlay`'s option: Tab stays inside, as in a dialog. */
  trapFocus?: boolean | undefined;
  /** The palette and direction the overlay takes — see `overlayScope`. */
  scope: OverlayScope;
  /** The overlay asks to close; the caller unmounts it, or not. */
  onDismiss: (reason: OverlayDismissReason) => void;
  children: ReactNode;
}

/**
 * The space between a menu or panel and the element it opens below — a
 * toolbar button, a header — so its shadow does not run into that element's
 * border. Nothing opened at a point, or beside its own menu, as a submenu is,
 * takes it.
 */
export const ANCHOR_GAP = 4;

/** `focus` as `attachOverlay` takes it, reading a ref's control now. */
function attachedFocus(
  focus: OverlayProps["initialFocus"],
): OverlayInitialFocus | undefined {
  return typeof focus === "object" && !(focus instanceof HTMLElement)
    ? (focus.current ?? "first")
    : focus;
}

/**
 * The palette class an overlay opened from `element` copies:
 * `gridkit-light` or `gridkit-dark`, from the nearest ancestor carrying one,
 * or none to follow the page.
 */
function themeClassNameOf(element: Element | null): string {
  const scope = element?.closest(".gridkit-light, .gridkit-dark");
  if (scope === null || scope === undefined) {
    return "";
  }
  return scope.classList.contains("gridkit-dark")
    ? "gridkit-dark"
    : "gridkit-light";
}

/**
 * The scope an overlay opened from `element` takes, read as it opens. With
 * no element, it follows the page.
 */
export function overlayScope(element: Element | null): OverlayScope {
  return {
    themeClassName: themeClassNameOf(element),
    direction: writingDirection(element ?? document.documentElement),
  };
}

/**
 * `children` in a panel portalled into `document.body` — where no scrolling
 * ancestor of the grid clips it — shown beside `anchor` by
 * `@gridkitjs/dom`'s `attachOverlay` for as long as it is mounted.
 *
 * Attached in a layout effect, which React runs after its children's: a menu
 * inside attaches its own behaviour first, so the overlay's initial focus
 * finds the item that behaviour made the tab stop. A nested overlay — a
 * submenu — mounts on a later user action than the one it opens from, so it
 * attaches after it and sits above it in the overlay stack.
 */
export default function Overlay({
  anchor,
  placement,
  gap,
  offset,
  initialFocus,
  returnFocusTo,
  returnFocusFallback,
  ignoreScrollAfterInput,
  trapFocus,
  scope,
  onDismiss,
  children,
}: OverlayProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  // Read through refs, so new functions every render do not re-attach.
  const onDismissRef = useRef(onDismiss);
  const returnFocusFallbackRef = useRef(returnFocusFallback);
  useLayoutEffect(() => {
    onDismissRef.current = onDismiss;
    returnFocusFallbackRef.current = returnFocusFallback;
  });

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (panel === null) {
      return undefined;
    }
    return attachOverlay(anchor, panel, {
      placement,
      gap,
      offset,
      initialFocus: attachedFocus(initialFocus),
      returnFocusTo,
      returnFocusFallback: () => returnFocusFallbackRef.current?.() ?? null,
      ignoreScrollAfterInput,
      trapFocus,
      onDismiss: (reason) => {
        onDismissRef.current(reason);
      },
    });
  }, [
    anchor,
    placement,
    gap,
    offset,
    initialFocus,
    returnFocusTo,
    ignoreScrollAfterInput,
    trapFocus,
  ]);

  return createPortal(
    <div
      ref={panelRef}
      className={classNames("gridkit-overlay", scope.themeClassName)}
      dir={scope.direction}
    >
      {children}
    </div>,
    document.body,
  );
}
