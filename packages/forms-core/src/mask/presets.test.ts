import { describe, expect, test } from "vitest";

import { defaultFormsMessages } from "../messages/formsMessages";
import type { ValidatorContext } from "../validation/validators";
import { applyMaskEdit, formatMasked, maskDetails } from "./applyMask";
import { maskParser } from "./maskField";
import { maskPresets, type MaskPreset } from "./presets";
import { ibanRule, ipv4Rule, luhnRule } from "./rules";

const context: ValidatorContext = {
  text: "",
  locale: "en-US",
  messages: defaultFormsMessages,
};

/** The focused text after typing `keys` one by one into the empty field; refused keys change nothing. */
function typed(preset: MaskPreset, keys: string): string {
  let shown = formatMasked(preset.options, "", true);
  for (const data of keys) {
    const result = applyMaskEdit(
      preset.options,
      {
        text: shown.text,
        selectionStart: shown.caret,
        selectionEnd: shown.caret,
      },
      { inputType: "insertText", data },
      true,
    );
    if (result.accepted) {
      shown = result;
    }
  }
  return shown.text;
}

/** What a field with `preset` holds for `text`: its value, or its message. */
function value(preset: MaskPreset, text: string): string | null {
  const read = maskParser(preset.options, preset.valueFormat)(text, {
    defaultParse: () => ({ kind: "value", value: null }),
    locale: "tr-TR",
    messages: defaultFormsMessages,
  });
  return read.kind === "value" ? read.value : read.message;
}

/** The check's message for `value`, or `null`. */
function checked(preset: MaskPreset, input: string | null) {
  const result = preset.validate?.(input, context) ?? null;
  return typeof result === "object" && result !== null && "text" in result
    ? result.text
    : result;
}

describe("iban", () => {
  const { iban } = maskPresets;

  test("is grouped in fours and sized by its country", () => {
    expect(typed(iban, "de89370400440532013000")).toBe(
      "DE89 3704 0044 0532 0130 00",
    );
    expect(typed(iban, "no9386011117947")).toBe("NO93 8601 1117 947");
    expect(typed(iban, "gb82west12345698765432")).toBe(
      "GB82 WEST 1234 5698 7654 32",
    );
    expect(typed(iban, "de893704004405320130001")).toBe(
      "DE89 3704 0044 0532 0130 00",
    );
  });

  test("starts with the longest pattern, and takes ASCII letters only", () => {
    expect(typed(iban, "")).toBe("____ ____ ____ ____ ____ ____ ____ ____ __");
    expect(typed(iban, "dé8")).toBe(
      "D___ ____ ____ ____ ____ ____ ____ ____ __",
    );
  });

  test("upper-cases the same in every locale", () => {
    expect(typed(iban, "it60x0542811101000000123456")).toBe(
      "IT60 X054 2811 1010 0000 0123 456",
    );
    expect(value(iban, "IT60 X054 2811 1010 0000 0123 456")).toBe(
      "IT60X0542811101000000123456",
    );
  });

  test("keeps the raw value, and checks the length and the check digits", () => {
    expect(value(iban, "DE89 3704 0044 0532 0130 00")).toBe(
      "DE89370400440532013000",
    );
    expect(value(iban, "DE89 3704 0044 0532 01")).toBe("Complete this field");
    expect(checked(iban, "DE89370400440532013000")).toBeNull();
    expect(checked(iban, "GB82WEST12345698765432")).toBeNull();
    expect(checked(iban, "NO9386011117947")).toBeNull();
    expect(checked(iban, "DE89370400440532013001")).toBe("Enter a valid IBAN");
    expect(checked(iban, "DE8937040044053201300")).toBe("Enter a valid IBAN");
    expect(checked(iban, "XX89370400440532013000")).toBe("Enter a valid IBAN");
    expect(checked(iban, null)).toBeNull();
  });

  test("a pasted IBAN is laid out by its country", () => {
    const result = applyMaskEdit(
      iban.options,
      { text: typed(iban, ""), selectionStart: 0, selectionEnd: 0 },
      {
        inputType: "insertFromPaste",
        data: "FR14 2004 1010 0505 0001 3M02 606",
      },
      true,
    );
    expect([result.text, result.raw, result.complete]).toEqual([
      "FR14 2004 1010 0505 0001 3M02 606",
      "FR1420041010050500013M02606",
      true,
    ]);
  });
});

