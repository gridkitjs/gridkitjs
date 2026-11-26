import type { FieldMessageInput, LabelPosition } from "@gridkitjs/forms";
import { DemoSection } from "../DemoSection";
import { DemoField, DemoGroup } from "./DemoField";
import { DemoInput } from "./DemoInput";

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
      description="The label in each position, the required and optional markers, help text and a message of each severity, around a TextInput. A floating label rises on focus or a value; a required field shows its error once you leave it empty."
    >
      <div className="flex flex-col gap-8">
        <DemoGroup title="Label positions">
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
        </DemoGroup>
        <DemoGroup title="Severities">
          {SEVERITIES.map(({ label, message }) => (
            <DemoField key={label} label={label} message={message}>
              <DemoInput component={`Field: ${label}`} defaultValue="10045" />
            </DemoField>
          ))}
        </DemoGroup>
        <DemoGroup title="Markers and modes">
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
        </DemoGroup>
      </div>
    </DemoSection>
  );
}
