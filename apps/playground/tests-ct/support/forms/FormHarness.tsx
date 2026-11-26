import { useState } from "react";
import {
  Field,
  Fieldset,
  Form,
  FormSection,
  MessageSummary,
  type Density,
  type FieldMode,
} from "@gridkitjs/forms";
import { FieldTextInput } from "./FieldTextInput";

export interface FormHarnessProps {
  /** How an accepted submit is taken: `onSubmit`, or a React form action. */
  readonly submitWith?: "onSubmit" | "action";
  readonly withSummary?: boolean;
  readonly enterMovesToNextField?: boolean;
  readonly noValidate?: boolean;
  /** Puts the required "City" field in a section that starts collapsed. */
  readonly collapsedCity?: boolean;
  /** Adds the app's own native `<input required>`, "Code", after "Name". */
  readonly nativeRequired?: boolean;
  readonly fieldsetDisabled?: boolean;
  readonly mode?: FieldMode;
  readonly density?: Density;
}

/** A submit's form data as text, field by field. */
function describe(formData: FormData): string {
  return [...formData.entries()]
    .map(
      ([name, value]) =>
        `${name}=${typeof value === "string" ? value : value.name}`,
    )
    .join("&");
}

/**
 * A `Form` with a required "Name", an optional "Email", a read-only
 * "Account", a "Subscribe" checkbox, "Notes" and a "Comments" textarea in
 * a fieldset, and a required "City" in a section of its own. Each submit
 * the form lets through is written to the "Submitted" output, with its
 * form data.
 */
export default function FormHarness({
  submitWith = "onSubmit",
  withSummary = false,
  enterMovesToNextField = false,
  noValidate = false,
  collapsedCity = false,
  nativeRequired = false,
  fieldsetDisabled = false,
  mode,
  density,
}: FormHarnessProps) {
  const [submitted, setSubmitted] = useState<readonly string[]>([]);
  const record = (formData: FormData) => {
    setSubmitted((current) => [...current, describe(formData)]);
  };

  return (
    <div>
      <Form
        aria-label="Order"
        enterMovesToNextField={enterMovesToNextField}
        noValidate={noValidate}
        mode={mode}
        density={density}
        {...(submitWith === "action"
          ? { action: record }
          : {
              onSubmit: (event) => {
                event.preventDefault();
                record(new FormData(event.currentTarget));
              },
            })}
      >
        {withSummary && <MessageSummary />}
        <Field label="Name" required>
          <FieldTextInput name="name" />
        </Field>
        {nativeRequired && (
          <label>
            Code <input name="code" required />
          </label>
        )}
        <Field label="Email">
          <FieldTextInput name="email" />
        </Field>
        <Field label="Account" readOnly>
          <FieldTextInput name="account" defaultValue="A-100" />
        </Field>
        <Fieldset legend="Preferences" disabled={fieldsetDisabled}>
          <label>
            <input type="checkbox" name="subscribe" /> Subscribe
          </label>
          <Field label="Notes">
            <FieldTextInput name="notes" />
          </Field>
          <label>
            Comments <textarea name="comments" />
          </label>
        </Fieldset>
        <FormSection
          title="Delivery"
          collapsible
          defaultExpanded={!collapsedCity}
        >
          <Field label="City" required>
            <FieldTextInput name="city" />
          </Field>
        </FormSection>
        <button type="submit">Send</button>
      </Form>
      <output aria-label="Submitted">{submitted.join(" | ")}</output>
    </div>
  );
}
