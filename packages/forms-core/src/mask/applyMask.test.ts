import { describe, expect, test } from "vitest";

import {
  applyMaskEdit,
  formatMasked,
  isValidMaskStart,
  maskDetails,
  type MaskOptions,
} from "./applyMask";

/** What the user does to the field. */
type Action =
  | { readonly inputType: string; readonly data: string | null }
  | readonly Action[];

/** Typing `keys`, one key at a time. */
function type(keys: string): Action {
  return Array.from(keys, (data) => ({ inputType: "insertText", data }));
}

function paste(data: string): Action {
  return { inputType: "insertFromPaste", data };
}

const BACKSPACE: Action = { inputType: "deleteContentBackward", data: null };
const DELETE: Action = { inputType: "deleteContentForward", data: null };
const WORD_BACKSPACE: Action = { inputType: "deleteWordBackward", data: null };
const LINE_BACKSPACE: Action = {
  inputType: "deleteSoftLineBackward",
  data: null,
};

/** Reads "12|3" (a caret) or "1[23]" (a selection) into the text and selection. */
function readState(state: string) {
  const caret = state.indexOf("|");
  if (caret !== -1) {
    return {
      text: state.replace("|", ""),
      selectionStart: caret,
      selectionEnd: caret,
    };
  }
  const start = state.indexOf("[");
  const end = state.indexOf("]") - 1;
  return {
    text: state.replace("[", "").replace("]", ""),
    selectionStart: start,
    selectionEnd: end,
  };
}

/**
 * What the focused field shows after `action` on `state`, with "|" at the
 * caret, or `"refused"`. A refused key in a sequence refuses the sequence.
 */
function after(options: MaskOptions, state: string, action: Action): string {
  if (Array.isArray(action)) {
    return (action as readonly Action[]).reduce<string>(
      (shown, next) =>
        shown === "refused" ? shown : after(options, shown, next),
      state,
    );
  }
  const edit = action as Exclude<Action, readonly Action[]>;
  const result = applyMaskEdit(options, readState(state), edit, true);
  return result.accepted
    ? `${result.text.slice(0, result.caret)}|${result.text.slice(result.caret)}`
    : "refused";
}

/** The details of the focused text `state`, its "|" taken out. */
function details(options: MaskOptions, state: string) {
  return maskDetails(options, readState(state).text);
}

const phone: MaskOptions = { mask: ["(000) 000-0000", "+0 (000) 000-0000"] };

describe("a phone-like mask: typing 5551234567 into the empty field", () => {
  test("focus shows the template, the caret at the first slot", () => {
    const shown = formatMasked(phone, "", true);
    expect([shown.text, shown.caret, shown.raw]).toEqual([
      "(___) ___-____",
      1,
      "",
    ]);
  });

  test.each([
    ["(|___) ___-____", type("5"), "(5|__) ___-____", "5"],
    ["(5|__) ___-____", type("55"), "(555) |___-____", "555"],
    ["(555) |___-____", type("123"), "(555) 123-|____", "555123"],
    ["(555) 123-|____", type("4567"), "(555) 123-4567|", "5551234567"],
    ["(555) 123-4567|", type("a"), "refused", "5551234567"],
    ["(555) 123-4567|", type("8"), "+5 (551) 234-5678|", "55512345678"],
  ])("%s, typing, shows %s", (state, keys, shown, raw) => {
    expect(after(phone, state, keys)).toBe(shown);
    const text = shown === "refused" ? state : shown;
    expect(details(phone, text).raw).toBe(raw);
  });

  test("the text is complete at the tenth digit, in the first pattern", () => {
    expect(details(phone, "(555) 123-456_")).toEqual({
      raw: "555123456",
      formatted: "(555) 123-456",
      complete: false,
      pattern: "(000) 000-0000",
    });
    expect(details(phone, "(555) 123-4567").complete).toBe(true);
    expect(details(phone, "+5 (551) 234-5678")).toEqual({
      raw: "55512345678",
      formatted: "+5 (551) 234-5678",
      complete: true,
      pattern: "+0 (000) 000-0000",
    });
  });
});

