/**
 * The `pointerdown` a gesture starts from. A native `PointerEvent` is one,
 * and so is a framework's wrapper around it, such as React's synthetic
 * event, so a renderer passes whichever its handler received.
 */
export interface PointerPress {
  readonly pointerId: number;
  readonly clientX: number;
  readonly clientY: number;
  readonly button: number;
  readonly isPrimary: boolean;
  preventDefault(): void;
}

/**
 * Whether `press` may start a gesture: the main button of the primary
 * pointer. A right-click opens a context menu and a second finger is not the
 * gesture already under way, so neither starts a drag or a resize.
 */
export function isPrimaryPress(press: PointerPress): boolean {
  return press.button === 0 && press.isPrimary;
}

interface PointerGestureHandlers {
  onMove: (event: PointerEvent) => void;
  onEnd: () => void;
  onCancel: () => void;
}

/**
 * Wires up a pointer-driven gesture — capture, move tracking, and an
 * Escape-to-cancel — leaving the caller's `onMove`/`onEnd`/`onCancel` to own
 * the gesture's own domain logic (and any state reset that goes with it).
 */
export function startPointerGesture(
  element: HTMLElement,
  pointerId: number,
  handlers: PointerGestureHandlers,
): void {
  element.setPointerCapture(pointerId);

  function stop(): void {
    element.removeEventListener("pointermove", move);
    element.removeEventListener("pointerup", end);
    element.removeEventListener("pointercancel", cancel);
    window.removeEventListener("keydown", onKeyDown);
    if (element.hasPointerCapture(pointerId)) {
      element.releasePointerCapture(pointerId);
    }
  }

  function move(event: PointerEvent): void {
    handlers.onMove(event);
  }

  function end(): void {
    stop();
    handlers.onEnd();
  }

  function cancel(): void {
    stop();
    handlers.onCancel();
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      cancel();
    }
  }

  element.addEventListener("pointermove", move);
  element.addEventListener("pointerup", end);
  element.addEventListener("pointercancel", cancel);
  window.addEventListener("keydown", onKeyDown);
}