describe("cardNumber", () => {
  const { cardNumber } = maskPresets;

  test("groups 4-4-4-4, with up to three more digits", () => {
    expect(typed(cardNumber, "4111111111111111")).toBe("4111 1111 1111 1111");
    expect(typed(cardNumber, "4111111111111111111")).toBe(
      "4111 1111 1111 1111 111",
    );
    expect(
      maskDetails(cardNumber.options, "4111 1111 1111 1111").complete,
    ).toBe(true);
    expect(
      maskDetails(cardNumber.options, "4111 1111 1111 1111 1__").complete,
    ).toBe(false);
  });

  test("groups American Express 4-6-5", () => {
    expect(typed(cardNumber, "378282246310005")).toBe("3782 822463 10005");
    expect(value(cardNumber, "3782 822463 10005")).toBe("378282246310005");
  });

  test("checks the Luhn digit", () => {
    expect(checked(cardNumber, "4111111111111111")).toBeNull();
    expect(checked(cardNumber, "378282246310005")).toBeNull();
    expect(checked(cardNumber, "4111111111111112")).toBe(
      "Enter a valid card number",
    );
  });

  test("wants the numeric keypad and the card number autofill", () => {
    expect(cardNumber.inputMode).toBe("numeric");
    expect(cardNumber.autoComplete).toBe("cc-number");
  });
});

describe("ipv4", () => {
  const { ipv4 } = maskPresets;

  test("a dot moves to the next part; a full part moves by itself", () => {
    expect(typed(ipv4, "192.168.1.1")).toBe("192.168.1.1__");
    expect(typed(ipv4, "10.0.0.1")).toBe("10.0.0.1__");
    expect(typed(ipv4, "19216801")).toBe("192.168.01_.___");
  });

  test("keeps its dots, and checks each part", () => {
    expect(value(ipv4, "192.168.1.1__")).toBe("192.168.1.1");
    expect(value(ipv4, "192.168.___.___")).toBe("Complete this field");
    expect(checked(ipv4, "192.168.1.1")).toBeNull();
    expect(checked(ipv4, "0.0.0.0")).toBeNull();
    expect(checked(ipv4, "255.255.255.255")).toBeNull();
    expect(checked(ipv4, "256.1.1.1")).toBe("Enter a valid IPv4 address");
    expect(checked(ipv4, "192.168.01.1")).toBe("Enter a valid IPv4 address");
  });
});

describe("postal codes", () => {
  test.each([
    ["postalCodeUS", "12345", "12345", "12345"],
    ["postalCodeUS", "123456789", "12345-6789", "12345-6789"],
    ["postalCodeCA", "k1a0b1", "K1A 0B1", "K1A 0B1"],
    ["postalCodeGB", "sw1a1aa", "SW1A 1AA", "SW1A 1AA"],
    ["postalCodeGB", "m11aa", "M1 1AA", "M1 1AA"],
    ["postalCodeGB", "b338th", "B33 8TH", "B33 8TH"],
    ["postalCodeGB", "cr26xh", "CR2 6XH", "CR2 6XH"],
    ["postalCodeGB", "dn551pt", "DN55 1PT", "DN55 1PT"],
    ["postalCodeGB", "w1a0ax", "W1A 0AX", "W1A 0AX"],
    ["postalCodeGB", "ec1a1bb", "EC1A 1BB", "EC1A 1BB"],
    ["postalCodeDE", "10115", "10115", "10115"],
    ["postalCodeNL", "1012ab", "1012 AB", "1012 AB"],
    ["postalCodeBR", "01310100", "01310-100", "01310-100"],
    ["postalCodeJP", "1000001", "100-0001", "100-0001"],
  ] as const)("%s: typing %j shows %j, value %j", (name, keys, shown, kept) => {
    const preset = maskPresets[name];
    expect(typed(preset, keys)).toBe(shown);
    expect(value(preset, shown)).toBe(kept);
  });

  test.each([
    ["postalCodeUS", "1234a", "1234_"],
    ["postalCodeUS", "123456", "12345-6___"],
    ["postalCodeCA", "1k", "K__ ___"],
    ["postalCodeGB", "1sw", "SW_ ___"],
    ["postalCodeDE", "1011", "1011_"],
    ["postalCodeNL", "10120", "1012 __"],
    ["postalCodeBR", "0131", "0131_-___"],
    ["postalCodeJP", "100x", "100-____"],
  ] as const)("%s: typing %j leaves %j, incomplete", (name, keys, shown) => {
    const preset = maskPresets[name];
    expect(typed(preset, keys)).toBe(shown);
    expect(value(preset, shown)).toBe("Complete this field");
  });

  test("want the numeric keypad only when they are all digits", () => {
    expect(maskPresets.postalCodeUS.inputMode).toBe("numeric");
    expect(maskPresets.postalCodeGB.inputMode).toBe("text");
    expect(maskPresets.postalCodeUS.autoComplete).toBe("postal-code");
  });
});

describe("the rules alone", () => {
  test("ignore spaces and pass null", () => {
    expect(ibanRule()("DE89 3704 0044 0532 0130 00", context)).toBeNull();
    expect(luhnRule()("4111 1111 1111 1111", context)).toBeNull();
    expect(ipv4Rule()(null, context)).toBeNull();
    expect(luhnRule()("41a1", context)).toEqual({
      text: "Enter a valid card number",
      code: "cardNumber",
    });
  });
});
