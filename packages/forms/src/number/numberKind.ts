import {
  compareDecimals,
  filterNumberEdit,
  normalizeDecimal,
  numberDetails,
  numberFormatter,
  numberParser,
  numberToDecimal,
  shiftDecimal,
  type DecimalString,
  type FieldState,
  type NumberDetails,
  type NumberOptions,
  type NumberReadingInfo,
  type NumberValue,
  type NumberValueType,
  type PercentScale,
} from "@gridkitjs/forms-core";
import {
  attachStepKeys,
  type AttachedStepKeys,
  type StepKeysOptions,
} from "@gridkitjs/forms-dom";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { warnOnce } from "../dev";
import type { FieldInputKind } from "../useFieldInput";
import type { NumberInputProps } from "./NumberInput";

/** The props that decide how a number field reads and writes its text. */
export type NumberFormatProps<T extends NumberValueType> = Pick<
  NumberInputProps<T>,
  | "valueType"
  | "fractionDigits"
  | "minimumFractionDigits"
  | "maximumFractionDigits"
  | "integer"
  | "roundingMode"
  | "useGrouping"
  | "negative"
  | "decimalSeparator"
  | "groupSeparator"
  | "groupSizes"
  | "numberingSystem"
  | "currency"
  | "currencyDisplay"
  | "unit"
  | "unitDisplay"
>;

/** A number value as an exact decimal string. */
export function toDecimal(value: number | string): DecimalString {
  return typeof value === "number"
    ? numberToDecimal(value)
    : (normalizeDecimal(value) ?? value);
}

/** Whether two numbers are the same, compared exactly. */
export function sameNumber(a: number | string, b: number | string): boolean {
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

/** How a number field with these props reads and writes, memoized on them. */
export function useNumberOptions<T extends NumberValueType>(
  {
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
  }: NumberFormatProps<T>,
  locale: Intl.LocalesArgument,
  percentScale?: PercentScale,
): NumberOptions {
  const style = numberStyle(percentScale, currency, unit);
  return useMemo<NumberOptions>(
    () => ({
      locale,
      style,
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
      style,
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
}

/** A number field's `kind`, its details always given. */
export type NumberKind<V> = FieldInputKind<V, NumberDetails> & {
  readonly details: (current: FieldState<V>) => NumberDetails;
};

/** How a number field's text is judged as it is typed. */
export interface NumberEntrySettings<T extends NumberValueType> {
  readonly valueType: T | undefined;
  /** Refuses keys that cannot be part of a number, and cleans pastes. */
  readonly cleanInput: boolean;
  /** Whether a minus may be typed: no `min`, or one below zero. */
  readonly negatives: boolean;
  readonly limitFractionDigits: boolean | undefined;
  readonly decimalEntry: "fixed" | "free" | undefined;
}

/**
 * A number field's `kind`: forms-core's parser and formatter, an exact
 * `equals`, `NumberDetails`, and `filterNumberEdit` as its filter. It
 * keeps how clean-up read the paste on screen, until the next edit, for
 * the details, so each field takes a kind of its own.
 */
export function numberKind<T extends NumberValueType>(
  options: NumberOptions,
  entry: NumberEntrySettings<T>,
): NumberKind<NumberValue<T>> {
  let pasted: NumberReadingInfo | null = null;
  return {
    defaultParse: numberParser<T>({ ...options, valueType: entry.valueType }),
    defaultFormat: numberFormatter<NumberValue<T>>(options),
    serialize: (value) => toDecimal(value),
    equals: sameNumber,
    details: (current) => numberDetails(current, options, pasted),
    filterInput: entry.cleanInput
      ? (edit, before) => {
          const result = filterNumberEdit(edit, before, {
            ...options,
            negatives: entry.negatives,
            limitFractionDigits: entry.limitFractionDigits,
            decimalEntry: entry.decimalEntry,
          });
          pasted = result.pasted;
          return result.decision;
        }
      : undefined,
  };
}

/** Whether a field with this `min` takes negative numbers. */
export function takesNegatives(min: number | string | undefined): boolean {
  return min === undefined || compareDecimals(toDecimal(min), "0") < 0;
}

/** A development warning when `min` is above `max`. */
export function useLimitsWarning(
  name: string,
  min: number | string | undefined,
  max: number | string | undefined,
): void {
  useEffect(() => {
    if (
      min !== undefined &&
      max !== undefined &&
      compareDecimals(toDecimal(min), toDecimal(max)) > 0
    ) {
      warnOnce(
        "number-min-max",
        `${name}: min is above max, so no value can satisfy both.`,
      );
    }
  }, [name, min, max]);
}

/** What a step adds: `step` (one, or a percentage point), and `largeStep` (ten steps). */
export function stepSizes(
  step: number | string | undefined,
  largeStep: number | string | undefined,
  percentScale: PercentScale | undefined,
): { readonly step: DecimalString; readonly largeStep: DecimalString } {
  const size =
    step === undefined
      ? percentScale === "fraction"
        ? "0.01"
        : "1"
      : toDecimal(step);
  return {
    step: size,
    largeStep:
      largeStep === undefined ? shiftDecimal(size, 1) : toDecimal(largeStep),
  };
}

/** Options to attach with, before a render's own reach them. */
const NO_STEP_KEYS: StepKeysOptions = { onStep: () => undefined };

/**
 * Attaches forms-dom's step keys to `element` while `on`, and hands them
 * every render's options.
 */
export function useStepKeys(
  element: HTMLInputElement | null,
  on: boolean,
  options: StepKeysOptions,
): void {
  const stepKeys = useRef<AttachedStepKeys | null>(null);
  useLayoutEffect(() => {
    if (element === null || !on) {
      return undefined;
    }
    const attached = attachStepKeys(element, NO_STEP_KEYS);
    stepKeys.current = attached;
    return () => {
      attached.detach();
      stepKeys.current = null;
    };
  }, [element, on]);
  // Every render's options, the attaching render's included: this effect
  // runs straight after the one above, before any key can arrive.
  useLayoutEffect(() => {
    stepKeys.current?.setOptions(options);
  });
}
