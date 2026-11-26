import { useEffect, useState, type MouseEvent } from "react";
import {
  Field,
  SearchInput,
  type FieldMessageInput,
  type FieldMode,
} from "@gridkitjs/forms";
import { EventList, useEventRecorder } from "./EventLog";

export interface SearchInputHarnessProps {
  readonly debounce?: number;
  readonly defaultValue?: string | null;
  readonly clearable?: boolean;
  readonly placeholder?: string;
  readonly mode?: FieldMode;
  readonly readOnly?: boolean;
  readonly disabled?: boolean;
  readonly message?: FieldMessageInput;
}

function keepFocus(event: MouseEvent): void {
  event.preventDefault();
}

/**
 * A `SearchInput` in a `Field` labelled "Search orders", with every
 * handler call logged in order in the "Events" list. "Escape passed"
 * counts the Escape presses that reached the document unprevented.
 * "Remove" unmounts the input; none of the buttons takes focus.
 */
export default function SearchInputHarness({
  mode,
  readOnly,
  disabled,
  ...props
}: SearchInputHarnessProps) {
  const { events, record, clear } = useEventRecorder();
  const [shown, setShown] = useState(true);
  const [escapes, setEscapes] = useState(0);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape" && !event.defaultPrevented) {
        setEscapes((count) => count + 1);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <div>
      <Field
        label="Search orders"
        mode={mode}
        readOnly={readOnly}
        disabled={disabled}
      >
        {shown && (
          <SearchInput
            {...props}
            onInput={record("onInput")}
            onBeforeChange={record("onBeforeChange")}
            onChange={record("onChange")}
            onValidate={record("onValidate")}
            onBeforeCommit={record("onBeforeCommit")}
            onCommit={record("onCommit")}
            onClear={(event) => {
              record("onClear")({ ...event, value: null, text: "" });
            }}
          />
        )}
      </Field>
      <p data-testid="escapes">{`Escape passed ${String(escapes)}`}</p>
      <button
        type="button"
        onMouseDown={keepFocus}
        onClick={() => {
          setShown(false);
        }}
      >
        Remove
      </button>
      <button type="button" onMouseDown={keepFocus} onClick={clear}>
        Clear events
      </button>
      <EventList events={events} />
    </div>
  );
}
