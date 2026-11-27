import { describe, expect, test } from "vitest";

import { cleanPastedNumber } from "./cleanPastedNumber";
import { parseNumber } from "./parseNumber";

/** The design's pasted-text table, row for row: locale, pasted, becomes, reads as. */
const PASTED: readonly (readonly [
  string,
  string,
  string | null,
  string | null,
])[] = [
  ["en-US", "$1,234.50", "1234.50", "1234.5"],
  ["de-DE", "$1,234.50", "1234,50", "1234.5"],
  ["fr-FR", "1 234,50 €", "1234,50", "1234.5"],
  ["en-US", "1 234,50 €", "1234.50", "1234.5"],
  ["de-DE", "(1.234,50)", "-1234,50", "-1234.5"],
  ["en-US", "(1.234,50)", "-1234.50", "-1234.5"],
  ["de-DE", "1.234,50-", "-1234,50", "-1234.5"],
  ["en-US", "1.234,50-", "-1234.50", "-1234.5"],
  ["de-DE", "1.234", "1234", "1234"],
  ["en-US", "1.234", "1.234", "1.234"],
  ["en-US", "1,5", "1.5", "1.5"],
  ["de-DE", "3.14", "3,14", "3.14"],
  ["en-US", "1.234.567", "1234567", "1234567"],
  ["de-DE", "USD 1,234.50", "1234,50", "1234.5"],
  ["ar-EG", "1,234.5", "١٢٣٤٫٥", "1234.5"],
  ["de-CH", "1'234.50 CHF", "1234.50", "1234.5"],
  ["en-US", "12abc", null, null],
  ["en-US", "1e5", null, null],
];

describe("cleanPastedNumber: the pasted-text table", () => {
  test.each(PASTED)("%s %j", (locale, pasted, becomes, readsAs) => {
    const cleaned = cleanPastedNumber(pasted, { locale });
    expect(cleaned?.text ?? null).toBe(becomes);
    if (cleaned !== null) {
      const reading = parseNumber(cleaned.text, { locale });
      expect(reading.kind === "number" ? reading.decimal : null).toBe(readsAs);
    }
  });
});

describe("cleanPastedNumber", () => {
  test("cleans each example in two locales", () => {
    const examples = {
      "$1,234.50": ["1234.50", "1234,50"],
      "1 234,50 €": ["1234.50", "1234,50"],
      "(1.234,50)": ["-1234.50", "-1234,50"],
      "1.234,50-": ["-1234.50", "-1234,50"],
    };
    for (const [pasted, [enUS, frFR]] of Object.entries(examples)) {
      expect(cleanPastedNumber(pasted, { locale: "en-US" })?.text).toBe(enUS);
      expect(cleanPastedNumber(pasted, { locale: "fr-FR" })?.text).toBe(frFR);
    }
  });

  test("says how the paste was read", () => {
    expect(cleanPastedNumber("$1,234.50", { locale: "en-US" })).toEqual({
      text: "1234.50",
      info: {
        decimalSeparator: ".",
        grouped: true,
        negative: null,
        digits: ["latn"],
        cleaned: true,
      },
    });
    expect(cleanPastedNumber("(5)", { locale: "en-US" })?.info).toMatchObject({
      decimalSeparator: null,
      grouped: false,
      negative: "parentheses",
    });
  });

  test("writes the field's digits and keeps every digit pasted", () => {
    expect(cleanPastedNumber("١٢٣٫٤٥٠", { locale: "en-US" })?.text).toBe(
      "123.450",
    );
    expect(cleanPastedNumber("007,50", { locale: "de-DE" })?.text).toBe(
      "007,50",
    );
  });

  test("drops the field's unit and a percent sign", () => {
    expect(
      cleanPastedNumber("12,5 kg", {
        locale: "de-DE",
        style: "unit",
        unit: "kilogram",
      })?.text,
    ).toBe("12,5");
    expect(cleanPastedNumber("12.5%", { locale: "de-DE" })?.text).toBe("12,5");
  });

  test("refuses letters that are not a currency code, and text with no digit", () => {
    expect(cleanPastedNumber("12ABC", { locale: "en-US" })).toBeNull();
    expect(cleanPastedNumber("12 kg", { locale: "en-US" })).toBeNull();
    expect(cleanPastedNumber("€", { locale: "en-US" })).toBeNull();
    expect(cleanPastedNumber("(12", { locale: "en-US" })).toBeNull();
    expect(cleanPastedNumber("1#2", { locale: "en-US" })).toBeNull();
  });

  test("refuses a decimal point that appears twice, or grouping after it", () => {
    expect(cleanPastedNumber("1.234,5,6", { locale: "en-US" })).toBeNull();
    expect(cleanPastedNumber("1,2.3.4", { locale: "en-US" })).toBeNull();
  });

  test("a space or apostrophe always groups", () => {
    expect(cleanPastedNumber("1 234 567", { locale: "en-US" })?.text).toBe(
      "1234567",
    );
    expect(cleanPastedNumber("1'234", { locale: "de-DE" })?.text).toBe("1234");
  });

  test("minus zero has no sign", () => {
    expect(cleanPastedNumber("-0,00", { locale: "de-DE" })).toMatchObject({
      text: "0,00",
      info: { negative: null },
    });
  });
});
