import {
  placeOverlay,
  type OverlayPlacementOptions,
  type OverlayRect,
} from "./placeOverlay";

/** What an overlay opens beside: an element, or a point in viewport coordinates. */
export type OverlayAnchor =
  Element | { readonly x: number; readonly y: number };

/** Why an overlay asked to close. */
export type OverlayDismissReason =
  "escape" | "outside" | "scroll" | "resize" | "blur";

export interface OverlayOptions extends OverlayPlacementOptions {
  /**
   * The overlay asks to close: Escape was pressed, a pointer went down
   * outside it, something outside it scrolled, the window resized or lost
   * focus, or focus moved outside it. The caller closes it — removes the
   * panel and detaches — or keeps it open by doing nothing.
   */
  readonly onDismiss: (reason: OverlayDismissReason) => void;
  /**
   * Where focus goes when the overlay detaches. Defaults to the element that
   * had focus when it attached; `null` leaves focus alone.
   */
  readonly returnFocusTo?: HTMLElement | null | undefined;
}

/** Everything focusable by script, so a menu's `tabindex="-1"` items count. */
const FOCUSABLE =
  "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]";

function anchorRect(anchor: OverlayAnchor): OverlayRect {
  if (anchor instanceof Element) {
    const { top, left, width, height } = anchor.getBoundingClientRect();
    return { top, left, width, height };
  }
  return { top: anchor.y, left: anchor.x, width: 0, height: 0 };
}

/**
 * Shows `panel` as an overlay beside `anchor` — a menu, a popover, a filter
 * editor — and returns the function that ends it. The caller renders the
 * panel, usually as a child of `document.body` so no scrolling ancestor clips
 * it; this positions it, moves focus into it, and reports through
 * `onDismiss` when the user is done with it.
 *
 * The panel is positioned `fixed`, at the place `placeOverlay` picks from the
 * anchor's and the panel's measured boxes, and carries that placement in
 * `data-gridkit-placement` (`"top-start"` once flipped above, say) for a
 * stylesheet to point an arrow by. Focus moves to the panel's first focusable
 * descendant, or to the panel itself — given `tabindex="-1"` if it has no
 * `tabindex` — when there is none.
 *
 * Nothing that happens on or in the anchor dismisses the overlay, so a button
 * that toggles it can close it with its own click rather than having the
 * overlay close and the click reopen it.
 *
 * Detaching removes every listener and returns focus, but only when focus is
 * still in the panel or nowhere — a click that dismissed it by landing on
 * another control leaves focus on that control.
 */
export function attachOverlay(
  anchor: OverlayAnchor,
  panel: HTMLElement,
  options: OverlayOptions,
): () => void {
  const { onDismiss } = options;
  const returnFocusTo =
    options.returnFocusTo === undefined
      ? document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
      : options.returnFocusTo;

  function belongs(target: EventTarget | null): boolean {
    return (
      target instanceof Node &&
      (panel.contains(target) ||
        (anchor instanceof Element && anchor.contains(target)))
    );
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      onDismiss("escape");
    }
  }

  function onPointerDown(event: PointerEvent): void {
    if (!belongs(event.target)) {
      onDismiss("outside");
    }
  }

  // The overlay is placed in viewport coordinates, so any scroll that moves
  // its anchor leaves it behind — except a scroll inside the panel itself.
  function onScroll(event: Event): void {
    if (!(event.target instanceof Node && panel.contains(event.target))) {
      onDismiss("scroll");
    }
  }

  function onResize(): void {
    onDismiss("resize");
  }

  // Only a move to somewhere definite counts: focus dropping to nothing, as
  // when the focused item re-renders away, is not the user leaving.
  function onFocusOut(event: FocusEvent): void {
    if (event.relatedTarget !== null && !belongs(event.relatedTarget)) {
      onDismiss("blur");
    }
  }

  function onWindowBlur(): void {
    onDismiss("blur");
  }

  // Shrink-wrapped before it is measured: in normal flow a block panel
  // would report the full width of the page.
  panel.style.position = "fixed";
  panel.style.top = "0px";
  panel.style.left = "0px";
  const { width, height } = panel.getBoundingClientRect();
  const position = placeOverlay(
    anchorRect(anchor),
    { width, height },
    {
      width: document.documentElement.clientWidth,
      height: document.documentElement.clientHeight,
    },
    options,
  );
  panel.style.top = `${String(position.top)}px`;
  panel.style.left = `${String(position.left)}px`;
  panel.setAttribute("data-gridkit-placement", position.placement);

  const first = panel.querySelector<HTMLElement>(FOCUSABLE);
  if (first === null && !panel.hasAttribute("tabindex")) {
    panel.tabIndex = -1;
  }
  (first ?? panel).focus({ preventScroll: true });

  document.addEventListener("keydown", onKeyDown, true);
  document.addEventListener("pointerdown", onPointerDown, true);
  window.addEventListener("scroll", onScroll, { capture: true, passive: true });
  window.addEventListener("resize", onResize);
  window.addEventListener("blur", onWindowBlur);
  panel.addEventListener("focusout", onFocusOut);

  let attached = true;
  return () => {
    if (!attached) {
      return;
    }
    attached = false;
    document.removeEventListener("keydown", onKeyDown, true);
    document.removeEventListener("pointerdown", onPointerDown, true);
    window.removeEventListener("scroll", onScroll, { capture: true });
    window.removeEventListener("resize", onResize);
    window.removeEventListener("blur", onWindowBlur);
    panel.removeEventListener("focusout", onFocusOut);

    const active = document.activeElement;
    if (
      returnFocusTo !== null &&
      (active === null || active === document.body || panel.contains(active))
    ) {
      returnFocusTo.focus({ preventScroll: true });
    }
  };
}
