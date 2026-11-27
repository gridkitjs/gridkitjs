import type { DecimalString } from "./decimal";
import { digitValue, isDigit } from "./digits";
import type { NumberOptions } from "./options";
import {
  digitSystems,
  fieldSeparators,
  groupingFits,
  plainNumberText,
  readSign,
  withoutAffixes,
  type FieldSeparators,
  type NumberReadingInfo,
} from "./reading";
import { numberSymbols, type NumberSymbols } from "./symbols";

/**
 * Why a text is not a number:
 *
 * - `notANumber`: a letter, a second decimal separator, a group separator
 *   after it, an exponent.
 * - `incomplete`: a sign or separator with no digit yet ("-", ","), or an
 *   opening parenthesis with no closing one.
 * - `grouping`: group separators where the field does not group ("1,5" in
 *   `en-US`).
 * - `tooPrecise`: more digits than a JS number keeps exactly, for a field
 *   holding numbers (`numberParser`).
 *
 * A minor release may add a member.
 */
export type NumberUnreadableReason =
  "notANumber" | "incomplete" | "grouping" | "tooPrecise";

/** What a text reads as: nothing, an exact number, or why it is not one. */
export type NumberReading =
  | { readonly kind: "empty" }
  | {
      readonly kind: "number";
      /** Exact, as typed: point decimal, no grouping, no trailing fraction zeros. */
      readonly decimal: DecimalString;
      readonly info: NumberReadingInfo;
    }
  | { readonly kind: "unreadable"; readonly reason: NumberUnreadableReason };

const EMPTY = { kind: "empty" } as const;

function unreadableBecause(reason: NumberUnreadableReason): NumberReading {
  return { kind: "unreadable", reason };
}

/** The digits of a number's text, in ASCII, and how it was written. */
interface NumberBody {
  readonly integer: string;
  readonly fraction: string;
  readonly decimalSeparator: string | null;
  readonly grouped: boolean;
}

/** Reads digits and separators: any decimal digits, the field's separators and their lookalikes. */
function readBody(
  body: string,
  separators: FieldSeparators,
  groupSizes: NumberSymbols["groupSizes"],
): NumberBody | NumberUnreadableReason {
  const groups: string[] = [];
  let group = "";
  let fraction = "";
  let decimalSeparator: string | null = null;
  for (const char of body) {
    if (isDigit(char)) {
      const digit = String(digitValue(char));
      if (decimalSeparator === null) {
        group += digit;
      } else {
        fraction += digit;
      }
    } else if (decimalSeparator === null && separators.decimal.has(char)) {
      decimalSeparator = char;
    } else if (decimalSeparator === null && separators.group.has(char)) {
      groups.push(group);
      group = "";
    } else {
      return "notANumber";
    }
  }
  groups.push(group);
  const integer = groups.join("");
  if (integer === "" && fraction === "") {
    return "incomplete";
  }
  const grouped = groups.length > 1;
  if (grouped && !groupingFits(groups, groupSizes)) {
    return "grouping";
  }
  return { integer, fraction, decimalSeparator, grouped };
}

/**
 * Reads text a user typed, strictly by the field's symbols, as an exact
 * decimal; it never rounds or guesses. It takes:
 *
 * - any Unicode decimal digits (`١٢٣` reads as 123 in `en-US`), and
 *   full-width forms from an input method;
 * - the field's decimal separator once, and its group separator between
 *   integer digits where its grouping allows ("1,5" is `grouping` in
 *   `en-US`), each with its lookalikes (any space for a space);
 * - a leading `-` or `+`, a trailing `-`, or parentheses;
 * - the field's own currency sign or code, percent sign or unit at either
 *   end, so its `full` text reads back.
 *
 * "12," reads as 12, ",5" as 0.5, "007" as 7, and "-0" as 0.
 */
export function parseNumber(
  text: string,
  options: NumberOptions = {},
): NumberReading {
  const plain = plainNumberText(text);
  if (plain === "") {
    return EMPTY;
  }
  const symbols = numberSymbols(options.locale, options);
  const sign = readSign(withoutAffixes(plain, options, symbols));
  const body = readBody(
    sign.body,
    fieldSeparators(symbols),
    symbols.groupSizes,
  );
  if (typeof body === "string") {
    return unreadableBecause(body);
  }
  if (!sign.closed) {
    return unreadableBecause("incomplete");
  }
  const integer = body.integer.replace(/^0+(?=\d)/, "") || "0";
  const fraction = body.fraction.replace(/0+$/, "");
  const negative =
    sign.negative !== null && /[1-9]/.test(integer + fraction)
      ? sign.negative
      : null;
  return {
    kind: "number",
    decimal: `${negative === null ? "" : "-"}${integer}${fraction === "" ? "" : `.${fraction}`}`,
    info: {
      decimalSeparator: body.decimalSeparator,
      grouped: body.grouped,
      negative,
      digits: digitSystems(text),
      cleaned: false,
    },
  };
}
