import {
  compareDecimals,
  filterNumberEdit,
  formatNumber,
  maxRule,
  minRule,
  normalizeDecimal,
  numberAffixes,
  numberCaret,
  numberDetails,
  numberFormatter,
  numberParser,
  numberSymbols,
  numberToDecimal,
  requiredRule,
  shiftDecimal,
  stepNumberValue,
  type ChangeCause,
  type DecimalString,
  type NegativeStyle,
  type NumberDetails,
  type NumberOptions,
  type NumberReadingInfo,
  type NumberValue,
  type NumberValueType,
  type PercentScale,
  type RoundingMode,
  type StepDirection,
  type StepSize,
} from "@gridkitjs/forms-core";
import {
  attachHoldRepeat,
  attachStepKeys,
  type AttachedHoldRepeat,
  type AttachedStepKeys,
  type HoldRepeatOptions,
  type StepKeysOptions,
} from "@gridkitjs/forms-dom";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from "react";
import { warnOnce } from "../dev";
import { DisplayValue } from "../DisplayValue";
import { useFieldContext } from "../field/fieldContext";
import { classNames } from "../field/parts";
import { useFormSettings } from "../settings";
import {
  ControlBox,
  densityClass,
  hasNode,
  InputFrame,
  joinIds,
  keepFocus,
  OwnMessages,
  useControlElement,
  useOwnMessagesId,
} from "../text/parts";
import type { TextInputBaseProps } from "../text/textInputProps";
import {
  isFocused,
  useFieldInput,
  validatorsOf,
  type FieldInputKind,
} from "../useFieldInput";

/** A limit or step: a number, or in decimal mode also an exact decimal string. */
export type NumberLimit<T extends NumberValueType> = T extends "decimal"
  ? number | DecimalString
  : number;

/** onStep: a step is about to be taken. The change events follow, and may still refuse it. */
export interface NumberStepEvent<V> {
  readonly direction: StepDirection;
  readonly size: StepSize;
  readonly via: "key" | "button" | "wheel";
  /** The value the step goes to. */
  readonly value: V | null;
  readonly previousValue: V | null;
  readonly nativeEvent: Event | null;
}

export interface NumberInputProps<
  T extends NumberValueType = "number",
> extends TextInputBaseProps<NumberValue<T>, HTMLInputElement, NumberDetails> {
  /** `"number"` (default): a JS number. `"decimal"`: an exact decimal string (`"1234.50"`). */
  readonly valueType?: T | undefined;
  /** Fixed decimals: shown and kept, and typed in place. Sets both the minimum and the maximum. */
  readonly fractionDigits?: number | undefined;
  /** Fraction digits always written; 0 by default (a currency: its minor units). */
  readonly minimumFractionDigits?: number | undefined;
  /** Fraction digits kept; more are rounded. Unset: every digit typed is kept. */
  readonly maximumFractionDigits?: number | undefined;
  /** Whole numbers only: no decimal separator, a numeric keyboard. */
  readonly integer?: boolean | undefined;
  /** `"halfExpand"` (ties away from zero) by default; Intl's names. */
  readonly roundingMode?: RoundingMode | undefined;
  /** Refuses a keystroke that would type more fraction digits than allowed, instead of rounding. */
  readonly limitFractionDigits?: boolean | undefined;
  /**
   * With fixed decimals, `"fixed"` (default) shows them while typing, the
   * decimal separator jumps into them and they are typed over; `"free"`
   * types them as any other field does.
   */
  readonly decimalEntry?: "fixed" | "free" | undefined;
  /** Group the integer digits when the field does not have focus. On by default. */
  readonly useGrouping?: boolean | undefined;
  /** How a negative number is shown without focus: `"minus"` (default), `"parentheses"`, `"trailingMinus"`. */
  readonly negative?: NegativeStyle | undefined;
  readonly decimalSeparator?: string | undefined;
  readonly groupSeparator?: string | undefined;
  readonly groupSizes?:
    readonly [primary: number, secondary: number] | undefined;
  /** The digits the field writes: `"latn"` keeps Latin digits in `ar-EG`. */
  readonly numberingSystem?: string | undefined;
  /** ISO 4217 code; its sign is drawn beside the number, where the locale puts it. */
  readonly currency?: string | undefined;
  readonly currencyDisplay?: NumberOptions["currencyDisplay"];
  /** An Intl unit (`"kilogram"`), drawn beside the number. */
  readonly unit?: string | undefined;
  readonly unitDisplay?: NumberOptions["unitDisplay"];
  readonly min?: NumberLimit<T> | undefined;
  readonly max?: NumberLimit<T> | undefined;
  /** What the arrow keys and the stepper add; 1 by default. */
  readonly step?: NumberLimit<T> | undefined;
  /** What PageUp and PageDown add; ten steps by default. */
  readonly largeStep?: NumberLimit<T> | undefined;
  /** `"keys"` (default): a spinbutton the arrow keys step. `"none"`: a plain text box. */
  readonly stepping?: "keys" | "none" | undefined;
  /** Stepper buttons: none (default), stacked at the end, or one at each end. */
  readonly stepper?: "none" | "end" | "split" | undefined;
  /** The mouse wheel steps while the field has focus. Off by default. */
  readonly wheel?: boolean | undefined;
  /** Refuses keys that cannot be part of a number and cleans pastes. On by default. */
  readonly cleanInput?: boolean | undefined;
  /** Where the number sits in the box: the end (default) or the start. */
  readonly align?: "start" | "end" | undefined;
  /** Escape puts back the last committed value; on by default. */
  readonly revertOnEscape?: boolean | undefined;
  readonly onStep?:
    ((event: NumberStepEvent<NumberValue<T>>) => void) | undefined;
  readonly ref?: Ref<HTMLInputElement> | undefined;
}

