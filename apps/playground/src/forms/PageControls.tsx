import type { ReactNode } from "react";
import { presets } from "../presets";
import {
  COLOR_SCHEMES,
  DENSITIES,
  FIELD_MODES,
  FLOATING_LABELS,
  LOCALES,
  NECESSITY_INDICATORS,
  usePlaygroundSettings,
  type Option,
} from "./settings";

const PRESETS: readonly Option<string>[] = presets.map((preset) => ({
  value: preset.id,
  label: preset.label,
}));

const CONTROL_CLASS =
  "rounded border border-gridkit-line bg-gridkit-surface px-2 py-1 text-sm text-gridkit-fg focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gridkit-accent";

function Control({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-gridkit-fg-muted">
      {label}
      {children}
    </label>
  );
}

function SelectControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  readonly label: string;
  readonly value: T;
  readonly options: readonly Option<T>[];
  readonly onChange: (value: T) => void;
}) {
  return (
    <Control label={label}>
      <select
        className={CONTROL_CLASS}
        value={value}
        onChange={(event) => {
          const chosen = options.find(
            (option) => option.value === event.target.value,
          );
          if (chosen !== undefined) {
            onChange(chosen.value);
          }
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Control>
  );
}

function CheckboxControl({
  label,
  checked,
  onChange,
}: {
  readonly label: string;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 self-end py-1 text-sm">
      <input
        type="checkbox"
        className="size-4 accent-gridkit-accent"
        checked={checked}
        onChange={(event) => {
          onChange(event.target.checked);
        }}
      />
      {label}
    </label>
  );
}

/** The controls that set how every section on the page draws. */
export function PageControls() {
  const { settings, change } = usePlaygroundSettings();

  return (
    <div
      role="group"
      aria-label="Page controls"
      className="flex flex-wrap items-end gap-x-5 gap-y-3"
    >
      <SelectControl
        label="Preset"
        value={settings.preset}
        options={PRESETS}
        onChange={(preset) => {
          change({ preset });
        }}
      />
      <SelectControl
        label="Colour scheme"
        value={settings.colorScheme}
        options={COLOR_SCHEMES}
        onChange={(colorScheme) => {
          change({ colorScheme });
        }}
      />
      <SelectControl
        label="Density"
        value={settings.density}
        options={DENSITIES}
        onChange={(density) => {
          change({ density });
        }}
      />
      <SelectControl
        label="Mode"
        value={settings.mode}
        options={FIELD_MODES}
        onChange={(mode) => {
          change({ mode });
        }}
      />
      <SelectControl
        label="Marked fields"
        value={settings.necessityIndicator}
        options={NECESSITY_INDICATORS}
        onChange={(necessityIndicator) => {
          change({ necessityIndicator });
        }}
      />
      <SelectControl
        label="Floating label"
        value={settings.floatingLabel}
        options={FLOATING_LABELS}
        onChange={(floatingLabel) => {
          change({ floatingLabel });
        }}
      />
      <SelectControl
        label="Locale"
        value={settings.locale}
        options={LOCALES}
        onChange={(locale) => {
          change({ locale });
        }}
      />
      <CheckboxControl
        label="Right to left"
        checked={settings.direction === "rtl"}
        onChange={(checked) => {
          change({ direction: checked ? "rtl" : "ltr" });
        }}
      />
      <CheckboxControl
        label="Disabled"
        checked={settings.disabled}
        onChange={(disabled) => {
          change({ disabled });
        }}
      />
      <CheckboxControl
        label="Read only"
        checked={settings.readOnly}
        onChange={(readOnly) => {
          change({ readOnly });
        }}
      />
    </div>
  );
}
