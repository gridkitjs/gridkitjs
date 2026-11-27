import { describe, expect, test } from "vitest";

import { createFieldController } from "../field/createFieldController";
import type { FieldChangeEvent } from "../field/events";
import { createFieldState, type FieldState } from "../field/state";
import { defaultFormsMessages } from "../messages/formsMessages";
import type { FormatContext, ParseContext } from "../parse";
import {
  numberDetails,
  numberFormatter,
  numberParser,
  stepNumberValue,
  type NumberDetails,
  type NumberStep,
} from "./numberField";

function parseContext<V>(locale: string): ParseContext<V> {
  return {
    defaultParse: () => ({ kind: "value", value: null }),
    locale,
    messages: defaultFormsMessages,
  };
}

function formatContext<V>(
  locale: string,
  purpose: "display" | "edit",
): FormatContext<V> {
  return {
    defaultFormat: () => "",
    locale,
    messages: defaultFormsMessages,
    purpose,
  };
}

describe("numberParser", () => {
  const read = numberParser();
  const readDecimal = numberParser({ valueType: "decimal" });
  const en = parseContext<number>("en-US");
  const enDecimal = parseContext<string>("en-US");

  test("reads a JS number by default, null for empty", () => {
    expect(read("1,234.5", en)).toEqual({ kind: "value", value: 1234.5 });
    expect(read(" ", en)).toEqual({ kind: "value", value: null });
    expect(read("-0", en)).toEqual({ kind: "value", value: 0 });
  });

  test("row 33: a 20-digit number is exact as a decimal and too precise as a number", () => {
    expect(readDecimal("12345678901234567890", enDecimal)).toEqual({
      kind: "value",
      value: "12345678901234567890",
    });
    expect(read("12345678901234567890", en)).toEqual({
      kind: "unreadable",
      message: "This number has more digits than can be kept exactly",
    });
  });

  test("refuses a number's lost digits, never its exact ones", () => {
    expect(read("9007199254740993", en).kind).toBe("unreadable");
    expect(read("123456789012345.6", en)).toEqual({
      kind: "value",
      value: 123456789012345.6,
    });
    expect(read("1000000000000000000000", en)).toEqual({
      kind: "value",
      value: 1e21,
    });
  });

  test("rounds to the maximum fraction digits as it reads", () => {
    const twoDigits = numberParser({ maximumFractionDigits: 2 });
    expect(twoDigits("2.345", en)).toEqual({ kind: "value", value: 2.35 });
    const halfEven = numberParser({
      maximumFractionDigits: 0,
      roundingMode: "halfEven",
    });
    expect(halfEven("2.5", en)).toEqual({ kind: "value", value: 2 });
    expect(halfEven("3.5", en)).toEqual({ kind: "value", value: 4 });
  });

  test("rounds to whole numbers with no fraction digits", () => {
    const whole = numberParser({ maximumFractionDigits: 0 });
    expect(whole("2.4", en)).toEqual({ kind: "value", value: 2 });
  });

  test("holds a decimal in normal form, padded to the minimum digits", () => {
    const usd = numberParser({
      valueType: "decimal",
      style: "currency",
      currency: "USD",
    });
    expect(usd("1234.5", enDecimal)).toEqual({
      kind: "value",
      value: "1234.50",
    });
    expect(usd("-0.001", enDecimal)).toEqual({ kind: "value", value: "0.00" });
    expect(readDecimal("0012.500", enDecimal)).toEqual({
      kind: "value",
      value: "12.5",
    });
  });

  test("takes a currency's minor units: JPY rounds to whole yen", () => {
    const jpy = numberParser({ style: "currency", currency: "JPY" });
    expect(jpy("1234.5", en)).toEqual({ kind: "value", value: 1235 });
  });

  test("stores a percent as a fraction by default, exactly", () => {
    const percent = numberParser({ style: "percent" });
    expect(percent("12.3", en)).toEqual({ kind: "value", value: 0.123 });
    expect(percent("12,5 %", parseContext<number>("fr-FR"))).toEqual({
      kind: "value",
      value: 0.125,
    });
    const asPercent = numberParser({
      style: "percent",
      percentScale: "percent",
    });
    expect(asPercent("12.5", en)).toEqual({ kind: "value", value: 12.5 });
    const roundedPercent = numberParser({
      valueType: "decimal",
      style: "percent",
      maximumFractionDigits: 1,
    });
    expect(roundedPercent("12.34", enDecimal)).toEqual({
      kind: "value",
      value: "0.123",
    });
  });

  test("says why text cannot be read, naming the field's separators", () => {
    const de = parseContext<number>("de-DE");
    expect(read("12a", de)).toEqual({
      kind: "unreadable",
      message: "Enter a number",
    });
    expect(read("-", de)).toEqual({
      kind: "unreadable",
      message: "Enter a number",
    });
    expect(read("1.5", de)).toEqual({
      kind: "unreadable",
      message: "Use “,” for decimals and “.” between thousands",
    });
  });

  test("reads in its own locale when it names one", () => {
    const german = numberParser({ locale: "de-DE" });
    expect(german("1.234,5", en)).toEqual({ kind: "value", value: 1234.5 });
  });
});

