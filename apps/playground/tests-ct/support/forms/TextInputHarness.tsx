import { useState, type MouseEvent } from "react";
import {
  Field,
  TextInput,
  type Density,
  type FieldMessageInput,
  type FieldMode,
  type LabelPosition,
} from "@gridkitjs/forms";
import { EventList, useEventRecorder } from "./EventLog";

export interface TextInputHarnessProps {
  /** Draws the input bare, with its own `label` (or none), not in a `Field`. */
  readonly bare?: boolean;
  /** The field's label, "Name" unless given; a bare input's own `label`. */
  readonly label?: string;
  readonly labelPosition?: LabelPosition;
  /** The `Field`'s messages. */
  readonly fieldMessage?: FieldMessageInput | readonly FieldMessageInput[];
  readonly message?: FieldMessageInput | readonly FieldMessageInput[];
  readonly invalid?: boolean;
  readonly type?: "text" | "password";
  readonly multiline?: boolean;
  readonly minRows?: number;
  readonly maxRows?: number;
  readonly maxLength?: number;
  readonly minLength?: number;
  /** The source of a `pattern`. */
  readonly pattern?: string;
  readonly showCounter?: boolean;
  readonly uppercase?: boolean;
  readonly trim?: boolean;
  readonly revealable?: boolean;
  readonly revertOnEscape?: boolean;
  readonly clearable?: boolean;
  readonly placeholder?: string;
  readonly prefix?: string;
  readonly suffix?: string;
  readonly loading?: boolean;
  readonly selectOnFocus?: boolean;
  readonly required?: boolean;
  readonly defaultValue?: string | null;
  readonly name?: string;
  readonly mode?: FieldMode;
  readonly readOnly?: boolean;
  readonly disabled?: boolean;
  readonly density?: Density;
  readonly "aria-label"?: string;
}

/** Keeps focus where it is, as a toolbar button would. */
function keepFocus(event: MouseEvent): void {
  event.preventDefault();
}

/**
 * A `TextInput` in a `Field` labelled "Name" (or drawn bare), inside a
 * `<form>`, with a "Next" field after it. Every handler call is logged in
 * order in the "Events" list, `onClear` included, and "Clear events"
 * empties it without taking focus; a submit writes the form's `FormData`
 * to "submitted".
 */
export default function TextInputHarness({
  bare = false,
  label = "Name",
  labelPosition,
  fieldMessage,
  pattern,
  mode,
  readOnly,
  disabled,
  density,
  ...props
}: TextInputHarnessProps) {
  const { events, record, clear } = useEventRecorder();
  const [submitted, setSubmitted] = useState("none");

  const input = (
    <TextInput
      {...props}
      {...(pattern === undefined ? {} : { pattern: new RegExp(pattern) })}
      {...(bare
        ? {
            label: label === "" ? undefined : label,
            mode,
            readOnly,
            disabled,
            density,
          }
        : {})}
      onFocus={record("onFocus")}
      onBeforeInput={record("onBeforeInput")}
      onInput={record("onInput")}
      onBeforeChange={record("onBeforeChange")}
      onChange={record("onChange")}
      onValidate={record("onValidate")}
      onBeforeCommit={record("onBeforeCommit")}
      onCommit={record("onCommit")}
      onBlur={record("onBlur")}
      onClear={(event) => {
        record("onClear")({ ...event, value: null, text: "" });
      }}
    />
  );

  return (
    <div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(JSON.stringify([...new FormData(event.currentTarget)]));
        }}
      >
        {bare ? (
          input
        ) : (
          <Field
            label={label}
            labelPosition={labelPosition}
            message={fieldMessage}
            mode={mode}
            readOnly={readOnly}
            disabled={disabled}
            density={density}
          >
            {input}
          </Field>
        )}
        <label>
          Next <input />
        </label>
        <button type="submit">Submit</button>
      </form>
      <p data-testid="submitted">{submitted}</p>
      <button type="button" onMouseDown={keepFocus} onClick={clear}>
        Clear events
      </button>
      <EventList events={events} />
    </div>
  );
}
