import {
  booleanFormatter,
  booleanParser,
  checkedRule,
  CHECKBOX_WORDS,
  SWITCH_WORDS,
  type BooleanWords,
  type FormsMessages,
} from "@gridkitjs/forms-core";
import { useMemo } from "react";
import { useFieldContext } from "../field/fieldContext";
import { classNames } from "../field/parts";
import { useFormSettings } from "../settings";
import {
  densityClass,
  hasNode,
  InputFrame,
  joinIds,
  OwnMessages,
  useOwnMessagesId,
} from "../text/parts";
import {
  useFieldInput,
  validatorsOf,
  type FieldInputKind,
} from "../useFieldInput";
import type { ToggleBaseProps } from "./toggleProps";

/** How each toggle reads, writes and requires its value. */
interface ToggleVariant {
  /** The root class, which every part's class starts with. */
  readonly base: "gridkit-forms-checkbox" | "gridkit-forms-switch";
  readonly kind: FieldInputKind<boolean>;
  /** What `required` says while the value is not `true`. */
  readonly requiredMessage: (messages: FormsMessages) => string;
}

function toggleKind(words: BooleanWords): FieldInputKind<boolean> {
  return {
    defaultParse: booleanParser(words),
    defaultFormat: booleanFormatter(words),
    serialize: (value) => String(value),
  };
}

export const CHECKBOX: ToggleVariant = {
  base: "gridkit-forms-checkbox",
  kind: toggleKind(CHECKBOX_WORDS),
  requiredMessage: (messages) => messages.requiredChecked,
};

export const SWITCH: ToggleVariant = {
  base: "gridkit-forms-switch",
  kind: toggleKind(SWITCH_WORDS),
  requiredMessage: (messages) => messages.requiredOn,
};

function CheckIcon({ mixed }: { readonly mixed: boolean }) {
  return (
    <svg
      className="gridkit-forms-checkbox-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {mixed ? <path d="M6 12h12" /> : <path d="M20 6 9 17l-5-5" />}
    </svg>
  );
}

export interface ToggleInputProps extends ToggleBaseProps<boolean> {
  readonly variant: ToggleVariant;
  /** Checkbox: a flip can set `null`. */
  readonly threeState?: boolean | undefined;
  /** Switch: "On" or "Off" beside the track. */
  readonly showStateLabel?: boolean | undefined;
}

function ToggleControl({
  variant,
  threeState = false,
  showStateLabel = false,
  label,
  labelPlacement = "end",
  defaultValue,
  required,
  validate,
  density,
  autoFocus,
  className,
  style,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  ...props
}: ToggleInputProps) {
  const field = useFieldContext();
  const settings = useFormSettings();
  const needsValue = required === true || field?.required === true;
  const { requiredMessage } = variant;
  const validators = useMemo(
    () => [
      ...(needsValue ? [checkedRule(requiredMessage)] : []),
      ...validatorsOf(validate),
    ],
    [needsValue, requiredMessage, validate],
  );

  const input = useFieldInput(
    {
      ...props,
      defaultValue: defaultValue === undefined ? false : defaultValue,
      required,
      validate: validators,
    },
    variant.kind,
    { toggle: { threeState } },
  );
  const { controlProps, state } = input;
  const { base } = variant;
  const controlId = controlProps.id;
  const ownMessagesId = useOwnMessagesId(controlId);
  const hasLabel = hasNode(label);
  const mixed = base === "gridkit-forms-checkbox" && state.value === null;

  const root = classNames(
    base,
    state.value === true && "is-checked",
    mixed && "is-mixed",
    controlProps.disabled === true && "is-disabled",
    controlProps["aria-readonly"] === true && "is-readonly",
    input.severity !== null && `is-${input.severity}`,
    labelPlacement === "start" && "is-label-start",
    input.mode === "display" && "is-display",
    densityClass(density ?? settings.density),
    className,
  );
  const labelText = hasLabel && (
    <span className={`${base}-label`}>{label}</span>
  );

  if (input.mode === "display") {
    return (
      <div className={root} style={style}>
        {labelText}
        {input.displayValue}
        {input.hiddenInput}
      </div>
    );
  }

  return (
    <>
      <label className={root} style={style}>
        <input
          {...controlProps}
          type="checkbox"
          role={base === "gridkit-forms-switch" ? "switch" : undefined}
          className={`${base}-control`}
          autoFocus={autoFocus}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          aria-describedby={joinIds(
            controlProps["aria-describedby"],
            ownMessagesId,
            ariaDescribedBy,
          )}
        />
        {base === "gridkit-forms-checkbox" ? (
          <span className="gridkit-forms-checkbox-box" aria-hidden="true">
            <CheckIcon mixed={mixed} />
          </span>
        ) : (
          <span className="gridkit-forms-switch-track" aria-hidden="true">
            <span className="gridkit-forms-switch-thumb" />
          </span>
        )}
        {labelText}
        {showStateLabel && (
          <span className="gridkit-forms-switch-state" aria-hidden="true">
            {input.text}
          </span>
        )}
        {input.hiddenInput}
      </label>
      <OwnMessages
        id={`${controlId}-messages`}
        messages={input.messages}
        strings={settings.messages}
        named={
          hasLabel || ariaLabel !== undefined || ariaLabelledBy !== undefined
        }
      />
    </>
  );
}

/**
 * The checkbox and the switch: a native `<input type="checkbox">`, real
 * and focusable, laid transparent over the whole row so the label is part
 * of what a press hits, with the box or track drawn under it. Outside a
 * `Field`, a `description` draws one around it; `label` is always the text
 * beside the control.
 */
export function ToggleInput(props: ToggleInputProps) {
  return (
    <InputFrame
      label={undefined}
      description={props.description}
      id={props.id}
      mode={props.mode}
      density={props.density}
      readOnly={props.readOnly}
      disabled={props.disabled}
    >
      <ToggleControl {...props} />
    </InputFrame>
  );
}