/** What `PercentInput` adds to the shared number control. */
export interface NumberVariant {
  /** Set for a percent: how its value is scaled. */
  readonly percentScale?: PercentScale | undefined;
  /** The root's classes. */
  readonly rootClassName: string;
}

function toDecimal(value: number | string): DecimalString {
  return typeof value === "number"
    ? numberToDecimal(value)
    : (normalizeDecimal(value) ?? value);
}

/** Whether two numbers are the same, compared exactly. */
function sameNumber(a: number | string, b: number | string): boolean {
  return compareDecimals(toDecimal(a), toDecimal(b)) === 0;
}

const supported = new Map<string, boolean>();

/** Whether Intl knows the currency code or unit; a dev warning otherwise. */
function isSupported(style: "currency" | "unit", code: string): boolean {
  const key = `${style}:${code}`;
  let known = supported.get(key);
  if (known === undefined) {
    try {
      new Intl.NumberFormat("en", { style, [style]: code });
      known = true;
    } catch {
      known = false;
      warnOnce(
        key,
        `NumberInput: ${style} "${code}" is not one Intl knows, so it is ignored.`,
      );
    }
    supported.set(key, known);
  }
  return known;
}

/** The style a number field writes in: a percent, else a currency (which wins over a unit), else a unit. */
function numberStyle(
  percentScale: PercentScale | undefined,
  currency: string | undefined,
  unit: string | undefined,
): NumberOptions["style"] {
  if (percentScale !== undefined) {
    return "percent";
  }
  if (currency !== undefined && unit !== undefined) {
    warnOnce(
      "number-currency-unit",
      "NumberInput: both currency and unit are set; the currency is shown.",
    );
  }
  if (currency !== undefined && isSupported("currency", currency)) {
    return "currency";
  }
  if (unit !== undefined && isSupported("unit", unit)) {
    return "unit";
  }
  return "decimal";
}

/** Options to attach with, before a render's own reach them. */
const NO_REPEAT: HoldRepeatOptions = { onRepeat: () => false };
const NO_STEP_KEYS: StepKeysOptions = { onStep: () => undefined };

function ChevronIcon({ direction }: { readonly direction: StepDirection }) {
  return (
    <svg
      className="gridkit-forms-stepper-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={direction === "up" ? "m6 15 6-6 6 6" : "m6 9 6 6 6-6"} />
    </svg>
  );
}

/**
 * One stepper button: it steps once when pressed and repeats while held
 * (forms-dom's `attachHoldRepeat`), and a hold ends when the control loses
 * focus. At a limit, or in a read-only field, it is drawn disabled but
 * stays pressable, so a held pointer is never lost.
 */
