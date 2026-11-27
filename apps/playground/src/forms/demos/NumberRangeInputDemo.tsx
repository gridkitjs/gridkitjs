import {
  NumberRangeInput,
  type FieldMessageInput,
  type NumberRangeInputProps,
} from "@gridkitjs/forms";
import { DemoSection } from "../DemoSection";
import { useEventReporter, type ReportedEvent } from "../eventLog";
import { DemoField, DemoGroup } from "./DemoField";

/** An event as the log takes it, with the end it is about after its source. */
function withEnd(
  event: ReportedEvent & { readonly changedEnd?: string | null },
): ReportedEvent {
  const { changedEnd, source } = event;
  return changedEnd === undefined || source === undefined
    ? event
    : { ...event, source: `${source}, end: ${changedEnd ?? "none"}` };
}

/** A `NumberRangeInput` reporting all of its events to the log under `component`. */
function LoggedRangeInput({
  component,
  ...props
}: NumberRangeInputProps & { readonly component: string }) {
  const reporter = useEventReporter(component);
  const report =
    (name: string) =>
    (event: ReportedEvent & { readonly changedEnd?: string | null }) => {
      reporter(name)(withEnd(event));
    };
  return (
    <NumberRangeInput
      onFocus={report("onFocus")}
      onBeforeInput={report("onBeforeInput")}
      onInput={report("onInput")}
      onBeforeChange={report("onBeforeChange")}
      onChange={report("onChange")}
      onValidate={report("onValidate")}
      onBeforeCommit={report("onBeforeCommit")}
      onCommit={report("onCommit")}
      onBlur={report("onBlur")}
      onClear={(event) => {
        reporter("onClear")({ ...event, value: null, text: "" });
      }}
      {...props}
    />
  );
}

const SEVERITIES: readonly {
  readonly label: string;
  readonly message: FieldMessageInput;
}[] = [
  { label: "Range error border", message: "Outside the price list" },
  {
    label: "Range warning border",
    message: { text: "Wider than usual", severity: "warning" },
  },
  {
    label: "Range info border",
    message: { text: "Copied from the last search", severity: "info" },
  },
  {
    label: "Range success border",
    message: { text: "Matches the catalogue", severity: "success" },
  },
];

/**
 * `NumberRangeInput` in every state: open ends, reversed entry swapped or
 * refused, span limits with the span shown, fixed decimals on both ends,
 * half-open bounds, every severity's border and the modes. Numbers follow
 * the page's locale; the page controls set the density, mode, `readOnly`
 * and `disabled` of every field unless a state fixes one, and every input
 * reports to the log, the end each event is about after its source.
 */
export function NumberRangeInputDemo() {
  return (
    <DemoSection
      title="NumberRangeInput"
      description="Two number fields under one label, holding one range. Either end may stay empty. An end typed before its start swaps (the texts change places on leaving) or shows an error. Tab moves between the ends; the range commits once when focus leaves both, or on Enter. Arrow keys step each end and stop at the other."
    >
      <div className="flex flex-col gap-8">
        <DemoGroup title="Entry">
          <DemoField label="Price range" description="Open ends allowed">
            <LoggedRangeInput component="NumberRangeInput: Price" clearable />
          </DemoField>
          <DemoField
            label="Budget range"
            description="Two fixed decimals, in euros"
          >
            <LoggedRangeInput
              component="NumberRangeInput: Budget"
              currency="EUR"
              defaultValue={{ start: 100, end: 2500 }}
            />
          </DemoField>
          <DemoField label="Weight range" description="Two fixed decimals">
            <LoggedRangeInput
              component="NumberRangeInput: Weight"
              fractionDigits={2}
            />
          </DemoField>
          <DemoField label="Age range" description="Whole numbers">
            <LoggedRangeInput component="NumberRangeInput: Years" integer />
          </DemoField>
        </DemoGroup>
        <DemoGroup title="Reversed entry">
          <DemoField
            label="Swapped range"
            description='reversed="swap", the default'
          >
            <LoggedRangeInput component="NumberRangeInput: Swapped" />
          </DemoField>
          <DemoField label="Refused range" description='reversed="error"'>
            <LoggedRangeInput
              component="NumberRangeInput: Refused"
              reversed="error"
            />
          </DemoField>
        </DemoGroup>
        <DemoGroup title="Limits and span">
          <DemoField
            label="Order size range"
            description="0 to 1,000; spans 10 to 500, shown"
          >
            <LoggedRangeInput
              component="NumberRangeInput: Order size"
              min={0}
              max={1000}
              minSpan={10}
              maxSpan={500}
              showSpan
              defaultValue={{ start: 10, end: 50 }}
            />
          </DemoField>
          <DemoField
            label="Half-open range"
            description='bounds="[)": the end is left out, so 10–10 is empty'
          >
            <LoggedRangeInput
              component="NumberRangeInput: Half-open"
              bounds="[)"
              showSpan
            />
          </DemoField>
          <DemoField label="Required range" required>
            <LoggedRangeInput component="NumberRangeInput: Required" />
          </DemoField>
        </DemoGroup>
        <DemoGroup title="Severity borders">
          {SEVERITIES.map(({ label, message }) => (
            <DemoField key={label} label={label} message={message}>
              <LoggedRangeInput
                component={`NumberRangeInput: ${label}`}
                defaultValue={{ start: 5, end: 15 }}
              />
            </DemoField>
          ))}
        </DemoGroup>
        <DemoGroup title="Modes">
          <DemoField label="Range shown as text" mode="display">
            <LoggedRangeInput
              component="NumberRangeInput: Shown as text"
              currency="EUR"
              defaultValue={{ start: 10, end: 20 }}
            />
          </DemoField>
          <DemoField label="Open end, shown as text" mode="display">
            <LoggedRangeInput
              component="NumberRangeInput: From"
              defaultValue={{ start: 10, end: null }}
            />
          </DemoField>
          <DemoField label="Open start, shown as text" mode="display">
            <LoggedRangeInput
              component="NumberRangeInput: Up to"
              defaultValue={{ start: null, end: 20 }}
            />
          </DemoField>
          <DemoField label="Empty range, shown as text" mode="display">
            <LoggedRangeInput component="NumberRangeInput: Empty" />
          </DemoField>
          <DemoField label="Locked range" readOnly>
            <LoggedRangeInput
              component="NumberRangeInput: Locked"
              defaultValue={{ start: 1, end: 9 }}
            />
          </DemoField>
          <DemoField label="Switched-off range" disabled>
            <LoggedRangeInput
              component="NumberRangeInput: Switched off"
              defaultValue={{ start: 1, end: 9 }}
            />
          </DemoField>
        </DemoGroup>
      </div>
    </DemoSection>
  );
}
