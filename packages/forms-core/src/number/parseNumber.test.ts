import { describe, expect, test } from "vitest";

import { parseNumber, type NumberReading } from "./parseNumber";

type Expected = string | { readonly unreadable: string } | null;

/** The design's typed-text table, row for row: locale, typed, reads as. */
const TYPED: readonly (readonly [string, string, Expected])[] = [
  ["en-US", "1234.5", "1234.5"],
  ["en-US", "1,234.5", "1234.5"],
  ["en-US", "1,5", { unreadable: "grouping" }],
  ["en-US", "12,34,567", { unreadable: "grouping" }],
  ["en-US", "1.234,5", { unreadable: "notANumber" }],
  ["en-US", "(12)", "-12"],
  ["en-US", "12-", "-12"],
  ["en-US", "-0", "0"],
  ["en-US", "１２３．５", "123.5"],
  ["en-US", "١٢٣", "123"],
  ["en-US", "-", { unreadable: "incomplete" }],
  ["en-US", "1e5", { unreadable: "notANumber" }],
  ["de-DE", "1.234,5", "1234.5"],
  ["de-DE", "1234,5", "1234.5"],
  ["de-DE", "1.234", "1234"],
  ["de-DE", "1.5", { unreadable: "grouping" }],
  ["de-DE", "1,234.5", { unreadable: "notANumber" }],
  ["de-DE", "1.234,50-", "-1234.5"],
  ["fr-FR", "1\u202F234,5", "1234.5"],
  ["fr-FR", "1 234,5", "1234.5"],
  ["fr-FR", "1.234,5", { unreadable: "notANumber" }],
  ["de-CH", "1'234.5", "1234.5"],
  ["de-CH", "1’234.5", "1234.5"],
  ["de-CH", "1234,5", { unreadable: "notANumber" }],
  ["en-IN", "12,34,567.5", "1234567.5"],
  ["en-IN", "1,234,567.5", "1234567.5"],
  ["en-IN", "1,23,4567", { unreadable: "grouping" }],
  ["ar-EG", "١٬٢٣٤٫٥", "1234.5"],
  ["ar-EG", "1234.5", "1234.5"],
  ["ar-EG", "\u061C-١٢٣٤٫٥", "-1234.5"],
  ["hi-IN", "12,34,567.5", "1234567.5"],
  ["hi-IN", "१२,३४,५६७.५", "1234567.5"],
  // Row 33: exact here; `numberParser` refuses it as a JS number.
  ["en-US", "12345678901234567890", "12345678901234567890"],
];

/** What a reading comes to, in the table's terms. */
function outcome(reading: NumberReading): Expected {
  switch (reading.kind) {
    case "empty":
      return null;
    case "number":
      return reading.decimal;
    case "unreadable":
      return { unreadable: reading.reason };
  }
}

describe("parseNumber: the typed-text table", () => {
  test.each(TYPED)("%s %j", (locale, typed, expected) => {
    expect(outcome(parseNumber(typed, { locale }))).toEqual(expected);
  });
});

describe("parseNumber", () => {
  test("empty text, spaces and direction marks alone, read as empty", () => {
    expect(parseNumber("", { locale: "en-US" })).toEqual({ kind: "empty" });
    expect(parseNumber("  \u200E ", { locale: "en-US" })).toEqual({
      kind: "empty",
    });
  });

  test("reads a trailing or leading decimal separator, and drops leading zeros", () => {
    expect(outcome(parseNumber("12,", { locale: "de-DE" }))).toBe("12");
    expect(outcome(parseNumber(",5", { locale: "de-DE" }))).toBe("0.5");
    expect(outcome(parseNumber("007", { locale: "en-US" }))).toBe("7");
    expect(outcome(parseNumber("-0,00", { locale: "de-DE" }))).toBe("0");
  });

  test("a separator or sign with no digit is incomplete, as is an open parenthesis", () => {
    for (const typed of [",", "-,", "(", "(12"]) {
      expect(outcome(parseNumber(typed, { locale: "de-DE" }))).toEqual({
        unreadable: "incomplete",
      });
    }
  });

  test("two signs, a second decimal separator or a letter are not a number", () => {
    for (const typed of ["--5", "-5-", "(-5)", "1,2,3", "12a", "5)"]) {
      expect(outcome(parseNumber(typed, { locale: "de-DE" }))).toEqual({
        unreadable: "notANumber",
      });
    }
  });

  test("minimum grouping digits are not checked", () => {
    expect(outcome(parseNumber("1.234", { locale: "es-ES" }))).toBe("1234");
  });

  test("a space is not a separator where the field groups with a comma", () => {
    expect(outcome(parseNumber("1 234", { locale: "en-US" }))).toEqual({
      unreadable: "notANumber",
    });
  });

  test("reads the field's separator overrides", () => {
    const options = {
      locale: "en-US",
      decimalSeparator: ",",
      groupSeparator: ".",
    };
    expect(outcome(parseNumber("1.234,5", options))).toBe("1234.5");
    expect(outcome(parseNumber("1,234.5", options))).toEqual({
      unreadable: "notANumber",
    });
  });

  test("reads the field's own currency, percent sign and unit at either end", () => {
    const usd = {
      locale: "en-US",
      style: "currency",
      currency: "USD",
    } as const;
    expect(outcome(parseNumber("$1,234.50", usd))).toBe("1234.5");
    expect(outcome(parseNumber("-$1,234.50", usd))).toBe("-1234.5");
    expect(outcome(parseNumber("USD 12", usd))).toBe("12");
    const eur = {
      locale: "de-DE",
      style: "currency",
      currency: "EUR",
    } as const;
    expect(outcome(parseNumber("1.234,50 €", eur))).toBe("1234.5");
    expect(outcome(parseNumber("(1.234,50 €)", eur))).toBe("-1234.5");
    expect(outcome(parseNumber("1.234,50- €", eur))).toBe("-1234.5");
    expect(
      outcome(parseNumber("%12,5", { locale: "tr-TR", style: "percent" })),
    ).toBe("12.5");
    expect(
      outcome(
        parseNumber("12,5 kg", {
          locale: "de-DE",
          style: "unit",
          unit: "kilogram",
        }),
      ),
    ).toBe("12.5");
  });

  test("takes no currency sign the field does not show", () => {
    expect(outcome(parseNumber("$12", { locale: "en-US" }))).toEqual({
      unreadable: "notANumber",
    });
  });

  test("says how the text was read", () => {
    expect(parseNumber("-1.234,5", { locale: "de-DE" })).toEqual({
      kind: "number",
      decimal: "-1234.5",
      info: {
        decimalSeparator: ",",
        grouped: true,
        negative: "minus",
        digits: ["latn"],
        cleaned: false,
      },
    });
    const mixed = parseNumber("1２3", { locale: "en-US" });
    expect(mixed.kind === "number" && mixed.info.digits).toEqual([
      "latn",
      "fullwide",
    ]);
    const parentheses = parseNumber("(5)", { locale: "en-US" });
    expect(parentheses.kind === "number" && parentheses.info.negative).toBe(
      "parentheses",
    );
    const zero = parseNumber("-0", { locale: "en-US" });
    expect(zero.kind === "number" && zero.info.negative).toBeNull();
  });
});
