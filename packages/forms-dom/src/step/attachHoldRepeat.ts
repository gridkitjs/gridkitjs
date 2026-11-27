import { scheduleTimeout } from "../scheduleTimeout";

export interface HoldRepeatOptions {
  /** One step; false when it changed nothing (a limit), which ends the hold. */
  readonly onRepeat: (nativeEvent: PointerEvent) => boolean;
  /** Milliseconds from the press to the first repeat; 400 by default. */
  readonly delay?: number | undefined;
  /** Milliseconds between repeats; 60 by default. */
  readonly interval?: number | undefined;
  /** Milliseconds between repeats once `fastAfter` have been taken; 30 by default. */
  readonly fastInterval?: number | undefined;
  /** Repeats before they speed up; 20 by default. */
  readonly fastAfter?: number | undefined;
}

export interface AttachedHoldRepeat {
  /** Replaces the options, from the next step on. */
  readonly setOptions: (options: HoldRepeatOptions) => void;
  /** Ends a hold in progress, as letting go would. */
  readonly cancel: () => void;
  /** Ends a hold in progress and removes every listener. */
  readonly detach: () => void;
}

/**
 * Where a press of the button is:
 *
 * - `idle`: not pressed.
 * - `waiting`: pressed, one step taken, waiting `delay` to repeat.
 * - `repeating`: stepping every `interval`, then every `fastInterval`.
 * - `detached`: every listener is gone.
 *
 * `waiting` and `repeating` hold the pointer's capture and a timer, which
 * every way out of them releases.
 */
export type HoldRepeatState =
  | { readonly kind: "idle" }
  | {
      readonly kind: "waiting";
      readonly pointerId: number;
      readonly press: PointerEvent;
      readonly cancel: () => void;
    }
  | {
      readonly kind: "repeating";
      readonly pointerId: number;
      readonly press: PointerEvent;
      readonly count: number;
      readonly cancel: () => void;
    }
  | { readonly kind: "detached" };

const IDLE: HoldRepeatState = { kind: "idle" };
const DETACHED: HoldRepeatState = { kind: "detached" };

const DELAY = 400;
const INTERVAL = 60;
const FAST_INTERVAL = 30;
const FAST_AFTER = 20;

/**
 * Makes a stepper button step once when pressed and repeat while held: after
 * `delay` it steps every `interval`, and faster once `fastAfter` steps have
 * been taken. The hold ends when the pointer is let go or cancelled, loses
 * capture or leaves the button, when a step changes nothing, on `cancel`
 * and on `detach`, and every end clears the timer and releases the
 * pointer's capture.
 *
 * Only the primary button of a mouse, or a touch or pen, presses it. A long
 * touch opens no context menu. The renderer keeps focus where it is (on a
 * `mousedown`, so a tap still clicks) and draws the button's disabled
 * state; `onRepeat` returning false when it cannot step ends the hold.
 */
export function attachHoldRepeat(
  button: HTMLElement,
  initialOptions: HoldRepeatOptions,
): AttachedHoldRepeat {
  let options = initialOptions;
  let state: HoldRepeatState = IDLE;
  const listeners = new AbortController();
  const { signal } = listeners;

  /** Leaves `waiting` or `repeating` for `next`, releasing the timer and the capture. */
  function release(next: HoldRepeatState): void {
    if (state.kind === "waiting" || state.kind === "repeating") {
      state.cancel();
      const { pointerId } = state;
      state = next;
      if (button.hasPointerCapture(pointerId)) {
        button.releasePointerCapture(pointerId);
      }
      return;
    }
    if (state.kind !== "detached") {
      state = next;
    }
  }

  function repeat(press: PointerEvent, count: number): void {
    if (!options.onRepeat(press)) {
      release(IDLE);
      return;
    }
    const taken = count + 1;
    const interval =
      taken >= (options.fastAfter ?? FAST_AFTER)
        ? (options.fastInterval ?? FAST_INTERVAL)
        : (options.interval ?? INTERVAL);
    state = {
      kind: "repeating",
      pointerId: press.pointerId,
      press,
      count: taken,
      cancel: scheduleTimeout(() => {
        repeat(press, taken);
      }, interval),
    };
  }

  function onPointerDown(event: PointerEvent): void {
    if (state.kind !== "idle" || event.button !== 0) {
      return;
    }
    if (!options.onRepeat(event)) {
      return;
    }
    // Capture keeps the press's moves and its end here wherever the
    // pointer goes; a touch is captured already.
    try {
      button.setPointerCapture(event.pointerId);
    } catch {
      // A pointer the browser has already let go of cannot be captured.
    }
    state = {
      kind: "waiting",
      pointerId: event.pointerId,
      press: event,
      cancel: scheduleTimeout(() => {
        repeat(event, 0);
      }, options.delay ?? DELAY),
    };
  }

  function onPointerMove(event: PointerEvent): void {
    if (
      (state.kind !== "waiting" && state.kind !== "repeating") ||
      event.pointerId !== state.pointerId
    ) {
      return;
    }
    const box = button.getBoundingClientRect();
    if (
      event.clientX < box.left ||
      event.clientX > box.right ||
      event.clientY < box.top ||
      event.clientY > box.bottom
    ) {
      release(IDLE);
    }
  }

  function onEnd(event: PointerEvent): void {
    if (
      (state.kind === "waiting" || state.kind === "repeating") &&
      event.pointerId === state.pointerId
    ) {
      release(IDLE);
    }
  }

  button.addEventListener("pointerdown", onPointerDown, { signal });
  button.addEventListener("pointermove", onPointerMove, { signal });
  button.addEventListener("pointerup", onEnd, { signal });
  button.addEventListener("pointercancel", onEnd, { signal });
  button.addEventListener("lostpointercapture", onEnd, { signal });
  button.addEventListener(
    "contextmenu",
    (event) => {
      event.preventDefault();
    },
    { signal },
  );

  return {
    setOptions: (next) => {
      options = next;
    },
    cancel: () => {
      release(IDLE);
    },
    detach: () => {
      release(DETACHED);
      listeners.abort();
    },
  };
}