describe("a phone-like mask: deleting in the middle", () => {
  test.each([
    ["(555) 1|23-4567", BACKSPACE, "(555) |234-567_", "555234567"],
    ["(555) |234-567_", type("9"), "(555) 9|23-4567", "5559234567"],
    ["(555) |923-4567", BACKSPACE, "(55|9) 234-567_", "559234567"],
    ["(555) [123]-4567", DELETE, "(555) |456-7___", "5554567"],
  ])("%s shows %s", (state, action, shown, raw) => {
    expect(after(phone, state, action)).toBe(shown);
    expect(details(phone, shown).raw).toBe(raw);
  });

  test("Delete steps forward over literals", () => {
    expect(after(phone, "(555|) 123-4567", DELETE)).toBe("(555) |234-567_");
  });

  test("deleting the eleventh digit moves back to the first pattern", () => {
    expect(after(phone, "+5 (551) 234-5678|", BACKSPACE)).toBe(
      "(555) 123-4567|",
    );
  });

  test("a word goes back to the literal before it; a line, to the start", () => {
    expect(after(phone, "(555) 123|-4567", WORD_BACKSPACE)).toBe(
      "(555) |456-7___",
    );
    expect(after(phone, "(555) 123|-4567", LINE_BACKSPACE)).toBe(
      "(|456) 7__-____",
    );
  });

  test("nothing to delete is refused", () => {
    expect(after(phone, "(|___) ___-____", BACKSPACE)).toBe("refused");
    expect(after(phone, "(555) 123-4567|", DELETE)).toBe("refused");
    expect(after(phone, "(555)[ ]123-4567", DELETE)).toBe("refused");
  });
});

describe("a phone-like mask: pasting into the empty field", () => {
  test.each([
    ["555.123.4567", "(555) 123-4567", "5551234567"],
    ["(555) 123-4567", "(555) 123-4567", "5551234567"],
    ["+1 (555) 123-4567", "+1 (555) 123-4567", "15551234567"],
    ["call 555 123", "(555) 123-____", "555123"],
  ])("%j shows %s", (pasted, shown, raw) => {
    const result = applyMaskEdit(
      phone,
      readState("(|___) ___-____"),
      paste(pasted) as Exclude<Action, readonly Action[]>,
      true,
    );
    expect([result.text, result.raw]).toEqual([shown, raw]);
  });

  test("a paste goes in at the caret and the caret after it", () => {
    expect(after(phone, "(555) |___-____", paste("12-34"))).toBe(
      "(555) 123-4|___",
    );
  });

  test("a paste with nothing that fits is refused", () => {
    expect(after(phone, "(|___) ___-____", paste("call me"))).toBe("refused");
  });

  test("typing is strict: a key that would push a digit out is refused", () => {
    const single: MaskOptions = { mask: "(000) 000-0000" };
    expect(after(single, "(555) |123-4567", type("9"))).toBe("refused");
    expect(after(single, "(555) [123]-4567", type("9"))).toBe(
      "(555) 9|45-67__",
    );
  });

  test("a selection replaced by a paste keeps the characters after it", () => {
    expect(after(phone, "(555) [123]-4567", paste("98"))).toBe(
      "(555) 98|4-567_",
    );
  });
});

