import {
  hasError,
  mostSevere,
  toFieldMessages,
  type FieldMessageInput,
} from "@gridkitjs/forms-core";
import {
  useId,
  useMemo,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useSummaryEntry } from "../form/formContext";
import {
  FormSettingsProvider,
  useResolvedSettings,
  type LabelPosition,
  type NecessityIndicator,
} from "../settings";
import {
  FieldContext,
  useControlMessages,
  type FieldContextValue,
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

export interface FieldGroupProps {
  /** Names the group; each input in it needs an `aria-label` of its own. */
  readonly label: ReactNode;
  /** Help text under the inputs, read as part of each one's description. */
  readonly description?: ReactNode;
  /** The app's messages, always shown; a string is an error. */
  readonly message?:
    FieldMessageInput | readonly FieldMessageInput[] | undefined;
  /** Marks the label, and tells every input a value is required. */
  readonly required?: boolean | undefined;
  /** `"floating"` is drawn as `"top"`: the label names no one control. */
  readonly labelPosition?: LabelPosition | undefined;
  /** The label column's width for `labelPosition="start"`, as a CSS length. */
  readonly labelWidth?: string | undefined;
  readonly necessityIndicator?: NecessityIndicator | undefined;
  /** Columns taken in a `FormLayout`. */
  readonly span?: FieldSpan | undefined;
  /** The group's `id`, which a summary link points at; generated without it. */
  readonly id?: string | undefined;
  readonly className?: string | undefined;
  readonly style?: CSSProperties | undefined;
  /** Several inputs, each with its own `aria-label`. */
  readonly children?: ReactNode;
}

function ignoreControlState(): void {
  // A group's label names no one control, so it does not float.
}

/**
 * Several inputs under one label and one message area, such as a postal
 * code and a city: a group the label names, laid out as a field is. Every
 * input is described by the group's description and messages, and lists
 * its own messages in the group's message area.
 */
export function FieldGroup({
  label,
  description,
  message,
  required = false,
  labelPosition,
  labelWidth,
  necessityIndicator,
  span,
  id,
  className,
  style,
  children,
}: FieldGroupProps) {
  const settings = useResolvedSettings({ labelPosition, necessityIndicator });
  const generatedId = useId();
  const groupId = id ?? generatedId;
  const labelId = `${groupId}-label`;
  const descriptionId = `${groupId}-description`;
  const messagesId = `${groupId}-messages`;
  const hasDescription = description !== undefined && description !== null;

  const [controlMessages, setControlMessages] = useControlMessages();
  const shown = useShownMessages(controlMessages, message, settings.disabled);
  const severity = mostSevere(
    shown.map((shownMessage) => shownMessage.severity),
  );
  const describedBy = hasDescription
    ? `${descriptionId} ${messagesId}`
    : messagesId;
  // Only the app's error is the whole group's; an input's is its own.
  const invalid = hasError(toFieldMessages(message, "app"));

  const context = useMemo<FieldContextValue>(
    () => ({
      controlId: null,
      settings,
      describedBy,
      required,
      invalid,
      setControlMessages,
      setControlState: ignoreControlState,
    }),
    [settings, describedBy, required, invalid, setControlMessages],
  );

  const root = useRef<HTMLDivElement>(null);
  useSummaryEntry(groupId, label, shown, root);

  const position =
    settings.labelPosition === "floating" ? "top" : settings.labelPosition;

  return (
    <div
      ref={root}
      id={groupId}
      role="group"
      aria-labelledby={labelId}
      className={classNames(
        "gridkit-forms-field",
        "gridkit-forms-field-group",
        `is-label-${position}`,
        required && "is-required",
        severity !== null && `is-${severity}`,
        settings.disabled && "is-disabled",
        settings.readOnly && "is-readonly",
        settings.mode === "display" && "is-display",
        settings.density !== "standard" && `is-${settings.density}`,
        spanClass(span),
        className,
      )}
      style={withLabelWidth(style, labelWidth)}
    >
      <span
        className={classNames(
          "gridkit-forms-field-label",
          position === "hidden" && "gridkit-forms-sr-only",
        )}
        id={labelId}
      >
        {label}
        <NecessityMarker
          required={required}
          indicator={settings.necessityIndicator}
          strings={settings.messages}
        />
      </span>
      <div className="gridkit-forms-field-control gridkit-forms-field-group-controls">
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
