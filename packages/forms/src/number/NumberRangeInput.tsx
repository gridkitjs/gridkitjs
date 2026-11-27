import {
  compareDecimals,
  endsRule,
  formatNumber,
  formatNumberRange,
  maxRule,
  maxSpanRule,
  minRule,
  minSpanRule,
  numberCaret,
  numberRangeKindOf,
  numberSymbols,
  rangeDetails,
  rangeEnds,
  rangeSpan,
  readRangeEnds,
  requiredRule,
  sameRange,
  stepNumberValue,
  type FieldState,
  type NoFlags,
  type NumberDetails,
  type NumberOptions,
  type NumberValue,
  type NumberValueType,
  type PartController,
  type PartOptions,
  type Range,
  type RangeBounds,
  type RangeDetails,
  type RangeEnd,
  type RangeEnds,
  type StepDirection,
  type StepSize,
  type Validator,
} from "@gridkitjs/forms-core";
import type { TextInputOptions } from "@gridkitjs/forms-dom";
import {
  useLayoutEffect,
  useMemo,
  useState,
  type HTMLAttributes,
  type Ref,
} from "react";
import { DisplayValue } from "../DisplayValue";
import { useFieldContext } from "../field/fieldContext";
import { classNames } from "../field/parts";
import { useFormSettings } from "../settings";
import {
  ControlBox,
  densityClass,
  InputFrame,
  joinIds,
  OwnMessages,
  useOwnMessagesId,
} from "../text/parts";
import type { TextInputBaseProps } from "../text/textInputProps";
import {
  useCompositeInput,
  usePartControl,
  type CompositeInputSpec,
} from "../useCompositeInput";
import { validatorsOf } from "../useFieldInput";
import type { NumberInputProps, NumberLimit } from "./NumberInput";
import {
  numberKind,
  sameNumber,
  stepSizes,
  takesNegatives,
  toDecimal,
  useLimitsWarning,
  useNumberOptions,
  useStepKeys,
  type NumberFormatProps,
  type NumberKind,
} from "./numberKind";

/** A number range: either end `null` when open. */
export type NumberRange<T extends NumberValueType = "number"> = Range<
  NumberValue<T>
>;

/** What `NumberRangeInput` adds to every event: the range's details and each end's number details. */
export type NumberRangeDetails<T extends NumberValueType = "number"> =
  RangeDetails<NumberValue<T>, NoFlags, NumberValue<T>> & {
    readonly startDetails: NumberDetails;
    readonly endDetails: NumberDetails;
  };

export interface NumberRangeInputProps<T extends NumberValueType = "number">
  extends
    Omit<
      TextInputBaseProps<
        NumberRange<T>,
        HTMLInputElement,
        NumberRangeDetails<T>
      >,
      | "placeholder"
      | "prefix"
      | "suffix"
      | "ref"
      | "parse"
      | "format"
      | "controlProps"
    >,
    NumberFormatProps<T>,
    Pick<
      NumberInputProps<T>,
      | "min"
      | "max"
      | "step"
      | "largeStep"
      | "stepping"
      | "limitFractionDigits"
      | "decimalEntry"
      | "cleanInput"
      | "align"
      | "revertOnEscape"
    > {
  /** `"[]"` (default): the end belongs to the range. `"[)"`: it does not, so 10–10 is empty. */
  readonly bounds?: RangeBounds | undefined;
  /** An end typed before its start: swapped (default) or an error. */
  readonly reversed?: "swap" | "error" | undefined;
  /** With `bounds="[)"`, allows a start equal to its end. */
  readonly allowEmpty?: boolean | undefined;
  /** The shortest span allowed, `end - start`. */
  readonly minSpan?: NumberLimit<T> | undefined;
  /** The longest span allowed. */
  readonly maxSpan?: NumberLimit<T> | undefined;
  /** Shows the span after the end ("Span: 10"), read with the end. */
  readonly showSpan?: boolean | undefined;
  readonly startPlaceholder?: string | undefined;
  readonly endPlaceholder?: string | undefined;
  /** The start's native control. */
  readonly startRef?: Ref<HTMLInputElement> | undefined;
  /** The end's native control. */
  readonly endRef?: Ref<HTMLInputElement> | undefined;
}

