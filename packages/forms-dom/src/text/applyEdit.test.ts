import { describe, expect, it } from "vitest";
import { applyEdit } from "./applyEdit";

const caret = (at: number) => ({ start: at, end: at });

describe("applyEdit", () => {
  it("inserts typed, pasted, dropped and composed text over the selection", () => {
    expect(applyEdit("ac", caret(1), "insertText", "b")).toBe("abc");
    expect(applyEdit("a-c", { start: 1, end: 2 }, "insertText", "b")).toBe(
      "abc",
    );
    expect(applyEdit("", caret(0), "insertFromPaste", "pasted")).toBe("pasted");
    expect(applyEdit("ab", caret(2), "insertFromDrop", "c")).toBe("abc");
    expect(
      applyEdit("にh", { start: 1, end: 2 }, "insertCompositionText", "ほ"),
    ).toBe("にほ");
  });

  it("inserts a line break for Enter in a text area", () => {
    expect(applyEdit("ab", caret(1), "insertLineBreak", null)).toBe("a\nb");
    expect(applyEdit("ab", caret(1), "insertParagraph", null)).toBe("a\nb");
  });

  it("deletes the selection whatever the kind of deletion", () => {
    expect(
      applyEdit("abcd", { start: 1, end: 3 }, "deleteContentBackward", null),
    ).toBe("ad");
    expect(applyEdit("abcd", { start: 1, end: 3 }, "deleteByCut", null)).toBe(
      "ad",
    );
    expect(
      applyEdit("にほ", { start: 0, end: 2 }, "deleteCompositionText", null),
    ).toBe("");
  });

  it("deletes one character either side of the caret, an emoji whole", () => {
    expect(applyEdit("abc", caret(2), "deleteContentBackward", null)).toBe(
      "ac",
    );
    expect(applyEdit("abc", caret(1), "deleteContentForward", null)).toBe("ac");
    expect(applyEdit("a👍🏽", caret(5), "deleteContentBackward", null)).toBe("a");
    expect(applyEdit("abc", caret(0), "deleteContentBackward", null)).toBe(
      "abc",
    );
    expect(applyEdit("abc", caret(3), "deleteContentForward", null)).toBe(
      "abc",
    );
  });

  it("deletes a word, with the spaces beside it", () => {
    expect(applyEdit("one two  ", caret(9), "deleteWordBackward", null)).toBe(
      "one ",
    );
    expect(applyEdit("one two", caret(3), "deleteWordForward", null)).toBe(
      "one",
    );
  });

  it("deletes to either end of the line, or the whole line", () => {
    const text = "first\nsecond\nthird";
    expect(applyEdit(text, caret(9), "deleteSoftLineBackward", null)).toBe(
      "first\nond\nthird",
    );
    expect(applyEdit(text, caret(9), "deleteHardLineForward", null)).toBe(
      "first\nsec\nthird",
    );
    expect(applyEdit(text, caret(9), "deleteEntireSoftLine", null)).toBe(
      "first\n\nthird",
    );
  });

  it("leaves the text to the browser where only it knows the outcome", () => {
    expect(applyEdit("abc", caret(3), "historyUndo", null)).toBeNull();
    expect(applyEdit("abc", caret(3), "historyRedo", null)).toBeNull();
    expect(
      applyEdit("teh", caret(1), "insertReplacementText", "the"),
    ).toBeNull();
    expect(applyEdit("ab", caret(1), "insertTranspose", null)).toBeNull();
    expect(applyEdit("abc", caret(3), "formatBold", null)).toBeNull();
  });
});
