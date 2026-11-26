import { useMemo, useRef, useState, type Ref } from "react";
import { formatText, requiredRule, textParser } from "@gridkitjs/forms-core";
import {
  Field,
  useFieldInput,
  type Density,
  type FieldBeforeCommitEvent,
  type FieldInputKind,
  type InputHandle,
} from "@gridkitjs/forms";
import { DemoSection } from "../DemoSection";
import { useEventReporter } from "../eventLog";
import { usePlaygroundSettings } from "../settings";

const DENSITY_CLASS: Readonly<Record<Density, string>> = {
  compact: "h-6 px-1.5 text-sm",
  standard: "h-8 px-2 text-sm",
  comfortable: "h-10 px-3 text-base",
};

const BUTTON_CLASS =
  "rounded border border-gridkit-line px-2 py-1 text-sm hover:border-gridkit-hover-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gridkit-accent";

/** How long the slow check takes to answer. */
const CHECK_DELAY = 1000;

/** The value the slow check refuses. */
const TAKEN = "taken";

function Toggle({
  label,
  checked,
  onChange,
}: {
  readonly label: string;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => {
          onChange(event.target.checked);
        }}
      />
      {label}
    </label>
  );
}

interface NameInputProps {
  readonly required: boolean;
  readonly slowCheck: boolean;
  readonly uppercase: boolean;
  readonly handle: Ref<InputHandle<string>>;
}

/**
 * The bare text control on `useFieldInput`, inside its field, reporting
 * each of its nine events to the log.
 */
function NameInput({ required, slowCheck, uppercase, handle }: NameInputProps) {
  const { settings } = usePlaygroundSettings();
  const reporter = useEventReporter("Field input");
  const requireValue = useMemo(() => requiredRule<string>(), []);

  const kind = useMemo<FieldInputKind<string>>(
    () => ({
      defaultParse: textParser({ uppercase }),
      defaultFormat: formatText,
      serialize: (value) => value,
    }),
    [uppercase],
  );

  function onBeforeCommit(
    event: FieldBeforeCommitEvent<string>,
  ): Promise<void> | undefined {
    reporter("onBeforeCommit")(event);
    if (!slowCheck) {
      return undefined;
    }
    return new Promise((resolve) => {
      setTimeout(() => {
        if (event.value?.toLowerCase() === TAKEN) {
          event.preventDefault(`"${TAKEN}" is taken`);
        }
        resolve();
      }, CHECK_DELAY);
    });
  }

  const field = useFieldInput(
    {
      required,
      validate: required ? requireValue : undefined,
      locale: settings.locale,
      handleRef: handle,
      onFocus: reporter("onFocus"),
      onBeforeInput: reporter("onBeforeInput"),
      onInput: reporter("onInput"),
      onBeforeChange: reporter("onBeforeChange"),
      onChange: reporter("onChange"),
      onValidate: reporter("onValidate"),
      onBeforeCommit,
      onCommit: reporter("onCommit"),
      onBlur: reporter("onBlur"),
    },
    kind,
  );

  if (field.mode === "display") {
    return field.displayValue;
  }
  return (
    <>
      <input
        className={`${DENSITY_CLASS[settings.density]} ${uppercase ? "uppercase" : ""} w-full rounded border border-gridkit-fg-muted bg-gridkit-surface text-gridkit-fg read-only:bg-gridkit-surface-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gridkit-accent disabled:opacity-50 aria-invalid:border-gridkit-error`}
        {...field.controlProps}
      />
      <p role="status" className="text-sm text-gridkit-fg-muted">
        {field.state.phase.kind === "checking" ? "Checking…" : ""}
      </p>
    </>
  );
}

/**
 * A bare text control on `useFieldInput`, the hook every forms input is
 * built on, in a `Field`. The toggles add a required check, a slow
 * `onBeforeCommit` and an upper-case reading, so the order of events can
 * be watched as each joins in.
 */
export function FieldInputDemo() {
  const { settings } = usePlaygroundSettings();
  const handle = useRef<InputHandle<string>>(null);
  const [required, setRequired] = useState(false);
  const [slowCheck, setSlowCheck] = useState(false);
  const [uppercase, setUppercase] = useState(false);

  return (
    <DemoSection
      title="Field input"
      description="A bare text control on useFieldInput, the hook every forms input is built on. Each of its events goes to the log; the toggles add hooks to watch the order change."
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <Toggle label="Required" checked={required} onChange={setRequired} />
          <Toggle
            label={`Slow check (refuses "${TAKEN}")`}
            checked={slowCheck}
            onChange={setSlowCheck}
          />
          <Toggle
            label="Upper case"
            checked={uppercase}
            onChange={setUppercase}
          />
        </div>
        <Field
          label="Name"
          className="max-w-sm"
          density={settings.density}
          mode={settings.mode}
          necessityIndicator={settings.necessityIndicator}
          readOnly={settings.readOnly}
          disabled={settings.disabled}
        >
          <NameInput
            required={required}
            slowCheck={slowCheck}
            uppercase={uppercase}
            handle={handle}
          />
        </Field>
        <div className="flex gap-2">
          <button
            type="button"
            className={BUTTON_CLASS}
            onClick={() => handle.current?.setValue("Ada")}
          >
            Set to Ada
          </button>
          <button
            type="button"
            className={BUTTON_CLASS}
            onClick={() => handle.current?.reset()}
          >
            Reset
          </button>
        </div>
      </div>
    </DemoSection>
  );
}
