import { describe, expect, test } from "vitest";

import {
  hasError,
  sortFieldMessages,
  toFieldMessage,
  toFieldMessages,
  type FieldMessage,
} from "./fieldMessage";

describe("toFieldMessages", () => {
  test("reads a string as an error with no code", () => {
    expect(toFieldMessages("Too high", "app")).toEqual([
      { severity: "error", text: "Too high", code: null, source: "app" },
    ]);
  });

  test("keeps an object's severity and code, defaulting to an error", () => {
    expect(
      toFieldMessages(
        [{ text: "Over the limit", severity: "warning", code: "limit" }, "No"],
        "validate",
      ),
    ).toEqual([
      {
        severity: "warning",
        text: "Over the limit",
        code: "limit",
        source: "validate",
      },
      { severity: "error", text: "No", code: null, source: "validate" },
    ]);
    expect(toFieldMessages({ text: "Check it" }, "app")).toEqual([
      { severity: "error", text: "Check it", code: null, source: "app" },
    ]);
  });

  test("reads null and undefined as none", () => {
    expect(toFieldMessages(null, "app")).toEqual([]);
    expect(toFieldMessages(undefined, "app")).toEqual([]);
    expect(toFieldMessages([], "app")).toEqual([]);
  });
});

describe("toFieldMessage", () => {
  test("uses the fallback code only when the input names none", () => {
    expect(toFieldMessage("Taken", "commit", "refused").code).toBe("refused");
    expect(
      toFieldMessage({ text: "Taken", code: "duplicate" }, "commit", "refused")
        .code,
    ).toBe("duplicate");
  });
});

function message(
  severity: FieldMessage["severity"],
  source: FieldMessage["source"],
  text = `${severity} from ${source}`,
): FieldMessage {
  return { severity, text, code: null, source };
}

describe("sortFieldMessages", () => {
  test("puts the most serious first, then parse, commit, validate, app", () => {
    const sorted = sortFieldMessages([
      message("info", "app"),
      message("error", "app"),
      message("warning", "validate"),
      message("error", "validate"),
      message("error", "commit"),
      message("error", "parse"),
      message("success", "validate"),
    ]);
    expect(sorted.map((entry) => entry.text)).toEqual([
      "error from parse",
      "error from commit",
      "error from validate",
      "error from app",
      "warning from validate",
      "info from app",
      "success from validate",
    ]);
  });

  test("keeps the order of equal messages and leaves the input as it was", () => {
    const input = [
      message("warning", "app", "first"),
      message("warning", "app", "second"),
    ];
    expect(sortFieldMessages(input).map((entry) => entry.text)).toEqual([
      "first",
      "second",
    ]);
    expect(input.map((entry) => entry.text)).toEqual(["first", "second"]);
  });
});

describe("hasError", () => {
  test("is true only when an error is among the messages", () => {
    expect(hasError([message("warning", "validate")])).toBe(false);
    expect(hasError([message("info", "app"), message("error", "app")])).toBe(
      true,
    );
    expect(hasError([])).toBe(false);
  });
});
