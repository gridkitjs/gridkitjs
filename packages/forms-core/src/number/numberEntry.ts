import type { InputFilterDecision, TextEdit } from "../field/plan";
import { cleanPastedNumber } from "./cleanPastedNumber";
import { roundDecimal, type DecimalString } from "./decimal";
import { digitValue, isDigit } from "./digits";
import { formatNumber } from "./formatNumber";
import { numberFractionDigits, type NumberOptions } from "./options";
import { parseNumber } from "./parseNumber";
import { fieldSeparators, type NumberReadingInfo } from "./reading";
import { numberSymbols, type NumberSymbols } from "./symbols";

/** How a number field takes what is typed, pasted and dropped into it. */
export interface NumberEntryOptions extends NumberOptions {
  /** Whether a minus or parentheses may be typed; false for a field whose `min` is 0 or above. True by default. */
  readonly negatives?: boolean | undefined;
  /** Refuses a digit that would type more fraction digits than the maximum, instead of rounding them. */
  readonly limitFractionDigits?: boolean | undefined;
  /**
   * `"fixed"` (default): a field with fixed decimals shows them all while
   * it has a value, the decimal separator jumps into them and they are
   * typed over. `"free"`: digits and one separator, typed as anywhere else.
   */
  readonly decimalEntry?: "fixed" | "free" | undefined;
}

/** What a number field does with an edit, and how clean-up read a paste. */
export interface NumberEntry {
  readonly decision: InputFilterDecision;
  /** How clean-up read the paste or drop the decision inserts; `null` for any other edit. */
  readonly pasted: NumberReadingInfo | null;
}

const ALLOW = { kind: "allow" } as const;
const PREVENT = { kind: "prevent" } as const;
const SIGNS = new Set(["-", "\u2212", "+", "(", ")"]);
const MINUS_SIGNS = new Set(["-", "\u2212", "\uFE63"]);

function entry(
  decision: InputFilterDecision,
  pasted: NumberReadingInfo | null = null,
): NumberEntry {
  return { decision, pasted };
}

/**
 * The fraction digits a field types in place, or `null` when it types
 * them freely: with fixed-decimal entry, a minimum equal to a maximum
 * above zero.
 */
export function fixedFractionDigits(
  options: NumberEntryOptions,
): number | null {
  const { minimum, maximum } = numberFractionDigits(options);
  return options.decimalEntry !== "free" && maximum === minimum && minimum > 0
    ? minimum
    : null;
}

function isPaste(edit: TextEdit<unknown>): boolean {
  return edit.source === "paste" || edit.source === "drop";
}

/** What an edit inserted, from the text before and after it: the middle that differs. */
function insertedText(before: string, after: string): string {
  let start = 0;
  while (
    start < before.length &&
    start < after.length &&
    before[start] === after[start]
  ) {
    start += 1;
  }
  let end = 0;
  while (
    end < before.length - start &&
    end < after.length - start &&
    before[before.length - 1 - end] === after[after.length - 1 - end]
  ) {
    end += 1;
  }
  return after.slice(start, after.length - end);
}

/** The stretch of `before` an edit removed, from the text after it. */
function removedRange(
  before: string,
  after: string,
): readonly [start: number, end: number] {
  let start = 0;
  while (
    start < before.length &&
    start < after.length &&
    before[start] === after[start]
  ) {
    start += 1;
  }
  let end = before.length;
  while (
    end > start &&
    end - start > before.length - after.length &&
    before[end - 1] === after[after.length - (before.length - end) - 1]
  ) {
    end -= 1;
  }
  return [start, end];
}

/** The characters typed for the decimal point: the field's separator and its lookalikes. */
function decimalChars(symbols: NumberSymbols): ReadonlySet<string> {
  return fieldSeparators(symbols).decimal;
}

/**
 * Whether the groups typed so far fit the field's grouping, the last one
 * still being typed: the first 1 to the larger size long, the ones after
 * either size, the last no longer than the primary size.
 */