describe("literals", () => {
  test("typing a literal moves past it, a key that changes nothing is refused", () => {
    expect(after(phone, "(555|) ___-____", type(")"))).toBe("refused");
    expect(after(phone, "(55|_) ___-____", type(")"))).toBe("refused");
  });

  test("a typed literal skips the optional slots before it", () => {
    const ipv4: MaskOptions = { mask: "099.099.099.099" };
    expect(formatMasked(ipv4, "", true).text).toBe("___.___.___.___");
    expect(after(ipv4, "|___.___.___.___", type("19."))).toBe(
      "19.|___.___.___",
    );
    expect(after(ipv4, "19.|___.___.___", type("168"))).toBe("19.168.|___.___");
    // The caret is past the dot already, so typing one changes nothing.
    expect(after(ipv4, "19.168.|___.___", type("."))).toBe("refused");
    expect(after(ipv4, "19.168.|___.___", type("1.1"))).toBe("19.168.1.1|__");
    expect(details(ipv4, "19.168.1.1__")).toEqual({
      raw: "1916811",
      formatted: "19.168.1.1",
      complete: true,
      pattern: "099.099.099.099",
    });
  });

  test("Backspace after a typed literal takes the step back", () => {
    const ipv4: MaskOptions = { mask: "099.099.099.099" };
    expect(after(ipv4, "1.|___.___.___", BACKSPACE)).toBe("1|__.___.___.___");
    expect(after(ipv4, "1.2|__.___.___", BACKSPACE)).toBe("1.|___.___.___");
  });

  test("a full part moves on to the next by itself", () => {
    const ipv4: MaskOptions = { mask: "099.099.099.099" };
    expect(after(ipv4, "|___.___.___.___", type("1921"))).toBe(
      "192.1|__.___.___",
    );
    expect(after(ipv4, "192|.___.___.___", type("."))).toBe("refused");
  });

  test("a slot that accepts the literal's character takes it", () => {
    const any: MaskOptions = { mask: "0C-0" };
    expect(after(any, "1|_-_", type("-"))).toBe("1--|_");
  });
});

describe("optional sections", () => {
  const zip: MaskOptions = { mask: "00000[-0000]" };

  test("print nothing until one of their slots is filled", () => {
    expect(formatMasked(zip, "", true).text).toBe("_____");
    expect(after(zip, "|_____", type("12345"))).toBe("12345|");
    expect(after(zip, "12345|", type("6"))).toBe("12345-6|___");
    expect(after(zip, "12345|", type("-"))).toBe("refused");
    expect(after(zip, "12345-6|___", BACKSPACE)).toBe("12345|");
  });

  test("left empty, they leave the text complete; begun, they must be finished", () => {
    expect(details(zip, "12345")).toMatchObject({ complete: true });
    expect(details(zip, "12345-6___")).toMatchObject({
      complete: false,
      raw: "123456",
      formatted: "12345-6",
    });
    expect(details(zip, "12345-6789")).toMatchObject({ complete: true });
    expect(details(zip, "1234_")).toMatchObject({ complete: false });
  });
});

describe("several patterns", () => {
  const zip: MaskOptions = { mask: ["00000", "00000-0000"] };

  test("typing past the short pattern moves to the next, deleting moves back", () => {
    expect(after(zip, "|_____", type("12345"))).toBe("12345|");
    expect(after(zip, "12345|", type("6"))).toBe("12345-6|___");
    expect(details(zip, "12345-6___").pattern).toBe("00000-0000");
    expect(after(zip, "12345-6|___", BACKSPACE)).toBe("12345|");
  });

  test("the first pattern that holds the raw characters wins", () => {
    const codes: MaskOptions = { mask: ["L0", "0L", "LL"] };
    expect(after(codes, "|__", type("5"))).toBe("5|_");
    expect(details(codes, "5_").pattern).toBe("0L");
    expect(after(codes, "|__", type("AB"))).toBe("AB|");
    expect(details(codes, "AB").pattern).toBe("LL");
  });
});

describe("a function mask", () => {
  const card: MaskOptions = {
    mask: (raw) =>
      /^3[47]/.test(raw) ? "0000 000000 00000" : "0000 0000 0000 0000",
  };

  test("picks its pattern from the raw text the edit leaves", () => {
    expect(formatMasked(card, "", true).text).toBe("____ ____ ____ ____");
    expect(after(card, "|____ ____ ____ ____", type("37"))).toBe(
      "37|__ ______ _____",
    );
    expect(after(card, "37|__ ______ _____", BACKSPACE)).toBe(
      "3|___ ____ ____ ____",
    );
  });

  test("reads text written by another of its patterns", () => {
    expect(details(card, "3782 822463 10005")).toEqual({
      raw: "378282246310005",
      formatted: "3782 822463 10005",
      complete: true,
      pattern: "0000 000000 00000",
    });
  });

  test("lays out a paste in the pattern it picks", () => {
    expect(after(card, "|____ ____ ____ ____", paste("378282246310005"))).toBe(
      "3782 822463 10005|",
    );
  });
});

