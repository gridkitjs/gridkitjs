import { localeKey } from "../localeKey";
import {
  decimalOf,
  fractionDigitsOf,
  shiftDecimal,
  type DecimalString,
  type NumberLike,
} from "./decimal";
import {
  numberFractionDigits,
  type FractionDigits,
  type NumberOptions,
} from "./options";
import { DIRECTION_MARKS, numberSymbols, type NumberSymbols } from "./symbols";

/**
 * Which text `formatNumber` writes:
 *
 * - `display`: what a field shows when it does not have focus: grouped,
 *   fraction digits padded, the negative style; no currency, percent sign
 *   or unit.
 * - `edit`: what a focused field shows: no grouping, a leading minus, the
 *   digits the value has, padded to the minimum.
 * - `full`: Intl's whole text, with the currency, percent sign or unit, as
 *   display mode, the `formatted` event detail and a grid cell show it.
 */
export type NumberTextForm = "display" | "edit" | "full";

/** Where the currency, percent sign or unit sits around the number, for an input's adornments. */
export interface NumberAffixes {
  readonly prefix: string;
  readonly suffix: string;
}

const NO_AFFIXES: NumberAffixes = { prefix: "", suffix: "" };

/** Intl allows no more fraction digits than this. */
const MAX_FRACTION_DIGITS = 100;

const EDGE_SPACING = /^[\s\u200E\u200F\u061C]+|[\s\u200E\u200F\u061C]+$/g;

interface Part {
  readonly type: string;
  readonly value: string;
}

/** Formats already built, by locale and options. */
const formats = new Map<string, Intl.NumberFormat>();

function intlFormat(
  locale: Intl.LocalesArgument,
  options: Intl.NumberFormatOptions,
): Intl.NumberFormat {
  const key = JSON.stringify([localeKey(locale), options]);
  let format = formats.get(key);
  if (format === undefined) {
    format = new Intl.NumberFormat(locale, options);
    formats.set(key, format);
  }
  return format;
}

function isPercent(options: NumberOptions): boolean {
  return options.style === "percent";
}

/** The number a field shows for `value`: for a percent, the percent number (12.5 for 0.125). */
function shownDecimal(
  value: NumberLike,
  options: NumberOptions,
): DecimalString {
  const decimal = decimalOf(value);
  return isPercent(options) && options.percentScale !== "percent"
    ? shiftDecimal(decimal, 2)
    : decimal;
}

/** What Intl formats for `value`: for a percent, the fraction it multiplies by 100. */
function intlValue(
  value: NumberLike,
  options: NumberOptions,
): Intl.StringNumericLiteral {
  const decimal = decimalOf(value);
  const scaled =
    isPercent(options) && options.percentScale === "percent"
      ? shiftDecimal(decimal, -2)
      : decimal;
  // A decimal string is a numeric string, which Intl formats exactly.
  return scaled as Intl.StringNumericLiteral;
}

/** The fraction digits to write `shown` with: with no maximum, every digit it has. */
function digitsFor(
  options: NumberOptions,
  shown: readonly DecimalString[],
): FractionDigits & { readonly maximum: number } {
  const { minimum, maximum } = numberFractionDigits(options);
  const kept =
    maximum ??
    Math.max(minimum, ...shown.map((value) => fractionDigitsOf(value)));
  return { minimum, maximum: Math.min(kept, MAX_FRACTION_DIGITS) };
}

function intlOptions(
  options: NumberOptions,
  form: NumberTextForm,
  digits: FractionDigits & { readonly maximum: number },
  grouping: boolean,
): Intl.NumberFormatOptions {
  const base: Intl.NumberFormatOptions = {
    minimumFractionDigits: digits.minimum,
    maximumFractionDigits: digits.maximum,
    roundingMode: options.roundingMode ?? "halfExpand",
    // `true` would group four-digit numbers in locales that do not.
    useGrouping: grouping ? "auto" : false,
    // Intl writes "-0" for a negative value that rounds to zero otherwise.
    signDisplay: "negative",
    numberingSystem: options.numberingSystem,
  };
  if (form !== "full") {
    return { ...base, style: "decimal" };
  }
  switch (options.style ?? "decimal") {
    case "decimal":
      return { ...base, style: "decimal" };
    case "percent":
      return { ...base, style: "percent" };
    case "currency":
      return {
        ...base,
        style: "currency",
        currency: options.currency,
        currencyDisplay: options.currencyDisplay ?? "symbol",
      };
    case "unit":
      return {
        ...base,
        style: "unit",
        unit: options.unit,
        unitDisplay: options.unitDisplay ?? "short",
      };
  }
}