function groupsSoFarFit(integer: string, symbols: NumberSymbols): boolean {
  const separators = fieldSeparators(symbols).group;
  const groups: string[] = [];
  let group = "";
  for (const char of integer) {
    if (separators.has(char)) {
      groups.push(group);
      group = "";
    } else {
      group += char;
    }
  }
  groups.push(group);
  const [primary, secondary] = symbols.groupSizes;
  const [first = "", ...rest] = groups;
  const last = rest.pop();
  return (
    first.length >= 1 &&
    first.length <= Math.max(primary, secondary) &&
    rest.every(
      (group) => group.length === primary || group.length === secondary,
    ) &&
    (last === undefined || last.length <= primary)
  );
}

/** The integer part of typed text: its characters before the decimal separator, signs left out. */
function integerText(text: string, decimals: ReadonlySet<string>): string {
  let integer = "";
  for (const char of text) {
    if (decimals.has(char)) {
      break;
    }
    if (!SIGNS.has(char)) {
      integer += char;
    }
  }
  return integer;
}

/** The text a number field could still become a number from: anything but `notANumber`. */
function isValidStart(text: string, options: NumberOptions): boolean {
  const reading = parseNumber(text, options);
  return reading.kind !== "unreadable" || reading.reason !== "notANumber";
}

/** The digits typed after the decimal separator of `text`. */
function fractionDigitsTyped(text: string, symbols: NumberSymbols): number {
  const decimals = decimalChars(symbols);
  const point = Array.from(text).findIndex((char) => decimals.has(char));
  if (point === -1) {
    return 0;
  }
  return Array.from(text)
    .slice(point + 1)
    .filter(isDigit).length;
}

/** Free entry: the edit stands when it leaves text that can still become a number. */
function filterFree<N>(
  edit: TextEdit<N>,
  before: string,
  options: NumberEntryOptions,
  symbols: NumberSymbols,
): NumberEntry {
  const input = edit.input;
  const inputType = input?.inputType ?? null;
  if (
    inputType === null ||
    inputType.startsWith("delete") ||
    inputType.startsWith("history")
  ) {
    return entry(ALLOW);
  }
  if (isPaste(edit)) {
    const pasted = input?.data ?? insertedText(before, edit.text);
    const cleaned = cleanPastedNumber(pasted, options);
    if (cleaned === null) {
      return entry(PREVENT);
    }
    const start = input?.selectionStart ?? before.length;
    const end = input?.selectionEnd ?? start;
    const text = before.slice(0, start) + cleaned.text + before.slice(end);
    return isValidStart(text, options)
      ? entry({ kind: "rewrite", data: cleaned.text }, cleaned.info)
      : entry(PREVENT);
  }
  const data = input?.data ?? insertedText(before, edit.text);
  const separators = fieldSeparators(symbols);
  const fractions = numberFractionDigits(options).maximum !== 0;
  const negatives = options.negatives !== false;
  for (const char of data) {
    const allowed =
      isDigit(char) ||
      (fractions && separators.decimal.has(char)) ||
      separators.group.has(char) ||
      (SIGNS.has(char) && (negatives || char === "+"));
    if (!allowed) {
      return entry(PREVENT);
    }
  }
  const text = edit.text;
  if (!isValidStart(text, options)) {
    return entry(PREVENT);
  }
  if (
    Array.from(data).some((char) => separators.group.has(char)) &&
    !groupsSoFarFit(integerText(text, separators.decimal), symbols)
  ) {
    return entry(PREVENT);
  }
  const { maximum } = numberFractionDigits(options);
  if (
    options.limitFractionDigits === true &&
    maximum !== null &&
    fractionDigitsTyped(text, symbols) > maximum
  ) {
    return entry(PREVENT);
  }
  return entry(ALLOW);
}

/**
 * A fixed-decimal text, read into its parts: an optional sign, the integer
 * digits and the fraction digits, with where each starts in the text.
 */
interface FixedText {
  readonly negative: boolean;
  readonly integer: string;
  readonly fraction: string;
  /** Where the integer digits start: after the sign. */
  readonly integerStart: number;
  /** Where the integer digits end: at the separator, or the end of the text. */
  readonly integerEnd: number;
  /** Where the fraction digits start: after the separator. */
  readonly fractionStart: number;
}

