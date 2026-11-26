import { CHECKBOX, ToggleInput } from "./ToggleInput";
import type { ToggleBaseProps } from "./toggleProps";

export interface CheckboxProps extends ToggleBaseProps<boolean> {
  /**
   * A flip can set `null`, drawn indeterminate: `false` → `true` → `null`
   * → `false`. Without it a flip never sets `null`, and an app's `null`
   * checks on the first flip.
   */
  readonly threeState?: boolean | undefined;
}

/**
 * A checkbox. Its value is `true`, `false` or `null`, which is drawn
 * indeterminate ("mixed"); it starts `false`. Every flip, by a press or
 * <kbd>Space</kbd>, fires the change events and commits at once (`source`
 * and `trigger` `"toggle"`), with "Yes" or "No" as its text. `required`
 * means it must be checked; `readOnly` refuses flips and stays focusable;
 * display mode shows "Yes", "No" or a dash. Named by `label`, the text
 * beside the box, and by the label of a `Field` around it.
 */
export function Checkbox(props: CheckboxProps) {
  return <ToggleInput {...props} variant={CHECKBOX} />;
}
