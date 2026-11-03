/** How a context menu was asked for. */
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

/** Shift+F10 and the ContextMenu key: the keyboard's ways to ask for one. */
function isContextMenuKey(event: KeyboardEvent): boolean {
  if (event.ctrlKey || event.altKey || event.metaKey) {
    return false;
  }
  return event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey);
}

/**
 * Reports every context menu the user asks for inside `root` — a right-click,
 * Shift+F10 or the ContextMenu key — through `onRequest`, and returns the
 * function that stops it. Each gesture asks once: pressing a key also makes
 * the browser fire `contextmenu` on some systems, and that event is taken,
 * not reported again, once the key opened a menu.
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
   * Set once a key opened a menu, until the `contextmenu` event the same key
   * press may still bring. A pointer or another key starts a new gesture,
   * so a browser that brings none does not cost the next right-click.
   */
  let swallowContextMenu = false;

  function request(
    event: Event,
    point: ContextMenuRequest["point"],
    source: ContextMenuSource,
  ): boolean {
    const { target } = event;
    if (
      event.defaultPrevented ||
      !(target instanceof Element) ||
      !root.contains(target) ||
      !options.onRequest({ target, point, source })
    ) {
      return false;
    }
    event.preventDefault();
    return true;
  }

  function onKeyDown(event: KeyboardEvent): void {
    swallowContextMenu = false;
    if (isContextMenuKey(event) && request(event, null, "keyboard")) {
      swallowContextMenu = true;
    }
  }

  function onPointerDown(): void {
    swallowContextMenu = false;
  }

  function onContextMenu(event: MouseEvent): void {
    if (swallowContextMenu) {
      swallowContextMenu = false;
      event.preventDefault();
      return;
    }
    request(event, { x: event.clientX, y: event.clientY }, "pointer");
  }

  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("pointerdown", onPointerDown, true);
  document.addEventListener("contextmenu", onContextMenu);

  return () => {
    document.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("pointerdown", onPointerDown, true);
    document.removeEventListener("contextmenu", onContextMenu);
  };
}
