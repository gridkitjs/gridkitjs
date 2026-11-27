import { describe, expect, test } from "vitest";

import type { ChangeSource } from "../field/events";
import type { TextEdit } from "../field/plan";
import {
  filterNumberEdit,
  fixedFractionDigits,
  numberCaret,
  type NumberEntryOptions,
} from "./numberEntry";

/** What the user does to the field. */
type Action =
  | { readonly type: "type"; readonly data: string }
  | { readonly type: "paste"; readonly data: string }
  | { readonly type: "backspace" }
  | { readonly type: "delete" }
  | { readonly type: "deleteWord" };

function type(data: string): Action {
  return { type: "type", data };
}

function paste(data: string): Action {
  return { type: "paste", data };
}

const BACKSPACE: Action = { type: "backspace" };
const DELETE: Action = { type: "delete" };
const DELETE_WORD: Action = { type: "deleteWord" };

/** Reads "12|3" (a caret) or "1[23]" (a selection) into the text and selection. */
function readState(state: string): {
  readonly text: string;
  readonly start: number;
  readonly end: number;
} {
  const caret = state.indexOf("|");
  if (caret !== -1) {
    return { text: state.replace("|", ""), start: caret, end: caret };
  }
  const start = state.indexOf("[");
  const end = state.indexOf("]") - 1;
  return { text: state.replace("[", "").replace("]", ""), start, end };
}

/** The edit the browser would make, as forms-dom reports it before it happens. */
function browserEdit(state: string, action: Action): TextEdit<null> {
  const { text, start, end } = readState(state);
  const splice = (from: number, to: number, insert: string) =>
    text.slice(0, from) + insert + text.slice(to);
  const selected = start !== end;
  const base = { nativeEvent: null };
  const input = (inputType: string, data: string | null) => ({
    inputType,
    data,
    selectionStart: start,
    selectionEnd: end,
    isComposing: false,
  });
  const source: ChangeSource = action.type === "paste" ? "paste" : "typing";
  switch (action.type) {
    case "type":
    case "paste":
      return {
        ...base,
        source,
        text: splice(start, end, action.data),
        input: input(
          action.type === "type" ? "insertText" : "insertFromPaste",
          action.data,
        ),
      };
    case "backspace":
      return {
        ...base,
        source,
        text: selected ? splice(start, end, "") : splice(start - 1, end, ""),
        input: input("deleteContentBackward", null),
      };
    case "delete":
      return {
        ...base,
        source,
        text: selected ? splice(start, end, "") : splice(start, end + 1, ""),
        input: input("deleteContentForward", null),
      };
    case "deleteWord": {
      const word = /\S*\s*$/u.exec(text.slice(0, start))?.[0] ?? "";
      return {
        ...base,
        source,
        text: splice(start - word.length, end, ""),
        input: input("deleteWordBackward", null),
      };
    }
  }
}

/**
 * What the field shows after `action` on `state`, with "|" at the caret:
 * the browser's own edit where the filter allows it, `"refused"` where it
 * prevents it.
 */
function after(
  state: string,
  action: Action,
  options: NumberEntryOptions,
): string {
  const edit = browserEdit(state, action);
  const before = readState(state).text;
  const { decision } = filterNumberEdit(edit, before, options);
  switch (decision.kind) {
    case "allow":
      return edit.text;
    case "prevent":
      return "refused";
    case "rewrite": {
      const { start, end } = readState(state);
      const text = before.slice(0, start) + decision.data + before.slice(end);
      const caret = start + decision.data.length;
      return `${text.slice(0, caret)}|${text.slice(caret)}`;
    }
    case "replace":
      return `${decision.text.slice(0, decision.caret)}|${decision.text.slice(decision.caret)}`;
  }
}

