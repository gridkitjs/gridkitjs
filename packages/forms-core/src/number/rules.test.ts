import { describe, expect, test } from "vitest";

import { defaultFormsMessages } from "../messages/formsMessages";
import type { ValidatorContext } from "../validation/validators";
import { maxRule, minRule, stepRule } from "./rules";

const en: ValidatorContext = {
  text: "",
  locale: "en-US",
  messages: defaultFormsMessages,
};

describe("minRule and maxRule", () => {
  test("refuse a number past the limit, with the limit written by the field", () => {
    expect(minRule<number>(10)(9.99, en)).toEqual({
      text: "Enter 10 or more",
      code: "rangeUnderflow",
    });
    expect(minRule<number>(10)(10, en)).toBeNull();
    expect(
      maxRule<number>(1000, {
        locale: "de-DE",
        style: "currency",
        currency: "EUR",
      })(1000.01, en),
    ).toEqual({
      text: "Enter 1.000,00\u00A0€ or less",
      code: "rangeOverflow",
    });
  });

  test("keep every digit of a decimal-string max", () => {
    const max = maxRule<string>("99999999999999999.99");
    expect(max("99999999999999999.99", en)).toBeNull();
    expect(max("100000000000000000", en)).toEqual({
      text: "Enter 99,999,999,999,999,999.99 or less",
      code: "rangeOverflow",
    });
  });

  test("compare a number with a decimal limit, and pass null", () => {
    expect(minRule<number>("0.1")(0.1, en)).toBeNull();
    expect(minRule<number>("0.1")(null, en)).toBeNull();
  });

  test("write a percent limit as the field shows it", () => {
    expect(maxRule<number>(1, { style: "percent" })(1.5, en)).toMatchObject({
      text: "Enter 100% or less",
    });
  });
});

describe("stepRule", () => {
  test("takes multiples of 0.05 exactly, whichever value type", () => {
    const step = stepRule<number>(0.05);
    expect(step(0.15, en)).toBeNull();
    expect(step(0.3, en)).toBeNull();
    expect(step(-0.35, en)).toBeNull();
    expect(step(0.12, en)).toEqual({
      text: "Enter a multiple of 0.05",
      code: "stepMismatch",
    });
    expect(stepRule<string>("0.05")("12345678901234567890.15", en)).toBeNull();
  });

  test("counts steps from its base", () => {
    const step = stepRule<number>(1, 0.5);
    expect(step(2.5, en)).toBeNull();
    expect(step(2, en)).toMatchObject({ code: "stepMismatch" });
  });

  test("passes null, and throws for a step that is not above zero", () => {
    expect(stepRule<number>(2)(null, en)).toBeNull();
    expect(() => stepRule(0)).toThrow(RangeError);
  });
});
