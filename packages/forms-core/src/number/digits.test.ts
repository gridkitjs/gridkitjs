import { describe, expect, test } from "vitest";

import { digitValue, isDigit, numberingSystemOf } from "./digits";

describe("digits", () => {
  test("reads a decimal digit of any script by its place in its run", () => {
    expect(["0", "7", "٣", "۹", "७", "７"].map(digitValue)).toEqual([
      0, 7, 3, 9, 7, 7,
    ]);
  });

  test("reads the touching runs of the mathematical digits", () => {
    // U+1D7CE is bold zero; U+1D7D8 the double-struck zero just after its nine.
    expect(digitValue(String.fromCodePoint(0x1d7d1))).toBe(3);
    expect(digitValue(String.fromCodePoint(0x1d7d8))).toBe(0);
    expect(digitValue(String.fromCodePoint(0x1d7ff))).toBe(9);
  });

  test("knows a digit from anything else", () => {
    expect(isDigit("٣")).toBe(true);
    expect(isDigit("a")).toBe(false);
    expect(isDigit("〇")).toBe(false);
  });

  test("names the numbering system a digit belongs to", () => {
    expect(["1", "١", "۱", "१", "１"].map(numberingSystemOf)).toEqual([
      "latn",
      "arab",
      "arabext",
      "deva",
      "fullwide",
    ]);
  });
});
