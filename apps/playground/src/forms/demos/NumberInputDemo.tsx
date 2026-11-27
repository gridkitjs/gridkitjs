import {
  NumberInput,
  PercentInput,
  type FieldMessageInput,
  type NumberInputProps,
  type NumberStepEvent,
  type NumberValueType,
  type PercentInputProps,
} from "@gridkitjs/forms";
import { DemoSection } from "../DemoSection";
import { useEventReporter, type ReportedEvent } from "../eventLog";
import { DemoField, DemoGroup } from "./DemoField";

/** Every handler of a number input, reporting to the log under `component`. */
function useNumberHandlers(component: string) {
  const reporter = useEventReporter(component);
  return {
    onFocus: reporter("onFocus"),
    onBeforeInput: reporter("onBeforeInput"),
    onInput: reporter("onInput"),
    onBeforeChange: reporter("onBeforeChange"),
    onChange: reporter("onChange"),
    onValidate: reporter("onValidate"),
    onBeforeCommit: reporter("onBeforeCommit"),
    onCommit: reporter("onCommit"),
    onBlur: reporter("onBlur"),
    onClear: (event: Omit<ReportedEvent, "value" | "text">) => {
      reporter("onClear")({ ...event, value: null, text: "" });
    },
    // The log has no columns for a step's own fields, so its text says them.
    onStep: (event: NumberStepEvent<unknown>) => {
      reporter("onStep")({
        ...event,
        text: `${event.direction} ${event.size} by ${event.via}`,
        source: "step",
      });
    },
  };
}

/** A `NumberInput` reporting all of its events to the log under `component`. */
function LoggedNumberInput<T extends NumberValueType = "number">({
  component,
  ...props
}: NumberInputProps<T> & { readonly component: string }) {
  return <NumberInput<T> {...useNumberHandlers(component)} {...props} />;
}

/** A `PercentInput` reporting all of its events to the log under `component`. */
function LoggedPercentInput<T extends NumberValueType = "number">({
  component,
  ...props
}: PercentInputProps<T> & { readonly component: string }) {
  return <PercentInput<T> {...useNumberHandlers(component)} {...props} />;
}

const SEVERITIES: readonly {
  readonly label: string;
  readonly message: FieldMessageInput;
}[] = [
  { label: "Error border", message: "Above the credit limit" },
  {
    label: "Warning border",
    message: { text: "Above the usual amount", severity: "warning" },
  },
  {
    label: "Info border",
    message: { text: "Copied from the last order", severity: "info" },
  },
  {
    label: "Success border",
    message: { text: "Matches the invoice", severity: "success" },
  },
];

/**
 * `NumberInput` in every state: free and fixed-decimal entry, a currency, a
 * unit and exact decimals, stepping by keys, wheel and buttons in each
 * placement, the negative styles, limits, every severity's border, the
 * modes and each density. Numbers follow the page's locale; the page
 * controls set the density, mode, `readOnly` and `disabled` of every field
 * unless a state fixes one, and every input reports to the log.
 */
