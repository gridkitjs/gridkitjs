import {
  isInsideOverlayAbove,
  pushOverlay,
  removeOverlay,
  type StackedOverlay,
} from "./overlayStack";
import {
  placeOverlay,
  type OverlayPlacementOptions,
  type OverlayRect,
} from "./placeOverlay";

/** What an overlay opens beside: an element, or a point in viewport coordinates. */
export type OverlayAnchor =
  Element | { readonly x: number; readonly y: number };

/**
 * Where focus goes when an overlay attaches: its first focusable descendant,
 * the panel itself, nowhere — focus stays where it was — or a given element.
 */
export type OverlayInitialFocus = "first" | "panel" | "none" | HTMLElement;

/** Why an overlay asked to close. */
export type OverlayDismissReason =
  "escape" | "outside" | "scroll" | "resize" | "blur" | "parent";

export interface OverlayOptions extends OverlayPlacementOptions {
  /**
   * The overlay asks to close: Escape was pressed while it was the topmost
   * overlay, a pointer went down outside it, something outside it scrolled,
   * the window resized or lost focus, focus moved outside it, or the overlay
   * it was opened above detached. The caller closes it — removes the panel
   * and detaches — or keeps it open by doing nothing, except after
   * `"parent"`, which detaches it regardless.
   */
  readonly onDismiss: (reason: OverlayDismissReason) => void;
  /**
   * Where focus goes on attaching. Defaults to `"first"`: a menu focuses its
   * first item. A panel whose first control is not where the user starts — a
   * filter editor's operator picker before its value box — passes that
   * element, or `"panel"` to land on the panel itself; `"none"` leaves focus
   * where it was, as a suggestion list does while typing goes on in the
   * field that opened it.
   */
  readonly initialFocus?: OverlayInitialFocus | undefined;
  /**
   * Where focus goes when the overlay detaches. Defaults to the element that
   * had focus when it attached; `null` leaves focus alone.
   */
  readonly returnFocusTo?: HTMLElement | null | undefined;
  /**
   * Whether a scroll outside the panel just after input inside it — an
   * `input` or `change` event, in the two animation frames that follow it —
   * leaves it open. A panel whose controls change the page under it opts
   * in: a column chooser hiding a column narrows the grid it opened from,
   * and the browser scrolls that grid back within its narrower content.
   * Defaults to `false`, where every scroll outside the panel dismisses it.
   */
  readonly ignoreScrollAfterInput?: boolean | undefined;
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
 * The element `initialFocus` names, or `null` for none. The panel stands in
 * for a first focusable descendant it does not have, given `tabindex="-1"`
 * when it has no `tabindex` of its own so that it can take focus.
 */
function initialFocusTarget(
  panel: HTMLElement,
  initialFocus: OverlayInitialFocus,
): HTMLElement | null {
  if (initialFocus === "none") {
    return null;
  }
  if (initialFocus instanceof HTMLElement) {
    return initialFocus;
  }
  const first =
    initialFocus === "first"
      ? panel.querySelector<HTMLElement>(FOCUSABLE)
      : null;
  if (first !== null) {
    return first;
  }
  if (!panel.hasAttribute("tabindex")) {
    panel.tabIndex = -1;
  }
  return panel;
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
 * stylesheet to point an arrow by. Whenever the panel's size changes — a list
 * that shrinks under a search — it is placed again beside the anchor, so a
 * panel flipped above its anchor keeps its bottom edge there — or beside
 * where the anchor was, once it has left the page. Focus moves
 * where `initialFocus` says.
 *
 * Nothing that happens on or in the anchor dismisses the overlay, so a button
 * that toggles it can close it with its own click rather than having the
 * overlay close and the click reopen it.
 *
 * Overlays stack in the order they attach. Escape belongs to the topmost
 * alone, which takes it: it closes a submenu without closing the menu under
 * it, and nothing else on the page — a grid that clears its selection on
 * Escape — hears it. An overlay counts everything in the overlays above it
 * as inside itself, so a click in a submenu keeps its menu open while a click
 * elsewhere in the menu closes only the submenu.
 *
 * Detaching removes every listener and returns focus, but only when focus is
 * still in the panel, in an overlay above it, or nowhere — a click that
 * dismissed it by landing on another control leaves focus on that control.
 * Any overlay still above it is dismissed with `"parent"` and detached first.
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

  const stacked: StackedOverlay = {
    panel,
    onEscape: () => {
      onDismiss("escape");
    },
    onParentDetached: () => {
      onDismiss("parent");
      detach();
    },
  };

  /** In the panel, or in an overlay opened above it. */
  function inside(target: EventTarget | null): boolean {
    return (
      target instanceof Node &&
      (panel.contains(target) || isInsideOverlayAbove(stacked, target))
    );
  }

  function belongs(target: EventTarget | null): boolean {
    return (
      inside(target) ||
      (anchor instanceof Element &&
        target instanceof Node &&
        anchor.contains(target))
    );
  }

  function onPointerDown(event: PointerEvent): void {
    if (!belongs(event.target)) {
      onDismiss("outside");
    }
  }

  // Set from input in the panel until two frames have passed: the scroll an
  // input causes is dispatched by the frame after its layout, which may
  // itself wait for the next frame.
  let settlingFrame: number | null = null;
  function onInput(): void {
    if (settlingFrame !== null) {
      cancelAnimationFrame(settlingFrame);
    }
    settlingFrame = requestAnimationFrame(() => {
      settlingFrame = requestAnimationFrame(() => {
        settlingFrame = null;
      });
    });
  }

  // The overlay is placed in viewport coordinates, so any scroll that moves
  // its anchor leaves it behind — except a scroll inside the panel itself,
  // or one the panel's own input caused, when it asks for that.
  function onScroll(event: Event): void {
    if (!inside(event.target) && settlingFrame === null) {
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

  // An anchor taken out of the page has no box to read — the header of a
  // column the panel itself just hid — so the panel goes on being placed
  // beside where it last was, rather than in the viewport's corner.
  let lastAnchorBox: OverlayRect | null = null;
  function anchorBox(): OverlayRect {
    if (
      lastAnchorBox === null ||
      !(anchor instanceof Element) ||
      anchor.isConnected
    ) {
      lastAnchorBox = anchorRect(anchor);
    }
    return lastAnchorBox;
  }

  // Measured fixed at the viewport's top-left corner, shrink-wrapped and with
  // the whole viewport to grow into — in normal flow a block panel would
  // report the full width of the page — and from that corner every time, so
  // placing it again measures it the way the first placing did.
  function place(): void {
    panel.style.top = "0px";
    panel.style.left = "0px";
    const { width, height } = panel.getBoundingClientRect();
    const position = placeOverlay(
      anchorBox(),
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
  }

  panel.style.position = "fixed";
  place();
  const resizeObserver = new ResizeObserver(place);
  resizeObserver.observe(panel);

  // On the stack before focus moves in, so the overlay below sees the focus
  // leaving it land inside an overlay above it rather than outside.
  pushOverlay(stacked);
  initialFocusTarget(panel, options.initialFocus ?? "first")?.focus({
    preventScroll: true,
  });

  document.addEventListener("pointerdown", onPointerDown, true);
  window.addEventListener("scroll", onScroll, { capture: true, passive: true });
  window.addEventListener("resize", onResize);
  window.addEventListener("blur", onWindowBlur);
  panel.addEventListener("focusout", onFocusOut);
  if (options.ignoreScrollAfterInput === true) {
    panel.addEventListener("input", onInput);
    panel.addEventListener("change", onInput);
  }

  let attached = true;
  function detach(): void {
    if (!attached) {
      return;
    }
    attached = false;
    // Read before the overlays above close and hand focus back to wherever
    // they took it from, which may already have left the page with this panel.
    const active = document.activeElement;
    const focusInside =
      active === null || active === document.body || inside(active);
    removeOverlay(stacked);
    resizeObserver.disconnect();
    document.removeEventListener("pointerdown", onPointerDown, true);
    window.removeEventListener("scroll", onScroll, { capture: true });
    window.removeEventListener("resize", onResize);
    window.removeEventListener("blur", onWindowBlur);
    panel.removeEventListener("focusout", onFocusOut);
    panel.removeEventListener("input", onInput);
    panel.removeEventListener("change", onInput);
    if (settlingFrame !== null) {
      cancelAnimationFrame(settlingFrame);
    }

    if (returnFocusTo !== null && focusInside) {
      returnFocusTo.focus({ preventScroll: true });
    }
  }
  return detach;
}