describe("custom tokens and case", () => {
  test("a hex colour", () => {
    const hex: MaskOptions = { mask: "\\#>HHHHHH", tokens: { H: /[0-9a-f]/i } };
    expect(formatMasked(hex, "", true).text).toBe("#______");
    expect(after(hex, "#|______", type("ff00aa"))).toBe("#FF00AA|");
    expect(after(hex, "#|______", type("g"))).toBe("refused");
  });

  test("> and < change case, | keeps it", () => {
    const mixed: MaskOptions = { mask: ">L<L|L" };
    expect(after(mixed, "|___", type("aBc"))).toBe("Abc|");
  });

  test("case follows the locale", () => {
    expect(after({ mask: ">L", locale: "tr-TR" }, "|_", type("i"))).toBe("İ|");
    expect(after({ mask: ">L", locale: "en-US" }, "|_", type("i"))).toBe("I|");
  });

  test("digits of any script and full-width forms are kept as ASCII", () => {
    const code: MaskOptions = { mask: "00-LL" };
    expect(after(code, "|__-__", type("١٢"))).toBe("12-|__");
    expect(after(code, "|__-__", paste("１２ＡＢ"))).toBe("12-AB|");
  });

  test("a transform runs before the case", () => {
    const code: MaskOptions = {
      mask: ">X",
      tokens: {
        X: { accept: /[a-z]/, transform: (c) => (c === "o" ? "0" : c) },
      },
    };
    expect(after(code, "|_", type("a"))).toBe("A|");
    expect(after(code, "|_", type("o"))).toBe("0|");
  });
});

describe("prompt character", () => {
  test("another character, or none: the text then ends at the first empty slot", () => {
    expect(
      formatMasked({ ...phone, promptCharacter: "#" }, "555", true).text,
    ).toBe("(555) ###-####");
    const bare: MaskOptions = { ...phone, promptCharacter: "" };
    expect(formatMasked(bare, "", true).text).toBe("(");
    expect(after(bare, "(|", type("555"))).toBe("(555) |");
    expect(after(bare, "(555) |", BACKSPACE)).toBe("(55|");
  });
});

describe("formatMasked", () => {
  test("lays a raw or formatted value into the mask, focused or not", () => {
    expect(formatMasked(phone, "5551234567", false)).toMatchObject({
      text: "(555) 123-4567",
      raw: "5551234567",
      complete: true,
      accepted: true,
    });
    expect(formatMasked(phone, "(555) 123-4567", false).raw).toBe("5551234567");
    expect(formatMasked(phone, "555", false).text).toBe("(555");
    expect(formatMasked(phone, "", false).text).toBe("");
  });

  test("puts the caret at the first empty slot", () => {
    expect(formatMasked(phone, "555", true)).toMatchObject({
      text: "(555) ___-____",
      caret: 6,
    });
  });
});

describe("isValidMaskStart", () => {
  test("whether some pattern can still take the raw text", () => {
    expect(isValidMaskStart(phone, "")).toBe(true);
    expect(isValidMaskStart(phone, "555")).toBe(true);
    expect(isValidMaskStart(phone, "55512345678")).toBe(true);
    expect(isValidMaskStart(phone, "555123456789")).toBe(false);
    expect(isValidMaskStart(phone, "55a")).toBe(false);
  });
});

describe("text no pattern wrote", () => {
  test("is read as a paste, then edited", () => {
    expect(details(phone, "5551234567")).toMatchObject({
      raw: "5551234567",
      complete: true,
    });
    expect(after(phone, "555|", type("1"))).toBe("(555) 1|__-____");
  });

  test("undo and other edits the mask cannot place are refused", () => {
    expect(
      after(phone, "(555) 123-4567|", { inputType: "historyUndo", data: null }),
    ).toBe("refused");
  });
});
