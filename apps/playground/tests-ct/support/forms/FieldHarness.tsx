import { useRef, type MouseEvent } from "react";
import {
  Field,
  type FieldMessageInput,
  type FieldMode,
  type InputHandle,
  type LabelPosition,
  type NecessityIndicator,
} from "@gridkitjs/forms";
import { FieldTextInput } from "./FieldTextInput";

export interface FieldHarnessProps {
  readonly label?: string;
  readonly description?: string;
  readonly message?: FieldMessageInput | readonly FieldMessageInput[];
  readonly labelPosition?: LabelPosition;
  readonly labelWidth?: string;
  readonly necessityIndicator?: NecessityIndicator;
  readonly mode?: FieldMode;
  readonly required?: boolean;
  /** A `required` on the input rather than on the field. */
  readonly inputRequired?: boolean;
  readonly readOnly?: boolean;
  readonly disabled?: boolean;
  readonly defaultValue?: string | null;
  readonly name?: string;
  readonly placeholder?: string;
  readonly className?: string;
}

function keepFocus(event: MouseEvent): void {
  event.preventDefault();
}

/**
 * A `Field` (labelled "Email" unless `label` says otherwise) around a text
 * input, with a "Next" field after it to tab to. "Set to Ada" and "Empty it"
 * change the value from code, without taking focus.
 */
export default function FieldHarness({
  label = "Email",
  defaultValue,
  name,
  placeholder,
  inputRequired,
  ...fieldProps
}: FieldHarnessProps) {
  const handle = useRef<InputHandle<string>>(null);
  return (
    <div>
      <Field label={label} {...fieldProps}>
        <FieldTextInput
          defaultValue={defaultValue}
          name={name}
          required={inputRequired}
          handleRef={handle}
          {...(placeholder === undefined ? {} : { placeholder })}
        />
      </Field>
      <label>
        Next <input />
      </label>
      <button
        type="button"
        onMouseDown={keepFocus}
        onClick={() => handle.current?.setValue("Ada")}
      >
        Set to Ada
      </button>
      <button
        type="button"
        onMouseDown={keepFocus}
        onClick={() => handle.current?.setValue(null)}
      >
        Empty it
      </button>
    </div>
  );
}
