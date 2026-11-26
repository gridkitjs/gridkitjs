import { useState } from "react";
import { SearchInput, type SearchInputProps } from "@gridkitjs/forms";
import { DemoSection } from "../DemoSection";
import { useEventReporter } from "../eventLog";
import { usePlaygroundSettings, type Option } from "../settings";
import { DemoField, DemoGroup } from "./DemoField";
import { Toggle } from "./TextInputDemo";

const CONTROL_CLASS =
  "rounded border border-gridkit-line bg-gridkit-surface px-2 py-1 text-sm text-gridkit-fg";

const DEBOUNCES: readonly Option<string>[] = [
  { value: "0", label: "None" },
  { value: "250", label: "250 ms" },
  { value: "600", label: "600 ms" },
];

/** A `SearchInput` reporting all of its events to the log under `component`. */
function LoggedSearchInput({
  component,
  ...props
}: SearchInputProps & { readonly component: string }) {
  const { settings } = usePlaygroundSettings();
  const reporter = useEventReporter(component);
  return (
    <SearchInput
      locale={settings.locale}
      onFocus={reporter("onFocus")}
      onInput={reporter("onInput")}
      onBeforeChange={reporter("onBeforeChange")}
      onChange={reporter("onChange")}
      onValidate={reporter("onValidate")}
      onBeforeCommit={reporter("onBeforeCommit")}
      onCommit={reporter("onCommit")}
      onBlur={reporter("onBlur")}
      onClear={(event) => {
        reporter("onClear")({ ...event, value: null, text: "" });
      }}
      {...props}
    />
  );
}

/**
 * `SearchInput` with a chosen debounce, so `onInput` and `onChange` can be
 * watched drifting apart in the log, plus a floating label, a loading
 * state, a message and the modes. The page controls apply as everywhere.
 */
export function SearchInputDemo() {
  const [debounce, setDebounce] = useState("250");
  const [loading, setLoading] = useState(false);

  return (
    <DemoSection
      title="SearchInput"
      description="A search box: onInput fires on every key, onChange once typing pauses for the debounce. Enter commits at once, cancelling a pending debounce; Escape clears it."
    >
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end gap-x-5 gap-y-2">
            <label className="flex flex-col gap-1 text-xs font-medium text-gridkit-fg-muted">
              Debounce
              <select
                className={CONTROL_CLASS}
                value={debounce}
                onChange={(event) => {
                  setDebounce(event.target.value);
                }}
              >
                {DEBOUNCES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <Toggle label="Searching" checked={loading} onChange={setLoading} />
          </div>
          <DemoField label="Search orders" className="max-w-sm">
            <LoggedSearchInput
              component="SearchInput"
              debounce={Number(debounce)}
              loading={loading}
            />
          </DemoField>
        </div>
        <DemoGroup title="States">
          <DemoField label="Search customers" labelPosition="floating">
            <LoggedSearchInput component="SearchInput: Search customers" />
          </DemoField>
          <DemoField
            label="Search invoices"
            message={{ text: "No invoice matches", severity: "warning" }}
          >
            <LoggedSearchInput
              component="SearchInput: Search invoices"
              defaultValue="INV-0000"
            />
          </DemoField>
          <DemoField label="Search archive" mode="display">
            <LoggedSearchInput
              component="SearchInput: Search archive"
              defaultValue="2024"
            />
          </DemoField>
          <DemoField label="Search history" disabled>
            <LoggedSearchInput
              component="SearchInput: Search history"
              defaultValue="March"
            />
          </DemoField>
        </DemoGroup>
      </div>
    </DemoSection>
  );
}
