import { describe, expect, test } from "vitest";

import { hasError } from "../messages/fieldMessage";
import { defaultFormsMessages } from "../messages/formsMessages";
import {
  checkedRule,
  maxLengthRule,
  minLengthRule,
  patternRule,
  requiredRule,
  runValidators,
  type ValidatorContext,
} from "./validators";

const context: ValidatorContext = {
  text: "",
  locale: undefined,
  messages: defaultFormsMessages,
};

describe("requiredRule", () => {
  const required = requiredRule<string>();

  test("refuses null and text of only whitespace", () => {
    const missing = { text: "Enter a value", code: "required" };
    expect(required(null, context)).toEqual(missing);
    expect(required(" \t\n ", context)).toEqual(missing);
  });

  test("accepts any other value", () => {
    expect(required("a", context)).toBeNull();
    expect(requiredRule<number>()(0, context)).toBeNull();
    expect(requiredRule<boolean>()(false, context)).toBeNull();
  });
});

describe("minLengthRule", () => {
  const minLength = minLengthRule(3);

  test("refuses fewer code points than the minimum", () => {
    expect(minLength("ab", context)).toEqual({
      text: "Enter at least 3 characters",
      code: "tooShort",
    });
  });

  test("counts an emoji as one character", () => {
    expect(minLength("ab😀", context)).toBeNull();
  });

  test("passes null", () => {
    expect(minLength(null, context)).toBeNull();
  });
});

describe("maxLengthRule", () => {
  const maxLength = maxLengthRule(3);

  test("refuses more code points than the maximum", () => {
    expect(maxLength("abcd", context)).toEqual({
      text: "Enter no more than 3 characters",
      code: "tooLong",
    });
  });

  test("counts code points, not UTF-16 units", () => {
    // Three emoji are six UTF-16 units but three characters.
    expect(maxLength("😀😀😀", context)).toBeNull();
    expect(maxLength("😀😀😀😀", context)).not.toBeNull();
  });

  test("passes null", () => {
    expect(maxLength(null, context)).toBeNull();
  });
});

describe("patternRule", () => {
  test("requires the whole value to match", () => {
    const digits = patternRule(/\d{3}/);
    expect(digits("123", context)).toBeNull();
    expect(digits("1234", context)).toEqual({
      text: "Enter a value in the expected format",
      code: "pattern",
    });
    expect(digits("a123", context)).not.toBeNull();
  });

  test("keeps alternatives inside the anchors", () => {
    const yesOrNo = patternRule(/yes|no/);
    expect(yesOrNo("yes", context)).toBeNull();
    expect(yesOrNo("yesno", context)).not.toBeNull();
  });

  test("answers the same on every call under a global flag", () => {
    const digits = patternRule(/\d+/g);
    expect(digits("12", context)).toBeNull();
    expect(digits("12", context)).toBeNull();
  });

  test("keeps the other flags, and takes its own message", () => {
    const code = patternRule(/[a-z]{2}/i, "Two letters");
    expect(code("AB", context)).toBeNull();
    expect(code("A1", context)).toEqual({
      text: "Two letters",
      code: "pattern",
    });
  });

  test("passes null", () => {
    expect(patternRule(/x/)(null, context)).toBeNull();
  });
});

describe("checkedRule", () => {
  const mustCheck = checkedRule((messages) => messages.requiredChecked);

  test("refuses anything but true", () => {
    const unchecked = { text: "Check this box to continue", code: "required" };
    expect(mustCheck(false, context)).toEqual(unchecked);
    expect(mustCheck(null, context)).toEqual(unchecked);
    expect(mustCheck(true, context)).toBeNull();
  });
});

describe("runValidators", () => {
  test("collects every validator's messages in order", () => {
    const messages = runValidators(
      [
        requiredRule<string>(),
        () => [{ text: "Unusual", severity: "info" }, "Not allowed"],
        () => undefined,
      ],
      null,
      context,
    );
    expect(messages.map((message) => [message.severity, message.text])).toEqual(
      [
        ["error", "Enter a value"],
        ["info", "Unusual"],
        ["error", "Not allowed"],
      ],
    );
    expect(messages.every((message) => message.source === "validate")).toBe(
      true,
    );
  });

  test("passes the context through", () => {
    const seen: ValidatorContext[] = [];
    runValidators(
      [
        (_value, given) => {
          seen.push(given);
          return null;
        },
      ],
      "x",
      { ...context, text: "x" },
    );
    expect(seen).toEqual([{ ...context, text: "x" }]);
  });

  test("a warning is shown but leaves the field valid", () => {
    const messages = runValidators(
      [
        (value: number | null) =>
          value !== null && value > 100
            ? { text: "Over the credit limit", severity: "warning" }
            : null,
      ],
      150,
      context,
    );
    expect(messages).toHaveLength(1);
    expect(hasError(messages)).toBe(false);
  });
});