/** Whether `form` groups the integer digits. */
function groups(
  options: NumberOptions,
  symbols: NumberSymbols,
  form: NumberTextForm,
): boolean {
  return (
    form !== "edit" && options.useGrouping !== false && symbols.group !== ""
  );
}

/** `digits` grouped by the field's sizes and separator. */
function regroup(digits: string, symbols: NumberSymbols): string {
  const characters = Array.from(digits);
  const [primary, secondary] = symbols.groupSizes;
  if (characters.length < primary + symbols.minimumGroupingDigits) {
    return digits;
  }
  let end = characters.length - primary;
  const grouped = [characters.slice(end).join("")];
  while (end > 0) {
    const start = Math.max(0, end - secondary);
    grouped.unshift(characters.slice(start, end).join(""));
    end = start;
  }
  return grouped.join(symbols.group);
}

/**
 * Intl's parts with the field's own separators and group sizes where it
 * overrides the locale's (an override `numberSymbols` ignored is not in
 * them): the integer digits of each number are grouped again when the
 * text is grouped and the sizes are the field's own.
 */
function withFieldSymbols(
  parts: readonly Part[],
  options: NumberOptions,
  symbols: NumberSymbols,
  grouping: boolean,
): Part[] {
  const decimal =
    options.decimalSeparator === symbols.decimal ? symbols.decimal : null;
  const group = options.groupSeparator === symbols.group ? symbols.group : null;
  const sizes = options.groupSizes;
  const ownSizes =
    grouping &&
    sizes !== undefined &&
    sizes.every((size, index) => size === symbols.groupSizes[index]);
  const written: Part[] = [];
  for (const part of parts) {
    if (ownSizes && (part.type === "integer" || part.type === "group")) {
      const previous = written.at(-1);
      const digits = part.type === "integer" ? part.value : "";
      if (previous?.type === "integer") {
        written[written.length - 1] = {
          type: "integer",
          value: previous.value + digits,
        };
      } else {
        written.push({ type: "integer", value: digits });
      }
    } else if (part.type === "decimal" && decimal !== null) {
      written.push({ type: "decimal", value: decimal });
    } else if (part.type === "group" && group !== null) {
      written.push({ type: "group", value: group });
    } else {
      written.push(part);
    }
  }
  return ownSizes
    ? written.map((part) =>
        part.type === "integer"
          ? { type: "integer", value: regroup(part.value, symbols) }
          : part,
      )
    : written;
}

const NUMERIC_PARTS = new Set(["integer", "group", "decimal", "fraction"]);

/** The text of `parts`, its minus written in the `negative` style. */
function joinWithSign(
  parts: readonly Part[],
  negative: NumberOptions["negative"],
): string {
  const minusAt = parts.findIndex((part) => part.type === "minusSign");
  const minus = parts[minusAt];
  if (minus === undefined || negative === undefined || negative === "minus") {
    return parts.map((part) => part.value).join("");
  }
  const rest = parts.filter((_, index) => index !== minusAt);
  const text = (list: readonly Part[]) =>
    list.map((part) => part.value).join("");
  if (negative === "parentheses") {
    return `(${text(rest)})`;
  }
  const lastDigit = rest.findLastIndex(
    (part) => part.type === "integer" || part.type === "fraction",
  );
  return (
    text(rest.slice(0, lastDigit + 1)) +
    minus.value.replace(DIRECTION_MARKS, "") +
    text(rest.slice(lastDigit + 1))
  );
}

