import { useState } from "react";
import { Field, FormSection } from "@gridkitjs/forms";
import { FieldTextInput } from "./FieldTextInput";

export interface SectionHarnessProps {
  /** Holds the section's expansion itself, through `expanded`. */
  readonly controlled?: boolean;
}

/**
 * A collapsible "Delivery" section, described as "Where the order goes",
 * holding a "City" field. Controlled, it writes each `onExpandedChange` to
 * the "Expanded" output.
 */
export default function SectionHarness({
  controlled = false,
}: SectionHarnessProps) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div>
      <FormSection
        title="Delivery"
        description="Where the order goes"
        collapsible
        {...(controlled ? { expanded, onExpandedChange: setExpanded } : {})}
      >
        <Field label="City">
          <FieldTextInput />
        </Field>
      </FormSection>
      <output aria-label="Expanded">{String(expanded)}</output>
    </div>
  );
}
