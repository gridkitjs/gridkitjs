import { describe, expect, test } from "vitest";

import type { FieldMessage } from "../messages/fieldMessage";
import {
  createFieldState,
  fieldMessages,
  fieldText,
  shownMessages,
  type FieldState,
} from "./state";

const warning: FieldMessage = {
  severity: "warning",
  text: "Odd",
  code: null,
  source: "validate",
};
const tooLong: FieldMessage = {
  severity: "error",
  text: "Too long",
  code: "tooLong",
  source: "validate",
};
const refusal: FieldMessage = {
  severity: "error",
  text: "Taken",
  code: "refused",
  source: "commit",
};

const format = (value: number | null) =>
  value === null ? "" : value.toFixed(2);

describe("fieldText", () => {
  test("formats the value for a current draft", () => {
    expect(fieldText(createFieldState(12, []), format)).toBe("12.00");
  });

  test("shows typed text as it is", () => {
    const state: FieldState<number> = {
      ...createFieldState(12, []),
      draft: { kind: "text", text: "12.", reading: { kind: "pending" } },
    };
    expect(fieldText(state, format)).toBe("12.");
  });
});

describe("fieldMessages", () => {
  test("lists the refusal and the validation in display order", () => {
    const state: FieldState<number> = {
      ...createFieldState(12, [warning, tooLong]),
      refusal,
    };
    expect(fieldMessages(state)).toEqual([refusal, tooLong, warning]);
  });

  test("shows only why unreadable text cannot be read, and a refusal", () => {
    const state: FieldState<number> = {
      ...createFieldState(12, [tooLong]),
      draft: {
        kind: "text",
        text: "12a",
        reading: { kind: "unreadable", message: "Enter a number" },
      },
      refusal,
    };
    expect(fieldMessages(state)).toEqual([
      {
        severity: "error",
        text: "Enter a number",
        code: "unreadable",
        source: "parse",
      },
      refusal,
    ]);
  });
});

describe("shownMessages", () => {
  test("shows nothing until the field is revealed", () => {
    const state = createFieldState(12, [tooLong]);
    expect(shownMessages(state)).toEqual([]);
    expect(shownMessages({ ...state, revealed: true })).toEqual([tooLong]);
  });
});
