import { isDigit, numberingSystemOf } from "./digits";
import { numberAffixes } from "./formatNumber";
import type { NegativeStyle, NumberOptions } from "./options";
import { DIRECTION_MARKS, type NumberSymbols } from "./symbols";

/** How a text was read. */
export interface NumberReadingInfo {
  /** The character taken as the decimal point, as typed; `null` when there was none. */
  readonly decimalSeparator: string | null;
  /** Whether the integer digits were grouped. */
  readonly grouped: boolean;
  /** How a negative number was written; `null` for one that is not negative. */
  readonly negative: NegativeStyle | null;
  /** The numbering systems of the digits typed, in the order met: `["latn"]`, `["arab"]`, `["latn", "fullwide"]`. */
  readonly digits: readonly string[];
  /** The text was a paste or drop that clean-up rewrote. */
  readonly cleaned: boolean;
}

const FULL_WIDTH = /[\uFF01-\uFF5E]/g;
const MINUS_SIGNS = /[\u2212\uFE63]/g;

/**
 * `text` with the noise of where it came from removed: direction marks
 * dropped, full-width forms (which a Chinese or Japanese input method
 * types) turned into ASCII, every minus sign into `-`, and trimmed.
 */
export function plainNumberText(text: string): string {
  return text
    .replace(DIRECTION_MARKS, "")
    .replace(FULL_WIDTH, (char) =>
      String.fromCharCode(char.charCodeAt(0) - 0xfee0),
    )
    .replace(MINUS_SIGNS, "-")
    .trim();
}

/** The numbering systems of the digits in `text`, in the order met. */
export function digitSystems(text: string): string[] {
  const systems = new Set<string>();
  for (const char of text) {
    if (isDigit(char)) {
      systems.add(numberingSystemOf(char));
    }
  }
  return [...systems];
}

const SPACES = [" ", "\u00A0", "\u202F", "\u2009"];
/** The apostrophes typed for an apostrophe group separator, as in `de-CH`. */
export const APOSTROPHES: readonly string[] = ["'", "\u2019", "\u02BC"];
const ARABIC_GROUP = "\u066C";
const ARABIC_DECIMAL = "\u066B";

/** `separator` and the characters typed for it: any space for a space, any apostrophe for an apostrophe. */
function lookalikes(separator: string): readonly string[] {
  if (SPACES.includes(separator)) {
    return SPACES;
  }
  if (APOSTROPHES.includes(separator)) {
    return APOSTROPHES;
  }
  if (separator === ARABIC_GROUP) {
    return [ARABIC_GROUP, ",", "\u060C"];
  }
  if (separator === ARABIC_DECIMAL) {
    return [ARABIC_DECIMAL, "."];
  }
  return separator === "" ? [] : [separator];
}

/** The characters a field reads as its decimal point and as its group separator. */
export interface FieldSeparators {
  readonly decimal: ReadonlySet<string>;
  readonly group: ReadonlySet<string>;
}

/** The field's separators and their lookalikes; the decimal's own character wins a clash. */
export function fieldSeparators(symbols: NumberSymbols): FieldSeparators {
  const decimal = new Set(
    lookalikes(symbols.decimal).filter((char) => char !== symbols.group),
  );
  const group = new Set(
    lookalikes(symbols.group).filter((char) => !decimal.has(char)),
  );
  return { decimal, group };
}

/**
 * Whether integer digit groups (as split by group separators) are grouped
 * the way the field groups: the first group 1 to the larger size long, the
 * last exactly the primary size, every one between either size. So `en-IN`
 * reads both "12,34,567" and "1,234,567", and `en-US` neither "12,34,567"
 * nor "1,5".
 */
export function groupingFits(
  groups: readonly string[],
  [primary, secondary]: NumberSymbols["groupSizes"],
): boolean {
  const [first = "", ...rest] = groups;
  const last = rest.at(-1);
  return (
    first.length >= 1 &&
    first.length <= Math.max(primary, secondary) &&
    last?.length === primary &&
    rest
      .slice(0, -1)
      .every((group) => group.length === secondary || group.length === primary)
  );
}

/** The currency, percent and unit texts a field accepts around its number, longest first. */
function affixTokens(options: NumberOptions, symbols: NumberSymbols): string[] {
  const style = options.style ?? "decimal";
  if (style === "decimal") {
    return [];
  }
  const { prefix, suffix } = numberAffixes(options);
  const tokens = [prefix, suffix];
  if (style === "currency" && options.currency !== undefined) {
    tokens.push(options.currency.toUpperCase());
  }
  if (style === "percent") {
    tokens.push("%", symbols.percent);
  }
  return [...new Set(tokens.map(plainNumberText))]
    .filter((token) => token !== "")
    .sort((a, b) => b.length - a.length);
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * `text` with the field's own currency sign or code, percent sign or unit
 * removed from either end, inside or outside a sign: "-$1,234.50",
 * "1.234,50- €" and "(1.234,50 €)" keep their signs.
 */
export function withoutAffixes(
  text: string,
  options: NumberOptions,
  symbols: NumberSymbols,
): string {
  let rest = text;
  for (const token of affixTokens(options, symbols)) {
    const escaped = escapeRegExp(token);
    rest = rest
      .replace(new RegExp(`^([-+(]?)\\s*${escaped}\\s*`, "u"), "$1")
      .replace(new RegExp(`\\s*${escaped}\\s*([-)]?)$`, "u"), "$1");
  }
  return rest.trim();
}

/** The sign of a number's text, and the text inside it. */
export interface SignedText {
  readonly body: string;
  readonly negative: NegativeStyle | null;
  /** False for an opening parenthesis with no closing one yet. */
  readonly closed: boolean;
}

/** Reads a leading `-` or `+`, a trailing `-`, or parentheses around the whole text. */
export function readSign(text: string): SignedText {
  if (text.startsWith("(")) {
    const closed = text.endsWith(")") && text.length > 1;
    return {
      body: text.slice(1, closed ? -1 : undefined).trim(),
      negative: "parentheses",
      closed,
    };
  }
  if (text.startsWith("-") || text.startsWith("+")) {
    return {
      body: text.slice(1).trim(),
      negative: text.startsWith("-") ? "minus" : null,
      closed: true,
    };
  }
  if (text.endsWith("-")) {
    return {
      body: text.slice(0, -1).trim(),
      negative: "trailingMinus",
      closed: true,
    };
  }
  return { body: text, negative: null, closed: true };
}