/** The tighter of two limits: the lower of two upper limits, the higher of two lower ones. */
function tighter<V extends number | string>(
  a: V | null,
  b: V | null,
  side: "lower" | "upper",
): V | null {
  if (a === null || b === null) {
    return a ?? b;
  }
  const order = compareDecimals(toDecimal(a), toDecimal(b));
  return (side === "upper" ? order <= 0 : order >= 0) ? a : b;
}

/** A number kind as one part of a composite: how it reads, writes and filters. */
function partOf<V>(kind: NumberKind<V>): PartOptions<V, Event> {
  return {
    defaultParse: kind.defaultParse,
    defaultFormat: kind.defaultFormat,
    equals: kind.equals,
    filterInput: kind.filterInput,
  };
}

/** What both ends' controls share. */
interface EndSettings<V> {
  readonly text: TextInputOptions;
  readonly spinbutton: boolean;
  readonly editable: boolean;
  readonly readOnly: boolean;
  readonly disabled: boolean;
  readonly required: boolean;
  readonly ltr: boolean;
  readonly autoFocus: boolean | undefined;
  readonly attributes: Pick<
    HTMLAttributes<HTMLInputElement>,
    "inputMode" | "enterKeyHint"
  > & { readonly autoComplete: string | undefined };
  readonly min: number | string | undefined;
  readonly max: number | string | undefined;
  /** The value a step takes an end to, or `null` when it takes none. */
  readonly stepTo: (
    end: RangeEnd,
    direction: StepDirection,
    size: StepSize,
  ) => V | null;
  /** A value as a screen reader says it. */
  readonly valueText: (value: V) => string;
}

/** One end's control: a number box of its own, typed and stepped as a `NumberInput`. */
function RangeEndControl<V extends number | string>({
  end,
  part,
  controlRef,
  onElement,
  id,
  labelledBy,
  describedBy,
  invalid,
  placeholder,
  settings,
}: {
  readonly end: RangeEnd;
  readonly part: PartController<V, Event>;
  readonly controlRef: Ref<HTMLInputElement> | undefined;
  /** Told the control once it is in the page, and `null` when it goes. */
  readonly onElement?: ((element: HTMLInputElement | null) => void) | undefined;
  readonly id: string;
  readonly labelledBy: string | undefined;
  readonly describedBy: string | undefined;
  readonly invalid: boolean;
  readonly placeholder: string | undefined;
  readonly settings: EndSettings<V>;
}) {
  const [element, ref] = usePartControl(part, controlRef, settings.text);
  useLayoutEffect(() => {
    onElement?.(element);
  }, [onElement, element]);
  const { spinbutton, min, max } = settings;
  useStepKeys(element, spinbutton && settings.editable, {
    onStep: (direction, size, nativeEvent) => {
      const next = settings.stepTo(end, direction, size);
      if (next === null) {
        return;
      }
      part.change(next, { source: "step", nativeEvent, input: null });
      if (element !== null && element.ownerDocument.activeElement === element) {
        const caret = element.value.length;
        element.setSelectionRange(caret, caret);
      }
    },
    edges: { min: min !== undefined, max: max !== undefined },
  });
  const { value } = part.getState();
  return (
    <input
      {...settings.attributes}
      ref={ref}
      id={id}
      className={`gridkit-forms-number-input-control gridkit-forms-range-${end}`}
      type="text"
      role={spinbutton ? "spinbutton" : undefined}
      dir={settings.ltr ? "ltr" : undefined}
      defaultValue={part.getText()}
      readOnly={settings.readOnly}
      disabled={settings.disabled}
      placeholder={placeholder}
      autoFocus={end === "start" ? settings.autoFocus : undefined}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      aria-required={settings.required || undefined}
      aria-valuenow={spinbutton && value !== null ? Number(value) : undefined}
      aria-valuemin={spinbutton && min !== undefined ? Number(min) : undefined}
      aria-valuemax={spinbutton && max !== undefined ? Number(max) : undefined}
      aria-valuetext={
        spinbutton && value !== null ? settings.valueText(value) : undefined
      }
    />
  );
}