describe("fixedFractionDigits", () => {
  test("is the count when the minimum equals a maximum above zero", () => {
    expect(
      fixedFractionDigits({
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    ).toBe(2);
    expect(fixedFractionDigits({ style: "currency", currency: "EUR" })).toBe(2);
  });

  test("is null for free digits, no digits, or free entry", () => {
    expect(fixedFractionDigits({})).toBeNull();
    expect(fixedFractionDigits({ maximumFractionDigits: 2 })).toBeNull();
    expect(
      fixedFractionDigits({
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }),
    ).toBeNull();
    expect(fixedFractionDigits({ style: "currency", currency: "JPY" })).toBe(
      null,
    );
    expect(
      fixedFractionDigits({
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        decimalEntry: "free",
      }),
    ).toBeNull();
  });
});

describe("filterNumberEdit: fixed-decimal entry", () => {
  const de: NumberEntryOptions = {
    locale: "de-DE",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  };
  const en: NumberEntryOptions = { ...de, locale: "en-US" };

  test.each([
    // The decimals show as soon as there is a value; digits go before them.
    ["|", type("5"), "5|,00"],
    ["5|,00", type("1"), "51|,00"],
    ["51|,00", type("2"), "512|,00"],
    ["|5,00", type("1"), "1|5,00"],
    // The decimal separator jumps into the decimals and types nothing.
    ["123|,00", type(","), "123,|00"],
    ["1|23,00", type(","), "123,|00"],
    ["123,|00", type(","), "refused"],
    ["123,4|0", type(","), "refused"],
    ["|", type(","), "0,|00"],
    // So does the other mark: a phone's decimal key types the device's.
    ["123|,00", type("."), "123,|00"],
    // Decimals are typed over and never grow.
    ["123,|00", type("4"), "123,4|0"],
    ["123,4|0", type("5"), "123,45|"],
    ["123,45|", type("6"), "refused"],
    ["123,|45", type("9"), "123,9|5"],
    // A zero at the start of the integer part goes.
    ["0|,45", type("7"), "7|,45"],
    ["|0,45", type("7"), "7|,45"],
    // Backspace keeps the shape.
    ["123,45|", BACKSPACE, "123,4|0"],
    ["123,4|5", BACKSPACE, "123,|05"],
    ["123,|45", BACKSPACE, "12|,45"],
    ["1|23,45", BACKSPACE, "|23,45"],
    ["1|,45", BACKSPACE, "0|,45"],
    ["0|,45", BACKSPACE, "refused"],
    ["5|,00", BACKSPACE, "|"],
    ["|5,00", BACKSPACE, "refused"],
    // Delete mirrors it.
    ["123|,45", DELETE, "123,0|5"],
    ["123,|45", DELETE, "123,0|5"],
    ["123,4|5", DELETE, "123,40|"],
    ["123,45|", DELETE, "refused"],
    ["1|23,45", DELETE, "1|3,45"],
    // Clearing everything empties the field.
    ["[123,45]", BACKSPACE, "|"],
    ["[123,45]", DELETE, "|"],
    // A selection is replaced, then shaped back; the separator stays.
    ["[123,45]", type("7"), "7|,00"],
    ["1[23],45", type("9"), "19|,45"],
    ["123,[4]5", type("9"), "123,9|5"],
    ["123,[45]", type("9"), "123,9|0"],
    ["12[3,4]5", type("9"), "129|,05"],
    ["12[3,4]5", BACKSPACE, "12|,05"],
    // A sign at the start.
    ["|", type("-"), "-|"],
    ["-|", type("5"), "-5|,00"],
    ["|5,00", type("-"), "-|5,00"],
    ["-|5,00", BACKSPACE, "|5,00"],
    ["|-5,00", DELETE, "|5,00"],
    ["5|,00", type("-"), "refused"],
    // Anything else is refused.
    ["5|,00", type("a"), "refused"],
    ["5|,00", type("€"), "refused"],
    // Digits of any script are written in the field's.
    ["|", type("٣"), "3|,00"],
    ["|", type("３"), "3|,00"],
  ])("de-DE: %s, then %o, gives %s", (state, action, expected) => {
    expect(after(state, action, de)).toBe(expected);
  });

  test.each([
    ["1|23.45", DELETE_WORD, "|23.45"],
    ["123.45|", DELETE_WORD, "|"],
  ])(
    "a word deletion removes digits as a selection would: %s",
    (state, action, expected) => {
      expect(after(state, action, en)).toBe(expected);
    },
  );

  test("refuses a sign where negatives are not allowed", () => {
    expect(after("|5,00", type("-"), { ...de, negatives: false })).toBe(
      "refused",
    );
  });

  test.each([
    ["|", paste("$1,234.5"), "1234|.50"],
    ["[9.00]", paste("1234.567"), "1234|.57"],
    ["1|.00", paste("23"), "123|.00"],
    ["1|.00", paste("2.5"), "2|.50"],
    ["|", paste("(12.00)"), "-12|.00"],
  ])("en-US: pasting into %s, %o, gives %s", (state, action, expected) => {
    expect(after(state, action, en)).toBe(expected);
  });

  test("pasted text that is not a number is refused", () => {
    expect(after("|", paste("12abc"), en)).toBe("refused");
  });

  test("a paste reports how clean-up read it", () => {
    const { pasted } = filterNumberEdit(
      browserEdit("|", paste("$1,234.50")),
      "",
      en,
    );
    expect(pasted).toMatchObject({
      decimalSeparator: ".",
      grouped: true,
      cleaned: true,
    });
  });

  test("a currency's minor units are its fixed decimals", () => {
    expect(
      after("|", type("5"), {
        locale: "en-US",
        style: "currency",
        currency: "USD",
      }),
    ).toBe("5|.00");
  });

  test("free entry types into a fixed-decimal field like any other", () => {
    expect(after("|", type("5"), { ...de, decimalEntry: "free" })).toBe("5");
  });

  test("undo stands, and text that is not fixed-decimal is edited freely", () => {
    const undo: TextEdit<null> = {
      text: "12",
      source: "undo",
      nativeEvent: null,
      input: {
        inputType: "historyUndo",
        data: null,
        selectionStart: 5,
        selectionEnd: 5,
        isComposing: false,
      },
    };
    expect(filterNumberEdit(undo, "12,00", de).decision).toEqual({
      kind: "allow",
    });
    expect(after("(12|", type("3"), de)).toBe("(123");
  });
});

describe("filterNumberEdit: free entry", () => {
  const de: NumberEntryOptions = { locale: "de-DE" };
  const en: NumberEntryOptions = { locale: "en-US" };

  test.each([
    ["|", type("-"), de, "-"],
    ["-1234|", type(","), de, "-1234,"],
    ["-1234,|", type("5"), de, "-1234,5"],
    ["1234,5|", type(","), de, "refused"],
    ["1234|", type("."), de, "refused"],
    ["1|", type("."), de, "1."],
    ["1.234|", type("."), de, "1.234."],
    ["12|", type(" "), en, "refused"],
    ["12|", type("a"), en, "refused"],
    ["12|", type("e"), en, "refused"],
    ["12|", type("€"), en, "refused"],
    ["|", type("("), en, "("],
    ["(12|", type(")"), en, "(12)"],
    ["12|3", BACKSPACE, en, "13"],
  ])("%s, then %o, in %o, gives %s", (state, action, options, expected) => {
    expect(after(state, action, options)).toBe(expected);
  });

  test("a percent field refuses the percent sign", () => {
    expect(after("12|", type("%"), { locale: "en-US", style: "percent" })).toBe(
      "refused",
    );
  });

  test("a whole-number field refuses the decimal separator", () => {
    expect(after("12|", type("."), { ...en, maximumFractionDigits: 0 })).toBe(
      "refused",
    );
  });

  test("negatives can be refused", () => {
    expect(after("|", type("-"), { ...en, negatives: false })).toBe("refused");
    expect(after("|", type("+"), { ...en, negatives: false })).toBe("+");
  });

  test("limitFractionDigits refuses a digit past the maximum", () => {
    const options = {
      ...en,
      maximumFractionDigits: 2,
      limitFractionDigits: true,
    };
    expect(after("1.2|", type("3"), options)).toBe("1.23");
    expect(after("1.23|", type("4"), options)).toBe("refused");
    expect(
      after("1.234|", type("5"), { ...options, limitFractionDigits: false }),
    ).toBe("1.2345");
  });

  test("a paste is cleaned into the field's own text", () => {
    expect(after("|", paste("$1,234.50"), en)).toBe("1234.50|");
    expect(after("|", paste("$1,234.50"), de)).toBe("1234,50|");
    expect(after("|", paste("1.234"), de)).toBe("1234|");
    expect(after("|", paste("12abc"), en)).toBe("refused");
    expect(after("1.5|", paste("2.5"), en)).toBe("refused");
  });
});

describe("numberCaret", () => {
  const de = numberCaret({ locale: "de-DE" });

  test("keeps the caret after the same digit when grouping changes", () => {
    expect(de("-1.234.567,5", 6, "-1234567,5")).toBe(5);
    expect(de("-1234567,5", 5, "-1.234.567,5")).toBe(6);
  });

  test("keeps a caret at the end at the end, and one at the start at the start", () => {
    expect(de("1234,5", 6, "1234,50")).toBe(7);
    expect(de("1.234", 0, "1234")).toBe(0);
  });
});
