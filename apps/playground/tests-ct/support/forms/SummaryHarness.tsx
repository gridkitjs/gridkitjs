import {
  Field,
  FieldGroup,
  Form,
  FormSection,
  MessageSummary,
  type FieldMessageInput,
  type Severity,
} from "@gridkitjs/forms";
import { FieldTextInput } from "./FieldTextInput";

export interface SummaryHarnessProps {
  /** The summary's `severities`; its own default without. */
  readonly severities?: readonly Severity[];
  /** The app's messages on "Name", "Email" and "Phone". */
  readonly messages?: {
    readonly name?: FieldMessageInput | readonly FieldMessageInput[];
    readonly email?: FieldMessageInput | readonly FieldMessageInput[];
    readonly phone?: FieldMessageInput | readonly FieldMessageInput[];
  };
  /** Starts the "Delivery" section, holding a required "City", collapsed. */
  readonly collapsedDelivery?: boolean;
}

/**
 * A `Form` with a `MessageSummary` over "Name", "Email" and "Phone"
 * fields, an "Address" group, and a collapsible "Delivery" section whose
 * "City" is required. A "Send" button submits it.
 */
export default function SummaryHarness({
  severities,
  messages = {},
  collapsedDelivery = false,
}: SummaryHarnessProps) {
  return (
    <Form aria-label="Order">
      <MessageSummary severities={severities} />
      <Field label="Name" message={messages.name}>
        <FieldTextInput />
      </Field>
      <Field label="Email" message={messages.email}>
        <FieldTextInput />
      </Field>
      <Field label="Phone" message={messages.phone}>
        <FieldTextInput />
      </Field>
      <FieldGroup label="Address" required>
        <FieldTextInput aria-label="Postal code" />
        <FieldTextInput aria-label="Street" />
      </FieldGroup>
      <FormSection
        title="Delivery"
        collapsible
        defaultExpanded={!collapsedDelivery}
      >
        <Field label="City" required>
          <FieldTextInput />
        </Field>
      </FormSection>
      <button type="submit">Send</button>
    </Form>
  );
}
