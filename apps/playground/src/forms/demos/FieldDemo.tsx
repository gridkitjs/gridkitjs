import { useMemo, type ReactNode } from "react";
import { formatText, requiredRule, textParser } from "@gridkitjs/forms-core";
import {
  Field,
  useField,
  useFieldInput,
  type Density,
  type FieldInputKind,
  type FieldMessageInput,
  type FieldProps,
  type LabelPosition,
} from "@gridkitjs/forms";
import { DemoSection } from "../DemoSection";
import { useEventReporter } from "../eventLog";
import { usePlaygroundSettings } from "../settings";

const TEXT: FieldInputKind<string> = {
  defaultParse: textParser(),
  defaultFormat: formatText,
  serialize: (value) => value,
};

const DENSITY_CLASS: Readonly<Record<Density, string>> = {
  compact: "h-6 px-2 text-sm",
  standard: "h-8 px-2 text-sm",
  comfortable: "h-10 px-2 text-base",
};

/**
 * A text control on `useFieldInput`, drawn with utilities as a stand-in for
 * the forms' own text input. It reports its commits and validation to the
 * log under `component`, and checks for a value when its field is required.
 */
function DemoInput({
  component,
  defaultValue,
  placeholder,
}: {
  readonly component: string;
  readonly defaultValue?: string;
  readonly placeholder?: string;
}) {
  const { settings } = usePlaygroundSettings();
  const reporter = useEventReporter(component);
  const { required, density } = useField();
  const requireValue = useMemo(() => requiredRule<string>(), []);
  const field = useFieldInput(
    {
      defaultValue,
      validate: required ? requireValue : undefined,
      locale: settings.locale,
      onChange: reporter("onChange"),
      onValidate: reporter("onValidate"),
      onCommit: reporter("onCommit"),
    },
    TEXT,
  );
  if (field.mode === "display") {
    return field.displayValue;
  }
  return (
    <input
      placeholder={placeholder}
      className={`${DENSITY_CLASS[density]} w-full rounded border border-gridkit-fg-muted bg-gridkit-surface text-gridkit-fg read-only:bg-gridkit-surface-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gridkit-accent disabled:bg-gridkit-surface-muted disabled:text-gridkit-fg-muted in-[.is-warning]:border-gridkit-warning aria-invalid:border-gridkit-error`}
      {...field.controlProps}
    />
  );
}

/**
 * A `Field` with the page's density, mode, marked fields, `readOnly` and
 * `disabled`.
 */
function DemoField(props: FieldProps) {
  const { settings } = usePlaygroundSettings();
  return (
    <Field
      density={settings.density}
      mode={settings.mode}
      necessityIndicator={settings.necessityIndicator}
      readOnly={settings.readOnly}
      disabled={settings.disabled}
      {...props}
    />
  );
}

function Group({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-gridkit-fg-muted">
        {title}
      </h3>
      <div className="grid max-w-3xl gap-x-6 gap-y-5 sm:grid-cols-2">
        {children}
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
  { label: "Error", message: "This customer number is not in use" },
  {
    label: "Warning",
    message: { text: "Above the usual credit limit", severity: "warning" },
  },
  {
    label: "Info",
    message: { text: "Copied from the last order", severity: "info" },
  },
  {
    label: "Success",
    message: { text: "Matches the tax register", severity: "success" },
  },
];

/**
 * `Field` around a text control in every label position, with a message
 * of every severity, and in display mode, read-only and disabled. The page
 * controls set the density and mode and make every field read-only or
 * disabled; each input reports its changes and commits to the log.
 */
export function FieldDemo() {
  return (
    <DemoSection
      title="Field"
      description="The label in each position, the required and optional markers, help text and a message of each severity, around a stand-in text control. A floating label rises on focus or a value; a required field shows its error once you leave it empty."
    >
      <div className="flex flex-col gap-8">
        <Group title="Label positions">
          {POSITIONS.map(({ position, label }) => (
            <DemoField
              key={position}
              label={`${label} label`}
              labelPosition={position}
              description={
                position === "hidden"
                  ? "The label is read, not shown"
                  : undefined
              }
              required={position === "floating"}
            >
              <DemoInput
                component={`Field: ${label} label`}
                placeholder="name@example.com"
              />
            </DemoField>
          ))}
        </Group>
        <Group title="Severities">
          {SEVERITIES.map(({ label, message }) => (
            <DemoField key={label} label={label} message={message}>
              <DemoInput component={`Field: ${label}`} defaultValue="10045" />
            </DemoField>
          ))}
        </Group>
        <Group title="Markers and modes">
          <DemoField
            label="Optional"
            necessityIndicator="optional"
            description="Marked in words when the form marks optional fields"
          >
            <DemoInput component="Field: Optional" />
          </DemoField>
          <DemoField label="Display mode" mode="display">
            <DemoInput component="Field: Display mode" defaultValue="Ada" />
          </DemoField>
          <DemoField label="Read-only" readOnly>
            <DemoInput component="Field: Read-only" defaultValue="Ada" />
          </DemoField>
          <DemoField
            label="Disabled"
            disabled
            message={{ text: "Set by your administrator", severity: "info" }}
          >
            <DemoInput component="Field: Disabled" defaultValue="Ada" />
          </DemoField>
        </Group>
      </div>
    </DemoSection>
  );
}