/** The range as display mode writes it: "10–20", "from 10", "up to 20". */
function displayText<V extends number | string>(
  range: Range<V> | null,
  options: NumberOptions,
  strings: {
    rangeFrom: (start: string) => string;
    rangeUpTo: (end: string) => string;
  },
): string {
  if (range === null) {
    return "";
  }
  const { start, end } = range;
  if (start !== null && end !== null) {
    return formatNumberRange(start, end, options);
  }
  if (start !== null) {
    return strings.rangeFrom(formatNumber(start, options, "full"));
  }
  return end === null
    ? ""
    : strings.rangeUpTo(formatNumber(end, options, "full"));
}

/** Whether an end's own text or value is at fault: it cannot be read, or lies outside `min` and `max`. */
function endAtFault<V extends number | string>(
  state: FieldState<V>,
  min: number | string | undefined,
  max: number | string | undefined,
): boolean {
  const { draft, value } = state;
  if (draft.kind === "text" && draft.reading.kind === "unreadable") {
    return true;
  }
  if (value === null) {
    return false;
  }
  const decimal = toDecimal(value);
  return (
    (min !== undefined && compareDecimals(decimal, toDecimal(min)) < 0) ||
    (max !== undefined && compareDecimals(decimal, toDecimal(max)) > 0)
  );
}

