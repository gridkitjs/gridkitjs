import type { Validator } from "../validation/validators";
import type { MaskOptions, MaskValueFormat } from "./applyMask";
import type { MaskTokens } from "./grammar";
import { IBAN_LENGTHS, ibanRule, ipv4Rule, luhnRule } from "./rules";

/** A ready-made mask: its options, its check, the keyboard it wants and the value it keeps. */
export interface MaskPreset {
  readonly options: MaskOptions;
  /** Checks a complete value further: a checksum, a range. */
  readonly validate?: Validator<string> | undefined;
  readonly inputMode: "numeric" | "decimal" | "text";
  readonly autoComplete?: string | undefined;
  readonly valueFormat: MaskValueFormat;
}

/** Codes are ASCII: these tokens keep out the letters and digits of other scripts that the built-in ones accept. */
const ASCII_TOKENS: MaskTokens = {
  L: /[A-Za-z]/,
  A: /[A-Za-z0-9]/,
  a: { accept: /[A-Za-z0-9]/, optional: true },
};

/** Upper-casing codes the same in every locale ("i" is "I", not the Turkish "İ"). */
const CODE_LOCALE = "en";

/** The longest IBAN, and the shortest, which an unknown country's pattern spans. */
const IBAN_MAX = 34;
const IBAN_MIN = 15;

/**
 * An IBAN's pattern for the raw text typed: two letters, two check digits
 * and the rest, sized by the country the letters name and grouped in
 * fours; up to 34 characters (15 required) for a country it does not know.
 */
function ibanPattern(raw: string): string {
  const length = IBAN_LENGTHS[raw.slice(0, 2).toUpperCase()];
  const tokens = Array.from({ length: length ?? IBAN_MAX }, (_, index) => {
    if (index < 2) {
      return "L";
    }
    if (index < 4) {
      return "0";
    }
    return length === undefined && index >= IBAN_MIN ? "a" : "A";
  });
  const groups: string[] = [];
  for (let start = 0; start < tokens.length; start += 4) {
    groups.push(tokens.slice(start, start + 4).join(""));
  }
  return `>${groups.join(" ")}`;
}

/** A card number's pattern: American Express (34, 37) groups 4-6-5; the rest 4-4-4-4, with up to three more digits. */
function cardNumberPattern(raw: string): string {
  return /^3[47]/.test(raw) ? "0000 000000 00000" : "0000 0000 0000 0000[ 000]";
}

function postalCode(
  mask: MaskOptions["mask"],
  inputMode: "numeric" | "text",
): MaskPreset {
  return {
    options:
      inputMode === "text"
        ? { mask, tokens: ASCII_TOKENS, locale: CODE_LOCALE }
        : { mask },
    inputMode,
    autoComplete: "postal-code",
    valueFormat: "formatted",
  };
}

/** The presets `MaskedInput` takes by name. */
export interface MaskPresets {
  /** An IBAN, grouped in fours, sized by its country; raw value, checked by `ibanRule`. */
  readonly iban: MaskPreset;
  /** A card number, grouped by its length; raw digits, checked by `luhnRule`. */
  readonly cardNumber: MaskPreset;
  /** An IPv4 address, `.` moving to the next part; formatted value, checked by `ipv4Rule`. */
  readonly ipv4: MaskPreset;
  /** `12345` or `12345-6789`. */
  readonly postalCodeUS: MaskPreset;
  /** `K1A 0B1`. */
  readonly postalCodeCA: MaskPreset;
  /** `SW1A 1AA`, `M1 1AA` and the other UK shapes. */
  readonly postalCodeGB: MaskPreset;
  /** `10115`. */
  readonly postalCodeDE: MaskPreset;
  /** `1012 AB`. */
  readonly postalCodeNL: MaskPreset;
  /** `01310-100`. */
  readonly postalCodeBR: MaskPreset;
  /** `100-0001`. */
  readonly postalCodeJP: MaskPreset;
}

/**
 * Ready-made masks. Postal codes keep their separators, as addresses print
 * them; an IPv4 address keeps its dots, which its raw digits would lose.
 */
export const maskPresets: MaskPresets = {
  iban: {
    options: { mask: ibanPattern, tokens: ASCII_TOKENS, locale: CODE_LOCALE },
    validate: ibanRule(),
    inputMode: "text",
    valueFormat: "raw",
  },
  cardNumber: {
    options: { mask: cardNumberPattern },
    validate: luhnRule(),
    inputMode: "numeric",
    autoComplete: "cc-number",
    valueFormat: "raw",
  },
  ipv4: {
    options: { mask: "099.099.099.099" },
    validate: ipv4Rule(),
    // The decimal keypad has the dot.
    inputMode: "decimal",
    valueFormat: "formatted",
  },
  postalCodeUS: postalCode("00000[-0000]", "numeric"),
  postalCodeCA: postalCode(">L0L 0L0", "text"),
  postalCodeGB: postalCode(
    [">L0 0LL", ">L00 0LL", ">LL0 0LL", ">LL00 0LL", ">L0L 0LL", ">LL0L 0LL"],
    "text",
  ),
  postalCodeDE: postalCode("00000", "numeric"),
  postalCodeNL: postalCode("0000 >LL", "text"),
  postalCodeBR: postalCode("00000-000", "numeric"),
  postalCodeJP: postalCode("000-0000", "numeric"),
};
