import { describe, expect, test } from "vitest";

import { numberSymbols } from "./symbols";

describe("numberSymbols", () => {
  test("en-US", () => {
    expect(numberSymbols("en-US")).toEqual({
      numberingSystem: "latn",
      digits: "0123456789",
      decimal: ".",
      group: ",",
      groupSizes: [3, 3],
      minimumGroupingDigits: 1,
      minus: "-",
      percent: "%",
      numbersLeftToRight: true,
    });
  });

  test("de-DE swaps the separators", () => {
    expect(numberSymbols("de-DE")).toMatchObject({
      decimal: ",",
      group: ".",
      groupSizes: [3, 3],
    });
  });

  test("fr-FR groups with a narrow no-break space", () => {
    expect(numberSymbols("fr-FR")).toMatchObject({
      decimal: ",",
      group: " ",
    });
  });

  test("de-CH groups with an apostrophe, ASCII or typographic by ICU version", () => {
    const { decimal, group } = numberSymbols("de-CH");
    expect(decimal).toBe(".");
    expect(["'", "’"]).toContain(group);
  });

  test("en-IN groups by lakh", () => {
    expect(numberSymbols("en-IN")).toMatchObject({
      decimal: ".",
      group: ",",
      groupSizes: [3, 2],
    });
  });

  test("ar-EG writes Arabic-Indic digits, right to left", () => {
    expect(numberSymbols("ar-EG")).toMatchObject({
      numberingSystem: "arab",
      digits: "٠١٢٣٤٥٦٧٨٩",
      decimal: "٫",
      group: "٬",
      minus: "-",
      percent: "٪",
      numbersLeftToRight: false,
    });
  });

  test("hi-IN writes Latin digits, and Devanagari when asked", () => {
    expect(numberSymbols("hi-IN")).toMatchObject({
      numberingSystem: "latn",
      groupSizes: [3, 2],
    });
    expect(numberSymbols("hi-IN-u-nu-deva")).toMatchObject({
      numberingSystem: "deva",
      digits: "०१२३४५६७८९",
      groupSizes: [3, 2],
    });
  });

  test("es-ES leaves four-digit numbers ungrouped", () => {
    expect(numberSymbols("es-ES").minimumGroupingDigits).toBe(2);
    expect(numberSymbols("de-DE").minimumGroupingDigits).toBe(1);
  });

  test("drops the direction marks around the minus, and says which way numbers run", () => {
    expect(numberSymbols("he-IL")).toMatchObject({
      minus: "-",
      numbersLeftToRight: true,
    });
    expect(numberSymbols("sv-SE").minus).toBe("−");
  });

  test("reads the separators of the numbering system asked for", () => {
    expect(numberSymbols("ar-EG", { numberingSystem: "latn" })).toMatchObject({
      numberingSystem: "latn",
      digits: "0123456789",
    });
  });

  test("lays separator and group size overrides over the locale's", () => {
    expect(
      numberSymbols("en-US", { decimalSeparator: ",", groupSeparator: "." }),
    ).toMatchObject({ decimal: ",", group: "." });
    expect(numberSymbols("en-US", { groupSeparator: "" })).toMatchObject({
      decimal: ".",
      group: "",
    });
    expect(numberSymbols("en-US", { groupSizes: [4, 4] }).groupSizes).toEqual([
      4, 4,
    ]);
  });

  test("ignores separators that would clash, and group sizes that are not sizes", () => {
    expect(numberSymbols("en-US", { decimalSeparator: "," })).toMatchObject({
      decimal: ".",
      group: ",",
    });
    expect(numberSymbols("en-US", { decimalSeparator: "" }).decimal).toBe(".");
    expect(numberSymbols("en-US", { groupSizes: [0, 3] }).groupSizes).toEqual([
      3, 3,
    ]);
  });

  test("returns the same object for the same locale and overrides", () => {
    expect(numberSymbols("de-DE")).toBe(numberSymbols("de-DE"));
    expect(numberSymbols("de-DE", { groupSeparator: " " })).toBe(
      numberSymbols("de-DE", { groupSeparator: " " }),
    );
  });
});
