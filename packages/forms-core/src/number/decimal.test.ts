import { describe, expect, test } from "vitest";

import {
  addDecimals,
  compareDecimals,
  decimalOf,
  decimalToNumber,
  fractionDigitsOf,
  isDecimalString,
  normalizeDecimal,
  numberToDecimal,
  roundDecimal,
  shiftDecimal,
  snapDecimal,
  subtractDecimals,
  type RoundingMode,
} from "./decimal";

describe("isDecimalString", () => {
  test("takes digits with an optional sign and fraction", () => {
    for (const text of ["0", "-12", "+12.50", ".5", "-.5", "007"]) {
      expect(isDecimalString(text)).toBe(true);
    }
  });

  test("refuses anything else", () => {
    for (const text of ["", "-", "12.", "1e5", "1,5", " 1", "0x10", "١٢"]) {
      expect(isDecimalString(text)).toBe(false);
    }
  });
});

describe("normalizeDecimal", () => {
  test("writes the normal form", () => {
    expect(normalizeDecimal("007.500")).toBe("7.5");
    expect(normalizeDecimal("+.5")).toBe("0.5");
    expect(normalizeDecimal("-0012")).toBe("-12");
    expect(normalizeDecimal("12.000")).toBe("12");
  });

  test("minus zero is zero", () => {
    expect(normalizeDecimal("-0")).toBe("0");
    expect(normalizeDecimal("-0.00")).toBe("0");
    expect(normalizeDecimal("-0.00", 2)).toBe("0.00");
  });

  test("pads the fraction to the minimum digits, keeping longer ones", () => {
    expect(normalizeDecimal("12.5", 2)).toBe("12.50");
    expect(normalizeDecimal("12.345", 2)).toBe("12.345");
    expect(normalizeDecimal("12", 2)).toBe("12.00");
  });

  test("is null for text that is not a decimal", () => {
    expect(normalizeDecimal("1,5")).toBeNull();
  });
});

describe("compareDecimals", () => {
  test("orders by value, whatever the trailing zeros", () => {
    expect(compareDecimals("12.5", "12.50")).toBe(0);
    expect(compareDecimals("-0", "0")).toBe(0);
    expect(compareDecimals("0.1", "0.09")).toBe(1);
    expect(compareDecimals("-2", "-1.5")).toBe(-1);
    expect(
      compareDecimals("12345678901234567890.12", "12345678901234567890.11"),
    ).toBe(1);
  });

  test("throws for text that is not a decimal", () => {
    expect(() => compareDecimals("1,5", "1")).toThrow(RangeError);
  });
});

describe("adding and subtracting", () => {
  test("0.1 + 0.2 is exactly 0.3", () => {
    expect(addDecimals("0.1", "0.2")).toBe("0.3");
    expect(subtractDecimals("0.3", "0.1")).toBe("0.2");
  });

  test("keeps every digit of a 20-digit amount", () => {
    expect(addDecimals("12345678901234567890.12", "0.01")).toBe(
      "12345678901234567890.13",
    );
    expect(subtractDecimals("0", "12345678901234567890.12")).toBe(
      "-12345678901234567890.12",
    );
  });

  test("a result of zero has no sign", () => {
    expect(subtractDecimals("-1.5", "-1.50")).toBe("0");
  });
});

describe("roundDecimal", () => {
  const modes: readonly RoundingMode[] = [
    "halfExpand",
    "halfEven",
    "trunc",
    "halfCeil",
    "floor",
  ];
  // The design's table, one result per mode above.
  const table = [
    {
      value: "2.345",
      digits: 2,
      expected: ["2.35", "2.34", "2.34", "2.35", "2.34"],
    },
    {
      value: "2.355",
      digits: 2,
      expected: ["2.36", "2.36", "2.35", "2.36", "2.35"],
    },
    {
      value: "-2.345",
      digits: 2,
      expected: ["-2.35", "-2.34", "-2.34", "-2.34", "-2.35"],
    },
    { value: "2.5", digits: 0, expected: ["3", "2", "2", "3", "2"] },
    { value: "3.5", digits: 0, expected: ["4", "4", "3", "4", "3"] },
    { value: "-2.5", digits: 0, expected: ["-3", "-2", "-2", "-2", "-3"] },
    { value: "1.999", digits: 2, expected: ["2", "2", "1.99", "2", "1.99"] },
    {
      value: "0.125",
      digits: 2,
      expected: ["0.13", "0.12", "0.12", "0.13", "0.12"],
    },
  ];

  test.each(table)(
    "$value to $digits digits",
    ({ value, digits, expected }) => {
      expect(modes.map((mode) => roundDecimal(value, digits, mode))).toEqual(
        expected,
      );
    },
  );

  test("the other modes, as Intl defines them", () => {
    expect(roundDecimal("2.341", 2, "ceil")).toBe("2.35");
    expect(roundDecimal("-2.349", 2, "ceil")).toBe("-2.34");
    expect(roundDecimal("2.341", 2, "expand")).toBe("2.35");
    expect(roundDecimal("-2.341", 2, "expand")).toBe("-2.35");
    expect(roundDecimal("2.345", 2, "halfTrunc")).toBe("2.34");
    expect(roundDecimal("2.3451", 2, "halfTrunc")).toBe("2.35");
    expect(roundDecimal("-2.345", 2, "halfFloor")).toBe("-2.35");
    expect(roundDecimal("2.345", 2, "halfFloor")).toBe("2.34");
  });

  test("agrees with Intl on every mode", () => {
    const allModes: readonly RoundingMode[] = [
      "ceil",
      "floor",
      "expand",
      "trunc",
      "halfCeil",
      "halfFloor",
      "halfExpand",
      "halfTrunc",
      "halfEven",
    ];
    const values = ["2.345", "-2.345", "2.355", "0.125", "-0.005", "9.995"];
    for (const roundingMode of allModes) {
      const intl = new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 2,
        roundingMode,
        useGrouping: false,
        signDisplay: "negative",
      });
      for (const value of values) {
        expect(roundDecimal(value, 2, roundingMode)).toBe(
          intl.format(value as Intl.StringNumericLiteral),
        );
      }
    }
  });

  test("leaves a value with fewer digits alone, and never writes -0", () => {
    expect(roundDecimal("2.5", 2, "halfExpand")).toBe("2.5");
    expect(roundDecimal("-0.4", 0, "halfExpand")).toBe("0");
    expect(roundDecimal("-0.004", 2, "trunc")).toBe("0");
  });

  test("rounds a 20-digit amount exactly", () => {
    expect(roundDecimal("12345678901234567890.125", 2, "halfEven")).toBe(
      "12345678901234567890.12",
    );
  });

  test("throws for a digit count that is not one", () => {
    expect(() => roundDecimal("1", -1, "trunc")).toThrow(RangeError);
    expect(() => roundDecimal("1", 1.5, "trunc")).toThrow(RangeError);
  });
});

