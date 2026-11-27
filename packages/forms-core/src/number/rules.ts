import type { Validator } from "../validation/validators";
import {
  compareDecimals,
  decimalOf,
  snapDecimal,
  type NumberLike,
} from "./decimal";
import { formatNumber } from "./formatNumber";
import type { NumberOptions } from "./options";

/** `limit` as the field writes numbers in its messages: the `full` form, in its locale unless `options` names one. */
function written(
  limit: NumberLike,
  options: NumberOptions,
  locale: Intl.LocalesArgument,
): string {
  return formatNumber(
    limit,
    { ...options, locale: options.locale ?? locale },
    "full",
  );
}

/**
 * A number below `min` is `messages.rangeUnderflow`, "Enter 10 or more".
 * Compared as exact decimals, so either value type works and a decimal
 * limit keeps every digit. `options` are the field's, to write `min` the
 * way it writes numbers. `null` passes.
 */
export function minRule<V extends NumberLike>(
  min: NumberLike,
  options: NumberOptions = {},
): Validator<V> {
  const limit = decimalOf(min);
  return (value, { locale, messages }) =>
    value !== null && compareDecimals(decimalOf(value), limit) < 0
      ? {
          text: messages.rangeUnderflow(written(min, options, locale)),
          code: "rangeUnderflow",
        }
      : null;
}

/** A number above `max` is `messages.rangeOverflow`, "Enter 100 or less"; otherwise as `minRule`. */
export function maxRule<V extends NumberLike>(
  max: NumberLike,
  options: NumberOptions = {},
): Validator<V> {
  const limit = decimalOf(max);
  return (value, { locale, messages }) =>
    value !== null && compareDecimals(decimalOf(value), limit) > 0
      ? {
          text: messages.rangeOverflow(written(max, options, locale)),
          code: "rangeOverflow",
        }
      : null;
}

/**
 * A number that is not a whole number of `step`s from `base` is
 * `messages.stepMismatch`, "Enter a multiple of 0.05". Exact, so 0.15 is
 * three steps of 0.05. A number input's `step` only drives stepping; this
 * rule is for a field whose values must sit on it. Throws a `RangeError`
 * for a step that is not above zero. `null` passes.
 */
export function stepRule<V extends NumberLike>(
  step: NumberLike,
  base: NumberLike = 0,
  options: NumberOptions = {},
): Validator<V> {
  const size = decimalOf(step);
  const origin = decimalOf(base);
  if (compareDecimals(size, "0") <= 0) {
    throw new RangeError(`The step ${size} is not above zero`);
  }
  return (value, { locale, messages }) => {
    if (value === null) {
      return null;
    }
    const decimal = decimalOf(value);
    return compareDecimals(
      snapDecimal(decimal, origin, size, "below"),
      decimal,
    ) === 0
      ? null
      : {
          text: messages.stepMismatch(written(step, options, locale)),
          code: "stepMismatch",
        };
  };
}
