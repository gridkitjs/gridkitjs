import { describe, expect, test } from "vitest";

import {
  booleanFormatter,
  booleanParser,
  CHECKBOX_WORDS,
  nextCheckedValue,
  SWITCH_WORDS,
} from "./boolean";
import { defaultFormsMessages } from "./messages/formsMessages";

const format = {
  defaultFormat: () => "",
  locale: undefined,
  messages: defaultFormsMessages,
};

const parse = {
  defaultParse: () => ({ kind: "value", value: null }) as const,
  locale: undefined,
  messages: defaultFormsMessages,
};

describe("nextCheckedValue", () => {
  test("two states: unchecked and mixed check, checked unchecks", () => {
    expect(nextCheckedValue(false, false)).toBe(true);
    expect(nextCheckedValue(null, false)).toBe(true);
    expect(nextCheckedValue(true, false)).toBe(false);
  });

  test("three states: unchecked, checked, mixed, unchecked", () => {
    expect(nextCheckedValue(false, true)).toBe(true);
    expect(nextCheckedValue(true, true)).toBe(null);
    expect(nextCheckedValue(null, true)).toBe(false);
  });
});

describe("booleanFormatter", () => {
  test("writes a checkbox as Yes, No, or nothing for null", () => {
    const write = booleanFormatter(CHECKBOX_WORDS);
    expect(write(true, format)).toBe("Yes");
    expect(write(false, format)).toBe("No");
    expect(write(null, format)).toBe("");
  });

  test("writes a switch as On or Off, in the messages given", () => {
    const write = booleanFormatter(SWITCH_WORDS);
    expect(write(true, format)).toBe("On");
    expect(
      write(false, {
        ...format,
        messages: { ...defaultFormsMessages, displayOff: "Aus" },
      }),
    ).toBe("Aus");
  });
});

describe("booleanParser", () => {
  test("reads the words back, anything else as null", () => {
    const read = booleanParser(CHECKBOX_WORDS);
    expect(read("Yes", parse)).toEqual({ kind: "value", value: true });
    expect(read("No", parse)).toEqual({ kind: "value", value: false });
    expect(read("", parse)).toEqual({ kind: "value", value: null });
  });
});