/** The range control behind `NumberRangeInput`. */
function NumberRangeControl<T extends NumberValueType = "number">({
  valueType,
  fractionDigits,
  minimumFractionDigits,
  maximumFractionDigits,
  integer = false,
  roundingMode,
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
  limitFractionDigits,
  decimalEntry,
  cleanInput = true,
  align = "end",
  revertOnEscape = true,
  bounds = "[]",
  reversed = "swap",
  allowEmpty = false,
  minSpan,
  maxSpan,
  showSpan = false,
  startPlaceholder,
  endPlaceholder,
  startRef,
  endRef,
  required,
  validate,
  loading = false,
  density,
  autoFocus,
  clearable = false,
  selectOnFocus = true,
  inputMode,
  enterKeyHint,
  autoComplete = "off",
  className,
  style,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  ...props
}: NumberRangeInputProps<T>) {
  type V = NumberValue<T>;
  const field = useFieldContext();
  const formSettings = useFormSettings();
  const settings = field?.settings ?? formSettings;
  const locale = props.locale ?? settings.locale;
  const numberOptions = useNumberOptions<T>(
    {
      fractionDigits,
      minimumFractionDigits,
      maximumFractionDigits,
      integer,
      roundingMode,
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
    },
    locale,
  );
  const symbols = numberSymbols(locale, numberOptions);
  const rangeKind = numberRangeKindOf<T>(valueType);
  const negatives = takesNegatives(min);
  useLimitsWarning("NumberRangeInput", min, max);

  // One kind per end: each keeps how its own paste was read.
  const kinds = useMemo(() => {
    const entry = {
      valueType,
      cleanInput,
      negatives,
      limitFractionDigits,
      decimalEntry,
    };
    return {
      start: numberKind<T>(numberOptions, entry),
      end: numberKind<T>(numberOptions, entry),
    };
  }, [
    numberOptions,
    valueType,
    cleanInput,
    negatives,
    limitFractionDigits,
    decimalEntry,
  ]);
  const needsValue = required === true || field?.required === true;
  const validators = useMemo(() => {
    // A span limit is a value of the field's own type.
    const spanOf = (limit: number | string) =>
      (valueType === "decimal" ? toDecimal(limit) : Number(limit)) as V;
    const writeSpan = (span: V) => formatNumber(span, numberOptions, "full");
    const list: Validator<NumberRange<T>>[] = [];
    if (needsValue) {
      list.push(requiredRule<NumberRange<T>>());
    }
    if (min !== undefined) {
      list.push(endsRule(minRule<V>(min, numberOptions)));
    }
    if (max !== undefined) {
      list.push(endsRule(maxRule<V>(max, numberOptions)));
    }
    if (minSpan !== undefined) {
      list.push(
        minSpanRule(rangeKind, spanOf(minSpan), () => undefined, writeSpan),
      );
    }
    if (maxSpan !== undefined) {
      list.push(
        maxSpanRule(rangeKind, spanOf(maxSpan), () => undefined, writeSpan),
      );
    }
    return [...list, ...validatorsOf(validate)];
  }, [
    needsValue,
    min,
    max,
    minSpan,
    maxSpan,
    numberOptions,
    rangeKind,
    valueType,
    validate,
  ]);

  const rangeOptions = { bounds, reversed, allowEmpty };
  const spec: CompositeInputSpec<
    NumberRange<T>,
    RangeEnds<V>,
    NumberRangeDetails<T>
  > = {
    parts: { start: partOf(kinds.start), end: partOf(kinds.end) },
    assemble: (ends, context) =>
      readRangeEnds(rangeKind, ends, rangeOptions, undefined, context),
    split: (value) => rangeEnds(rangeKind, value, bounds, undefined),
    join: (texts) => texts.start + settings.messages.rangeSeparator + texts.end,
    equals: (a, b) => sameRange(rangeKind, a, b),
    details: (current, _previous, { changed, parts, texts }) => ({
      ...rangeDetails(
        rangeKind,
        current.value,
        changed,
        texts,
        bounds,
        undefined,
      ),
      startDetails: kinds.start.details(parts.start),
      endDetails: kinds.end.details(parts.end),
    }),
  };
  const [startElement, setStartElement] = useState<HTMLInputElement | null>(
    null,
  );
  const input = useCompositeInput(
    { ...props, required, validate: validators },
    spec,
    startElement,
  );
  const {
    composite,
    state,
    strings,
    severity,
    invalid,
    readOnly,
    disabled,
    describedBy: fieldDescribedBy,
    messages,
    setRoot,
    clear,
  } = input;
  const resolvedDensity = density ?? settings.density;
  const id = input.controlId;
  const editable = !readOnly && !disabled;
  const value = state.field.value;
  const ownMessagesId = useOwnMessagesId(id);
  const mapCaret = useMemo(() => numberCaret(numberOptions), [numberOptions]);
  const root = classNames(
    "gridkit-forms-number-range-input",
    align === "start" && "is-align-start",
    densityClass(resolvedDensity),
    className,
  );

  const { name } = props;
  const hiddenInputs =
    name === undefined
      ? null
      : (["start", "end"] as const).map((end) => {
          const endValue = value?.[end] ?? null;
          return (
            <input
              key={end}
              type="hidden"
              name={`${name}.${end}`}
              form={props.form}
              disabled={disabled}
              value={endValue === null ? "" : toDecimal(endValue)}
            />
          );
        });

  if (input.mode === "display") {
    return (
      <div className={root} style={style}>
        <DisplayValue
          text={displayText(value, numberOptions, strings)}
          emptyText={strings.emptyValue}
        />
        {hiddenInputs}
      </div>
    );
  }

  const sizes = stepSizes(step, largeStep, undefined);
  const endSettings: EndSettings<V> = {
    text: {
      selectOnFocus,
      escape: revertOnEscape ? "revert" : "none",
      mapCaret,
      decimalKey: integer ? undefined : symbols.decimal,
    },
    spinbutton: stepping === "keys",
    editable,
    readOnly: readOnly,
    disabled: disabled,
    required: input.required,
    ltr: symbols.numbersLeftToRight,
    autoFocus,
    attributes: {
      inputMode: inputMode ?? (integer ? "numeric" : "decimal"),
      enterKeyHint,
      autoComplete,
    },
    min,
    max,
    stepTo: (end, direction, size) => {
      if (!editable) {
        return null;
      }
      const start = composite.parts.start.getState().value;
      const finish = composite.parts.end.getState().value;
      const lower = min ?? null;
      const upper = max ?? null;
      // A step stops at the other end, so it never reverses the range.
      const limits =
        end === "start"
          ? {
              min: lower,
              max: tighter<number | string>(upper, finish, "upper"),
            }
          : {
              min: tighter<number | string>(lower, start, "lower"),
              max: upper,
            };
      const previous = end === "start" ? start : finish;
      const next = stepNumberValue<T>(
        previous,
        { direction, size, ...sizes, ...limits },
        { ...numberOptions, valueType },
      );
      return next === null || (previous !== null && sameNumber(previous, next))
        ? null
        : next;
    },
    valueText: (shown) => formatNumber(shown, numberOptions, "full"),
  };

  // A message about one end marks that end; one about the range, both.
  const atFault = {
    start: endAtFault(state.parts.start, min, max),
    end: endAtFault(state.parts.end, min, max),
  };
  const invalidEnd = (end: RangeEnd) =>
    invalid && (atFault.start || atFault.end ? atFault[end] : true);

  const span =
    showSpan && value !== null ? rangeSpan(rangeKind, value, undefined) : null;
  const spanId = `${id}-span`;
  const nameId = `${id}-name`;
  const labelIds = joinIds(
    field !== null && `${id}-label`,
    ariaLabelledBy,
    ariaLabel !== undefined && nameId,
  );
  const describedBy = (end: RangeEnd) =>
    joinIds(
      fieldDescribedBy,
      ownMessagesId,
      end === "end" && span !== null && spanId,
      ariaDescribedBy,
    );
  const hasText =
    composite.parts.start.getText() !== "" ||
    composite.parts.end.getText() !== "";

  return (
    <div
      ref={setRoot}
      className={root}
      style={style}
      role="group"
      aria-labelledby={labelIds}
    >
      <ControlBox
        className="gridkit-forms-range-control"
        severity={severity}
        disabled={disabled}
        readOnly={readOnly}
        loading={loading}
        density={resolvedDensity}
        prefix={undefined}
        prefixId={`${id}-prefix`}
        suffix={undefined}
        suffixId={`${id}-suffix`}
        clear={
          clearable && editable && hasText
            ? {
                label: strings.clear,
                onClear: (event) => {
                  clear(event.nativeEvent);
                },
              }
            : null
        }
      >
        <RangeEndControl<V>
          end="start"
          part={composite.parts.start}
          controlRef={startRef}
          onElement={setStartElement}
          id={id}
          labelledBy={joinIds(labelIds, `${id}-start-label`)}
          describedBy={describedBy("start")}
          invalid={invalidEnd("start")}
          placeholder={startPlaceholder}
          settings={endSettings}
        />
        <span className="gridkit-forms-range-separator" aria-hidden="true">
          {strings.rangeSeparator}
        </span>
        <RangeEndControl<V>
          end="end"
          part={composite.parts.end}
          controlRef={endRef}
          id={`${id}-end`}
          labelledBy={joinIds(labelIds, `${id}-end-label`)}
          describedBy={describedBy("end")}
          invalid={invalidEnd("end")}
          placeholder={endPlaceholder}
          settings={endSettings}
        />
        {span !== null && (
          <span className="gridkit-forms-range-span" id={spanId}>
            {strings.rangeSpanLabel(formatNumber(span, numberOptions, "full"))}
          </span>
        )}
      </ControlBox>
      {ariaLabel !== undefined && (
        <span className="gridkit-forms-sr-only" id={nameId}>
          {ariaLabel}
        </span>
      )}
      <span className="gridkit-forms-sr-only" id={`${id}-start-label`}>
        {strings.rangeStart}
      </span>
      <span className="gridkit-forms-sr-only" id={`${id}-end-label`}>
        {strings.rangeEnd}
      </span>
      {hiddenInputs}
      <OwnMessages
        id={`${id}-messages`}
        messages={messages}
        strings={strings}
        named={ariaLabel !== undefined || ariaLabelledBy !== undefined}
      />
    </div>
  );
}

/**
 * Two number fields under one label, holding one range: `{ start, end }`,
 * either end `null` when open, and `null` when both are. The value is
 * always ordered: an end typed before its start is swapped (the texts
 * change places on commit) or, with `reversed="error"`, refused with a
 * message. Each end types, pastes and steps as a `NumberInput` (a step
 * stops at the other end); Tab moves between the ends, and the range
 * commits once when focus leaves both, or on Enter. `min` and `max` bound
 * both ends; `minSpan` and `maxSpan` the span, which `showSpan` writes
 * after the end. The end belongs to the range by default (`bounds="[]"`).
 * Every event carries `NumberRangeDetails`: which end changed, the span,
 * and each end's number details.
 *
 * Inside a `Field` it takes the field's label, description and messages;
 * outside one, `label` and `description` draw a `Field` around it.
 */
export function NumberRangeInput<T extends NumberValueType = "number">(
  props: NumberRangeInputProps<T>,
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
      <NumberRangeControl<T> {...props} />
    </InputFrame>
  );
}