/**
 * `value` as text, in one of three forms (`display` by default; see
 * `NumberTextForm`). A decimal string is formatted without passing through
 * a JS number, so every digit of a 20-digit amount is written. With no
 * maximum, every fraction digit of the value is written; with one, the
 * value is rounded to it by `roundingMode`. Nothing is written as "-0".
 * Throws a `RangeError` for a string that is not a decimal, or a number
 * that is not finite.
 */
export function formatNumber(
  value: NumberLike,
  options: NumberOptions = {},
  form: NumberTextForm = "display",
): string {
  const symbols = numberSymbols(options.locale, options);
  const shown = shownDecimal(value, options);
  const grouping = groups(options, symbols, form);
  const format = intlFormat(
    options.locale,
    intlOptions(options, form, digitsFor(options, [shown]), grouping),
  );
  const parts = withFieldSymbols(
    format.formatToParts(
      form === "full"
        ? intlValue(value, options)
        : (shown as Intl.StringNumericLiteral),
    ),
    options,
    symbols,
    grouping,
  );
  const text = joinWithSign(
    parts,
    form === "edit" ? "minus" : options.negative,
  );
  return form === "full" ? text : text.replace(DIRECTION_MARKS, "");
}

/**
 * The currency, percent sign or unit written before and after the number
 * in `full` text, trimmed of spacing, for an input to draw beside its
 * text: `$` before in `en-US`, `€` after in `de-DE`, `%` before in
 * `tr-TR`. A spelled-out name agrees with `value` ("1 euro", "2 euros");
 * without one it is written for 0. Both are `""` for a plain decimal.
 */
export function numberAffixes(
  options: NumberOptions = {},
  value: NumberLike = 0,
): NumberAffixes {
  if ((options.style ?? "decimal") === "decimal") {
    return NO_AFFIXES;
  }
  const positive = decimalOf(value).replace(/^-/, "");
  const format = intlFormat(
    options.locale,
    intlOptions(
      options,
      "full",
      digitsFor(options, [shownDecimal(positive, options)]),
      false,
    ),
  );
  const parts = format.formatToParts(intlValue(positive, options));
  const first = parts.findIndex((part) => NUMERIC_PARTS.has(part.type));
  const last = parts.findLastIndex((part) => NUMERIC_PARTS.has(part.type));
  const text = (list: readonly Part[]) =>
    list
      .map((part) => part.value)
      .join("")
      .replace(EDGE_SPACING, "");
  return {
    prefix: text(parts.slice(0, first)),
    suffix: text(parts.slice(last + 1)),
  };
}

/**
 * Intl's text for the range from `start` to `end`, in the `full` form:
 * "10–20", "10,00–20,00 €". Ends that write the same are written once
 * ("10", where Intl writes "~10"). A negative end in another `negative`
 * style than the minus writes each end whole around the locale's range
 * separator: "(10)–20".
 */
export function formatNumberRange(
  start: NumberLike,
  end: NumberLike,
  options: NumberOptions = {},
): string {
  const symbols = numberSymbols(options.locale, options);
  const grouping = groups(options, symbols, "full");
  const format = intlFormat(
    options.locale,
    intlOptions(
      options,
      "full",
      digitsFor(options, [
        shownDecimal(start, options),
        shownDecimal(end, options),
      ]),
      grouping,
    ),
  );
  const parts = format.formatRangeToParts(
    intlValue(start, options),
    intlValue(end, options),
  );
  if (!parts.some((part) => part.source === "endRange")) {
    return formatNumber(start, options, "full");
  }
  if (
    (options.negative ?? "minus") !== "minus" &&
    parts.some((part) => part.type === "minusSign")
  ) {
    const lastStart = parts.findLastIndex(
      (part) => part.source === "startRange",
    );
    const firstEnd = parts.findIndex((part) => part.source === "endRange");
    const separator = parts
      .slice(lastStart + 1, firstEnd)
      .filter((part) => part.type === "literal")
      .map((part) => part.value)
      .join("");
    return (
      formatNumber(start, options, "full") +
      separator +
      formatNumber(end, options, "full")
    );
  }
  return withFieldSymbols(parts, options, symbols, grouping)
    .map((part) => part.value)
    .join("");
}