describe("numberFormatter", () => {
  test("writes the edit form while focused and the display form otherwise", () => {
    const write = numberFormatter<number>({
      style: "currency",
      currency: "EUR",
    });
    expect(write(-1234.5, formatContext("de-DE", "edit"))).toBe("-1234,50");
    expect(write(-1234.5, formatContext("de-DE", "display"))).toBe("-1.234,50");
    expect(write(null, formatContext("de-DE", "display"))).toBe("");
  });

  test("writes a decimal string exactly", () => {
    const write = numberFormatter<string>();
    expect(
      write("12345678901234567890.12", formatContext("en-US", "display")),
    ).toBe("12,345,678,901,234,567,890.12");
  });
});

describe("numberDetails", () => {
  const usd = {
    locale: "en-US",
    style: "currency",
    currency: "USD",
  } as const;

  function typedState(text: string, value: number | null): FieldState<number> {
    return {
      ...createFieldState(value, []),
      draft: { kind: "text", text, reading: { kind: "value", value } },
    };
  }

  test("gives the decimal, the full text, and no reading while the value shows", () => {
    expect(numberDetails(createFieldState(1234.5, []), usd)).toEqual({
      decimal: "1234.50",
      formatted: "$1,234.50",
      reading: null,
    });
    expect(numberDetails(createFieldState<number>(null, []), usd)).toEqual({
      decimal: null,
      formatted: "",
      reading: null,
    });
  });

  test("describes typed text as it reads", () => {
    expect(
      numberDetails(typedState("-1234,5", -1234.5), { locale: "de-DE" }),
    ).toEqual({
      decimal: "-1234.5",
      formatted: "-1.234,5",
      reading: {
        decimalSeparator: ",",
        grouped: false,
        negative: "minus",
        digits: ["latn"],
        cleaned: false,
      },
    });
  });

  test("describes the paste the input remembers instead", () => {
    const pasted = {
      decimalSeparator: ".",
      grouped: true,
      negative: null,
      digits: ["latn"],
      cleaned: true,
    };
    expect(
      numberDetails(typedState("1234.50", 1234.5), usd, pasted).reading,
    ).toBe(pasted);
  });

  test("gives a percent's stored value as its decimal", () => {
    expect(
      numberDetails(createFieldState(0.125, []), {
        locale: "fr-FR",
        style: "percent",
      }),
    ).toMatchObject({ decimal: "0.125", formatted: "12,5\u00A0%" });
  });
});

describe("a number field on the controller", () => {
  test("typing -1234,5 in de-DE fires the design's events, with edit and display text", () => {
    const options = { locale: "de-DE" } as const;
    const changes: FieldChangeEvent<number, NumberDetails>[] = [];
    const texts: { event: string; text: string }[] = [];
    const field = createFieldController<number, NumberDetails>({
      defaultParse: numberParser(),
      defaultFormat: numberFormatter(),
      details: (current) => numberDetails(current, options),
      locale: "de-DE",
      messages: defaultFormsMessages,
      onFocus: ({ text }) => texts.push({ event: "focus", text }),
      onChange: (event) => changes.push(event),
      onCommit: ({ text }) => texts.push({ event: "commit", text }),
      onBlur: ({ text }) => texts.push({ event: "blur", text }),
    });
    field.focus(null);
    for (const text of [
      "-",
      "-1",
      "-12",
      "-123",
      "-1234",
      "-1234,",
      "-1234,5",
    ]) {
      field.input({ text, source: "typing", nativeEvent: null, input: null });
    }
    expect(changes.map((change) => change.value)).toEqual([
      -1, -12, -123, -1234, -1234.5,
    ]);
    expect(changes.at(-1)).toMatchObject({
      decimal: "-1234.5",
      formatted: "-1.234,5",
      reading: { decimalSeparator: ",", grouped: false, negative: "minus" },
    });
    field.commit("enter", null);
    field.blur(null);
    expect(texts).toEqual([
      { event: "focus", text: "" },
      { event: "commit", text: "-1234,5" },
      { event: "commit", text: "-1.234,5" },
      { event: "blur", text: "-1.234,5" },
    ]);
  });

  test("shows an app's -0 as 0", () => {
    const field = createFieldController<number>({
      defaultValue: -0,
      defaultParse: numberParser(),
      defaultFormat: numberFormatter(),
      locale: "en-US",
      messages: defaultFormsMessages,
    });
    expect(field.getText()).toBe("0");
  });
});

describe("stepNumberValue", () => {
  const up: NumberStep = {
    direction: "up",
    size: "step",
    step: "0.1",
    largeStep: "1",
    min: null,
    max: null,
  };

  test("steps exactly, in the value type", () => {
    expect(stepNumberValue(0.1, up)).toBe(0.2);
    expect(stepNumberValue("0.1", up, { valueType: "decimal" })).toBe("0.2");
    expect(
      stepNumberValue("0.1", up, {
        valueType: "decimal",
        minimumFractionDigits: 2,
      }),
    ).toBe("0.20");
  });

  test("starts from empty, and stays at a limit", () => {
    expect(stepNumberValue(null, up)).toBe(0);
    expect(stepNumberValue(5, { ...up, step: 1, max: 5 })).toBe(5);
    expect(stepNumberValue(5, { ...up, size: "edge", step: 1, max: 9 })).toBe(
      9,
    );
  });

  test("rounds to the fraction digits kept, of the number shown for a percent", () => {
    expect(
      stepNumberValue(
        1,
        { ...up, step: "0.005" },
        { maximumFractionDigits: 2 },
      ),
    ).toBe(1.01);
    expect(
      stepNumberValue(
        0.12,
        { ...up, step: "0.001" },
        { style: "percent", maximumFractionDigits: 1 },
      ),
    ).toBe(0.121);
  });
});
