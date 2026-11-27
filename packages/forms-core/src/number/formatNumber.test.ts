import { describe, expect, test } from "vitest";

import { formatNumber, formatNumberRange, numberAffixes } from "./formatNumber";
import { numberSymbols } from "./symbols";

describe("formatNumber", () => {
  test("writes a 20-digit decimal string exactly", () => {
    expect(
      formatNumber("12345678901234567890.123456789", { locale: "de-DE" }),
    ).toBe("12.345.678.901.234.567.890,123456789");
  });

  test("writes every fraction digit the value has, with no maximum", () => {
    expect(formatNumber(0.125, { locale: "en-US" })).toBe("0.125");
    expect(formatNumber("1.5000001", { locale: "en-US" })).toBe("1.5000001");
  });

  test("rounds to the maximum by the rounding mode, a number by its decimal", () => {
    expect(
      formatNumber(1.005, { locale: "en-US", maximumFractionDigits: 2 }),
    ).toBe("1.01");
    expect(
      formatNumber("2.345", {
        locale: "en-US",
        maximumFractionDigits: 2,
        roundingMode: "halfEven",
      }),
    ).toBe("2.34");
  });

  test("never writes -0", () => {
    expect(formatNumber(-0, { locale: "en-US" })).toBe("0");
    expect(
      formatNumber(-0.4, { locale: "en-US", maximumFractionDigits: 0 }),
    ).toBe("0");
    expect(
      formatNumber(-0.4, {
        locale: "en-US",
        maximumFractionDigits: 0,
        negative: "parentheses",
      }),
    ).toBe("0");
  });

  test("leaves four-digit numbers ungrouped where the locale does", () => {
    expect(formatNumber(1234, { locale: "es-ES" })).toBe("1234");
    expect(formatNumber(12345, { locale: "es-ES" })).toBe("12.345");
  });

  describe("the three forms", () => {
    const eur = {
      locale: "de-DE",
      style: "currency",
      currency: "EUR",
    } as const;

    test("display groups and pads, without the currency", () => {
      expect(formatNumber(-1234.5, eur)).toBe("-1.234,50");
    });

    test("edit writes no grouping and a leading minus", () => {
      expect(formatNumber(-1234.5, eur, "edit")).toBe("-1234,50");
      expect(
        formatNumber(-1234.5, { ...eur, negative: "trailingMinus" }, "edit"),
      ).toBe("-1234,50");
      expect(formatNumber(1234.5, { locale: "de-DE" }, "edit")).toBe("1234,5");
    });

    test("edit writes fixed decimals in full", () => {
      expect(
        formatNumber(
          5,
          {
            locale: "de-DE",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          },
          "edit",
        ),
      ).toBe("5,00");
    });

    test("full is Intl's whole text", () => {
      expect(formatNumber(-1234.5, eur, "full")).toBe("-1.234,50\u00A0€");
    });
  });

  describe("negatives", () => {
    test("in parentheses, around the affixes too", () => {
      expect(
        formatNumber(-1234.5, { locale: "en-US", negative: "parentheses" }),
      ).toBe("(1,234.5)");
      expect(
        formatNumber(
          -1234.5,
          {
            locale: "de-DE",
            style: "currency",
            currency: "EUR",
            negative: "parentheses",
          },
          "full",
        ),
      ).toBe("(1.234,50\u00A0€)");
    });

    test("with a trailing minus after the last digit", () => {
      expect(
        formatNumber(-1234.5, { locale: "de-DE", negative: "trailingMinus" }),
      ).toBe("1.234,5-");
      expect(
        formatNumber(
          -1234.5,
          {
            locale: "de-DE",
            style: "currency",
            currency: "EUR",
            negative: "trailingMinus",
          },
          "full",
        ),
      ).toBe("1.234,50-\u00A0€");
    });
  });

  describe("currency", () => {
    test("takes its ISO 4217 minor units", () => {
      const jpy = {
        locale: "en-US",
        style: "currency",
        currency: "JPY",
      } as const;
      expect(formatNumber(1234.5, jpy)).toBe("1,235");
      expect(formatNumber(1234.5, jpy, "full")).toBe("¥1,235");
      const kwd = {
        locale: "en-US",
        style: "currency",
        currency: "KWD",
      } as const;
      expect(formatNumber(1234.5, kwd)).toBe("1,234.500");
      expect(formatNumber(1234.5, { ...kwd, locale: "de-DE" })).toBe(
        "1.234,500",
      );
    });

    test("writes the symbol where the locale puts it", () => {
      expect(
        formatNumber(
          -1234.5,
          { locale: "de-CH", style: "currency", currency: "CHF" },
          "full",
        ),
      ).toMatch(/^CHF-1['’]234\.50$/);
    });
  });

  describe("percent", () => {
    test("0.12 is 12 % in fr-FR, with its no-break space", () => {
      expect(
        formatNumber(0.12, { locale: "fr-FR", style: "percent" }, "full"),
      ).toBe("12\u00A0%");
    });

    test("display and edit write the percent number, without the sign", () => {
      const percent = { locale: "fr-FR", style: "percent" } as const;
      expect(formatNumber(0.125, percent)).toBe("12,5");
      expect(formatNumber(0.125, percent, "edit")).toBe("12,5");
    });

    test("a percent scale stores 12.5 for 12.5 %", () => {
      expect(
        formatNumber(
          12.5,
          { locale: "en-US", style: "percent", percentScale: "percent" },
          "full",
        ),
      ).toBe("12.5%");
    });

    test("writes 12.3 % for 0.123 exactly", () => {
      expect(formatNumber(0.123, { locale: "en-US", style: "percent" })).toBe(
        "12.3",
      );
    });
  });

  test("units", () => {
    expect(
      formatNumber(
        12.5,
        { locale: "de-DE", style: "unit", unit: "liter" },
        "full",
      ),
    ).toBe("12,5 l");
  });

  describe("symbols and overrides", () => {
    test("writes the locale's digits, and drops direction marks but in full", () => {
      const minus = numberSymbols("ar-EG").minus;
      expect(formatNumber(-1234.5, { locale: "ar-EG" })).toBe(
        `${minus}١٬٢٣٤٫٥`,
      );
      expect(formatNumber(-1234.5, { locale: "ar-EG" }, "full")).toBe(
        `\u061C${minus}١٬٢٣٤٫٥`,
      );
      expect(formatNumber(-1234.5, { locale: "he-IL" })).toBe("-1,234.5");
    });

    test("writes the numbering system asked for", () => {
      expect(
        formatNumber(1234.5, { locale: "ar-EG", numberingSystem: "latn" }),
      ).toBe(
        `1${numberSymbols("ar-EG", { numberingSystem: "latn" }).group}234${numberSymbols("ar-EG", { numberingSystem: "latn" }).decimal}5`,
      );
    });

    test("writes the field's separators and group sizes", () => {
      expect(
        formatNumber(1234567.5, {
          locale: "en-US",
          decimalSeparator: ",",
          groupSeparator: ".",
        }),
      ).toBe("1.234.567,5");
      expect(
        formatNumber(1234567.5, { locale: "en-US", groupSizes: [3, 2] }),
      ).toBe("12,34,567.5");
      expect(
        formatNumber(1234567.5, { locale: "en-US", groupSeparator: "" }),
      ).toBe("1234567.5");
      expect(
        formatNumber(1234567.5, { locale: "en-US", useGrouping: false }),
      ).toBe("1234567.5");
    });
  });

  test("throws for text that is not a decimal, and for NaN", () => {
    expect(() => formatNumber("1,5")).toThrow(RangeError);
    expect(() => formatNumber(Number.NaN)).toThrow(RangeError);
  });
});

describe("numberAffixes", () => {
  test("puts the currency on the locale's side", () => {
    expect(
      numberAffixes({ locale: "en-US", style: "currency", currency: "USD" }),
    ).toEqual({ prefix: "$", suffix: "" });
    expect(
      numberAffixes({ locale: "de-DE", style: "currency", currency: "EUR" }),
    ).toEqual({ prefix: "", suffix: "€" });
    expect(
      numberAffixes({ locale: "nl-NL", style: "currency", currency: "EUR" }),
    ).toEqual({ prefix: "€", suffix: "" });
    expect(
      numberAffixes({ locale: "de-CH", style: "currency", currency: "CHF" }),
    ).toEqual({ prefix: "CHF", suffix: "" });
    expect(
      numberAffixes({
        locale: "de-DE",
        style: "currency",
        currency: "USD",
        currencyDisplay: "code",
      }),
    ).toEqual({ prefix: "", suffix: "USD" });
  });

  test("puts the percent sign first in tr-TR", () => {
    expect(numberAffixes({ locale: "tr-TR", style: "percent" })).toEqual({
      prefix: "%",
      suffix: "",
    });
    expect(numberAffixes({ locale: "fr-FR", style: "percent" })).toEqual({
      prefix: "",
      suffix: "%",
    });
  });

  test("a unit can sit on both sides", () => {
    expect(
      numberAffixes(
        {
          locale: "zh-CN",
          style: "unit",
          unit: "kilometer-per-hour",
          unitDisplay: "long",
        },
        12.5,
      ),
    ).toEqual({ prefix: "每小时", suffix: "公里" });
    expect(
      numberAffixes({ locale: "en-US", style: "unit", unit: "kilogram" }),
    ).toEqual({ prefix: "", suffix: "kg" });
  });

  test("a plain decimal has none", () => {
    expect(numberAffixes({ locale: "en-US" })).toEqual({
      prefix: "",
      suffix: "",
    });
  });
});

describe("formatNumberRange", () => {
  test("writes Intl's range text", () => {
    expect(formatNumberRange(10, 20, { locale: "en-US" })).toBe("10–20");
    expect(
      formatNumberRange(10, 20, {
        locale: "de-DE",
        style: "currency",
        currency: "EUR",
      }),
    ).toBe("10,00–20,00\u00A0€");
  });

  test("writes ends that write the same once, with no approximation sign", () => {
    expect(formatNumberRange(10, 10, { locale: "en-US" })).toBe("10");
    expect(
      formatNumberRange(1.001, 1.004, {
        locale: "de-DE",
        style: "currency",
        currency: "EUR",
      }),
    ).toBe("1,00\u00A0€");
  });

  test("writes a negative end in the field's negative style", () => {
    expect(
      formatNumberRange(-10, 20, { locale: "en-US", negative: "parentheses" }),
    ).toBe("(10) – 20");
    expect(formatNumberRange(-10, 20, { locale: "en-US" })).toBe("-10 – 20");
  });

  test("keeps both ends exact and writes the field's separators", () => {
    expect(
      formatNumberRange("0.5", "12345678901234567890.25", {
        locale: "en-US",
        groupSizes: [3, 2],
      }),
    ).toBe("0.5–1,23,45,67,89,01,23,45,67,890.25");
  });
});
