import { useState, type MouseEvent } from "react";
import {
  Field,
  MaskedInput,
  maskPresets,
  type Density,
  type FieldMessageInput,
  type FieldMode,
  type LabelPosition,
  type MaskPresets,
  type MaskValueFormat,
} from "@gridkitjs/forms";
import { EventList, useEventRecorder, type AnyFieldEvent } from "./EventLog";

export interface MaskedInputHarnessProps {
  /** Draws the input bare, with its own `label`, not in a `Field`. */
  readonly bare?: boolean;
  /** The field's label, "Code" unless given. */
  readonly label?: string;
  readonly labelPosition?: LabelPosition;
  /** A pattern, or several. */
  readonly mask?: string | readonly string[];
  /** A preset by name, in place of `mask`. */
  readonly preset?: keyof MaskPresets;
  /** Adds the token `H`, a hex digit. */
  readonly hexToken?: boolean;
  readonly promptCharacter?: string;
  readonly valueFormat?: MaskValueFormat;
  readonly monospace?: boolean;
  readonly clearable?: boolean;
  readonly placeholder?: string;
  readonly required?: boolean;
  readonly message?: FieldMessageInput | readonly FieldMessageInput[];
  readonly defaultValue?: string | null;
  readonly name?: string;
  readonly mode?: FieldMode;
  readonly readOnly?: boolean;
  readonly disabled?: boolean;
  readonly density?: Density;
  readonly dir?: "ltr" | "rtl";
}

/** Keeps focus where it is, as a toolbar button would. */
function keepFocus(event: MouseEvent): void {
  event.preventDefault();
}

const HEX_TOKENS = { H: /[0-9a-f]/i };

/**
 * A `MaskedInput` in a `Field` labelled "Code" (or drawn bare), inside a
 * `<form>`, with a "Next" field after it. The mask is a pattern, several,
 * or a preset by name. Every handler call is logged in order in the
 * "Events" list, `onClear` included; "Clear events" empties it without
 * taking focus, and a submit writes the form's `FormData` to "submitted".
 */
export default function MaskedInputHarness({
  bare = false,
  label = "Code",
  labelPosition,
  mask = "(000) 000-0000",
  preset,
  hexToken = false,
  dir,
  mode,
  readOnly,
  disabled,
  density,
  ...props
}: MaskedInputHarnessProps) {
  const { events, record, clear } = useEventRecorder();
  const [submitted, setSubmitted] = useState("none");
  const input = (
    <MaskedInput
      {...props}
      {...(bare ? { label, mode, readOnly, disabled, density } : {})}
      mask={preset === undefined ? mask : maskPresets[preset]}
      tokens={hexToken ? HEX_TOKENS : undefined}
      onFocus={record("onFocus")}
      onBeforeInput={record("onBeforeInput")}
      onInput={record("onInput")}
      onBeforeChange={record("onBeforeChange")}
      onChange={record("onChange")}
      onValidate={record("onValidate")}
      onBeforeCommit={record("onBeforeCommit")}
      onCommit={record("onCommit")}
      onBlur={record("onBlur")}
      onClear={(event: Omit<AnyFieldEvent, "value" | "text">) => {
        record("onClear")({ ...event, value: null, text: "" });
      }}
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
            label={label}
            labelPosition={labelPosition}
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
