import { useMemo } from "react";
import { formatText, requiredRule, textParser } from "@gridkitjs/forms-core";
import {
  useField,
  useFieldInput,
  type FieldInputKind,
  type FieldInputProps,
} from "@gridkitjs/forms";

const TEXT: FieldInputKind<string> = {
  defaultParse: textParser(),
  defaultFormat: formatText,
  serialize: (value) => value,
};

export interface FieldTextInputProps extends FieldInputProps<string> {
  readonly placeholder?: string;
}

/**
 * A text control on `useFieldInput` to put in a `Field`: the field names,
 * describes and lists the messages of it, and a required field, or a
 * `required` of its own, makes it check for a value. In display mode it
 * shows its value as text.
 */
export function FieldTextInput({ placeholder, ...props }: FieldTextInputProps) {
  const { required } = useField();
  const requireValue = useMemo(() => requiredRule<string>(), []);
  const field = useFieldInput(
    {
      ...props,
      validate:
        required || props.required === true ? requireValue : props.validate,
    },
    TEXT,
  );
  return (
    <>
      {field.mode === "display" ? (
        field.displayValue
      ) : (
        <input placeholder={placeholder} {...field.controlProps} />
      )}
      {field.hiddenInput}
    </>
  );
}
