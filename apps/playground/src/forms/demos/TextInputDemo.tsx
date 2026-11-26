import { useRef, useState } from "react";
import {
  TextInput,
  type FieldBeforeCommitEvent,
  type FieldMessageInput,
  type InputHandle,
  type LabelPosition,
  type TextInputProps,
} from "@gridkitjs/forms";
import { DemoSection } from "../DemoSection";
import { useEventReporter } from "../eventLog";
import { usePlaygroundSettings } from "../settings";
import { DemoField, DemoGroup } from "./DemoField";

const BUTTON_CLASS =
  "rounded border border-gridkit-line px-2 py-1 text-sm hover:border-gridkit-hover-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gridkit-accent";

/** How long the slow check takes to answer. */
const CHECK_DELAY = 1000;

/** The value the slow check refuses. */
const TAKEN = "taken";

export function Toggle({
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

/** A `TextInput` reporting all of its events to the log under `component`. */
function LoggedTextInput({
  component,
  ...props
}: TextInputProps & { readonly component: string }) {
  const { settings } = usePlaygroundSettings();
  const reporter = useEventReporter(component);
  return (
    <TextInput
      locale={settings.locale}
      onFocus={reporter("onFocus")}
      onBeforeInput={reporter("onBeforeInput")}
      onInput={reporter("onInput")}
      onBeforeChange={reporter("onBeforeChange")}
      onChange={reporter("onChange")}
      onValidate={reporter("onValidate")}
      onBeforeCommit={reporter("onBeforeCommit")}
      onCommit={reporter("onCommit")}
      onBlur={reporter("onBlur")}
      onClear={(event) => {
        reporter("onClear")({ ...event, value: null, text: "" });
      }}
      {...props}
    />
  );
}

/**
 * The "Name" field the toggles change: a required check, a slow
 * `onBeforeCommit` that refuses "taken" and shows the spinner while it
 * runs, and an upper-case reading.
 */
function NameField() {
  const reporter = useEventReporter("TextInput");
  const handle = useRef<InputHandle<string>>(null);
  const [required, setRequired] = useState(false);
  const [slowCheck, setSlowCheck] = useState(false);
  const [uppercase, setUppercase] = useState(false);
  const [checking, setChecking] = useState(false);

  function onBeforeCommit(
    event: FieldBeforeCommitEvent<string>,
  ): Promise<void> | undefined {
    reporter("onBeforeCommit")(event);
    if (!slowCheck) {
      return undefined;
    }
    setChecking(true);
    return new Promise((resolve) => {
      setTimeout(() => {
        if (event.value?.toLowerCase() === TAKEN) {
          event.preventDefault(`"${TAKEN}" is taken`);
        }
        setChecking(false);
        resolve();
      }, CHECK_DELAY);
    });
  }

  return (
    <div className="flex flex-col gap-3">
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
      <DemoField label="Name" className="max-w-sm">
        <LoggedTextInput
          component="TextInput"
          required={required}
          uppercase={uppercase}
          loading={checking}
          clearable
          handleRef={handle}
          onBeforeCommit={onBeforeCommit}
        />
      </DemoField>
      <p role="status" className="text-sm text-gridkit-fg-muted">
        {checking ? "Checking…" : ""}
      </p>
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
  );
}

const POSITIONS: readonly {
  readonly position: LabelPosition;
  readonly label: string;
}[] = [
  { position: "top", label: "Top" },
  { position: "floating", label: "Floating" },
  { position: "start", label: "Start" },
  { position: "hidden", label: "Hidden" },
];

const SEVERITIES: readonly {
  readonly label: string;
  readonly message: FieldMessageInput;
}[] = [
  { label: "Error border", message: "This code is not in use" },
  {
    label: "Warning border",
    message: { text: "Above the usual amount", severity: "warning" },
  },
  {
    label: "Info border",
    message: { text: "Copied from the last order", severity: "info" },
  },
  {
    label: "Success border",
    message: { text: "Matches the register", severity: "success" },
  },
];

/**
 * `TextInput` in every state: the toggled "Name" field, each label
 * position with a placeholder, the box's adornments and buttons, the
 * counter, a password, multiline text, every severity's border, the modes
 * and each density. The page controls set the density, mode, marked
 * fields, `readOnly` and `disabled` of every field here, unless a state
 * fixes one; every input reports to the log.
 */
export function TextInputDemo() {
  return (
    <DemoSection
      title="TextInput"
      description="A single line, a password or growing multiline text, in the box every text input shares. The placeholder of a floating label shows only once the label rises. Ctrl+Enter commits multiline text; Escape puts back the last commit."
    >
      <div className="flex flex-col gap-8">
        <NameField />
        <DemoGroup title="Label positions, with a placeholder">
          {POSITIONS.map(({ position, label }) => (
            <DemoField
              key={position}
              label={`${label} text`}
              labelPosition={position}
            >
              <LoggedTextInput
                component={`TextInput: ${label} text`}
                placeholder="Ada Lovelace"
              />
            </DemoField>
          ))}
        </DemoGroup>
        <DemoGroup title="In the box">
          <DemoField label="Amount" description="A prefix and a suffix">
            <LoggedTextInput
              component="TextInput: Amount"
              prefix="€"
              suffix="net"
              inputMode="decimal"
            />
          </DemoField>
          <DemoField label="Clearable" labelPosition="floating">
            <LoggedTextInput
              component="TextInput: Clearable"
              clearable
              defaultValue="Clear me"
            />
          </DemoField>
          <DemoField label="Title" description="At most 20 characters">
            <LoggedTextInput
              component="TextInput: Title"
              maxLength={20}
              defaultValue="Quarterly report"
            />
          </DemoField>
          <DemoField label="Password">
            <LoggedTextInput
              component="TextInput: Password"
              type="password"
              autoComplete="new-password"
            />
          </DemoField>
          <DemoField label="Loading">
            <LoggedTextInput
              component="TextInput: Loading"
              loading
              defaultValue="Looking it up"
            />
          </DemoField>
          <DemoField label="Code" description="Selects all on Tab; upper case">
            <LoggedTextInput
              component="TextInput: Code"
              selectOnFocus
              uppercase
              defaultValue="ab-12"
            />
          </DemoField>
        </DemoGroup>
        <DemoGroup title="Multiline">
          <DemoField label="Notes" description="Grows from 2 to 6 lines">
            <LoggedTextInput
              component="TextInput: Notes"
              multiline
              maxRows={6}
            />
          </DemoField>
          <DemoField label="Comments" labelPosition="floating">
            <LoggedTextInput
              component="TextInput: Comments"
              multiline
              minRows={3}
              maxLength={200}
            />
          </DemoField>
        </DemoGroup>
        <DemoGroup title="Severity borders">
          {SEVERITIES.map(({ label, message }) => (
            <DemoField key={label} label={label} message={message}>
              <LoggedTextInput
                component={`TextInput: ${label}`}
                defaultValue="10045"
              />
            </DemoField>
          ))}
        </DemoGroup>
        <DemoGroup title="Modes">
          <DemoField label="Shown as text" mode="display">
            <LoggedTextInput
              component="TextInput: Shown as text"
              defaultValue={"Ada Lovelace\n12 St James's Square"}
              multiline
            />
          </DemoField>
          <DemoField label="Locked" readOnly>
            <LoggedTextInput component="TextInput: Locked" defaultValue="Ada" />
          </DemoField>
          <DemoField label="Switched off" disabled>
            <LoggedTextInput
              component="TextInput: Switched off"
              defaultValue="Ada"
              clearable
            />
          </DemoField>
          <DemoField label="Secret, shown as text" mode="display">
            <LoggedTextInput
              component="TextInput: Secret"
              type="password"
              defaultValue="hunter2"
            />
          </DemoField>
        </DemoGroup>
        <DemoGroup title="Each density">
          {(["compact", "standard", "comfortable"] as const).map((density) => (
            <DemoField
              key={density}
              label={`${density.charAt(0).toUpperCase()}${density.slice(1)} box`}
              density={density}
              labelPosition="floating"
            >
              <LoggedTextInput
                component={`TextInput: ${density}`}
                clearable
                placeholder="Ada Lovelace"
              />
            </DemoField>
          ))}
        </DemoGroup>
      </div>
    </DemoSection>
  );
}
