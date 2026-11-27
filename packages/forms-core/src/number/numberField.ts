import type { FieldState } from "../field/state";
import type { FormsMessages } from "../messages/formsMessages";
import {
  parsed,
  unreadable,
  type FormatContext,
  type ParseContext,
  type ParseResult,
} from "../parse";
import {
  decimalOf,
  decimalToNumber,
  roundDecimal,
  shiftDecimal,
  type DecimalString,
  type NumberLike,
} from "./decimal";
import { formatNumber } from "./formatNumber";
import {
  numberFractionDigits,
  type NumberOptions,
  type NumberValue,
  type NumberValueType,
} from "./options";
import { parseNumber, type NumberUnreadableReason } from "./parseNumber";
import type { NumberReadingInfo } from "./reading";
import { numberSymbols } from "./symbols";
import { stepNumber, type StepDirection, type StepSize } from "./stepNumber";

/** How a number field reads and writes, and the value type it holds. */
export interface NumberFieldOptions<
  T extends NumberValueType = NumberValueType,
> extends NumberOptions {
  /** `"number"` (default): a JS number. `"decimal"`: an exact decimal string (`"1234.50"`). */
  readonly valueType?: T | undefined;
}

/** What a number field adds to every event it fires. */
export interface NumberDetails {
  /** The value as an exact decimal string, whatever the value type; `null` when empty. */
  readonly decimal: DecimalString | null;
  /** The value as display mode writes it, currency, percent sign or unit included; `""` when empty. */
  readonly formatted: string;
  /** How the text on screen reads; `null` while it shows the value formatted, or cannot be read. */
  readonly reading: NumberReadingInfo | null;
}

/** Places a percent's stored value sits below the number shown: 2 for a fraction (0.125 for 12.5). */
function percentShift(options: NumberOptions): number {
  return options.style === "percent" && options.percentScale !== "percent"
    ? 2
    : 0;
}

/**
 * The value a field stores for a number shown as `typed`: rounded to the
 * maximum fraction digits, scaled back for a percent, in normal form with
 * the minimum digits.
 */
function storedDecimal(
  typed: DecimalString,
  options: NumberOptions,
): DecimalString {
  const { minimum, maximum } = numberFractionDigits(options);
  const rounded =
    maximum === null
      ? typed
      : roundDecimal(typed, maximum, options.roundingMode ?? "halfExpand");
  const shift = percentShift(options);
  return decimalOf(shiftDecimal(rounded, -shift), minimum + shift);
}

/** The message a field shows for text it cannot read. */
function unreadableMessage(
  reason: NumberUnreadableReason,
  options: NumberOptions,
  messages: FormsMessages,
): string {
  switch (reason) {
    case "notANumber":
    case "incomplete":
      return messages.notANumber;
    case "grouping": {
      const { decimal, group } = numberSymbols(options.locale, options);
      return messages.numberGrouping(decimal, group);
    }
    case "tooPrecise":
      return messages.numberTooPrecise;
  }
}

/**
 * A number field's own reading: `parseNumber`, then the value rounded to
 * the maximum fraction digits by `roundingMode` (so `onChange` carries the
 * value that will be stored), scaled for a percent, and held as the value
 * type. As a JS number, text whose rounded digits a number cannot keep
 * exactly ("9007199254740993") is unreadable rather than silently changed.
 * The locale is the field's unless `options` names one.
 */
export function numberParser<T extends NumberValueType = "number">(
  options: NumberFieldOptions<T> = {},
): (
  text: string,
  context: ParseContext<NumberValue<T>>,
) => ParseResult<NumberValue<T>> {
  return (text, context) => {
    const field = { ...options, locale: options.locale ?? context.locale };
    const reading = parseNumber(text, field);
    switch (reading.kind) {
      case "empty":
        return parsed(null);
      case "unreadable":
        return unreadable(
          unreadableMessage(reading.reason, field, context.messages),
        );
      case "number": {
        const decimal = storedDecimal(reading.decimal, field);
        if (options.valueType === "decimal") {
          return parsed(decimal as NumberValue<T>);
        }
        const { number, exact } = decimalToNumber(decimal);
        return exact
          ? parsed(number as NumberValue<T>)
          : unreadable(
              unreadableMessage("tooPrecise", field, context.messages),
            );
      }
    }
  };
}

/**
 * A number field's own writing: the `edit` form while it has focus and the
 * `display` form otherwise (`FormatContext.purpose`), `""` for `null`. The
 * locale is the field's unless `options` names one.
 */
export function numberFormatter<V extends NumberLike>(
  options: NumberOptions = {},
): (value: V | null, context: FormatContext<V>) => string {
  return (value, { locale, purpose }) =>
    value === null
      ? ""
      : formatNumber(
          value,
          { ...options, locale: options.locale ?? locale },
          purpose,
        );
}

/**
 * A number field's details for `state`, what its `FieldOptions.details`
 * returns. `pasted` is how clean-up read the paste the text on screen came
 * from, which the input remembers until the next edit (`cleanPastedNumber`);
 * without it, `reading` describes the text as typed. `options` holds the
 * field's locale.
 */
export function numberDetails<V extends NumberLike>(
  state: FieldState<V>,
  options: NumberOptions,
  pasted: NumberReadingInfo | null = null,
): NumberDetails {
  const { value, draft } = state;
  return {
    decimal:
      value === null
        ? null
        : decimalOf(
            value,
            numberFractionDigits(options).minimum + percentShift(options),
          ),
    formatted: value === null ? "" : formatNumber(value, options, "full"),
    reading:
      draft.kind === "text" ? (pasted ?? readingOf(draft.text, options)) : null,
  };
}

/** A step a number field takes, its numbers in the field's value units. */
export interface NumberStep {
  readonly direction: StepDirection;
  readonly size: StepSize;
  /** Above zero. */
  readonly step: NumberLike;
  readonly largeStep: NumberLike;
  readonly min: NumberLike | null;
  readonly max: NumberLike | null;
}

/**
 * The value a step takes a number field to, as `stepNumber` works it out
 * exactly, rounded to the field's maximum fraction digits (of the number
 * shown, for a percent) and held as its value type. At a limit it is the
 * value the field has; from empty, the starting point.
 */
export function stepNumberValue<T extends NumberValueType = "number">(
  value: NumberValue<T> | null,
  step: NumberStep,
  options: NumberFieldOptions<T> = {},
): NumberValue<T> | null {
  const limit = (bound: NumberLike | null) =>
    bound === null ? null : decimalOf(bound);
  const next = stepNumber({
    value: value === null ? null : decimalOf(value),
    direction: step.direction,
    size: step.size,
    step: decimalOf(step.step),
    largeStep: decimalOf(step.largeStep),
    min: limit(step.min),
    max: limit(step.max),
  });
  if (next === null) {
    return null;
  }
  const { minimum, maximum } = numberFractionDigits(options);
  const shift = percentShift(options);
  const rounded =
    maximum === null
      ? next
      : roundDecimal(
          next,
          maximum + shift,
          options.roundingMode ?? "halfExpand",
        );
  if (options.valueType === "decimal") {
    return decimalOf(rounded, minimum + shift) as NumberValue<T>;
  }
  return decimalToNumber(rounded).number as NumberValue<T>;
}

function readingOf(
  text: string,
  options: NumberOptions,
): NumberReadingInfo | null {
  const reading = parseNumber(text, options);
  return reading.kind === "number" ? reading.info : null;
}
