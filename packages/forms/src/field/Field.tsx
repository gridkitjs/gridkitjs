import { mostSevere, type FieldMessageInput } from "@gridkitjs/forms-core";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { warnOnce } from "../dev";
import { useSummaryEntry } from "../form/formContext";
import {
  FormSettingsProvider,
  useResolvedSettings,
  type Density,
  type FieldMode,
  type LabelPosition,
  type NecessityIndicator,
} from "../settings";
import {
  FieldContext,
  useControlMessages,
  type FieldContextValue,
  type FieldControlState,
} from "./fieldContext";
import { FieldMessages } from "./FieldMessages";
import {
  classNames,
  NecessityMarker,
  spanClass,
  useShownMessages,
  withLabelWidth,
  type FieldSpan,
} from "./parts";

export interface FieldProps {
  /**
   * Names the input. Leave it out only when the input has an `aria-label`;
   * `labelPosition="hidden"` keeps a label out of sight.
   */
  readonly label?: ReactNode;
  /** Help text under the control, read as part of its description. */
  readonly description?: ReactNode;
  /** The app's messages, always shown; a string is an error. */
  readonly message?:
    FieldMessageInput | readonly FieldMessageInput[] | undefined;
  /** Marks the label, and tells the input a value is required. */
  readonly required?: boolean | undefined;
  readonly labelPosition?: LabelPosition | undefined;
  /** The label column's width for `labelPosition="start"`, as a CSS length. */
  readonly labelWidth?: string | undefined;
  readonly necessityIndicator?: NecessityIndicator | undefined;
  readonly density?: Density | undefined;
  readonly mode?: FieldMode | undefined;
  readonly readOnly?: boolean | undefined;
  readonly disabled?: boolean | undefined;
  /** Columns taken in a `FormLayout`. */
  readonly span?: FieldSpan | undefined;
  /** The control's `id`; one is generated without it. */
  readonly id?: string | undefined;
  /** On the field's root. */
  readonly className?: string | undefined;
  readonly style?: CSSProperties | undefined;
  /** One input: a forms input, or the app's own through `useField`. */
  readonly children?: ReactNode;
}

/** Whether a floating label sits above the control rather than inside it. */
function isRaised(state: FieldControlState | null, mode: FieldMode): boolean {
  if (mode === "display") {
    return true;
  }
  return (
    state !== null &&
    (state.focused || !state.empty || state.startAdornment === true)
  );
}

/**
 * One input with its label, required or optional marker, description and
 * messages, wired to it for assistive technology: the label names the
 * control, the description and messages describe it, and `aria-invalid`
 * and `aria-required` follow the field. The input reads all of it from
 * context, so an app's own input gets the same through `useField`.
 *
 * The messages shown are the app's (`message`) and the input's own shown
 * ones, most serious first; the most serious sets the field's severity
 * class. A disabled field shows only the app's. Inside a `Form` they are
 * listed in its `MessageSummary`.
 */
export function Field({
  label,
  description,
  message,
  required = false,
  labelPosition,
  labelWidth,
  necessityIndicator,
  density,
  mode,
  readOnly,
  disabled,
  span,
  id,
  className,
  style,
  children,
}: FieldProps) {
  const settings = useResolvedSettings({
    mode,
    density,
    labelPosition,
    necessityIndicator,
    readOnly,
    disabled,
  });
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const labelId = `${controlId}-label`;
  const descriptionId = `${controlId}-description`;
  const messagesId = `${controlId}-messages`;
  const hasLabel = label !== undefined && label !== null;
  const hasDescription = description !== undefined && description !== null;

  const [controlMessages, setControlMessages] = useControlMessages();
  const [controlState, setControlState] = useState<FieldControlState | null>(
    null,
  );
  const shown = useShownMessages(controlMessages, message, settings.disabled);
  const severity = mostSevere(
    shown.map((shownMessage) => shownMessage.severity),
  );
  const describedBy = hasDescription
    ? `${descriptionId} ${messagesId}`
    : messagesId;

  const context = useMemo<FieldContextValue>(
    () => ({
      controlId,
      settings,
      describedBy,
      required,
      invalid: severity === "error",
      severity,
      setControlMessages,
      setControlState,
    }),
    [controlId, settings, describedBy, required, severity, setControlMessages],
  );

  // Marked when either the field or its input asks for a value.
  const marked = required || controlState?.required === true;
  const display = settings.mode === "display";
  const position = settings.labelPosition;
  const raised =
    position === "floating" && isRaised(controlState, settings.mode);

  const root = useRef<HTMLDivElement>(null);
  useSummaryEntry(controlId, hasLabel ? label : null, shown, root);
  useEffect(() => {
    if (hasLabel || display) {
      return;
    }
    const control = root.current?.ownerDocument.getElementById(controlId);
    if (
      control !== null &&
      control !== undefined &&
      !control.hasAttribute("aria-label") &&
      !control.hasAttribute("aria-labelledby")
    ) {
      warnOnce(
        "field-label",
        'A Field has no label and its input no aria-label, so the input has no name. Give the Field a label (labelPosition="hidden" keeps it out of sight) or the input an aria-label.',
      );
    }
  }, [hasLabel, display, controlId]);

  const marker = (
    <NecessityMarker
      required={marked}
      indicator={settings.necessityIndicator}
      strings={settings.messages}
    />
  );
  const labelClass = classNames(
    "gridkit-forms-field-label",
    position === "hidden" && "gridkit-forms-sr-only",
  );
  // In display mode there is no control for a <label> to point at.
  const labelElement = !hasLabel ? null : display ? (
    <span className={labelClass} id={labelId}>
      {label}
      {marker}
    </span>
  ) : (
    <label className={labelClass} id={labelId} htmlFor={controlId}>
      {label}
      {marker}
    </label>
  );
  const labelInside = position === "floating" && !display;

  return (
    <div
      ref={root}
      className={classNames(
        "gridkit-forms-field",
        `is-label-${position}`,
        raised && "is-label-raised",
        marked && "is-required",
        severity !== null && `is-${severity}`,
        settings.disabled && "is-disabled",
        settings.readOnly && "is-readonly",
        display && "is-display",
        settings.density !== "standard" && `is-${settings.density}`,
        spanClass(span),
        className,
      )}
      style={withLabelWidth(style, labelWidth)}
      role={display && hasLabel ? "group" : undefined}
      aria-labelledby={display && hasLabel ? labelId : undefined}
      aria-describedby={display ? describedBy : undefined}
    >
      {!labelInside && labelElement}
      <div className="gridkit-forms-field-control">
        {labelInside && labelElement}
        <FormSettingsProvider settings={settings}>
          <FieldContext value={context}>{children}</FieldContext>
        </FormSettingsProvider>
      </div>
      {hasDescription && (
        <p className="gridkit-forms-field-description" id={descriptionId}>
          {description}
        </p>
      )}
      <FieldMessages
        id={messagesId}
        messages={shown}
        strings={settings.messages}
      />
    </div>
  );
}
