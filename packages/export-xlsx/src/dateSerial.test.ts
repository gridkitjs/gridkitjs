import { describe, expect, test } from "vitest";

import { excelDateSerial } from "./dateSerial";

describe("excelDateSerial", () => {
  test("counts whole days from Excel's epoch", () => {
    expect(excelDateSerial(new Date(1900, 2, 1))).toBe(61);
    expect(excelDateSerial(new Date(2025, 0, 1))).toBe(45658);
    expect(excelDateSerial(new Date(2026, 10, 4))).toBe(46330);
  });

  test("keeps the time of day as the fraction", () => {
    expect(excelDateSerial(new Date(2026, 10, 4, 12))).toBe(46330.5);
    expect(excelDateSerial(new Date(2026, 10, 4, 6, 0, 0))).toBe(46330.25);
  });

  test("reads the local calendar date, not the UTC one", () => {
    // Local midnight is a different UTC day in every zone east of UTC.
    expect(excelDateSerial(new Date(2026, 10, 4, 0, 0))).toBe(46330);
    expect(
      excelDateSerial(new Date(2026, 10, 4, 23, 59, 59, 999)),
    ).toBeLessThan(46331);
  });

  test("gives null for a date Excel cannot hold", () => {
    expect(excelDateSerial(new Date(Number.NaN))).toBeNull();
    expect(excelDateSerial(new Date(1899, 11, 31))).toBeNull();
    expect(excelDateSerial(new Date(1900, 1, 28))).toBeNull();
    expect(excelDateSerial(new Date(10000, 0, 1))).toBeNull();
  });
});
