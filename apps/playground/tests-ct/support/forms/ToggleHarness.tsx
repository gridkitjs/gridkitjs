import { useState, type MouseEvent } from "react";
import {
  Checkbox,
  Field,
  Switch,
  type Density,
  type FieldBeforeChangeEvent,
  type FieldChangeEvent,
  type FieldMessageInput,
  type FieldMode,
  type LabelPosition,
  type ToggleLabelPlacement,
} from "@gridkitjs/forms";
import { EventList, useEventRecorder } from "./EventLog";

export interface ToggleHarnessProps {
  /** Which toggle to draw; a checkbox unless given. */
  readonly variant?: "checkbox" | "switch";
  /** The label of a `Field` around the toggle; none draws it bare. */
  readonly fieldLabel?: string;
  readonly labelPosition?: LabelPosition;
  /** The `Field`'s messages. */
  readonly fieldMessage?: FieldMessageInput | readonly FieldMessageInput[];
  /** The text beside the control. */
  readonly label?: string;
  readonly labelPlacement?: ToggleLabelPlacement;
  readonly threeState?: boolean;
  readonly showStateLabel?: boolean;
  readonly defaultValue?: boolean | null;
  /** Controlled, starting at this value; "Set mixed" and "Set checked" change it. */
  readonly controlled?: boolean | null;
  /** `onBeforeChange` prevents every flip. */
  readonly refuseChange?: boolean;
  readonly name?: string;
  readonly required?: boolean;
  readonly message?: FieldMessageInput | readonly FieldMessageInput[];
  readonly mode?: FieldMode;
  readonly readOnly?: boolean;
  readonly disabled?: boolean;
  readonly density?: Density;
  readonly dir?: "ltr" | "rtl";
  readonly "aria-label"?: string;
}

/** Keeps focus where it is, as a toolbar button would. */
function keepFocus(event: MouseEvent): void {
  event.preventDefault();
}

/**
 * A `Checkbox` or `Switch`, in a `Field` when `fieldLabel` is given, inside
 * a `<form>` with "Submit" and "Reset" buttons. Every handler call is
 * logged in order in the "Events" list, which "Clear events" empties
 * without taking focus; a submit writes the form's `FormData` to
 * "submitted", and the last value `onChange` gave shows in "value".
 */
export default function ToggleHarness({
  variant = "checkbox",
  fieldLabel,
  labelPosition,
  fieldMessage,
  threeState,
  showStateLabel,
  defaultValue,
  controlled,
  refuseChange = false,
  mode,
  readOnly,
  disabled,
  density,
  dir,
  ...props
}: ToggleHarnessProps) {
  const { events, record, clear } = useEventRecorder();
  const [submitted, setSubmitted] = useState("none");
  const [value, setValue] = useState<boolean | null | undefined>(controlled);
  const ownStates =
    fieldLabel === undefined ? { mode, readOnly, disabled, density } : {};

  const shared = {
    ...props,
    ...ownStates,
    onFocus: record("onFocus"),
    onBeforeChange: (event: FieldBeforeChangeEvent<boolean>) => {
      record("onBeforeChange")(event);
      if (refuseChange) {
        event.preventDefault();
      }
    },
    onChange: (event: FieldChangeEvent<boolean>) => {
      record("onChange")(event);
      setValue(event.value);
    },
    onValidate: record("onValidate"),
    onBeforeCommit: record("onBeforeCommit"),
    onCommit: record("onCommit"),
    onBlur: record("onBlur"),
  };
  const input =
    variant === "checkbox" ? (
      <Checkbox
        {...shared}
        threeState={threeState}
        {...(controlled === undefined ? { defaultValue } : { value })}
      />
    ) : (
      <Switch
        {...shared}
        showStateLabel={showStateLabel}
        {...(controlled === undefined
          ? { defaultValue: defaultValue ?? undefined }
          : { value: value ?? false })}
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
        {fieldLabel === undefined ? (
          input
        ) : (
          <Field
            label={fieldLabel}
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
        <button type="reset">Reset</button>
      </form>
      <p data-testid="submitted">{submitted}</p>
      <p data-testid="value">
        {JSON.stringify(value === undefined ? "none" : value)}
      </p>
      <button
        type="button"
        onClick={() => {
          setValue(null);
        }}
      >
        Set mixed
      </button>
      <button
        type="button"
        onClick={() => {
          setValue(true);
        }}
      >
        Set checked
      </button>
      <button type="button" onMouseDown={keepFocus} onClick={clear}>
        Clear events
      </button>
      <EventList events={events} />
    </div>
  );
}
