import { useState, type MouseEvent } from "react";
import {
  Field,
  type Density,
  NumberInput,
  PercentInput,
  type FieldMessageInput,
  type FieldMode,
  type NumberStepEvent,
  type PercentScale,
} from "@gridkitjs/forms";
import { EventList, useEventRecorder, type AnyFieldEvent } from "./EventLog";

export interface NumberInputHarnessProps {
  /** Draws the input bare, with its own `label`, not in a `Field`. */
  readonly bare?: boolean;
  /** The field's label, "Amount" unless given. */
  readonly label?: string;
  /** Draws a `PercentInput` with this scale instead. */
  readonly percent?: PercentScale;
  readonly valueType?: "number" | "decimal";
  readonly locale?: string;
  readonly dir?: "ltr" | "rtl";
  readonly fractionDigits?: number;
  readonly minimumFractionDigits?: number;
  readonly maximumFractionDigits?: number;
  readonly integer?: boolean;
  readonly limitFractionDigits?: boolean;
  readonly decimalEntry?: "fixed" | "free";
  readonly negative?: "minus" | "parentheses" | "trailingMinus";
  readonly currency?: string;
  readonly unit?: string;
  readonly min?: number | string;
  readonly max?: number | string;
  readonly step?: number | string;
  readonly largeStep?: number | string;
  readonly stepping?: "keys" | "none";
  readonly stepper?: "none" | "end" | "split";
  readonly wheel?: boolean;
  readonly align?: "start" | "end";
  readonly clearable?: boolean;
  readonly selectOnFocus?: boolean;
  readonly required?: boolean;
  readonly message?: FieldMessageInput | readonly FieldMessageInput[];
  readonly defaultValue?: number | string | null;
  readonly name?: string;
  readonly mode?: FieldMode;
  readonly readOnly?: boolean;
  readonly disabled?: boolean;
  readonly density?: Density;
  readonly prefix?: string;
  readonly suffix?: string;
}

/** Keeps focus where it is, as a toolbar button would. */
function keepFocus(event: MouseEvent): void {
  event.preventDefault();
}

/**
 * A `NumberInput` (or a `PercentInput`) in a `Field` labelled "Amount",
 * inside a `<form>`, with a "Next" field after it. Every handler call is
 * logged in order in the "Events" list, `onStep` included; "Clear events"
 * empties it without taking focus, "Remove" takes the input out of the
 * page, and a submit writes the form's `FormData` to "submitted".
 */
export default function NumberInputHarness({
  bare = false,
  label = "Amount",
  percent,
  valueType = "number",
  dir,
  min,
  max,
  step,
  largeStep,
  defaultValue,
  mode,
  readOnly,
  disabled,
  density,
  ...props
}: NumberInputHarnessProps) {
  const { events, record, clear } = useEventRecorder();
  const [submitted, setSubmitted] = useState("none");
  const [shown, setShown] = useState(true);
  const logStep = (event: NumberStepEvent<number | string>) => {
    record("onStep")({ ...event, text: "" });
  };
  const handlers = {
    onFocus: record("onFocus"),
    onBeforeInput: record("onBeforeInput"),
    onInput: record("onInput"),
    onBeforeChange: record("onBeforeChange"),
    onChange: record("onChange"),
    onValidate: record("onValidate"),
    onBeforeCommit: record("onBeforeCommit"),
    onCommit: record("onCommit"),
    onBlur: record("onBlur"),
    onClear: (event: Omit<AnyFieldEvent, "value" | "text">) => {
      record("onClear")({ ...event, value: null, text: "" });
    },
    onStep: logStep,
  };
  const shared = {
    ...props,
    ...(bare ? { label, mode, readOnly, disabled, density } : {}),
  };
  // Each value type takes its own limits; the props carry either.
  const asNumber = (given: number | string | undefined) =>
    given === undefined ? undefined : Number(given);
  const asDecimal = (given: number | string | undefined) =>
    given === undefined ? undefined : String(given);
  const numberProps = {
    ...shared,
    ...handlers,
    min: asNumber(min),
    max: asNumber(max),
    step: asNumber(step),
    largeStep: asNumber(largeStep),
    defaultValue:
      defaultValue === null ? null : asNumber(defaultValue ?? undefined),
  };
  const decimalProps = {
    ...shared,
    ...handlers,
    valueType: "decimal" as const,
    min: asDecimal(min),
    max: asDecimal(max),
    step: asDecimal(step),
    largeStep: asDecimal(largeStep),
    defaultValue:
      defaultValue === null ? null : asDecimal(defaultValue ?? undefined),
  };
  const input =
    valueType === "decimal" ? (
      percent === undefined ? (
        <NumberInput {...decimalProps} />
      ) : (
        <PercentInput {...decimalProps} scale={percent} />
      )
    ) : percent === undefined ? (
      <NumberInput {...numberProps} />
    ) : (
      <PercentInput {...numberProps} scale={percent} />
    );

  return (
    <div dir={dir}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(JSON.stringify([...new FormData(event.currentTarget)]));
        }}
      >
        {!shown ? null : bare ? (
          input
        ) : (
          <Field
            label={label}
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
      <button
        type="button"
        onClick={() => {
          setShown(false);
        }}
      >
        Remove
      </button>
      <EventList events={events} />
    </div>
  );
}
