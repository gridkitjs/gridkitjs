import { localeKey } from "../localeKey";
import type { Severity } from "./severity";

/**
 * Every string the forms show or announce of their own: validation
 * messages, button names, counters, display-mode text and the message
 * summary, so the forms can speak a language other than English. A message
 * that names something takes a function, so a translation can put it where
 * its own grammar wants it. Counts print in the locale's digits: "1,000"
 * under `"en"`, "1.000" under `"de-DE"`.
 *
 * A minor release may add keys. `resolveFormsMessages` lays a partial set
 * over the defaults, so a translation without a new key shows its English
 * default until it gains one.
 */
export interface FormsMessages {
  /** A required field is empty. */
  required: string;
  /** A required checkbox is not checked. */
  requiredChecked: string;
  /** A required switch is off. */
  requiredOn: string;
  /** The text is shorter than `minLength`. */
  tooShort: (min: number) => string;
  /** The text is longer than `maxLength`. */
  tooLong: (max: number) => string;
  /** The text does not match `pattern`. */
  patternMismatch: string;
  /** A custom parser's fallback when the text cannot be read. */
  unreadable: string;
  /** A number field's text is not a number. */
  notANumber: string;
  /** A number field's text groups digits where the field does not; names its separators. */
  numberGrouping: (decimal: string, group: string) => string;
  /** A number field holding JS numbers was given more digits than one keeps exactly. */
  numberTooPrecise: string;
  /** A number is below `min`, written as the field writes numbers. */
  rangeUnderflow: (min: string) => string;
  /** A number is above `max`, written as the field writes numbers. */
  rangeOverflow: (max: string) => string;
  /** A number is off its step, written as the field writes numbers. */
  stepMismatch: (step: string) => string;
  /** A commit refused without a message, or a check that failed. */
  checkFailed: string;
  /** The clear button's accessible name. */
  clear: string;
  /** The password reveal button's accessible name. */
  showPassword: string;
  /** A number input's stepper button that steps up. */
  increase: string;
  /** A number input's stepper button that steps down. */
  decrease: string;
  /** A range input's first end, read with the field's label. */
  rangeStart: string;
  /** A range input's second end, read with the field's label. */
  rangeEnd: string;
  /** Drawn between a range input's two ends. */
  rangeSeparator: string;
  /** A range with only a start, in display mode; `start` as the input writes it. */
  rangeFrom: (start: string) => string;
  /** A range with only an end, in display mode; `end` as the input writes it. */
  rangeUpTo: (end: string) => string;
  /** A range's end comes before its start, and the input does not swap them. */
  rangeReversed: string;
  /** A half-open range's start is its end, so it holds nothing. */
  rangeEmpty: string;
  /** A range spans less than its minimum, written as the input writes spans. */
  rangeTooShort: (span: string) => string;
  /** A range spans more than its maximum, written as the input writes spans. */
  rangeTooLong: (span: string) => string;
  /** A range input's span, shown after its end. */
  rangeSpanLabel: (span: string) => string;
  /** A masked field's text leaves required slots empty. */
  maskIncomplete: string;
  /** The visible character counter. */
  counter: (count: number, max: number) => string;
  /** The counter's description, read with the control. */
  counterLabel: (max: number) => string;
  /** Announced as typing pauses near the limit. */
  charactersLeft: (left: number) => string;
  /** Announced as typing pauses over the limit. */
  charactersOver: (over: number) => string;
  /** Announced while an input loads. */
  loading: string;
  /** Read beside the dash an empty field shows in display mode. */
  emptyValue: string;
  /** A checked checkbox in display mode, and its event text. */
  displayChecked: string;
  /** An unchecked checkbox in display mode, and its event text. */
  displayUnchecked: string;
  /** A switch that is on, in display mode. */
  displayOn: string;
  /** A switch that is off, in display mode. */
  displayOff: string;
  /** The marker on an optional field's label. */
  optional: string;
  /** The help button's accessible name. */
  fieldHelp: string;
  /** A search input's placeholder. */
  searchPlaceholder: string;
  /** Read before a message, naming its severity. */
  severityLabel: (severity: Severity) => string;
  /** How many messages of one severity a summary holds. */
  severityCount: (severity: Severity, count: number) => string;
  /** The message summary's title. */
  messageSummaryTitle: (count: number) => string;
}

type CountFormat = (count: number) => string;

/**
 * Count formats already built, one per locale: building an
 * `Intl.NumberFormat` costs far more than using one.
 */
const countFormats = new Map<string, CountFormat>();

/** A count in `locale`'s digits and separators, whole. */
function countFormat(locale: Intl.LocalesArgument): CountFormat {
  const key = localeKey(locale);
  let format = countFormats.get(key);
  if (format === undefined) {
    const numberFormat = new Intl.NumberFormat(locale, {
      maximumFractionDigits: 0,
    });
    format = (count) => numberFormat.format(count);
    countFormats.set(key, format);
  }
  return format;
}