/** Where an edit is, in the parts of a fixed-decimal text. */
type FixedCaret =
  | { readonly part: "integer"; readonly index: number }
  | { readonly part: "fraction"; readonly index: number };

/** A fixed-decimal number being edited: its digits as arrays, and the caret. */
interface FixedDraft {
  negative: boolean;
  integer: string[];
  fraction: string[];
  caret: FixedCaret;
}

/** Reads `text` as a fixed-decimal text, or `null` when it holds anything else. */
function readFixed(text: string, symbols: NumberSymbols): FixedText | null {
  const decimals = decimalChars(symbols);
  const at = (offset: number) => text[offset] ?? "";
  let index = 0;
  let negative = false;
  if (MINUS_SIGNS.has(at(0)) || (text !== "" && at(0) === symbols.minus)) {
    negative = true;
    index = 1;
  }
  const integerStart = index;
  let integer = "";
  while (index < text.length && isDigit(at(index))) {
    integer += at(index);
    index += 1;
  }
  const integerEnd = index;
  let fraction = "";
  let fractionStart = index;
  if (index < text.length && decimals.has(at(index))) {
    index += 1;
    fractionStart = index;
    while (index < text.length && isDigit(at(index))) {
      fraction += at(index);
      index += 1;
    }
  }
  return index === text.length
    ? { negative, integer, fraction, integerStart, integerEnd, fractionStart }
    : null;
}

/** Where `offset` in the text falls among a fixed-decimal text's parts. */
function caretAt(text: FixedText, offset: number): FixedCaret {
  if (offset <= text.integerEnd) {
    return {
      part: "integer",
      index: Math.max(0, offset - text.integerStart),
    };
  }
  return {
    part: "fraction",
    index: Math.min(
      text.fraction.length,
      Math.max(0, offset - text.fractionStart),
    ),
  };
}

/** The field's own digit for a typed one in any script. */
function fieldDigit(char: string, symbols: NumberSymbols): string {
  return Array.from(symbols.digits)[digitValue(char)] ?? char;
}

function zeroOf(symbols: NumberSymbols): string {
  return Array.from(symbols.digits)[0] ?? "0";
}

/** `fraction` padded or cut to `digits`, with the field's zero. */
function fitFraction(
  fraction: readonly string[],
  digits: number,
  zero: string,
): string[] {
  const fitted = fraction.slice(0, digits);
  while (fitted.length < digits) {
    fitted.push(zero);
  }
  return fitted;
}

/**
 * Removes `start` to `end` of the text: integer digits go, fraction digits
 * turn to zero in place (so the decimals never shift), a sign inside it
 * goes, the separator stays. The caret lands at `start`.
 */
function removeFixed(
  draft: FixedDraft,
  text: FixedText,
  start: number,
  end: number,
  zero: string,
): void {
  if (start < text.integerStart && end > 0) {
    draft.negative = false;
  }
  const integerFrom = Math.max(start, text.integerStart) - text.integerStart;
  const integerTo = Math.min(end, text.integerEnd) - text.integerStart;
  if (integerTo > integerFrom) {
    draft.integer.splice(integerFrom, integerTo - integerFrom);
  }
  const fractionFrom = Math.max(start, text.fractionStart) - text.fractionStart;
  const fractionTo =
    Math.min(end, text.fractionStart + draft.fraction.length) -
    text.fractionStart;
  for (let index = fractionFrom; index < fractionTo; index += 1) {
    draft.fraction[index] = zero;
  }
  draft.caret =
    start <= text.integerEnd
      ? { part: "integer", index: integerFrom }
      : { part: "fraction", index: Math.max(0, fractionFrom) };
}

/**
 * Backspace or Delete with nothing selected, keeping the decimals' shape:
 * in the decimals one turns to zero and the caret moves past it; from the
 * first decimal Backspace deletes the last integer digit, and Delete from
 * the end of the integer part zeroes the first decimal. `beforeSign`: the
 * caret is in front of the minus. False when there is nothing to delete.
 */
