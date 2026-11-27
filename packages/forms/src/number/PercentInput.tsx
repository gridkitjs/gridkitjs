import type { NumberValueType, PercentScale } from "@gridkitjs/forms-core";
import { InputFrame } from "../text/parts";
import { NumberControl, type NumberInputProps } from "./NumberInput";

export interface PercentInputProps<
  T extends NumberValueType = "number",
> extends Omit<
  NumberInputProps<T>,
  "currency" | "currencyDisplay" | "unit" | "unitDisplay"
> {
  /**
   * `"fraction"` (default): 0.12 is shown as 12 %, as Intl reads a
   * percent. `"percent"`: 12 is. `value`, `min`, `max` and `step` are in
   * these units; the default step is one percentage point.
   */
  readonly scale?: PercentScale | undefined;
}

/**
 * A `NumberInput` for a percentage: the percent sign drawn where the
 * locale puts it (before the number in `tr-TR`), and the value stored as
 * a fraction (0.125 for 12.5 %) or as the percent number itself, by
 * `scale`. Fraction digit props count the digits of the number shown, and
 * a fraction is scaled exactly, so 12.3 % is 0.123.
 */
export function PercentInput<T extends NumberValueType = "number">({
  scale = "fraction",
  ...props
}: PercentInputProps<T>) {
  return (
    <InputFrame
      label={props.label}
      description={props.description}
      id={props.id}
      mode={props.mode}
      density={props.density}
      readOnly={props.readOnly}
      disabled={props.disabled}
    >
      <NumberControl<T>
        {...props}
        percentScale={scale}
        rootClassName="gridkit-forms-number-input gridkit-forms-percent-input"
      />
    </InputFrame>
  );
}
