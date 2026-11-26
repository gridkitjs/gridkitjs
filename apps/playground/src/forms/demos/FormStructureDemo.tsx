import { useState } from "react";
import {
  Field,
  FieldGroup,
  Fieldset,
  Form,
  FormLayout,
  FormSection,
  MessageSummary,
  type LabelPosition,
} from "@gridkitjs/forms";
import { DemoSection } from "../DemoSection";
import { useEventReporter } from "../eventLog";
import { usePlaygroundSettings, type Option } from "../settings";
import { DemoInput } from "./DemoInput";

const COMPONENT = "Form structure";

const LABEL_POSITIONS: readonly Option<LabelPosition>[] = [
  { value: "top", label: "Top" },
  { value: "floating", label: "Floating" },
  { value: "start", label: "Start" },
  { value: "hidden", label: "Hidden" },
];

const COLUMN_COUNTS = [1, 2, 3, 4] as const;
type ColumnCount = (typeof COLUMN_COUNTS)[number];

const CONTROL_CLASS =
  "rounded border border-gridkit-line bg-gridkit-surface px-2 py-1 text-sm text-gridkit-fg";

const BUTTON_CLASS =
  "rounded border border-gridkit-line px-3 py-1 text-sm hover:border-gridkit-hover-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gridkit-accent";

/** A submit's form data as an object, for the log. */
function formValues(form: HTMLFormElement): Record<string, string> {
  return Object.fromEntries(
    [...new FormData(form).entries()].map(([name, value]) => [
      name,
      typeof value === "string" ? value : value.name,
    ]),
  );
}

/**
 * A whole form: a message summary, a section laid out in columns with
 * spans, a collapsible section holding a fieldset and a field group, and a
 * collapsed one with messages of every severity. The page controls set its
 * mode, density, marked fields, `readOnly` and `disabled`; the controls
 * here set its label position, columns and Enter navigation. A submit the
 * form lets through, and each section opening or closing, go to the log
 * with its inputs' events.
 */
export function FormStructureDemo() {
  const { settings } = usePlaygroundSettings();
  const reporter = useEventReporter(COMPONENT);
  const [labelPosition, setLabelPosition] = useState<LabelPosition>("top");
  const [columns, setColumns] = useState<ColumnCount>(2);
  const [enterMoves, setEnterMoves] = useState(false);

  return (
    <DemoSection
      title="Form structure"
      description="Form, FormSection, Fieldset, FieldGroup, FormLayout and MessageSummary together. Save with empty required fields to see the summary take focus; its links open a collapsed section to reach a field. Narrow the window to watch the columns drop."
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-gridkit-fg-muted">
            Label position
            <select
              className={CONTROL_CLASS}
              value={labelPosition}
              onChange={(event) => {
                const chosen = LABEL_POSITIONS.find(
                  (option) => option.value === event.target.value,
                );
                if (chosen !== undefined) {
                  setLabelPosition(chosen.value);
                }
              }}
            >
              {LABEL_POSITIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-gridkit-fg-muted">
            Columns
            <select
              className={CONTROL_CLASS}
              value={columns}
              onChange={(event) => {
                const chosen = COLUMN_COUNTS.find(
                  (count) => String(count) === event.target.value,
                );
                if (chosen !== undefined) {
                  setColumns(chosen);
                }
              }}
            >
              {COLUMN_COUNTS.map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 py-1 text-sm">
            <input
              type="checkbox"
              checked={enterMoves}
              onChange={(event) => {
                setEnterMoves(event.target.checked);
              }}
            />
            Enter moves to the next field
          </label>
        </div>
        <Form
          aria-label="Customer order"
          className="max-w-4xl"
          mode={settings.mode}
          density={settings.density}
          necessityIndicator={settings.necessityIndicator}
          readOnly={settings.readOnly}
          disabled={settings.disabled}
          locale={settings.locale}
          labelPosition={labelPosition}
          enterMovesToNextField={enterMoves}
          onSubmit={(event) => {
            event.preventDefault();
            reporter("onSubmit")({
              value: formValues(event.currentTarget),
              nativeEvent: event.nativeEvent,
            });
          }}
        >
          <MessageSummary />
          <FormSection title="Customer" description="Who the order is for">
            <FormLayout columns={columns}>
              <Field label="Contact" required span={2}>
                <DemoInput component={`${COMPONENT}: Contact`} name="name" />
              </Field>
              <Field
                label="Customer number"
                message={{
                  text: "Copied from the last order",
                  severity: "info",
                }}
              >
                <DemoInput
                  component={`${COMPONENT}: Customer number`}
                  name="customer"
                  defaultValue="10045"
                />
              </Field>
              <Field label="Email" required>
                <DemoInput component={`${COMPONENT}: Email`} name="email" />
              </Field>
              <Field label="Phone" description="With the country code">
                <DemoInput component={`${COMPONENT}: Phone`} name="phone" />
              </Field>
              <Field label="Notes" span="full">
                <DemoInput component={`${COMPONENT}: Notes`} name="notes" />
              </Field>
            </FormLayout>
          </FormSection>
          <FormSection
            title="Delivery"
            collapsible
            onExpandedChange={(expanded) => {
              reporter("onExpandedChange")({ value: expanded });
            }}
          >
            <Fieldset
              legend="Delivery address"
              description="Where the parcel goes"
            >
              <FormLayout columns={columns}>
                <Field label="Street" required span={2}>
                  <DemoInput component={`${COMPONENT}: Street`} name="street" />
                </Field>
                <FieldGroup label="Postal code and city" required>
                  <DemoInput
                    component={`${COMPONENT}: Postal code`}
                    name="postalCode"
                    aria-label="Postal code"
                  />
                  <DemoInput
                    component={`${COMPONENT}: City`}
                    name="city"
                    aria-label="City"
                  />
                </FieldGroup>
                <Field label="Country">
                  <DemoInput
                    component={`${COMPONENT}: Country`}
                    name="country"
                    defaultValue="Netherlands"
                  />
                </Field>
              </FormLayout>
            </Fieldset>
          </FormSection>
          <FormSection
            title="Credit"
            description="Checked when the order is placed"
            collapsible
            defaultExpanded={false}
            onExpandedChange={(expanded) => {
              reporter("onExpandedChange")({ value: expanded });
            }}
          >
            <FormLayout columns={columns}>
              <Field
                label="Credit limit"
                message={{
                  text: "Above the usual credit limit",
                  severity: "warning",
                }}
              >
                <DemoInput
                  component={`${COMPONENT}: Credit limit`}
                  name="creditLimit"
                  defaultValue="25000"
                />
              </Field>
              <Field
                label="Tax number"
                message={{
                  text: "Matches the tax register",
                  severity: "success",
                }}
              >
                <DemoInput
                  component={`${COMPONENT}: Tax number`}
                  name="taxNumber"
                  defaultValue="NL001234567B01"
                />
              </Field>
            </FormLayout>
          </FormSection>
          <div className="flex gap-2">
            <button type="submit" className={BUTTON_CLASS}>
              Save
            </button>
            <button type="reset" className={BUTTON_CLASS}>
              Reset
            </button>
          </div>
        </Form>
      </div>
    </DemoSection>
  );
}
