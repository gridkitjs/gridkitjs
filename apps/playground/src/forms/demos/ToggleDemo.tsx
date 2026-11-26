import { useState } from "react";
import {
  Checkbox,
  FieldGroup,
  Switch,
  type CheckboxProps,
  type FieldMessageInput,
  type SwitchProps,
} from "@gridkitjs/forms";
import { DemoSection } from "../DemoSection";
import { useEventReporter } from "../eventLog";
import { usePlaygroundSettings } from "../settings";
import { DemoField, DemoGroup } from "./DemoField";

/** The page's states, for an input drawn outside a `DemoField`. */
function usePageStates() {
  const { settings } = usePlaygroundSettings();
  return {
    mode: settings.mode,
    readOnly: settings.readOnly,
    disabled: settings.disabled,
  };
}

/** The handlers a toggle fires, each reporting to the log under `component`. */
function useToggleReporters(component: string) {
  const reporter = useEventReporter(component);
  return {
    onFocus: reporter("onFocus"),
    onBeforeChange: reporter("onBeforeChange"),
    onChange: reporter("onChange"),
    onValidate: reporter("onValidate"),
    onBeforeCommit: reporter("onBeforeCommit"),
    onCommit: reporter("onCommit"),
    onBlur: reporter("onBlur"),
  };
}

/** A `Checkbox` reporting all of its events to the log under `component`. */
function LoggedCheckbox({
  component,
  ...props
}: CheckboxProps & { readonly component: string }) {
  return <Checkbox {...useToggleReporters(component)} {...props} />;
}

/** A `Switch` reporting all of its events to the log under `component`. */
function LoggedSwitch({
  component,
  ...props
}: SwitchProps & { readonly component: string }) {
  return <Switch {...useToggleReporters(component)} {...props} />;
}

const SEVERITIES: readonly {
  readonly label: string;
  readonly message: FieldMessageInput;
}[] = [
  { label: "Error", message: "Accept the terms to continue" },
  {
    label: "Warning",
    message: { text: "Others can see this", severity: "warning" },
  },
  {
    label: "Info",
    message: { text: "Copied from your profile", severity: "info" },
  },
  {
    label: "Success",
    message: { text: "Saved", severity: "success" },
  },
];

const DENSITIES = ["compact", "standard", "comfortable"] as const;

