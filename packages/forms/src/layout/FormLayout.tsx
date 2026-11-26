import type { CSSProperties, ReactNode } from "react";
import { classNames, withLabelWidth } from "../field/parts";
import {
  FormSettingsProvider,
  useResolvedSettings,
  type Density,
  type LabelPosition,
} from "../settings";

export interface FormLayoutProps {
  /** The most columns it lays fields out in; fewer as it narrows. */
  readonly columns?: 1 | 2 | 3 | 4 | undefined;
  readonly labelPosition?: LabelPosition | undefined;
  /** The label column's width for `labelPosition="start"`, as a CSS length. */
  readonly labelWidth?: string | undefined;
  readonly density?: Density | undefined;
  readonly className?: string | undefined;
  readonly style?: CSSProperties | undefined;
  /** Fields, groups and fieldsets, each taking its `span` of columns. */
  readonly children?: ReactNode;
}

/**
 * Lays fields out in up to four columns, which drop to fewer as the layout
 * itself narrows: one below 32rem, at most two below 48rem, at most three
 * below 64rem. A field's `span` never takes more columns than the layout
 * has at its width, and start labels stack on top below 30rem. The columns
 * follow the writing direction.
 */
export function FormLayout({
  columns = 1,
  labelPosition,
  labelWidth,
  density,
  className,
  style,
  children,
}: FormLayoutProps) {
  const settings = useResolvedSettings({ labelPosition, density });
  return (
    <div
      className={classNames(
        "gridkit-forms-layout",
        columns !== 1 && `is-columns-${String(columns)}`,
        className,
      )}
      style={withLabelWidth(style, labelWidth)}
    >
      {/* The columns respond to the outer element's width, which a
          container query cannot read from the grid itself. */}
      <div className="gridkit-forms-layout-grid">
        <FormSettingsProvider settings={settings}>
          {children}
        </FormSettingsProvider>
      </div>
    </div>
  );
}