export function NumberInputDemo() {
  return (
    <DemoSection
      title="NumberInput"
      description="Plain digits while focused, grouped once it leaves, in the page's locale. Fixed decimals always show while focused: digits go before them, the decimal separator (or the keypad's) jumps into them, and they are typed over. Arrow keys step; PageUp and PageDown take ten steps; Home and End go to a limit that is set."
    >
      <div className="flex flex-col gap-8">
        <DemoGroup title="Typing">
          <DemoField label="Quantity" description="Free entry, any decimals">
            <LoggedNumberInput component="NumberInput: Quantity" />
          </DemoField>
          <DemoField label="Amount" description="Two fixed decimals">
            <LoggedNumberInput
              component="NumberInput: Amount"
              fractionDigits={2}
              clearable
            />
          </DemoField>
          <DemoField label="Price" description="A currency's minor units">
            <LoggedNumberInput
              component="NumberInput: Price"
              currency="EUR"
              defaultValue={1234.5}
            />
          </DemoField>
          <DemoField label="Free decimals" description="decimalEntry free">
            <LoggedNumberInput
              component="NumberInput: Free decimals"
              fractionDigits={2}
              decimalEntry="free"
            />
          </DemoField>
          <DemoField label="Weight" description="A unit, up to three decimals">
            <LoggedNumberInput
              component="NumberInput: Weight"
              unit="kilogram"
              maximumFractionDigits={3}
            />
          </DemoField>
          <DemoField
            label="Rate"
            description="At most two decimals; a third is refused"
          >
            <LoggedNumberInput
              component="NumberInput: Rate"
              maximumFractionDigits={2}
              limitFractionDigits
            />
          </DemoField>
          <DemoField label="Pieces" description="Whole numbers only">
            <LoggedNumberInput component="NumberInput: Pieces" integer />
          </DemoField>
          <DemoField label="Ledger total" description="An exact decimal string">
            <LoggedNumberInput
              component="NumberInput: Ledger total"
              valueType="decimal"
              fractionDigits={2}
              defaultValue="12345678901234567.89"
            />
          </DemoField>
        </DemoGroup>
        <DemoGroup title="Stepping">
          <DemoField label="Stacked buttons" description="0 to 10">
            <LoggedNumberInput
              component="NumberInput: Stacked buttons"
              stepper="end"
              min={0}
              max={10}
              defaultValue={5}
            />
          </DemoField>
          <DemoField label="Split buttons" description="Steps of 0.25">
            <LoggedNumberInput
              component="NumberInput: Split buttons"
              stepper="split"
              step={0.25}
              min={-1}
              max={1}
            />
          </DemoField>
          <DemoField label="Wheel" description="Scroll while focused">
            <LoggedNumberInput
              component="NumberInput: Wheel"
              wheel
              stepper="end"
            />
          </DemoField>
          <DemoField label="No stepping" description="A plain text box">
            <LoggedNumberInput
              component="NumberInput: No stepping"
              stepping="none"
              currency="USD"
            />
          </DemoField>
          <DemoField label="Exact steps" description="0.1 at a time, decimal">
            <LoggedNumberInput
              component="NumberInput: Exact steps"
              valueType="decimal"
              step="0.1"
              defaultValue="0.1"
              stepper="end"
            />
          </DemoField>
          <DemoField label="Start-aligned" description="align start">
            <LoggedNumberInput
              component="NumberInput: Start-aligned"
              align="start"
              stepper="end"
            />
          </DemoField>
        </DemoGroup>
        <DemoGroup title="Negatives">
          <DemoField label="Minus" description="Shown as -1,234.5">
            <LoggedNumberInput
              component="NumberInput: Minus"
              defaultValue={-1234.5}
            />
          </DemoField>
          <DemoField label="Parentheses" description="Shown as (1,234.5)">
            <LoggedNumberInput
              component="NumberInput: Parentheses"
              negative="parentheses"
              defaultValue={-1234.5}
            />
          </DemoField>
          <DemoField label="Trailing minus" description="Shown as 1,234.5-">
            <LoggedNumberInput
              component="NumberInput: Trailing minus"
              negative="trailingMinus"
              defaultValue={-1234.5}
            />
          </DemoField>
          <DemoField
            label="Text keyboard"
            description="inputMode text: iPhone's decimal keypad has no minus"
          >
            <LoggedNumberInput
              component="NumberInput: Text keyboard"
              inputMode="text"
            />
          </DemoField>
        </DemoGroup>
        <DemoGroup title="Limits">
          <DemoField
            label="From 10 to 100"
            description="A message, never a clamp"
          >
            <LoggedNumberInput
              component="NumberInput: From 10 to 100"
              min={10}
              max={100}
              stepper="end"
            />
          </DemoField>
          <DemoField label="Not below zero" description="The minus is refused">
            <LoggedNumberInput
              component="NumberInput: Not below zero"
              min={0}
              required
            />
          </DemoField>
        </DemoGroup>
        <DemoGroup title="Severity borders">
          {SEVERITIES.map(({ label, message }) => (
            <DemoField key={label} label={label} message={message}>
              <LoggedNumberInput
                component={`NumberInput: ${label}`}
                currency="EUR"
                defaultValue={12500}
                stepper="end"
              />
            </DemoField>
          ))}
        </DemoGroup>
        <DemoGroup title="Modes">
          <DemoField label="Shown as text" mode="display">
            <LoggedNumberInput
              component="NumberInput: Shown as text"
              currency="EUR"
              defaultValue={-1234.5}
            />
          </DemoField>
          <DemoField label="Locked" readOnly>
            <LoggedNumberInput
              component="NumberInput: Locked"
              stepper="end"
              defaultValue={42}
            />
          </DemoField>
          <DemoField label="Switched off" disabled>
            <LoggedNumberInput
              component="NumberInput: Switched off"
              stepper="split"
              defaultValue={42}
            />
          </DemoField>
          <DemoField label="Empty, shown as text" mode="display">
            <LoggedNumberInput component="NumberInput: Empty" />
          </DemoField>
        </DemoGroup>
        <DemoGroup title="Each density">
          {(["compact", "standard", "comfortable"] as const).map((density) => (
            <DemoField
              key={density}
              label={`${density.charAt(0).toUpperCase()}${density.slice(1)} box`}
              density={density}
              labelPosition="floating"
            >
              <LoggedNumberInput
                component={`NumberInput: ${density}`}
                stepper="end"
                currency="EUR"
              />
            </DemoField>
          ))}
        </DemoGroup>
      </div>
    </DemoSection>
  );
}

