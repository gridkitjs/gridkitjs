/** What the stack needs of an attached overlay. */
export interface StackedOverlay {
  readonly panel: HTMLElement;
  /** Escape was pressed while this was the topmost overlay. */
  readonly onEscape: () => void;
  /** An overlay below this one detached, so this one has to go too. */
  readonly onParentDetached: () => void;
}

/**
 * Every attached overlay, in the order it attached: a submenu opened from a
 * menu sits above it. Module-level because nesting spans overlays that know
 * nothing of each other — a menu does not hold a reference to the submenu a
 * click inside it opened.
 */
const stack: StackedOverlay[] = [];

/*
 * One listener for the whole stack, on `window` in the capture phase: the
 * first place a key event reaches, so neither React's root listener nor a
 * page's own Escape handler hears an Escape the topmost overlay took. An
 * Escape that ends an IME composition is the input method's, not ours.
 */
function onKeyDown(event: KeyboardEvent): void {
  const topmost = stack.at(-1);
  if (event.key !== "Escape" || event.isComposing || topmost === undefined) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  topmost.onEscape();
}

/** Puts `overlay` on top of the stack. */
export function pushOverlay(overlay: StackedOverlay): void {
  if (stack.length === 0) {
    window.addEventListener("keydown", onKeyDown, true);
  }
  stack.push(overlay);
}

/**
 * Takes `overlay` off the stack, and every overlay above it with it — each
 * told through `onParentDetached`, topmost first, so a submenu never outlives
 * the menu it opened from. Does nothing for an overlay no longer on it.
 */
export function removeOverlay(overlay: StackedOverlay): void {
  const index = stack.indexOf(overlay);
  if (index === -1) {
    return;
  }
  const above = stack.splice(index).slice(1).reverse();
  for (const child of above) {
    child.onParentDetached();
  }
  if (stack.length === 0) {
    window.removeEventListener("keydown", onKeyDown, true);
  }
}

/** Whether `target` is inside an overlay that sits above `overlay`. */
export function isInsideOverlayAbove(
  overlay: StackedOverlay,
  target: Node,
): boolean {
  const index = stack.indexOf(overlay);
  return (
    index !== -1 &&
    stack.slice(index + 1).some((above) => above.panel.contains(target))
  );
}
