import type { StepDirection, StepSize } from "@gridkitjs/forms-core";

export interface StepKeysOptions {
  /** A key or a wheel tick asked for a step. */
  readonly onStep: (
    direction: StepDirection,
    size: StepSize,
    nativeEvent: KeyboardEvent | WheelEvent,
  ) => void;
  /** Home and End step to an edge only when that limit is set; otherwise they move the caret. */
  readonly edges?: { readonly min: boolean; readonly max: boolean } | undefined;
  /** The wheel steps while the control has focus and the pointer is over it. */
  readonly wheel?: boolean | undefined;
}

export interface AttachedStepKeys {
  /** Replaces the options, from the next event on. */
  readonly setOptions: (options: StepKeysOptions) => void;
  /** Removes every listener. */
  readonly detach: () => void;
}

/** The wheel's travel, in pixels, that makes one step. */
const WHEEL_STEP_PIXELS = 50;

/** `keyCode` 229: WebKit's only sign that a key went to an input method. */
interface LegacyKeyboardEvent {
  readonly keyCode: number;
}

/** The step a key asks for, by the spinbutton pattern. */
function keyStep(
  key: string,
  edges: StepKeysOptions["edges"],
): readonly [StepDirection, StepSize] | null {
  switch (key) {
    case "ArrowUp":
      return ["up", "step"];
    case "ArrowDown":
      return ["down", "step"];
    case "PageUp":
      return ["up", "large"];
    case "PageDown":
      return ["down", "large"];
    case "Home":
      return edges?.min === true ? ["down", "edge"] : null;
    case "End":
      return edges?.max === true ? ["up", "edge"] : null;
    default:
      return null;
  }
}

function hasFocus(control: HTMLElement): boolean {
  const root = control.getRootNode();
  return (
    (root instanceof Document || root instanceof ShadowRoot) &&
    root.activeElement === control
  );
}

/**
 * Steps a number control from the keyboard, as the WAI-ARIA spinbutton
 * pattern does: ArrowUp and ArrowDown one step, PageUp and PageDown a
 * large step, Home and End to a limit that is set. With `options.wheel`,
 * the mouse wheel steps too while the control has focus and the pointer is
 * over it, one step per 50 pixels of travel (or per line or page), and
 * the page does not scroll meanwhile.
 *
 * Keys it steps on are taken (`preventDefault`); keys held with Ctrl, Alt
 * or Meta, keys an input method is using and keys another listener took
 * are left alone. A held arrow repeats by the keyboard's own repeat. It
 * holds its listeners and the wheel travel not yet stepped on; `detach`
 * removes them.
 */
export function attachStepKeys(
  control: HTMLInputElement,
  initialOptions: StepKeysOptions,
): AttachedStepKeys {
  let options = initialOptions;
  // Travel the wheel has made toward the next step, up being negative.
  let wheelTravel = 0;
  const listeners = new AbortController();
  const { signal } = listeners;

  control.addEventListener(
    "keydown",
    (event) => {
      const legacy: LegacyKeyboardEvent = event;
      if (
        event.defaultPrevented ||
        event.isComposing ||
        legacy.keyCode === 229 ||
        event.ctrlKey ||
        event.altKey ||
        event.metaKey
      ) {
        return;
      }
      const step = keyStep(event.key, options.edges);
      if (step === null) {
        return;
      }
      event.preventDefault();
      options.onStep(step[0], step[1], event);
    },
    { signal },
  );

  control.addEventListener(
    "wheel",
    (event) => {
      if (options.wheel !== true || !hasFocus(control)) {
        wheelTravel = 0;
        return;
      }
      event.preventDefault();
      const unit =
        event.deltaMode === WheelEvent.DOM_DELTA_PIXEL ? 1 : WHEEL_STEP_PIXELS;
      wheelTravel += event.deltaY * unit;
      while (Math.abs(wheelTravel) >= WHEEL_STEP_PIXELS) {
        const direction = wheelTravel < 0 ? "up" : "down";
        wheelTravel -= Math.sign(wheelTravel) * WHEEL_STEP_PIXELS;
        options.onStep(direction, "step", event);
      }
    },
    { signal, passive: false },
  );

  control.addEventListener(
    "blur",
    () => {
      wheelTravel = 0;
    },
    { signal },
  );

  return {
    setOptions: (next) => {
      options = next;
    },
    detach: () => {
      listeners.abort();
    },
  };
}
