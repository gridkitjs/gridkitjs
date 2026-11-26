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
  /** A commit refused without a message, or a check that failed. */
  checkFailed: string;
  /** The clear button's accessible name. */
  clear: string;
  /** The password reveal button's accessible name. */
  showPassword: string;
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
    checkFailed: "This value could not be checked",
    clear: "Clear",
    showPassword: "Show password",
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