function deleteFixed(
  draft: FixedDraft,
  backward: boolean,
  beforeSign: boolean,
  zero: string,
): boolean {
  const { caret } = draft;
  if (backward) {
    if (caret.part === "fraction" && caret.index > 0) {
      draft.fraction[caret.index - 1] = zero;
      draft.caret = { part: "fraction", index: caret.index - 1 };
      return true;
    }
    const index =
      caret.part === "fraction" ? draft.integer.length : caret.index;
    if (index > 0) {
      draft.integer.splice(index - 1, 1);
      draft.caret = { part: "integer", index: index - 1 };
      return true;
    }
    if (draft.negative && !beforeSign) {
      draft.negative = false;
      return true;
    }
    return false;
  }
  if (beforeSign) {
    draft.negative = false;
    return true;
  }
  if (caret.part === "integer" && caret.index < draft.integer.length) {
    draft.integer.splice(caret.index, 1);
    return true;
  }
  const index = caret.part === "fraction" ? caret.index : 0;
  if (index < draft.fraction.length) {
    draft.fraction[index] = zero;
    draft.caret = { part: "fraction", index: index + 1 };
    return true;
  }
  return false;
}

/**
 * Types one character into a fixed-decimal draft: a digit goes into the
 * integer part or over the next decimal, the decimal separator (or `.`
 * or `,`) moves into the decimals, a minus at the start makes it negative. False
 * when the character is refused.
 */
function typeFixed(
  draft: FixedDraft,
  char: string,
  options: NumberEntryOptions,
  symbols: NumberSymbols,
): boolean {
  const { caret } = draft;
  if (isDigit(char)) {
    const digit = fieldDigit(char, symbols);
    if (caret.part === "integer") {
      // A lone zero holds the place of the integer part, so a digit typed
      // beside it takes its place.
      if (draft.integer.length === 1 && draft.integer[0] === zeroOf(symbols)) {
        draft.integer = [digit];
        draft.caret = { part: "integer", index: 1 };
        return true;
      }
      draft.integer.splice(caret.index, 0, digit);
      draft.caret = { part: "integer", index: caret.index + 1 };
      return true;
    }
    if (caret.index >= draft.fraction.length) {
      return false;
    }
    draft.fraction[caret.index] = digit;
    draft.caret = { part: "fraction", index: caret.index + 1 };
    return true;
  }
  // Both marks jump, whichever the locale groups with: a phone's decimal
  // key types the device's separator, which need not be the field's.
  if (char === "." || char === "," || decimalChars(symbols).has(char)) {
    if (caret.part === "integer") {
      if (draft.integer.length === 0) {
        draft.integer = [zeroOf(symbols)];
      }
      draft.caret = { part: "fraction", index: 0 };
    }
    return true;
  }
  if (
    (MINUS_SIGNS.has(char) || char === symbols.minus) &&
    options.negatives !== false &&
    !draft.negative &&
    caret.part === "integer" &&
    caret.index === 0
  ) {
    draft.negative = true;
    return true;
  }
  return false;
}

/**
 * A fixed-decimal draft as the field's edit text, and where the caret goes
 * in it. Leading zeros go; an integer part with no digits shows "0" while
 * a decimal is not zero; with no digit that counts left, the text is
 * empty (or the lone minus just typed).
 */
