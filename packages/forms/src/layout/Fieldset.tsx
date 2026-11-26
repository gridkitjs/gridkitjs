import { useId, type CSSProperties, type ReactNode } from "react";
import {
  classNames,
  spanClass,
  withLabelWidth,
  type FieldSpan,
} from "../field/parts";
import {
  FormSettingsProvider,
  useResolvedSettings,
  type Density,
  type FieldMode,
  type LabelPosition,
} from "../settings";

export interface FieldsetProps {
  /** Names the fields inside, as a native `<legend>`. */
  readonly legend: ReactNode;
  /** Under the legend, describing the fieldset. */
  readonly description?: ReactNode;
  readonly mode?: FieldMode | undefined;
  readonly density?: Density | undefined;
  readonly labelPosition?: LabelPosition | undefined;
  /** The label column's width for `labelPosition="start"`, as a CSS length. */
  readonly labelWidth?: string | undefined;
  readonly readOnly?: boolean | undefined;
  /** Disables every control inside, natively as well. */
  readonly disabled?: boolean | undefined;
  /** Columns taken in a `FormLayout`. */
  readonly span?: FieldSpan | undefined;
  readonly className?: string | undefined;
  readonly style?: CSSProperties | undefined;
  readonly children?: ReactNode;
}

/**
 * Several fields under a legend, such as a delivery address, with
 * settings for the fields inside. Usually holds a `FormLayout`.
 */
export function Fieldset({
  legend,
  description,
  mode,
  density,
  labelPosition,
  labelWidth,
  readOnly,
  disabled,
  span,
  className,
  style,
  children,
}: FieldsetProps) {
  const settings = useResolvedSettings({
    mode,
    density,
    labelPosition,
    readOnly,
    disabled,
  });
  const descriptionId = useId();
  const hasDescription = description !== undefined && description !== null;
  return (
    <fieldset
      disabled={disabled}
      aria-describedby={hasDescription ? descriptionId : undefined}
      className={classNames(
        "gridkit-forms-fieldset",
        spanClass(span),
        className,
      )}
      style={withLabelWidth(style, labelWidth)}
    >
      <legend className="gridkit-forms-fieldset-legend">{legend}</legend>
      {hasDescription && (
        <p className="gridkit-forms-fieldset-description" id={descriptionId}>
          {description}
        </p>
      )}
      <FormSettingsProvider settings={settings}>
        {children}
      </FormSettingsProvider>
    </fieldset>
  );
}
