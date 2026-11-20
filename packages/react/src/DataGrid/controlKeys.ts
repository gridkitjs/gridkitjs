import { keyOrigin } from "@gridkitjs/dom";

/**
 * Whether a key belongs to a control a template drew inside the grid rather
 * than to the grid: every key pressed in text entry, and Space or Enter
 * pressed on any other control. A control's navigation keys still move the
 * grid's focus, since it has no use for them.
 */
export function isControlKey(event: {
  readonly target: EventTarget;
  readonly key: string;
}): boolean {
  const origin = keyOrigin(event.target);
  return (
    origin === "text-entry" ||
    (origin === "control" && (event.key === " " || event.key === "Enter"))
  );
}

/**
 * Whether a click is a control's activation by a key: the click a browser
 * fires when Space or Enter presses a button or ticks a checkbox, which
 * carries no click count (`detail` of `0`). That press is the control's, as
 * `isControlKey` says, so the grid treats the click as no press of its own.
 * A pointer's click on the same control still counts.
 */
export function isKeyActivatedControl(event: {
  readonly target: EventTarget;
  readonly detail: number;
}): boolean {
  return event.detail === 0 && keyOrigin(event.target) !== "grid";
}
