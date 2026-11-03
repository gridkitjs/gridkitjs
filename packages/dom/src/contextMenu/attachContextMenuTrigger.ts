/**
 * How a context menu was asked for: by a pointer — a right-click, or a touch
 * held still — or by the keyboard.
 */
export type ContextMenuSource = "pointer" | "keyboard";

/** A context menu asked for inside the root, as `onRequest` hears of it. */
export interface ContextMenuRequest {
  /** The element it was asked for on: the one under the pointer, or the one focused for a key. */
  readonly target: Element;
  /**
   * Where the pointer was, in viewport coordinates — where a menu opened by
   * it goes. `null` from the keyboard, which has no point: a menu it opens
   * goes beside the focused element instead.
   */
  readonly point: { readonly x: number; readonly y: number } | null;
  readonly source: ContextMenuSource;
}

export interface ContextMenuTriggerOptions {
  /**
   * A context menu was asked for inside the root. Returns whether the caller
   * opened one of its own: if so the browser's menu is prevented, and if not
   * it shows as it would have.
   */
  readonly onRequest: (request: ContextMenuRequest) => boolean;
}

/** How long a touch rests on the screen before it asks for a menu. */
const LONG_PRESS_DELAY = 500;

/** How far, in pixels, a touch may drift and still count as resting. */
const LONG_PRESS_SLOP = 10;

/** Shift+F10 and the ContextMenu key: the keyboard's ways to ask for one. */
function isContextMenuKey(event: KeyboardEvent): boolean {
  if (event.ctrlKey || event.altKey || event.metaKey) {
    return false;
  }
  return event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey);
}

/** A touch pressing, until it asks, lifts or moves away. */
interface Press {
  readonly pointerId: number;
  readonly x: number;
  readonly y: number;
  readonly timer: number;
}

/**
 * Reports every context menu the user asks for inside `root` — a right-click,
 * Shift+F10, the ContextMenu key, or a touch held still for half a second —
 * through `onRequest`, and returns the function that stops it.
 *
 * Each gesture asks once. Pressing a key, or holding a touch, also makes some
 * browsers fire `contextmenu` of their own, and that event is taken, not
 * reported again, once the gesture opened a menu. The click a touch brings
 * as it lifts is taken too: the menu opened under the finger, and the click
 * would land in it.
 *
 * An event something already prevented is left alone, so a cell template
 * that shows a menu of its own keeps it. That is why the listeners are on the
 * document, in the bubble phase: a framework that handles events at its own
 * root container — React does — hears them before the document does, where
 * a listener on `root` itself would hear them first. Only events whose target
 * is inside `root` count.
 */
export function attachContextMenuTrigger(
  root: Element,
  options: ContextMenuTriggerOptions,
): () => void {
  /**
   * Set once a key or a touch opened a menu, until the `contextmenu` event
   * the same gesture may still bring. A pointer or another key starts a new
   * gesture, so a browser that brings none does not cost the next
   * right-click.
   */
  let swallowContextMenu = false;
  /** Set once a touch opened a menu, until the click its lifting brings. */
  let swallowClick = false;
  let press: Press | null = null;

  /** Asks for a menu on what `event` happened to, unless something prevented it. */
  function ask(
    event: Event,
    point: ContextMenuRequest["point"],
    source: ContextMenuSource,
  ): boolean {
    const { target } = event;
    return (
      !event.defaultPrevented &&
      target instanceof Element &&
      root.contains(target) &&
      options.onRequest({ target, point, source })
    );
  }

  /** `ask`, and the browser's own menu prevented when one opened. */
  function request(
    event: Event,
    point: ContextMenuRequest["point"],
    source: ContextMenuSource,
  ): boolean {
    if (!ask(event, point, source)) {
      return false;
    }
    event.preventDefault();
    return true;
  }

  function cancelPress(): void {
    if (press !== null) {
      window.clearTimeout(press.timer);
      press = null;
    }
  }

  function onKeyDown(event: KeyboardEvent): void {
    swallowContextMenu = false;
    swallowClick = false;
    if (isContextMenuKey(event) && request(event, null, "keyboard")) {
      swallowContextMenu = true;
    }
  }

  /**
   * Every pointer starts a new gesture; a touch may become a long-press. It
   * is asked for once it has rested long enough, by which time the press
   * shows whether a template prevented it.
   */
  function onPointerDown(event: PointerEvent): void {
    swallowContextMenu = false;
    swallowClick = false;
    cancelPress();
    if (event.pointerType !== "touch" || !event.isPrimary) {
      return;
    }
    const point = { x: event.clientX, y: event.clientY };
    press = {
      pointerId: event.pointerId,
      ...point,
      timer: window.setTimeout(() => {
        press = null;
        if (ask(event, point, "pointer")) {
          swallowContextMenu = true;
          swallowClick = true;
        }
      }, LONG_PRESS_DELAY),
    };
  }

  function onPointerMove(event: PointerEvent): void {
    if (
      press?.pointerId === event.pointerId &&
      Math.hypot(event.clientX - press.x, event.clientY - press.y) >
        LONG_PRESS_SLOP
    ) {
      cancelPress();
    }
  }

  // Lifted, or taken over by the browser — to scroll, say.
  function onPointerEnd(event: PointerEvent): void {
    if (press?.pointerId === event.pointerId) {
      cancelPress();
    }
  }

  function onClick(event: MouseEvent): void {
    if (swallowClick) {
      swallowClick = false;
      event.preventDefault();
      event.stopPropagation();
    }
  }

  function onContextMenu(event: MouseEvent): void {
    if (swallowContextMenu) {
      swallowContextMenu = false;
      event.preventDefault();
      return;
    }
    // A browser that turns a held touch into `contextmenu` of its own asks
    // first, and the long-press need not.
    const touching = press !== null;
    cancelPress();
    if (
      request(event, { x: event.clientX, y: event.clientY }, "pointer") &&
      touching
    ) {
      swallowClick = true;
    }
  }

  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("pointerdown", onPointerDown, true);
  document.addEventListener("pointermove", onPointerMove, true);
  document.addEventListener("pointerup", onPointerEnd, true);
  document.addEventListener("pointercancel", onPointerEnd, true);
  // Captured, so the click is taken before anything under the finger hears it.
  document.addEventListener("click", onClick, true);
  document.addEventListener("contextmenu", onContextMenu);

  return () => {
    cancelPress();
    document.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("pointerdown", onPointerDown, true);
    document.removeEventListener("pointermove", onPointerMove, true);
    document.removeEventListener("pointerup", onPointerEnd, true);
    document.removeEventListener("pointercancel", onPointerEnd, true);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("contextmenu", onContextMenu);
  };
}