const SEVERITY_LABELS: Readonly<Record<Severity, string>> = {
  error: "Error",
  warning: "Warning",
  info: "Information",
  success: "Success",
};

/** The singular and plural noun a count of each severity takes. */
const SEVERITY_NOUNS: Readonly<Record<Severity, readonly [string, string]>> = {
  error: ["error", "errors"],
  warning: ["warning", "warnings"],
  info: ["note", "notes"],
  success: ["confirmation", "confirmations"],
};

/** "1 character", "3 characters": `count` with the noun in its number. */
function counted(
  n: CountFormat,
  count: number,
  [one, many]: readonly [string, string],
): string {
  return count === 1 ? `1 ${one}` : `${n(count)} ${many}`;
}

/**
 * The forms' own English, counts printed in `locale`'s digits. Without a
 * locale, the runtime's own; that one is `defaultFormsMessages`.
 */
export function createDefaultFormsMessages(
  locale?: Intl.LocalesArgument,
): FormsMessages {
  const n = countFormat(locale);
  const characters = ["character", "characters"] as const;
  return {
    required: "Enter a value",
    requiredChecked: "Check this box to continue",
    requiredOn: "Turn this on to continue",
    tooShort: (min) => `Enter at least ${counted(n, min, characters)}`,
    tooLong: (max) => `Enter no more than ${counted(n, max, characters)}`,
    patternMismatch: "Enter a value in the expected format",
    unreadable: "This value can't be read",
    notANumber: "Enter a number",
    numberGrouping: (decimal, group) =>
      `Use “${decimal}” for decimals and “${group}” between thousands`,
    numberTooPrecise: "This number has more digits than can be kept exactly",
    rangeUnderflow: (min) => `Enter ${min} or more`,
    rangeOverflow: (max) => `Enter ${max} or less`,
    stepMismatch: (step) => `Enter a multiple of ${step}`,
    checkFailed: "This value could not be checked",
    clear: "Clear",
    showPassword: "Show password",
    increase: "Increase",
    decrease: "Decrease",
    rangeStart: "From",
    rangeEnd: "To",
    rangeSeparator: "–",
    rangeFrom: (start) => `from ${start}`,
    rangeUpTo: (end) => `up to ${end}`,
    rangeReversed: "The end comes before the start",
    rangeEmpty: "The range is empty",
    rangeTooShort: (span) => `The range must span at least ${span}`,
    rangeTooLong: (span) => `The range must span no more than ${span}`,
    rangeSpanLabel: (span) => `Span: ${span}`,
    maskIncomplete: "Complete this field",
    counter: (count, max) => `${n(count)}/${n(max)}`,
    counterLabel: (max) => `Up to ${counted(n, max, characters)}`,
    charactersLeft: (left) => `${counted(n, left, characters)} left`,
    charactersOver: (over) => `${counted(n, over, characters)} too many`,
    loading: "Loading",
    emptyValue: "No value",
    displayChecked: "Yes",
    displayUnchecked: "No",
    displayOn: "On",
    displayOff: "Off",
    optional: "optional",
    fieldHelp: "More information",
    searchPlaceholder: "Search",
    severityLabel: (severity) => SEVERITY_LABELS[severity],
    severityCount: (severity, count) =>
      counted(n, count, SEVERITY_NOUNS[severity]),
    messageSummaryTitle: (count) =>
      count === 1
        ? "There is 1 problem with this form"
        : `There are ${n(count)} problems with this form`,
  };
}

/** The forms' own English, which an app's messages replace key by key. */
export const defaultFormsMessages: FormsMessages = createDefaultFormsMessages();

/** The defaults made for each locale so far, one object per locale. */
const localeDefaults = new Map<string, FormsMessages>();

function defaultsFor(locale: Intl.LocalesArgument): FormsMessages {
  if (locale === undefined) {
    return defaultFormsMessages;
  }
  const key = localeKey(locale);
  let defaults = localeDefaults.get(key);
  if (defaults === undefined) {
    defaults = createDefaultFormsMessages(locale);
    localeDefaults.set(key, defaults);
  }
  return defaults;
}

/**
 * `messages` over the defaults for `locale`: every key the forms need,
 * whichever the caller gave. The defaults themselves, the same object for
 * the same locale, when it gave none, so a renderer memoizing on the result
 * sees no change that is not one.
 */
export function resolveFormsMessages(
  messages: Partial<FormsMessages> | undefined,
  locale?: Intl.LocalesArgument,
): FormsMessages {
  const defaults = defaultsFor(locale);
  return messages === undefined ? defaults : { ...defaults, ...messages };
}