function writeFixed(
  draft: FixedDraft,
  digits: number,
  symbols: NumberSymbols,
): { readonly text: string; readonly caret: number } {
  const zero = zeroOf(symbols);
  let integer = [...draft.integer];
  let { caret } = draft;
  while (integer.length > 1 && integer[0] === zero) {
    integer = integer.slice(1);
    if (caret.part === "integer") {
      caret = { part: "integer", index: Math.max(0, caret.index - 1) };
    }
  }
  const fraction = fitFraction(draft.fraction, digits, zero);
  const typedFraction = draft.fraction.some((digit) => digit !== zero);
  if (integer.length === 0) {
    if (!typedFraction && draft.fraction.length > 0) {
      return { text: "", caret: 0 };
    }
    if (!typedFraction) {
      const sign = draft.negative ? symbols.minus : "";
      return { text: sign, caret: sign.length };
    }
    integer = [zero];
    if (caret.part === "integer") {
      caret = { part: "integer", index: 1 };
    }
  }
  const sign = draft.negative ? symbols.minus : "";
  const integerText = integer.join("");
  const text = sign + integerText + symbols.decimal + fraction.join("");
  const fractionStart =
    sign.length + integerText.length + symbols.decimal.length;
  return {
    text,
    caret:
      caret.part === "integer"
        ? sign.length + Math.min(caret.index, integerText.length)
        : fractionStart + Math.min(caret.index, digits),
  };
}

/** A pasted number as the field's fixed-decimal edit text, rounded, with the caret at the end of its integer part. */
function pastedFixed(
  decimal: DecimalString,
  digits: number,
  options: NumberEntryOptions,
  symbols: NumberSymbols,
): InputFilterDecision {
  const rounded = roundDecimal(
    decimal,
    digits,
    options.roundingMode ?? "halfExpand",
  );
  const text = formatNumber(
    rounded,
    {
      ...options,
      style: "decimal",
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    },
    "edit",
  );
  const point = text.lastIndexOf(symbols.decimal);
  return { kind: "replace", text, caret: point === -1 ? text.length : point };
}

/** Fixed-decimal entry for a paste or drop. */
function pasteFixed<N>(
  edit: TextEdit<N>,
  before: string,
  current: FixedText,
  digits: number,
  options: NumberEntryOptions,
  symbols: NumberSymbols,
): NumberEntry {
  const input = edit.input;
  const pasted = input?.data ?? insertedText(before, edit.text);
  const cleaned = cleanPastedNumber(pasted, options);
  if (cleaned === null) {
    return entry(PREVENT);
  }
  const reading = parseNumber(cleaned.text, { ...options, style: "decimal" });
  if (reading.kind !== "number") {
    return entry(PREVENT);
  }
  const start = input?.selectionStart ?? before.length;
  const end = input?.selectionEnd ?? start;
  const whole = start === 0 && end === before.length;
  const intoInteger =
    !whole &&
    before !== "" &&
    cleaned.info.decimalSeparator === null &&
    cleaned.info.negative === null &&
    end <= current.integerEnd &&
    start >= current.integerStart;
  if (!intoInteger) {
    return entry(
      pastedFixed(reading.decimal, digits, options, symbols),
      cleaned.info,
    );
  }
  const draft: FixedDraft = {
    negative: current.negative,
    integer: Array.from(current.integer),
    fraction: Array.from(current.fraction),
    caret: caretAt(current, start),
  };
  removeFixed(draft, current, start, end, zeroOf(symbols));
  for (const char of cleaned.text) {
    typeFixed(draft, char, options, symbols);
  }
  const written = writeFixed(draft, digits, symbols);
  return entry(
    { kind: "replace", text: written.text, caret: written.caret },
    cleaned.info,
  );
}

/**
 * Fixed-decimal entry: every edit is worked out on the text's parts and
 * the whole text replaced, so the decimals keep their count and place.
 */
