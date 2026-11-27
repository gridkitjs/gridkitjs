import { digitValue, isDigit } from "./digits";
import type { NumberOptions } from "./options";
import {
  digitSystems,
  fieldSeparators,
  groupingFits,
  plainNumberText,
  readSign,
  withoutAffixes,
  type NumberReadingInfo,
} from "./reading";
import { numberSymbols, type NumberSymbols } from "./symbols";

/** A paste turned into the field's own text, and how it was read. */
export interface CleanedNumber {
  /** The field's edit text: its digits and decimal separator, a leading minus, no grouping, every digit kept. */
  readonly text: string;
  /** How the pasted text was read; `cleaned` is true. */
  readonly info: NumberReadingInfo;
}

const CURRENCY_SIGN = /\p{Sc}/gu;
const PERCENT_SIGNS = /[%\u066A\uFE6A]/g;
const UPPER_WORD = /(?<![A-Za-z])[A-Z]{3}(?![A-Za-z])/g;
const LETTER = /\p{L}/u;
const APOSTROPHES = new Set(["'", "\u2019", "\u02BC"]);
/** The Arabic group separator and comma, which never mark a decimal point. */
const ARABIC_GROUPS = new Set(["\u066C", "\u060C"]);
const ARABIC_DECIMAL = "\u066B";

/** ISO 4217 codes Intl knows, read once. */
let currencyCodes: ReadonlySet<string> | undefined;

function isCurrencyCode(word: string): boolean {
  currencyCodes ??= new Set(Intl.supportedValuesOf("currency"));
  return currencyCodes.has(word);
}

/** `text` without currency signs and codes or percent signs; other letters stay, to refuse the paste. */
function withoutSymbols(text: string, symbols: NumberSymbols): string {
  return text
    .replace(UPPER_WORD, (word) => (isCurrencyCode(word) ? " " : word))
    .replace(CURRENCY_SIGN, "")
    .replace(PERCENT_SIGNS, "")
    .replaceAll(symbols.percent, "")
    .trim();
}

type Character =
  | { readonly kind: "digit"; readonly value: number }
  | { readonly kind: "group" }
  | { readonly kind: "decimal" }
  | { readonly kind: "mark"; readonly char: string };

/**
 * What one pasted character can be: spaces and apostrophes always group,
 * as do the Arabic group separator and comma; the Arabic decimal separator
 * is always the point; `.`, `,` and the field's own separators are marks
 * whose role depends on the rest. `null` for anything else.
 */
function characterOf(char: string, symbols: NumberSymbols): Character | null {
  if (isDigit(char)) {
    return { kind: "digit", value: digitValue(char) };
  }
  if (/\s/u.test(char) || APOSTROPHES.has(char) || ARABIC_GROUPS.has(char)) {
    return { kind: "group" };
  }
  if (char === ARABIC_DECIMAL) {
    return { kind: "decimal" };
  }
  return char === "." ||
    char === "," ||
    char === symbols.decimal ||
    char === symbols.group
    ? { kind: "mark", char }
    : null;
}

/**
 * Which mark is the decimal point, or `null` for none:
 *
 * - two different marks: the one that comes last;
 * - one mark, more than once: none, it groups;
 * - one mark, once: the field's decimal separator (or a lookalike) is the
 *   point; any other mark groups when the field's grouping fits it and is
 *   the point when it does not ("1,5" is 1.5 in `en-US`, "1.234" 1234 in
 *   `de-DE`).
 */
function decimalMark(
  characters: readonly Character[],
  symbols: NumberSymbols,
): string | null {
  const marks = characters.flatMap((character) =>
    character.kind === "mark" ? [character.char] : [],
  );
  const distinct = new Set(marks);
  const [only] = distinct;
  if (distinct.size > 1) {
    return marks.at(-1) ?? null;
  }
  if (only === undefined || marks.length > 1) {
    return null;
  }
  if (fieldSeparators(symbols).decimal.has(only)) {
    return only;
  }
  const groups: string[] = [];
  let group = "";
  for (const character of characters) {
    if (character.kind === "digit") {
      group += String(character.value);
    } else {
      groups.push(group);
      group = "";
    }
  }
  groups.push(group);
  return groupingFits(groups, symbols.groupSizes) ? null : only;
}

/**
 * Turns pasted or dropped text, copied from a web page, a PDF or a
 * spreadsheet in another locale, into the field's own edit text, or
 * returns `null` to refuse it. Currency signs and codes, percent signs and
 * the field's unit are dropped; parentheses or a leading or trailing minus
 * give the sign; any other letter refuses the paste, since dropping it
 * could change the number ("12abc", "1e5"). When both `.` and `,` appear,
 * the last is the decimal point ("$1,234.50" becomes "1234,50" in
 * `de-DE`); a lone mark is decided by the field's locale, so "1.234"
 * pasted into `de-DE` is 1234.
 */
export function cleanPastedNumber(
  text: string,
  options: NumberOptions = {},
): CleanedNumber | null {
  const symbols = numberSymbols(options.locale, options);
  const rest = withoutSymbols(
    withoutAffixes(plainNumberText(text), options, symbols),
    symbols,
  );
  const sign = readSign(rest);
  if (!sign.closed || LETTER.test(sign.body)) {
    return null;
  }
  const characters: Character[] = [];
  for (const char of sign.body) {
    const character = characterOf(char, symbols);
    if (character === null) {
      return null;
    }
    characters.push(character);
  }
  const point = characters.some((character) => character.kind === "decimal")
    ? ARABIC_DECIMAL
    : decimalMark(characters, symbols);
  const fieldDigits = Array.from(symbols.digits);
  let integer = "";
  let fraction: string | null = null;
  let grouped = false;
  for (const character of characters) {
    const isPoint =
      character.kind === "decimal" ||
      (character.kind === "mark" && character.char === point);
    if (isPoint) {
      if (fraction !== null) {
        return null;
      }
      fraction = "";
    } else if (character.kind === "digit") {
      const digit = fieldDigits[character.value] ?? String(character.value);
      if (fraction === null) {
        integer += digit;
      } else {
        fraction += digit;
      }
    } else if (fraction === null) {
      grouped = true;
    } else {
      return null;
    }
  }
  const digits = integer + (fraction ?? "");
  if (digits === "") {
    return null;
  }
  const negative =
    sign.negative !== null &&
    characters.some(
      (character) => character.kind === "digit" && character.value > 0,
    )
      ? sign.negative
      : null;
  return {
    text: `${negative === null ? "" : symbols.minus}${integer}${fraction === null ? "" : symbols.decimal + fraction}`,
    info: {
      decimalSeparator: fraction === null ? null : point,
      grouped,
      negative,
      digits: digitSystems(text),
      cleaned: true,
    },
  };
}