describe("shiftDecimal", () => {
  test("moves the point exactly", () => {
    expect(shiftDecimal("0.125", 2)).toBe("12.5");
    expect(shiftDecimal("12.3", -2)).toBe("0.123");
    expect(shiftDecimal("-1.5", 3)).toBe("-1500");
    expect(shiftDecimal("0", -2)).toBe("0");
  });
});

describe("snapDecimal", () => {
  test("finds the grid value on either side", () => {
    expect(snapDecimal("1.37", "0", "0.5", "below")).toBe("1");
    expect(snapDecimal("1.37", "0", "0.5", "above")).toBe("1.5");
    expect(snapDecimal("-1.37", "0", "0.5", "below")).toBe("-1.5");
    expect(snapDecimal("-1.37", "0", "0.5", "above")).toBe("-1");
  });

  test("counts the grid from its base", () => {
    expect(snapDecimal("4", "0.25", "1", "below")).toBe("3.25");
    expect(snapDecimal("4", "0.25", "1", "above")).toBe("4.25");
  });

  test("keeps a value on the grid", () => {
    expect(snapDecimal("0.3", "0", "0.1", "below")).toBe("0.3");
    expect(snapDecimal("0.3", "0", "0.1", "above")).toBe("0.3");
  });

  test("throws for a step that is not above zero", () => {
    expect(() => snapDecimal("1", "0", "0", "below")).toThrow(RangeError);
  });
});

describe("numberToDecimal", () => {
  test("writes the shortest digits that read back, with no exponent", () => {
    expect(numberToDecimal(0.1)).toBe("0.1");
    expect(numberToDecimal(0.1 + 0.2)).toBe("0.30000000000000004");
    expect(numberToDecimal(1e21)).toBe("1000000000000000000000");
    expect(numberToDecimal(1.5e-7)).toBe("0.00000015");
    expect(numberToDecimal(-1234.5)).toBe("-1234.5");
    expect(numberToDecimal(1.005)).toBe("1.005");
  });

  test("minus zero is zero", () => {
    expect(numberToDecimal(-0)).toBe("0");
  });

  test("throws for NaN and the infinities", () => {
    expect(() => numberToDecimal(Number.NaN)).toThrow(RangeError);
    expect(() => numberToDecimal(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});

describe("decimalToNumber", () => {
  test("says whether the number keeps the decimal exactly", () => {
    expect(decimalToNumber("0.3")).toEqual({ number: 0.3, exact: true });
    expect(decimalToNumber("123456789012345.6")).toEqual({
      number: 123456789012345.6,
      exact: true,
    });
    expect(decimalToNumber("1000000000000000000000")).toEqual({
      number: 1e21,
      exact: true,
    });
    expect(decimalToNumber("9007199254740993")).toEqual({
      number: 9007199254740992,
      exact: false,
    });
    expect(decimalToNumber("12345678901234567890.12").exact).toBe(false);
    expect(decimalToNumber(`1${"0".repeat(400)}`)).toEqual({
      number: Number.POSITIVE_INFINITY,
      exact: false,
    });
  });

  test("trailing zeros and minus zero do not count against it", () => {
    expect(decimalToNumber("12.50")).toEqual({ number: 12.5, exact: true });
    expect(decimalToNumber("-0.00")).toEqual({ number: 0, exact: true });
  });
});

describe("a 20-digit amount", () => {
  test("round-trips through the normal form", () => {
    const amount = "12345678901234567890.12";
    expect(normalizeDecimal(amount)).toBe(amount);
    expect(decimalOf(amount)).toBe(amount);
    expect(roundDecimal(amount, 2, "halfExpand")).toBe(amount);
  });
});

describe("decimalOf and fractionDigitsOf", () => {
  test("read either value type", () => {
    expect(decimalOf(0.5)).toBe("0.5");
    expect(decimalOf("00.50")).toBe("0.5");
    expect(fractionDigitsOf("12.340")).toBe(2);
    expect(fractionDigitsOf("12")).toBe(0);
  });
});
