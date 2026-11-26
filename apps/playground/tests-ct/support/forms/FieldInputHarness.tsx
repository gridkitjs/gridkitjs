import {
  StrictMode,
  useCallback,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { requiredRule } from "@gridkitjs/forms-core";
import type {
  FieldBeforeChangeEvent,
  FieldBeforeCommitEvent,
  FieldBeforeInputEvent,
  InputHandle,
} from "@gridkitjs/forms";
import { EventList, useEventRecorder } from "./EventLog";
import { TextField } from "./TextField";

export interface FieldInputHarnessProps {
  readonly defaultValue?: string | null;
  readonly name?: string;
  readonly required?: boolean;
  /** Reads the text upper-cased. */
  readonly uppercase?: boolean;
  readonly multiline?: boolean;
  /** Renders under `StrictMode`, which mounts everything twice. */
  readonly strict?: boolean;
  /** `onBeforeInput` inserts what was typed upper-cased, in its place. */
  readonly upperCaseInput?: boolean;
  /** `onBeforeChange` upper-cases the value, or refuses one with a digit. */
  readonly beforeChange?: "uppercase" | "no-digits";
  /** `onBeforeCommit` refuses at once, or waits for "Allow" or "Refuse". */
  readonly check?: "refuse" | "wait";
}

interface WaitingCheck {
  readonly event: FieldBeforeCommitEvent<string>;
  readonly answer: () => void;
}

/** Keeps focus where it is, as a toolbar button would. */
function keepFocus(event: MouseEvent): void {
  event.preventDefault();
}

/**
 * A "Name" text field on `useFieldInput` in a plain `<form>`, with a
 * "Next" field after it to tab or click to. Every handler call is logged
 * in order in the "Events" list, the field's `ref` writes its element's tag
 * where a spec reads it, and a submit writes the form's `FormData` there
 * too. The props choose what the hooks do.
 *
 * The buttons below the form call `handleRef` (`setValue`, `reset`,
 * `revealMessages`), answer a waiting `onBeforeCommit` and remove the field.
 * None takes focus from the field.
 */
function Harness({
  defaultValue,
  name,
  required = false,
  uppercase = false,
  multiline = false,
  upperCaseInput = false,
  beforeChange,
  check,
}: FieldInputHarnessProps) {
  const { events, record, clear } = useEventRecorder();
  const handle = useRef<InputHandle<string>>(null);
  const waiting = useRef<WaitingCheck[]>([]);
  const [element, setElement] = useState("none");
  const [submitted, setSubmitted] = useState("none");
  const [shown, setShown] = useState(true);
  const elementRef = useCallback((control: HTMLElement | null) => {
    setElement(control?.tagName.toLowerCase() ?? "none");
  }, []);

  function onBeforeInput(event: FieldBeforeInputEvent<string>): void {
    record("onBeforeInput")(event);
    const data = event.input?.data ?? null;
    if (upperCaseInput && data !== null && data !== data.toUpperCase()) {
      event.setData(data.toUpperCase());
    }
  }

  function onBeforeChange(event: FieldBeforeChangeEvent<string>): void {
    record("onBeforeChange")(event);
    if (beforeChange === "uppercase" && event.value !== null) {
      event.setValue(event.value.toUpperCase());
    }
    if (beforeChange === "no-digits" && /\d/u.test(event.value ?? "")) {
      event.preventDefault();
    }
  }

  function onBeforeCommit(
    event: FieldBeforeCommitEvent<string>,
  ): Promise<void> | undefined {
    record("onBeforeCommit")(event);
    if (check === "refuse") {
      event.preventDefault("That name is taken");
    }
    if (check !== "wait") {
      return undefined;
    }
    return new Promise((resolve) => {
      waiting.current.push({ event, answer: resolve });
    });
  }

  function answer(refuse: boolean): void {
    const checks = waiting.current;
    waiting.current = [];
    for (const { event, answer } of checks) {
      if (refuse) {
        event.preventDefault("That name is taken");
      }
      answer();
    }
  }

  return (
    <div>
      <form
        aria-label="Profile"
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(
            JSON.stringify([...new FormData(event.currentTarget).entries()]),
          );
        }}
      >
        {shown && (
          <TextField
            label="Name"
            defaultValue={defaultValue}
            name={name}
            uppercase={uppercase}
            multiline={multiline}
            validate={required ? requiredRule() : undefined}
            ref={elementRef}
            handleRef={handle}
            onFocus={record("onFocus")}
            onBeforeInput={onBeforeInput}
            onInput={record("onInput")}
            onBeforeChange={onBeforeChange}
            onChange={record("onChange")}
            onValidate={record("onValidate")}
            onBeforeCommit={onBeforeCommit}
            onCommit={record("onCommit")}
            onBlur={record("onBlur")}
          />
        )}
        <label>
          Next <input />
        </label>
        <button type="submit">Submit</button>
        <button type="reset">Reset form</button>
      </form>
      <button
        type="button"
        onMouseDown={keepFocus}
        onClick={() => handle.current?.setValue("Grace")}
      >
        Set to Grace
      </button>
      <button
        type="button"
        onMouseDown={keepFocus}
        onClick={() => handle.current?.reset()}
      >
        Reset field
      </button>
      <button
        type="button"
        onMouseDown={keepFocus}
        onClick={() => handle.current?.revealMessages()}
      >
        Reveal messages
      </button>
      <button
        type="button"
        onMouseDown={keepFocus}
        onClick={() => {
          answer(false);
        }}
      >
        Allow the check
      </button>
      <button
        type="button"
        onMouseDown={keepFocus}
        onClick={() => {
          answer(true);
        }}
      >
        Refuse the check
      </button>
      <button
        type="button"
        onMouseDown={keepFocus}
        onClick={() => {
          setShown(false);
        }}
      >
        Remove the field
      </button>
      <output data-testid="element">{element}</output>
      <output data-testid="submitted">{submitted}</output>
      <button type="button" onMouseDown={keepFocus} onClick={clear}>
        Clear events
      </button>
      <EventList events={events} />
    </div>
  );
}

export default function FieldInputHarness(props: FieldInputHarnessProps) {
  return props.strict === true ? (
    <StrictMode>
      <Harness {...props} />
    </StrictMode>
  ) : (
    <Harness {...props} />
  );
}