function StepperButton({
  direction,
  label,
  controlId,
  inactive,
  disabled,
  focused,
  onRepeat,
}: {
  readonly direction: StepDirection;
  readonly label: string;
  readonly controlId: string;
  /** At a limit, or read-only: drawn disabled. */
  readonly inactive: boolean;
  /** The field is disabled. */
  readonly disabled: boolean;
  /** The control has focus. */
  readonly focused: boolean;
  readonly onRepeat: (nativeEvent: PointerEvent) => boolean;
}) {
  const [button, setButton] = useState<HTMLButtonElement | null>(null);
  const hold = useRef<AttachedHoldRepeat | null>(null);
  useLayoutEffect(() => {
    if (button === null) {
      return undefined;
    }
    const attached = attachHoldRepeat(button, NO_REPEAT);
    hold.current = attached;
    return () => {
      attached.detach();
      hold.current = null;
    };
  }, [button]);
  // Every render's step, the attaching render's included: this effect runs
  // straight after the one above, before any press can arrive.
  useLayoutEffect(() => {
    hold.current?.setOptions({ onRepeat });
  });
  useEffect(() => {
    if (!focused) {
      hold.current?.cancel();
    }
  }, [focused]);

  return (
    <button
      ref={setButton}
      type="button"
      className={classNames(
        "gridkit-forms-stepper-button",
        direction === "up" ? "is-increment" : "is-decrement",
        (inactive || disabled) && "is-disabled",
      )}
      tabIndex={-1}
      aria-label={label}
      aria-controls={controlId}
      aria-disabled={inactive || undefined}
      disabled={disabled}
      onMouseDown={keepFocus}
    >
      <ChevronIcon direction={direction} />
    </button>
  );
}

