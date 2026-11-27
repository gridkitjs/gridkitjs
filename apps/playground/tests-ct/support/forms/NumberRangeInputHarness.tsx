import { useState, type MouseEvent } from "react";
import {
  Field,
  NumberRangeInput,
  type Density,
  type FieldBeforeChangeEvent,
  type FieldMessageInput,
  type FieldMode,
  type NumberRange,
  type NumberRangeDetails,
} from "@gridkitjs/forms";
import { EventList, useEventRecorder } from "./EventLog";

export interface NumberRangeInputHarnessProps {
  /** Draws the input bare, with its own `label`, not in a `Field`. */
  readonly bare?: boolean;
  readonly locale?: string;
  readonly dir?: "ltr" | "rtl";
  readonly bounds?: "[)" | "[]";
  readonly reversed?: "swap" | "error";
  readonly allowEmpty?: boolean;
  readonly fractionDigits?: number;
  readonly currency?: string;
  readonly min?: number;
  readonly max?: number;
  readonly minSpan?: number;
  readonly maxSpan?: number;
  readonly showSpan?: boolean;
  readonly clearable?: boolean;
  readonly required?: boolean;
  readonly message?: FieldMessageInput | readonly FieldMessageInput[];
  readonly defaultValue?: NumberRange | null;
  readonly name?: string;
  readonly mode?: FieldMode;
  readonly readOnly?: boolean;
  readonly disabled?: boolean;
  readonly density?: Density;
  /** `onBeforeChange` stores the end one higher, as an app keeping whole numbers with an exclusive end would. */
  readonly exclusiveEnd?: boolean;
}

/** Keeps focus where it is, as a toolbar button would. */
function keepFocus(event: MouseEvent): void {
  event.preventDefault();
}

/**
 * A `NumberRangeInput` in a `Field` labelled "Price", inside a `<form>`,
 * with a "Next" field after it. Every handler call is logged in order in
 * the "Events" list with the range's details; "Clear events" empties it
 * without taking focus, and a submit writes the form's `FormData` to
 * "submitted".
 */
export default function NumberRangeInputHarness({
  bare = false,
  dir,
  mode,
  readOnly,
  disabled,
  density,
  exclusiveEnd = false,
  ...props
}: NumberRangeInputHarnessProps) {
  const { events, record, clear } = useEventRecorder();
  const [submitted, setSubmitted] = useState("none");
  const onBeforeChange = (
    event: FieldBeforeChangeEvent<NumberRange, NumberRangeDetails>,
  ) => {
    record("onBeforeChange")(event);
    const { value } = event;
    if (exclusiveEnd && value !== null && value.end !== null) {
      event.setValue({ start: value.start, end: value.end + 1 });
    }
  };
  const input = (
    <NumberRangeInput
      {...props}
      {...(bare ? { label: "Price", mode, readOnly, disabled, density } : {})}
      onFocus={record("onFocus")}
      onInput={record("onInput")}
      onBeforeChange={onBeforeChange}
      onChange={record("onChange")}
      onValidate={record("onValidate")}
      onBeforeCommit={record("onBeforeCommit")}
      onCommit={record("onCommit")}
      onBlur={record("onBlur")}
    />
  );

  return (
    <div dir={dir}>
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
            label="Price"
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
