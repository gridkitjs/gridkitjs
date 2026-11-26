import { describe, expect, test } from "vitest";

import { defaultFormsMessages } from "./messages/formsMessages";
import type { ParseContext } from "./parse";
import {
  countCharacters,
  counterAnnouncement,
  formatText,
  textParser,
} from "./text";

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

describe("countCharacters", () => {
  test("counts code points, so a simple emoji is one", () => {
    expect(countCharacters("")).toBe(0);
    expect(countCharacters("Ada")).toBe(3);
    expect(countCharacters("a😀")).toBe(2);
  });
});

describe("counterAnnouncement", () => {
  test("says nothing while more than a tenth of the limit is left", () => {
    expect(counterAnnouncement(44, 50, defaultFormsMessages)).toBeNull();
  });

  test("says what is left from a tenth of the limit down to none", () => {
    expect(counterAnnouncement(45, 50, defaultFormsMessages)).toBe(
      "5 characters left",
    );
    expect(counterAnnouncement(49, 50, defaultFormsMessages)).toBe(
      "1 character left",
    );
    expect(counterAnnouncement(50, 50, defaultFormsMessages)).toBe(
      "0 characters left",
    );
  });

  test("says how many are too many once over", () => {
    expect(counterAnnouncement(53, 50, defaultFormsMessages)).toBe(
      "3 characters too many",
    );
  });
});
