import { useState, type MouseEvent } from "react";
import { EventList, useEventRecorder } from "./EventLog";
import { TextField } from "./TextField";

export interface ControlledInputProps {
  readonly initialValue: string | null;
  /** Whether the app takes each change into its state, or keeps its own value. */
  readonly follow?: boolean;
}

function keepFocus(event: MouseEvent): void {
  event.preventDefault();
}

/**
 * A "Name" field controlled by the app's state, which the app writes as
 * JSON in "app-value". The app takes each `onChange` into its state unless
 * `follow` is false. "Set to Grace" and "Set to empty" change the app's
 * value without taking focus from the field. Every handler call is logged
 * in the "Events" list.
 */
export default function ControlledInput({
  initialValue,
  follow = true,
}: ControlledInputProps) {
  const { events, record, clear } = useEventRecorder();
  const [value, setValue] = useState(initialValue);
  const logChange = record("onChange");

  return (
    <div>
      <TextField
        label="Name"
        value={value}
        onFocus={record("onFocus")}
        onInput={record("onInput")}
        onChange={(event) => {
          logChange(event);
          if (follow) {
            setValue(event.value);
          }
        }}
        onCommit={record("onCommit")}
        onBlur={record("onBlur")}
      />
      <label>
        Next <input />
      </label>
      <button
        type="button"
        onMouseDown={keepFocus}
        onClick={() => {
          setValue("Grace");
        }}
      >
        Set to Grace
      </button>
      <button
        type="button"
        onMouseDown={keepFocus}
        onClick={() => {
          setValue(null);
        }}
      >
        Set to empty
      </button>
      <output data-testid="app-value">{JSON.stringify(value)}</output>
      <button type="button" onMouseDown={keepFocus} onClick={clear}>
        Clear events
      </button>
      <EventList events={events} />
    </div>
  );
}
