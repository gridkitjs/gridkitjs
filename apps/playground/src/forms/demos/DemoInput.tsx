import { useMemo } from "react";
import { formatText, requiredRule, textParser } from "@gridkitjs/forms-core";
import {
  useField,
  useFieldInput,
  type Density,
  type FieldInputKind,
} from "@gridkitjs/forms";
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
export function DemoInput({
  component,
  name,
  defaultValue,
  placeholder,
  "aria-label": ariaLabel,
}: {
  readonly component: string;
  readonly name?: string;
  readonly defaultValue?: string;
  readonly placeholder?: string;
  /** Names the control in a `FieldGroup`, whose label names the group. */
  readonly "aria-label"?: string;
}) {
  const { settings } = usePlaygroundSettings();
  const reporter = useEventReporter(component);
  const { required, density } = useField();
  const requireValue = useMemo(() => requiredRule<string>(), []);
  const field = useFieldInput(
    {
      name,
      defaultValue,
      validate: required ? requireValue : undefined,
      locale: settings.locale,
      onChange: reporter("onChange"),
      onValidate: reporter("onValidate"),
      onCommit: reporter("onCommit"),
    },
    TEXT,
  );
  return (
    <>
      {field.mode === "display" ? (
        field.displayValue
      ) : (
        <input
          placeholder={placeholder}
          aria-label={ariaLabel}
          className={`${DENSITY_CLASS[density]} w-full rounded border border-gridkit-fg-muted bg-gridkit-surface text-gridkit-fg read-only:bg-gridkit-surface-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gridkit-accent disabled:bg-gridkit-surface-muted disabled:text-gridkit-fg-muted in-[.is-warning]:border-gridkit-warning aria-invalid:border-gridkit-error`}
          {...field.controlProps}
        />
      )}
      {field.hiddenInput}
    </>
  );
}