/**
 * `PercentInput` in both scales, with stepping, a fixed decimal and the
 * modes; the percent sign sits where the page's locale puts it.
 */
export function PercentInputDemo() {
  return (
    <DemoSection
      title="PercentInput"
      description="A NumberInput for a percentage: the sign where the locale puts it (before the number in Turkish), and the value stored as a fraction (0.125 for 12.5 %) or as the percent number."
    >
      <div className="flex flex-col gap-8">
        <DemoGroup title="Scales">
          <DemoField label="Discount" description="Stored as a fraction">
            <LoggedPercentInput
              component="PercentInput: Discount"
              defaultValue={0.125}
            />
          </DemoField>
          <DemoField label="VAT" description="Stored as the percent number">
            <LoggedPercentInput
              component="PercentInput: VAT"
              scale="percent"
              defaultValue={20}
            />
          </DemoField>
          <DemoField label="Share" description="One fixed decimal, 0 to 100 %">
            <LoggedPercentInput
              component="PercentInput: Share"
              fractionDigits={1}
              min={0}
              max={1}
              stepper="end"
            />
          </DemoField>
          <DemoField label="Margin" description="Exact, as a decimal string">
            <LoggedPercentInput
              component="PercentInput: Margin"
              valueType="decimal"
              stepper="split"
              defaultValue="0.123"
            />
          </DemoField>
        </DemoGroup>
        <DemoGroup title="Modes">
          <DemoField label="Shown as text" mode="display">
            <LoggedPercentInput
              component="PercentInput: Shown as text"
              defaultValue={0.075}
            />
          </DemoField>
          <DemoField label="Locked" readOnly>
            <LoggedPercentInput
              component="PercentInput: Locked"
              defaultValue={0.2}
              stepper="end"
            />
          </DemoField>
          <DemoField label="Switched off" disabled>
            <LoggedPercentInput
              component="PercentInput: Switched off"
              defaultValue={0.2}
            />
          </DemoField>
          <DemoField label="Out of range" message="Enter 100 % or less">
            <LoggedPercentInput
              component="PercentInput: Out of range"
              defaultValue={1.5}
            />
          </DemoField>
        </DemoGroup>
      </div>
    </DemoSection>
  );
}
