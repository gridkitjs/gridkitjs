import { TextInput } from "@gridkitjs/forms";
import { useEventReporter } from "../eventLog";
import { usePlaygroundSettings } from "../settings";

/**
 * A `TextInput` for the sections about structure, reporting its changes,
 * commits and validation to the log under `component`. A required field
 * makes it check for a value.
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
  return (
    <TextInput
      name={name}
      defaultValue={defaultValue}
      placeholder={placeholder}
      aria-label={ariaLabel}
      locale={settings.locale}
      onChange={reporter("onChange")}
      onValidate={reporter("onValidate")}
      onCommit={reporter("onCommit")}
    />
  );
}