/** The number control `NumberInput` and `PercentInput` share. */
export function NumberControl<T extends NumberValueType = "number">({
  percentScale,
  rootClassName,
  valueType,
  fractionDigits,
  minimumFractionDigits,
  maximumFractionDigits,
  integer = false,
  roundingMode,
  limitFractionDigits,
  decimalEntry,
  useGrouping,
  negative,
  decimalSeparator,
  groupSeparator,
  groupSizes,
  numberingSystem,
  currency,
  currencyDisplay,
  unit,
  unitDisplay,
  min,
  max,
  step,
  largeStep,
  stepping = "keys",
  stepper = "none",
  wheel = false,
  cleanInput = true,
  align = "end",
  revertOnEscape = true,
  onStep,
  required,
  validate,
  loading = false,
  density,
  autoFocus,
  placeholder,
  prefix,
  suffix,
  clearable = false,
  selectOnFocus = true,
  inputMode,
  enterKeyHint,
  autoComplete = "off",
  controlProps: extraControlProps,
  className,
  style,
  ref,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  ...props
}: NumberInputProps<T> & NumberVariant) {
  type V = NumberValue<T>;
  const field = useFieldContext();
  const formSettings = useFormSettings();
  const settings = field?.settings ?? formSettings;
  const locale = props.locale ?? settings.locale;
  const needsValue = required === true || field?.required === true;
  const resolvedStyle = numberStyle(percentScale, currency, unit);

  const numberOptions = useMemo<NumberOptions>(
    () => ({
      locale,
      style: resolvedStyle,
      currency,
      currencyDisplay,
      unit,
      unitDisplay,
      minimumFractionDigits: integer
        ? 0
        : (fractionDigits ?? minimumFractionDigits),
      maximumFractionDigits: integer
        ? 0
        : (fractionDigits ?? maximumFractionDigits),
      roundingMode,
      useGrouping,
      negative,
      percentScale,
      decimalSeparator,
      groupSeparator,
      groupSizes,
      numberingSystem,
    }),
    [
      locale,
      resolvedStyle,
      currency,
      currencyDisplay,
      unit,
      unitDisplay,
      integer,
      fractionDigits,
      minimumFractionDigits,
      maximumFractionDigits,
      roundingMode,
      useGrouping,
      negative,
      percentScale,
      decimalSeparator,
      groupSeparator,
      groupSizes,
      numberingSystem,
    ],
  );
  const symbols = numberSymbols(locale, numberOptions);
  const negatives =
    min === undefined || compareDecimals(toDecimal(min), "0") < 0;

  useEffect(() => {
    if (
      min !== undefined &&
      max !== undefined &&
      compareDecimals(toDecimal(min), toDecimal(max)) > 0
    ) {
      warnOnce(
        "number-min-max",
        "NumberInput: min is above max, so no value can satisfy both.",
      );
    }
  }, [min, max]);

  // How clean-up read the paste on screen, until the next edit.
  const pasted = useRef<NumberReadingInfo | null>(null);
  const kind = useMemo<FieldInputKind<V, NumberDetails>>(
    () => ({
      defaultParse: numberParser<T>({ ...numberOptions, valueType }),
      defaultFormat: numberFormatter<V>(numberOptions),
      serialize: (value) => toDecimal(value),
      equals: sameNumber,
      details: (current) =>
        numberDetails(current, numberOptions, pasted.current),
      filterInput: cleanInput
        ? (edit, before) => {
            const result = filterNumberEdit(edit, before, {
              ...numberOptions,
              negatives,
              limitFractionDigits,
              decimalEntry,
            });
            pasted.current = result.pasted;
            return result.decision;
          }
        : undefined,
    }),
    [
      numberOptions,
      valueType,
      cleanInput,
      negatives,
      limitFractionDigits,
      decimalEntry,
    ],
  );
  const validators = useMemo(
    () => [
      ...(needsValue ? [requiredRule<V>()] : []),
      ...(min === undefined ? [] : [minRule<V>(min, numberOptions)]),
      ...(max === undefined ? [] : [maxRule<V>(max, numberOptions)]),
      ...validatorsOf(validate),
    ],
    [needsValue, min, max, numberOptions, validate],
  );
  const mapCaret = useMemo(() => numberCaret(numberOptions), [numberOptions]);
  const affixes = numberAffixes(numberOptions);

  const [element, controlRef] = useControlElement(ref);
  const input = useFieldInput(
    { ...props, required, validate: validators, ref: controlRef },
    kind,
    {
      startAdornment:
        hasNode(prefix) || affixes.prefix !== "" || stepper === "split",
      selectOnFocus,
      escape: revertOnEscape ? "revert" : "none",
      mapCaret,
      decimalKey: integer ? undefined : symbols.decimal,
    },
  );
  const { controlProps, state } = input;
  const strings = settings.messages;
  const resolvedDensity = density ?? settings.density;
  const controlId = controlProps.id;
  const prefixId = `${controlId}-prefix`;
  const suffixId = `${controlId}-suffix`;
  const affixId = `${controlId}-affix`;
  const ownMessagesId = useOwnMessagesId(controlId);
  const editable = !controlProps.readOnly && !controlProps.disabled;
  const display = input.mode === "display";
  const focused = isFocused(state.phase);
  const spinbutton = stepping === "keys";

  const defaultStep: DecimalString = percentScale === "fraction" ? "0.01" : "1";
  const stepSize = step === undefined ? defaultStep : toDecimal(step);
  const limits = {
    step: stepSize,
    largeStep:
      largeStep === undefined
        ? shiftDecimal(stepSize, 1)
        : toDecimal(largeStep),
    min: min ?? null,
    max: max ?? null,
  };

  /** Takes a step, and says whether the value moved. */
  function takeStep(
    direction: StepDirection,
    size: StepSize,
    via: NumberStepEvent<V>["via"],
    nativeEvent: Event,
  ): boolean {
    if (!editable) {
      return false;
    }
    const previous = input.getValue();
    const next = stepNumberValue<T>(
      previous,
      { direction, size, ...limits },
      { ...numberOptions, valueType },
    );
    if (next === null || (previous !== null && sameNumber(previous, next))) {
      return false;
    }
    onStep?.({
      direction,
      size,
      via,
      value: next,
      previousValue: previous,
      nativeEvent,
    });
    const cause: ChangeCause<Event> = {
      source: "step",
      nativeEvent,
      input: null,
    };
    input.change(next, cause);
    if (element !== null && element.ownerDocument.activeElement === element) {
      const end = element.value.length;
      element.setSelectionRange(end, end);
    }
    const now = input.getValue();
    return now === null || previous === null || !sameNumber(now, previous);
  }

  const stepKeys = useRef<AttachedStepKeys | null>(null);
  const keysOn = spinbutton && editable && !display;
  const keyOptions: StepKeysOptions = {
    onStep: (direction, size, nativeEvent) => {
      takeStep(
        direction,
        size,
        nativeEvent instanceof WheelEvent ? "wheel" : "key",
        nativeEvent,
      );
    },
    edges: { min: min !== undefined, max: max !== undefined },
    wheel,
  };
  useLayoutEffect(() => {
    if (element === null || !keysOn) {
      return undefined;
    }
    const attached = attachStepKeys(element, NO_STEP_KEYS);
    stepKeys.current = attached;
    return () => {
      attached.detach();
      stepKeys.current = null;
    };
  }, [element, keysOn]);
  // As for the stepper buttons: the latest options, straight after attaching.
  useLayoutEffect(() => {
    stepKeys.current?.setOptions(keyOptions);
  });

  const { value } = state;
  const root = classNames(
    rootClassName,
    align === "start" && "is-align-start",
    stepper === "end" && "is-stepper-end",
    stepper === "split" && "is-stepper-split",
    densityClass(resolvedDensity),
    className,
  );

  if (display) {
    const text =
      props.format !== undefined || value === null
        ? input.text
        : formatNumber(value, numberOptions, "full");
    return (
      <div className={root} style={style}>
        <DisplayValue text={text} emptyText={strings.emptyValue} />
        {input.hiddenInput}
      </div>
    );
  }

  function stepperButton(direction: StepDirection): ReactNode {
    const limit = direction === "up" ? max : min;
    const atLimit =
      limit !== undefined &&
      value !== null &&
      compareDecimals(toDecimal(value), toDecimal(limit)) *
        (direction === "up" ? 1 : -1) >=
        0;
    return (
      <StepperButton
        direction={direction}
        label={direction === "up" ? strings.increase : strings.decrease}
        controlId={controlId}
        inactive={atLimit || controlProps.readOnly === true}
        disabled={controlProps.disabled === true}
        focused={focused}
        onRepeat={(nativeEvent) => {
          if (element === null) {
            return false;
          }
          if (element.ownerDocument.activeElement !== element) {
            element.focus();
          }
          return takeStep(direction, "step", "button", nativeEvent);
        }}
      />
    );
  }

  const affix = (text: string, side: "start" | "end") =>
    text === "" ? null : (
      <span
        className={`gridkit-forms-number-input-affix is-${side}`}
        id={spinbutton ? undefined : affixId}
        aria-hidden={spinbutton || undefined}
      >
        {text}
      </span>
    );
  const hasAffix = affixes.prefix !== "" || affixes.suffix !== "";

  return (
    <div className={root} style={style}>
      <ControlBox
        severity={input.severity}
        disabled={controlProps.disabled === true}
        readOnly={controlProps.readOnly === true}
        loading={loading}
        density={resolvedDensity}
        start={stepper === "split" ? stepperButton("down") : undefined}
        prefix={prefix}
        prefixId={prefixId}
        suffix={suffix}
        suffixId={suffixId}
        clear={
          clearable && editable && input.text !== ""
            ? {
                label: strings.clear,
                onClear: (event) => {
                  input.clear(event.nativeEvent);
                },
              }
            : null
        }
        end={
          stepper === "end" ? (
            <span className="gridkit-forms-stepper">
              {stepperButton("up")}
              {stepperButton("down")}
            </span>
          ) : stepper === "split" ? (
            stepperButton("up")
          ) : null
        }
      >
        {affix(affixes.prefix, "start")}
        <input
          {...extraControlProps}
          {...controlProps}
          className="gridkit-forms-number-input-control"
          type="text"
          role={spinbutton ? "spinbutton" : undefined}
          dir={symbols.numbersLeftToRight ? "ltr" : undefined}
          placeholder={placeholder}
          autoFocus={autoFocus}
          inputMode={inputMode ?? (integer ? "numeric" : "decimal")}
          enterKeyHint={enterKeyHint}
          autoComplete={autoComplete}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          aria-describedby={joinIds(
            hasNode(prefix) && prefixId,
            !spinbutton && hasAffix && affixId,
            hasNode(suffix) && suffixId,
            controlProps["aria-describedby"],
            ownMessagesId,
            ariaDescribedBy,
          )}
          aria-busy={loading || undefined}
          aria-valuenow={
            spinbutton && value !== null ? Number(value) : undefined
          }
          aria-valuemin={
            spinbutton && min !== undefined ? Number(min) : undefined
          }
          aria-valuemax={
            spinbutton && max !== undefined ? Number(max) : undefined
          }
          aria-valuetext={
            spinbutton && value !== null
              ? formatNumber(value, numberOptions, "full")
              : undefined
          }
        />
        {affix(affixes.suffix, "end")}
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
 * A number field: locale-aware entry with the shared events, a JS number
 * or (with `valueType="decimal"`) an exact decimal string as its value,
 * `null` when empty. While it has focus it shows plain digits, and with
 * fixed decimals every decimal, typed in place; without focus, the number
 * grouped and padded, with a currency or unit drawn beside it. It is a
 * spinbutton the arrow keys step, with optional stepper buttons that
 * repeat while held, and takes every shared input prop: display mode,
 * `readOnly`, `disabled`, messages with their severity, density, prefix
 * and suffix, and the events of `@gridkitjs/forms` with `NumberDetails`.
 *
 * Inside a `Field` it takes the field's label, description and messages;
 * outside one, `label` and `description` draw a `Field` around it.
 */
export function NumberInput<T extends NumberValueType = "number">(
  props: NumberInputProps<T>,
) {
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
      <NumberControl<T> {...props} rootClassName="gridkit-forms-number-input" />
    </InputFrame>
  );
}
