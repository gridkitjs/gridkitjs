import { FieldGroup } from "@gridkitjs/forms";
import { FieldTextInput } from "./FieldTextInput";

/**
 * A required "Address" group of two inputs, "Postal code" and "City", each
 * named by its own `aria-label`, under the help text "As on your letters".
 */
export default function FieldGroupHarness() {
  return (
    <FieldGroup label="Address" description="As on your letters" required>
      <FieldTextInput aria-label="Postal code" name="postalCode" />
      <FieldTextInput aria-label="City" name="city" />
    </FieldGroup>
  );
}
