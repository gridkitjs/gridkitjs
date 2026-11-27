import {
  MaskedInput,
  maskPresets,
  type FieldMessageInput,
  type MaskedInputProps,
  type MaskPresets,
} from "@gridkitjs/forms";
import { DemoSection } from "../DemoSection";
import { useEventReporter, type ReportedEvent } from "../eventLog";
import { DemoField, DemoGroup } from "./DemoField";

/** A `MaskedInput` reporting all of its events to the log under `component`. */
function LoggedMaskedInput({
  component,
  ...props
}: MaskedInputProps & { readonly component: string }) {
  const reporter = useEventReporter(component);
  return (
    <MaskedInput
      onFocus={reporter("onFocus")}
      onBeforeInput={reporter("onBeforeInput")}
      onInput={reporter("onInput")}
      onBeforeChange={reporter("onBeforeChange")}
      onChange={reporter("onChange")}
      onValidate={reporter("onValidate")}
      onBeforeCommit={reporter("onBeforeCommit")}
      onCommit={reporter("onCommit")}
      onBlur={reporter("onBlur")}
      onClear={(event: Omit<ReportedEvent, "value" | "text">) => {
        reporter("onClear")({ ...event, value: null, text: "" });
      }}
      {...props}
    />
  );
}

const PHONE = "(000) 000-0000";
const PHONE_DESCRIPTION = "10 digits, as (555) 123-4567";
const PHONE_WITH_COUNTRY = [PHONE, "+0 (000) 000-0000"];
const ZIP = ["00000", "00000-0000"];
const HEX_TOKENS = { H: /[0-9a-f]/i };

const PRESETS: readonly {
  readonly preset: keyof MaskPresets;
  readonly label: string;
  readonly description: string;
}[] = [
  { preset: "iban", label: "IBAN", description: "Checked by mod 97" },
  {
    preset: "cardNumber",
    label: "Card number",
    description: "Checked by Luhn; 34 or 37 groups as 4-6-5",
  },
  {
    preset: "ipv4",
    label: "IPv4 address",
    description: "A dot moves to the next part",
  },
  { preset: "postalCodeUS", label: "US ZIP code", description: "12345-6789" },
  {
    preset: "postalCodeCA",
    label: "Canadian postal code",
    description: "K1A 0B1",
  },
  { preset: "postalCodeGB", label: "UK postcode", description: "SW1A 1AA" },
  { preset: "postalCodeDE", label: "German postal code", description: "10115" },
  {
    preset: "postalCodeNL",
    label: "Dutch postal code",
    description: "1012 AB",
  },
  { preset: "postalCodeBR", label: "Brazilian CEP", description: "01310-100" },
  {
    preset: "postalCodeJP",
    label: "Japanese postal code",
    description: "100-0001",
  },
];

const SEVERITIES: readonly {
  readonly label: string;
  readonly message: FieldMessageInput;
}[] = [
  { label: "Error border", message: "This number is blocked" },
  {
    label: "Warning border",
    message: { text: "Not the number on file", severity: "warning" },
  },
  {
    label: "Info border",
    message: { text: "Copied from the customer", severity: "info" },
  },
  {
    label: "Success border",
    message: { text: "Verified by text message", severity: "success" },
  },
];

/**
 * `MaskedInput` in every state: a phone mask and its two-pattern form, a
 * two-pattern ZIP code, every preset, a token of the app's own, every
 * severity's border, the modes and a floating label. The page controls
 * set the mode, `readOnly` and `disabled` of every field unless a state
 * fixes one, and every input reports to the log.
 */
export function MaskedInputDemo() {
  return (
    <DemoSection
      title="MaskedInput"
      description="Typing fills the mask's slots and steps over its literals; a paste keeps what fits; composed text is laid in when composition ends. Empty slots show _ while focused. The value arrives only once the mask is complete."
    >
      <div className="flex flex-col gap-8">
        <DemoGroup title="Patterns">
          <DemoField label="Phone number" description={PHONE_DESCRIPTION}>
            <LoggedMaskedInput
              component="MaskedInput: Phone number"
              mask={PHONE}
              clearable
            />
          </DemoField>
          <DemoField
            label="Phone with country code"
            description="Two patterns: an 11th digit adds the country code"
          >
            <LoggedMaskedInput
              component="MaskedInput: Phone with country code"
              mask={PHONE_WITH_COUNTRY}
              valueFormat="formatted"
            />
          </DemoField>
          <DemoField
            label="ZIP code"
            description="Two patterns: 5 digits, or ZIP+4"
          >
            <LoggedMaskedInput
              component="MaskedInput: ZIP code"
              mask={ZIP}
              valueFormat="formatted"
            />
          </DemoField>
          <DemoField
            label="Colour"
            description="A token of its own: H is a hex digit"
          >
            <LoggedMaskedInput
              component="MaskedInput: Colour"
              mask="\#>HHHHHH"
              tokens={HEX_TOKENS}
              valueFormat="formatted"
              monospace
            />
          </DemoField>
          <DemoField label="Part number" description="Monospace, no prompt">
            <LoggedMaskedInput
              component="MaskedInput: Part number"
              mask=">LL-0000-AA"
              promptCharacter=""
              monospace
            />
          </DemoField>
        </DemoGroup>
        <DemoGroup title="Presets">
          {PRESETS.map(({ preset, label, description }) => (
            <DemoField key={preset} label={label} description={description}>
              <LoggedMaskedInput
                component={`MaskedInput: ${label}`}
                mask={maskPresets[preset]}
                monospace={preset === "iban" || preset === "cardNumber"}
              />
            </DemoField>
          ))}
        </DemoGroup>
        <DemoGroup title="Severity borders">
          {SEVERITIES.map(({ label, message }) => (
            <DemoField key={label} label={label} message={message}>
              <LoggedMaskedInput
                component={`MaskedInput: ${label}`}
                mask={PHONE}
                defaultValue="5551234567"
              />
            </DemoField>
          ))}
        </DemoGroup>
        <DemoGroup title="Modes">
          <DemoField label="Shown as text" mode="display">
            <LoggedMaskedInput
              component="MaskedInput: Shown as text"
              mask={PHONE}
              defaultValue="5551234567"
            />
          </DemoField>
          <DemoField label="Locked" readOnly>
            <LoggedMaskedInput
              component="MaskedInput: Locked"
              mask={maskPresets.iban}
              defaultValue="DE89370400440532013000"
            />
          </DemoField>
          <DemoField label="Switched off" disabled>
            <LoggedMaskedInput
              component="MaskedInput: Switched off"
              mask={PHONE}
              defaultValue="5551234567"
            />
          </DemoField>
          <DemoField
            label="Floating label"
            description="The template shows once the label rises"
            labelPosition="floating"
          >
            <LoggedMaskedInput
              component="MaskedInput: Floating label"
              mask={PHONE}
            />
          </DemoField>
        </DemoGroup>
      </div>
    </DemoSection>
  );
}
