import type { ReactNode, Ref } from "react";
import type { InputBaseProps } from "../text/textInputProps";

/** Which side of the box or track a toggle's label sits, in reading order. */
export type ToggleLabelPlacement = "end" | "start";

/**
 * The props `Checkbox` and `Switch` share: every input's, less the text
 * input's (a toggle has no text to type, clear or load), with `label` as
 * the text beside the control.
 */
export interface ToggleBaseProps<V> extends Omit<
  InputBaseProps<V>,
  "label" | "loading" | "onClear" | "ref"
> {
  /**
   * The text beside the control, which names it and is part of what a
   * press hits. Inside a `Field`, the field's label names it too.
   */
  readonly label?: ReactNode;
  /** The label after the control (`"end"`, the default) or before it. */
  readonly labelPlacement?: ToggleLabelPlacement | undefined;
  /** The native `<input type="checkbox">`. */
  readonly ref?: Ref<HTMLInputElement> | undefined;
}
