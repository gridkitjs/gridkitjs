import { describe, expect, test } from "vitest";

import { defaultFormsMessages } from "./messages/formsMessages";
import type { ParseContext } from "./parse";
import { formatText, textParser } from "./text";

function context(locale?: Intl.LocalesArgument): ParseContext<string> {
  const parse = textParser();
  const own: ParseContext<string> = {
    defaultParse: (text) => parse(text, own),
    locale,
    messages: defaultFormsMessages,
  };
  return own;
}

describe("textParser", () => {
  test("reads text as it is, and empty text as null", () => {
    const parse = textParser();
    expect(parse("Ada", context())).toEqual({ kind: "value", value: "Ada" });
    expect(parse("", context())).toEqual({ kind: "value", value: null });
  });

  test("keeps whitespace unless asked to trim", () => {
    expect(textParser()("  Ada ", context())).toEqual({
      kind: "value",
      value: "  Ada ",
    });
    expect(textParser()("   ", context())).toEqual({
      kind: "value",
      value: "   ",
    });
    expect(textParser({ trim: true })("  Ada ", context())).toEqual({
      kind: "value",
      value: "Ada",
    });
  });

  test("reads text of only whitespace as null when trimming", () => {
    expect(textParser({ trim: true })(" \t ", context())).toEqual({
      kind: "value",
      value: null,
    });
  });

  test("upper-cases in the context's locale", () => {
    const upper = textParser({ uppercase: true });
    expect(upper("istanbul", context("en"))).toEqual({
      kind: "value",
      value: "ISTANBUL",
    });
    expect(upper("istanbul", context("tr"))).toEqual({
      kind: "value",
      value: "İSTANBUL",
    });
  });
});

describe("formatText", () => {
  test("writes the value as it is, and null as empty text", () => {
    expect(formatText("Ada")).toBe("Ada");
    expect(formatText(null)).toBe("");
  });
});
