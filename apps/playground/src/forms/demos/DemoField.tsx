import type { ReactNode } from "react";
import { Field, type FieldProps } from "@gridkitjs/forms";
import { usePlaygroundSettings } from "../settings";

/**
 * A `Field` with the page's density, mode, marked fields, `readOnly` and
 * `disabled`; its own props win.
 */
export function DemoField(props: FieldProps) {
  const { settings } = usePlaygroundSettings();
  return (
    <Field
      density={settings.density}
      mode={settings.mode}
      necessityIndicator={settings.necessityIndicator}
      readOnly={settings.readOnly}
      disabled={settings.disabled}
      {...props}
    />
  );
}

/** A titled grid of states inside a section, two columns where there is room. */
export function DemoGroup({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-gridkit-fg-muted">
        {title}
      </h3>
      <div className="grid max-w-3xl gap-x-6 gap-y-5 sm:grid-cols-2">
        {children}
      </div>
    </div>
  );
}
