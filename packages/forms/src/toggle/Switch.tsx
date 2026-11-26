import { SWITCH, ToggleInput } from "./ToggleInput";
import type { ToggleBaseProps } from "./toggleProps";

export interface SwitchProps extends Omit<
  ToggleBaseProps<boolean>,
  "value" | "defaultValue"
> {
  /** Present means controlled. A switch is on or off, never empty. */
  readonly value?: boolean | undefined;
  /** Off unless given. */
  readonly defaultValue?: boolean | undefined;
  /**
   * Shows "On" or "Off" beside the track. Screen readers hear the state
   * from the control, so the words are hidden from them.
   */
  readonly showStateLabel?: boolean | undefined;
}

/**
 * A switch (`role="switch"`), for a setting that takes effect at once: on
 * or off, with no empty state. Every flip, by a press or <kbd>Space</kbd>,
 * fires the change events and commits (`source` and `trigger` `"toggle"`),
 * with "On" or "Off" as its text. `required` means it must be on;
 * `readOnly` refuses flips and stays focusable; display mode shows "On" or
 * "Off". The thumb moves to the reading end when on.
 */
export function Switch(props: SwitchProps) {
  return <ToggleInput {...props} variant={SWITCH} />;
}