function capitalized(text: string): string {
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

const COLUMNS = ["Name", "City", "Score"] as const;

/**
 * "All columns" over three column checkboxes: mixed while some are
 * checked, and checking or unchecking them all when flipped.
 */
function SelectAll() {
  const [shown, setShown] = useState<ReadonlySet<string>>(
    () => new Set(["Name"]),
  );
  const pageStates = usePageStates();
  const { settings } = usePlaygroundSettings();
  const all =
    shown.size === COLUMNS.length ? true : shown.size === 0 ? false : null;
  return (
    <FieldGroup
      label="Columns"
      description="Mixed while some are checked"
      necessityIndicator={settings.necessityIndicator}
    >
      <div className="flex flex-col">
        <LoggedCheckbox
          component="Checkbox: All columns"
          {...pageStates}
          label="All columns"
          value={all}
          onChange={(event) => {
            setShown(new Set(event.value === true ? COLUMNS : []));
          }}
        />
        {COLUMNS.map((column) => (
          <LoggedCheckbox
            key={column}
            component={`Checkbox: ${column}`}
            {...pageStates}
            className="ms-6"
            label={column}
            value={shown.has(column)}
            onChange={(event) => {
              setShown((current) => {
                const next = new Set(current);
                if (event.value === true) {
                  next.add(column);
                } else {
                  next.delete(column);
                }
                return next;
              });
            }}
          />
        ))}
      </div>
    </FieldGroup>
  );
}

/**
 * `Checkbox` in every state: checked, unchecked and mixed, the three-state
 * cycle, a "select all" over a partial selection, each label placement,
 * required, every severity, the modes and each density. The page controls
 * apply to every field here unless a state fixes one.
 */
export function CheckboxDemo() {
  const pageStates = usePageStates();
  return (
    <DemoSection
      title="Checkbox"
      description="A native checkbox: true, false or null (mixed). A press or Space flips it and commits at once; a three-state box cycles through mixed. A floating field label sits above it, as top."
    >
      <div className="flex flex-col gap-8">
        <DemoGroup title="States">
          <DemoField label="Unchecked">
            <LoggedCheckbox
              component="Checkbox: Unchecked"
              label="Send me the newsletter"
            />
          </DemoField>
          <DemoField label="Checked">
            <LoggedCheckbox
              component="Checkbox: Checked"
              label="Remember me"
              defaultValue
            />
          </DemoField>
          <DemoField label="Mixed" description="Checks on the first flip">
            <LoggedCheckbox
              component="Checkbox: Mixed"
              label="All rows"
              defaultValue={null}
            />
          </DemoField>
          <DemoField label="Three states" description="Off, on, mixed, off">
            <LoggedCheckbox
              component="Checkbox: Three states"
              label="Include archived"
              threeState
            />
          </DemoField>
          <SelectAll />
          <DemoField
            label="Floating label"
            labelPosition="floating"
            description="Sits above, as top"
          >
            <LoggedCheckbox
              component="Checkbox: Floating label"
              label="Use my address"
            />
          </DemoField>
        </DemoGroup>
        <DemoGroup title="Label placement">
          <DemoField label="Label at the end">
            <LoggedCheckbox
              component="Checkbox: Label at the end"
              label="Email me receipts"
            />
          </DemoField>
          <DemoField label="Label at the start">
            <LoggedCheckbox
              component="Checkbox: Label at the start"
              label="Email me receipts"
              labelPlacement="start"
            />
          </DemoField>
          <DemoField label="Required" required>
            <LoggedCheckbox
              component="Checkbox: Required"
              label="I agree to the terms"
            />
          </DemoField>
          <LoggedCheckbox
            component="Checkbox: Bare"
            {...pageStates}
            label="A bare checkbox, outside a field"
          />
        </DemoGroup>
        <DemoGroup title="Severity borders">
          {SEVERITIES.map(({ label, message }) => (
            <DemoField key={label} label={label} message={message}>
              <LoggedCheckbox
                component={`Checkbox: ${label}`}
                label="Share my profile"
              />
            </DemoField>
          ))}
        </DemoGroup>
        <DemoGroup title="Modes">
          <DemoField label="Shown as text" mode="display">
            <LoggedCheckbox
              component="Checkbox: Shown as text"
              label="Newsletter"
              defaultValue
            />
          </DemoField>
          <DemoField label="Locked" readOnly>
            <LoggedCheckbox
              component="Checkbox: Locked"
              label="Newsletter"
              defaultValue
            />
          </DemoField>
          <DemoField label="Switched off" disabled>
            <LoggedCheckbox
              component="Checkbox: Switched off"
              label="Newsletter"
              defaultValue
            />
          </DemoField>
          <DemoField label="Switched off, unchecked" disabled>
            <LoggedCheckbox
              component="Checkbox: Switched off, unchecked"
              label="Newsletter"
            />
          </DemoField>
        </DemoGroup>
        <DemoGroup title="Each density">
          {DENSITIES.map((density) => (
            <DemoField
              key={density}
              label={`${capitalized(density)} box`}
              density={density}
            >
              <LoggedCheckbox
                component={`Checkbox: ${density}`}
                label="Send me the newsletter"
              />
            </DemoField>
          ))}
        </DemoGroup>
      </div>
    </DemoSection>
  );
}

/**
 * `Switch` in every state: off and on, with "On"/"Off" beside it, each
 * label placement, required, every severity, the modes and each density.
 * The page controls apply to every field here unless a state fixes one.
 */
export function SwitchDemo() {
  const pageStates = usePageStates();
  return (
    <DemoSection
      title="Switch"
      description="An on or off setting that takes effect at once (role switch). A press or Space flips it and commits; the thumb moves to the reading end when on."
    >
      <div className="flex flex-col gap-8">
        <DemoGroup title="States">
          <DemoField label="Off">
            <LoggedSwitch component="Switch: Off" label="Email alerts" />
          </DemoField>
          <DemoField label="On">
            <LoggedSwitch
              component="Switch: On"
              label="Dark theme"
              defaultValue
            />
          </DemoField>
          <DemoField label="With its state">
            <LoggedSwitch
              component="Switch: With its state"
              label="Autosave"
              showStateLabel
            />
          </DemoField>
          <DemoField label="Label at the start">
            <LoggedSwitch
              component="Switch: Label at the start"
              label="Sounds"
              labelPlacement="start"
              defaultValue
            />
          </DemoField>
          <DemoField label="Required" required>
            <LoggedSwitch component="Switch: Required" label="Accept cookies" />
          </DemoField>
          <LoggedSwitch
            component="Switch: Bare"
            {...pageStates}
            label="A bare switch, outside a field"
          />
        </DemoGroup>
        <DemoGroup title="Severity borders">
          {SEVERITIES.map(({ label, message }) => (
            <DemoField key={label} label={label} message={message}>
              <LoggedSwitch
                component={`Switch: ${label}`}
                label="Public profile"
              />
            </DemoField>
          ))}
        </DemoGroup>
        <DemoGroup title="Modes">
          <DemoField label="Shown as text" mode="display">
            <LoggedSwitch
              component="Switch: Shown as text"
              label="Email alerts"
              defaultValue
            />
          </DemoField>
          <DemoField label="Locked" readOnly>
            <LoggedSwitch
              component="Switch: Locked"
              label="Email alerts"
              defaultValue
            />
          </DemoField>
          <DemoField label="Switched off" disabled>
            <LoggedSwitch
              component="Switch: Switched off"
              label="Email alerts"
              defaultValue
            />
          </DemoField>
          <DemoField label="Switched off, off" disabled>
            <LoggedSwitch
              component="Switch: Switched off, off"
              label="Email alerts"
            />
          </DemoField>
        </DemoGroup>
        <DemoGroup title="Each density">
          {DENSITIES.map((density) => (
            <DemoField
              key={density}
              label={`${capitalized(density)} track`}
              density={density}
            >
              <LoggedSwitch
                component={`Switch: ${density}`}
                label="Email alerts"
              />
            </DemoField>
          ))}
        </DemoGroup>
      </div>
    </DemoSection>
  );
}