function filterFixed<N>(
  edit: TextEdit<N>,
  before: string,
  digits: number,
  options: NumberEntryOptions,
  symbols: NumberSymbols,
): NumberEntry | null {
  const input = edit.input;
  const inputType = input?.inputType ?? null;
  if (input === null || inputType === null || inputType.startsWith("history")) {
    return entry(ALLOW);
  }
  const current = readFixed(before, symbols);
  if (current === null) {
    return null;
  }
  if (isPaste(edit)) {
    return pasteFixed(edit, before, current, digits, options, symbols);
  }
  const zero = zeroOf(symbols);
  const start = Math.min(input.selectionStart ?? before.length, before.length);
  const end = Math.min(input.selectionEnd ?? start, before.length);
  const whole = before !== "" && start === 0 && end === before.length;
  const draft: FixedDraft = whole
    ? {
        negative: false,
        integer: [],
        fraction: [],
        caret: { part: "integer", index: 0 },
      }
    : {
        negative: current.negative,
        integer: Array.from(current.integer),
        fraction: Array.from(current.fraction),
        caret: caretAt(current, start),
      };
  const deleting = inputType.startsWith("delete");
  if (whole && deleting) {
    return entry({ kind: "replace", text: "", caret: 0 });
  }
  if (!whole && start < end) {
    removeFixed(draft, current, start, end, zero);
  } else if (!whole && deleting) {
    if (
      inputType === "deleteContentBackward" ||
      inputType === "deleteContentForward"
    ) {
      if (
        !deleteFixed(
          draft,
          inputType === "deleteContentBackward",
          start < current.integerStart,
          zero,
        )
      ) {
        return entry(PREVENT);
      }
    } else {
      const [from, to] = removedRange(before, edit.text);
      if (from === to) {
        return entry(PREVENT);
      }
      removeFixed(draft, current, from, to, zero);
    }
  }
  if (!deleting) {
    const data = input.data ?? insertedText(before, edit.text);
    for (const char of data) {
      if (!typeFixed(draft, char, options, symbols)) {
        return entry(PREVENT);
      }
    }
  }
  const written = writeFixed(draft, digits, symbols);
  if (written.text === before && start === end && written.caret === start) {
    return entry(PREVENT);
  }
  return entry({ kind: "replace", text: written.text, caret: written.caret });
}

/**
 * A number field's judgement of an edit, its `filterInput`: `edit` is the
 * edit as the app's `onBeforeInput` left it, `before` the text before it.
 *
 * Free entry keeps what can still become a number: digits, the decimal
 * separator once (none in a field with no fraction digits), group
 * separators where the grouping allows, a sign (none when `negatives` is
 * false). Letters, currency signs and the rest are refused, deletions and
 * undo always stand, and a paste or drop is cleaned by `cleanPastedNumber`
 * and inserted in its place, or refused.
 *
 * A field with fixed decimals (`fixedFractionDigits`) replaces the whole
 * text on every edit instead: the decimals always show once it has a
 * value, digits go before them, the decimal separator (or `.` or `,`)
 * moves the caret into them, they are typed over and never grow, and deleting turns
 * one to zero. A paste is rounded to them. Text that is not a
 * fixed-decimal text (after an undo) is edited freely until it is again.
 */
export function filterNumberEdit<N>(
  edit: TextEdit<N>,
  before: string,
  options: NumberEntryOptions = {},
): NumberEntry {
  const symbols = numberSymbols(options.locale, options);
  const digits = fixedFractionDigits(options);
  if (digits !== null) {
    const fixed = filterFixed(edit, before, digits, options, symbols);
    if (fixed !== null) {
      return fixed;
    }
  }
  return filterFree(edit, before, options, symbols);
}

/**
 * Where the caret goes when a number field's text is written again (the
 * edit form on focus, the padded text on commit): after as many digits,
 * decimal separators and signs as it had before it, so group separators
 * added or removed around it do not move it. A caret at the end stays at
 * the end.
 */
export function numberCaret(
  options: NumberOptions = {},
): (previousText: string, caret: number, nextText: string) => number {
  const symbols = numberSymbols(options.locale, options);
  const decimals = decimalChars(symbols);
  const significant = (char: string) =>
    isDigit(char) ||
    decimals.has(char) ||
    SIGNS.has(char) ||
    char === symbols.minus;
  return (previousText, caret, nextText) => {
    if (caret >= previousText.length) {
      return nextText.length;
    }
    let count = 0;
    for (let index = 0; index < caret; index += 1) {
      if (significant(previousText[index] ?? "")) {
        count += 1;
      }
    }
    if (count === 0) {
      return 0;
    }
    for (let index = 0; index < nextText.length; index += 1) {
      if (significant(nextText[index] ?? "")) {
        count -= 1;
        if (count === 0) {
          return index + 1;
        }
      }
    }
    return nextText.length;
  };
}
