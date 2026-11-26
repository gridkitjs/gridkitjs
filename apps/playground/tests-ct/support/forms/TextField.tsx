import { useMemo } from "react";
import { formatText, textParser } from "@gridkitjs/forms-core";
import {
  useFieldInput,
  type FieldInputKind,
  type FieldInputProps,
} from "@gridkitjs/forms";

type Control = HTMLInputElement | HTMLTextAreaElement;

export interface TextFieldProps extends FieldInputProps<string, Control> {
  readonly label: string;
  /** Reads the text upper-cased. */
  readonly uppercase?: boolean;
  /** A `<textarea>` in place of an `<input>`. */
  readonly multiline?: boolean;
}

/**
 * A bare text control on `useFieldInput`, labelled, with its shown messages
 * listed under it: what the specs drive before any forms input exists.
 */
export function TextField({
  label,
  uppercase = false,
  multiline = false,
  ...props
}: TextFieldProps) {
  const kind = useMemo<FieldInputKind<string>>(
    () => ({
      defaultParse: textParser({ uppercase }),
      defaultFormat: formatText,
      serialize: (value) => value,
    }),
    [uppercase],
  );
  const field = useFieldInput(props, kind);
  return (
    <div>
      <label htmlFor={field.controlProps.id}>{label}</label>
      {multiline ? (
        <textarea {...field.controlProps} />
      ) : (
        <input {...field.controlProps} />
      )}
      {field.hiddenInput}
      <ul aria-label={`${label} messages`}>
        {field.messages.map((message) => (
          <li key={`${message.source}:${message.text}`}>{message.text}</li>
        ))}
      </ul>
    </div>
  );
}
