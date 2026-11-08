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
 * pointer, with `signal`, if any, not yet aborted. A right-click opens a
 * context menu and a second finger is not the gesture already under way, so
 * neither starts a drag or a resize; an aborted signal means the renderer has
 * already given up on what the press would drag.
 */
export function mayStartGesture(
  press: PointerPress,
  signal: AbortSignal | undefined,
): boolean {
  return press.button === 0 && press.isPrimary && signal?.aborted !== true;
}

interface PointerGestureHandlers {
  onMove: (event: PointerEvent) => void;
  onEnd: () => void;
  onCancel: () => void;
}

/**
 * Wires up a pointer-driven gesture — capture, move tracking, and cancelling
 * on Escape or when `signal` aborts — leaving the caller's
 * `onMove`/`onEnd`/`onCancel` to own the gesture's own domain logic (and any
 * state reset that goes with it).
 *
 * Only the pointer that started the gesture moves or ends it: another finger
 * landing mid-drag fires its own events on the same element, and they are
 * ignored.
 */
export function startPointerGesture(
  element: HTMLElement,
  pointerId: number,
  handlers: PointerGestureHandlers,
  signal: AbortSignal | undefined,
): void {
  element.setPointerCapture(pointerId);

  function stop(): void {
    element.removeEventListener("pointermove", move);
    element.removeEventListener("pointerup", end);
    element.removeEventListener("pointercancel", cancel);
    window.removeEventListener("keydown", onKeyDown);
    signal?.removeEventListener("abort", abandon);
    if (element.hasPointerCapture(pointerId)) {
      element.releasePointerCapture(pointerId);
    }
  }

  function move(event: PointerEvent): void {
    if (event.pointerId === pointerId) {
      handlers.onMove(event);
    }
  }

  function end(event: PointerEvent): void {
    if (event.pointerId === pointerId) {
      stop();
      handlers.onEnd();
    }
  }

  function cancel(event: PointerEvent): void {
    if (event.pointerId === pointerId) {
      abandon();
    }
  }

  function abandon(): void {
    stop();
    handlers.onCancel();
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      abandon();
    }
  }

  element.addEventListener("pointermove", move);
  element.addEventListener("pointerup", end);
  element.addEventListener("pointercancel", cancel);
  window.addEventListener("keydown", onKeyDown);
  signal?.addEventListener("abort", abandon);
}
