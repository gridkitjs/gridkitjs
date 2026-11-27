import {
  maskDetails,
  requiredRule,
  type MaskDetails,
  type MaskOptions,
  type MaskPreset,
  type MaskSource,
  type MaskValueFormat,
} from "@gridkitjs/forms-core";
import { useMemo, type Ref } from "react";
import { useFieldContext } from "../field/fieldContext";
import { classNames } from "../field/parts";
import { useFormSettings } from "../settings";
import {
  ControlBox,
  densityClass,
  hasNode,
  InputFrame,
  joinIds,
  OwnMessages,
  useOwnMessagesId,
} from "../text/parts";
import type { TextInputBaseProps } from "../text/textInputProps";
import { useFieldInput, validatorsOf } from "../useFieldInput";
import {
  firstEmptySlot,
  maskCaret,
  maskKind,
  maskTemplate,
  resolveMask,
} from "./maskKind";

export interface MaskedInputProps
  extends
    TextInputBaseProps<string, HTMLInputElement, MaskDetails>,
    Partial<Pick<MaskOptions, "tokens" | "promptCharacter">> {
  /**
   * A pattern (`"(000) 000-0000"`), several tried in order as the text
   * grows, a function choosing one from the raw text, or a preset from
   * `maskPresets`.
   */
  readonly mask: MaskSource | MaskPreset;
  /**
   * `"raw"` (default): only the characters typed. `"formatted"`: with the
   * literals. A preset sets its own, which this overrides.
   */
  readonly valueFormat?: MaskValueFormat | undefined;
  /** A fixed-width font, so the slots line up down a column of fields. */
  readonly monospace?: boolean | undefined;
  /** Escape puts back the last committed value; on by default. */
  readonly revertOnEscape?: boolean | undefined;
  readonly ref?: Ref<HTMLInputElement> | undefined;
}

function MaskedInputControl({
  mask,
  tokens,
  promptCharacter,
  valueFormat,
  monospace = false,
  revertOnEscape = true,
  required,
  validate,
  loading = false,
  density,
  autoFocus,
  placeholder,
  prefix,
  suffix,
  clearable = false,
  selectOnFocus = false,
  inputMode,
  enterKeyHint,
  autoComplete,
  controlProps: extraControlProps,
  className,
  style,
  ref,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  ...props
}: MaskedInputProps) {
  const field = useFieldContext();
  const formSettings = useFormSettings();
  const settings = field?.settings ?? formSettings;
  const locale = props.locale ?? settings.locale;
  const needsValue = required === true || field?.required === true;

  const resolved = useMemo(
    () => resolveMask(mask, { tokens, promptCharacter, valueFormat }, locale),
    [mask, tokens, promptCharacter, valueFormat, locale],
  );
  const { options } = resolved;
  const kind = useMemo(
    () => maskKind(options, resolved.valueFormat),
    [options, resolved.valueFormat],
  );
  const validators = useMemo(
    () => [
      ...(needsValue ? [requiredRule<string>()] : []),
      ...(resolved.validate === undefined ? [] : [resolved.validate]),
      ...validatorsOf(validate),
    ],
    [needsValue, resolved.validate, validate],
  );

  const input = useFieldInput(
    { ...props, required, validate: validators, ref },
    kind,
    {
      startAdornment: hasNode(prefix),
      selectOnFocus,
      escape: revertOnEscape ? "revert" : "none",
      mapCaret: options === null ? undefined : maskCaret(options),
      lastCaret:
        options === null
          ? undefined
          : (text: string) => firstEmptySlot(options, text),
    },
  );
  const { controlProps } = input;
  const strings = settings.messages;
  const resolvedDensity = density ?? settings.density;
  const controlId = controlProps.id;
  const prefixId = `${controlId}-prefix`;
  const suffixId = `${controlId}-suffix`;
  const ownMessagesId = useOwnMessagesId(controlId);
  const editable = !controlProps.readOnly && !controlProps.disabled;
  const root = classNames(
    "gridkit-forms-masked-input",
    monospace && "is-monospace",
    densityClass(resolvedDensity),
    className,
  );

  if (input.mode === "display") {
    return (
      <div className={root} style={style}>
        {input.displayValue}
        {input.hiddenInput}
      </div>
    );
  }

  // While focused an empty field shows the template, which is not text to clear.
  const typed =
    options === null ? input.text : maskDetails(options, input.text).raw;

  return (
    <div className={root} style={style}>
      <ControlBox
        severity={input.severity}
        disabled={controlProps.disabled === true}
        readOnly={controlProps.readOnly === true}
        loading={loading}
        density={resolvedDensity}
        prefix={prefix}
        prefixId={prefixId}
        suffix={suffix}
        suffixId={suffixId}
        clear={
          clearable && editable && typed !== ""
            ? {
                label: strings.clear,
                onClear: (event) => {
                  input.clear(event.nativeEvent);
                },
              }
            : null
        }
      >
        <input
          autoCapitalize={resolved.upperCase ? "characters" : undefined}
          autoCorrect="off"
          spellCheck={false}
          {...extraControlProps}
          {...controlProps}
          className="gridkit-forms-masked-input-control"
          type="text"
          dir="ltr"
          placeholder={
            placeholder ??
            (options === null ? undefined : maskTemplate(options))
          }
          autoFocus={autoFocus}
          inputMode={inputMode ?? resolved.inputMode}
          enterKeyHint={enterKeyHint}
          autoComplete={autoComplete ?? resolved.autoComplete ?? "off"}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          aria-describedby={joinIds(
            hasNode(prefix) && prefixId,
            hasNode(suffix) && suffixId,
            controlProps["aria-describedby"],
            ownMessagesId,
            ariaDescribedBy,
          )}
          aria-busy={loading || undefined}
        />
      </ControlBox>
      {input.hiddenInput}
      <OwnMessages
        id={`${controlId}-messages`}
        messages={input.messages}
        strings={strings}
        named={ariaLabel !== undefined || ariaLabelledBy !== undefined}
      />
    </div>
  );
}

/**
 * A text field laid into a mask: postal codes, IBANs, card numbers, part
 * numbers. Typing fills the mask's slots and skips its literals, a paste
 * keeps what fits, and text an input method composed is laid in once it
 * ends. While focused the empty slots show the prompt character; without
 * focus, the text typed with its literals. The value is a string, the raw
 * characters or (`valueFormat="formatted"`) the text with its literals,
 * only once the mask is complete, and `null` when empty: incomplete text
 * is unreadable and keeps the last complete value. Presets bring their
 * pattern, check, keyboard and value format. It takes every shared input
 * prop: display mode, `readOnly`, `disabled`, messages with their
 * severity, density, prefix and suffix, and the events of
 * `@gridkitjs/forms` with `MaskDetails`.
 *
 * Inside a `Field` it takes the field's label, description and messages;
 * outside one, `label` and `description` draw a `Field` around it.
 */
export function MaskedInput(props: MaskedInputProps) {
  return (
    <InputFrame
      label={props.label}
      description={props.description}
      id={props.id}
      mode={props.mode}
      density={props.density}
      readOnly={props.readOnly}
      disabled={props.disabled}
    >
      <MaskedInputControl {...props} />
    </InputFrame>
  );
}
