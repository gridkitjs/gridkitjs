import { describe, expect, test } from "vitest";

import { createFieldController } from "../field/createFieldController";
import type { TextEdit } from "../field/plan";
import { defaultFormsMessages } from "../messages/formsMessages";
import type { FormatContext, ParseContext } from "../parse";
import type { MaskOptions } from "./applyMask";
import {
  filterMaskEdit,
  maskFormatter,
  maskInputHints,
  maskParser,
} from "./maskField";

const phone: MaskOptions = { mask: ["(000) 000-0000", "+0 (000) 000-0000"] };

const parseContext: ParseContext<string> = {
  defaultParse: () => ({ kind: "value", value: null }),
  locale: "en-US",
  messages: defaultFormsMessages,
};

function formatContext(purpose: "display" | "edit"): FormatContext<string> {
  return {
    defaultFormat: () => "",
    locale: "en-US",
    messages: defaultFormsMessages,
    purpose,
  };
}

/** A typed key at `caret` in `before`, as forms-dom reports it. */
function key(before: string, caret: number, data: string): TextEdit<null> {
  return {
    text: before.slice(0, caret) + data + before.slice(caret),
    source: "typing",
    nativeEvent: null,
    input: {
      inputType: "insertText",
      data,
      selectionStart: caret,
      selectionEnd: caret,
      isComposing: false,
    },
  };
}

describe("maskParser", () => {
  const read = maskParser(phone);

  test("nothing typed is null; complete text is its raw characters", () => {
    expect(read("(___) ___-____", parseContext)).toEqual({
      kind: "value",
      value: null,
    });
    expect(read("", parseContext)).toEqual({ kind: "value", value: null });
    expect(read("(555) 123-4567", parseContext)).toEqual({
      kind: "value",
      value: "5551234567",
    });
  });

  test("or its formatted text, by option", () => {
    expect(
      maskParser(phone, "formatted")("(555) 123-4567", parseContext),
    ).toEqual({ kind: "value", value: "(555) 123-4567" });
  });

  test("incomplete text is unreadable", () => {
    expect(read("(555) 123-____", parseContext)).toEqual({
      kind: "unreadable",
      message: "Complete this field",
    });
  });

  test("text with characters no slot takes is unreadable", () => {
    expect(read("555-CALL-NOW", parseContext)).toEqual({
      kind: "unreadable",
      message: "Enter a value in the expected format",
    });
  });

  test("an optional section left empty is complete", () => {
    expect(
      maskParser({ mask: "00000[-0000]" }, "formatted")("12345", parseContext),
    ).toEqual({ kind: "value", value: "12345" });
  });
});

describe("maskFormatter", () => {
  const write = maskFormatter(phone);

  test("shows the template while focused, the formatted text otherwise", () => {
    expect(write(null, formatContext("edit"))).toBe("(___) ___-____");
    expect(write(null, formatContext("display"))).toBe("");
    expect(write("5551234567", formatContext("display"))).toBe(
      "(555) 123-4567",
    );
    expect(write("555", formatContext("edit"))).toBe("(555) ___-____");
  });

  test("changes case by the field's locale unless the options name one", () => {
    const upper = maskFormatter({ mask: ">LL" });
    expect(upper("ii", { ...formatContext("display"), locale: "tr-TR" })).toBe(
      "İİ",
    );
    const english = maskFormatter({ mask: ">LL", locale: "en-US" });
    expect(
      english("ii", { ...formatContext("display"), locale: "tr-TR" }),
    ).toBe("II");
  });
});

describe("filterMaskEdit", () => {
  test("replaces the text and places the caret, or refuses", () => {
    expect(
      filterMaskEdit(key("(___) ___-____", 1, "5"), "(___) ___-____", phone),
    ).toEqual({ kind: "replace", text: "(5__) ___-____", caret: 2 });
    expect(
      filterMaskEdit(key("(___) ___-____", 1, "a"), "(___) ___-____", phone),
    ).toEqual({ kind: "prevent" });
  });

  test("lets an app's change and undo stand", () => {
    expect(
      filterMaskEdit(
        { text: "x", source: "api", nativeEvent: null, input: null },
        "",
        phone,
      ),
    ).toEqual({ kind: "allow" });
    const undo = key("(555) ___-____", 6, "");
    expect(
      filterMaskEdit(
        {
          ...undo,
          input: undo.input && { ...undo.input, inputType: "historyUndo" },
        },
        "(555) ___-____",
        phone,
      ),
    ).toEqual({ kind: "allow" });
  });
});

describe("a masked field", () => {
  test("reads the value once the text completes, and only then", () => {
    const changes: (string | null)[] = [];
    const field = createFieldController<string>({
      defaultParse: maskParser(phone),
      defaultFormat: maskFormatter(phone),
      filterInput: (edit, before) => filterMaskEdit(edit, before, phone),
      locale: "en-US",
      messages: defaultFormsMessages,
      onChange: ({ value }) => changes.push(value),
    });
    field.focus(null);
    expect(field.getText()).toBe("(___) ___-____");
    let caret = 1;
    for (const data of "5551234567a8") {
      const before = field.getText();
      const edit = key(before, caret, data);
      const decision = field.beforeInput({ ...edit, cancelable: true });
      if (decision.kind === "replace") {
        field.input({ ...edit, text: decision.text });
        caret = decision.caret;
      }
    }
    expect(field.getText()).toBe("+5 (551) 234-5678");
    expect(changes).toEqual(["5551234567", "55512345678"]);
  });

  test("incomplete on commit is unreadable and keeps the last value", () => {
    const field = createFieldController<string>({
      defaultParse: maskParser(phone),
      defaultFormat: maskFormatter(phone),
      defaultValue: "5551234567",
      locale: "en-US",
      messages: defaultFormsMessages,
    });
    field.focus(null);
    field.input({
      text: "(555) 123-____",
      source: "typing",
      nativeEvent: null,
      input: null,
    });
    expect(field.commit("enter", null)).toEqual({ kind: "unreadable" });
    expect(field.getState().value).toBe("5551234567");
    expect(field.getMessages().map(({ text }) => text)).toEqual([
      "Complete this field",
    ]);
  });
});

describe("maskInputHints", () => {
  test("numeric when every slot is a built-in digit slot", () => {
    expect(maskInputHints(phone)).toEqual({
      inputMode: "numeric",
      upperCase: false,
    });
    expect(maskInputHints({ mask: "0000 >LL" })).toEqual({
      inputMode: "text",
      upperCase: true,
    });
    expect(maskInputHints({ mask: "00", tokens: { "0": /[0-9a-f]/ } })).toEqual(
      { inputMode: "text", upperCase: false },
    );
  });

  test("a function mask is text, its case judged by its first pattern", () => {
    expect(maskInputHints({ mask: () => ">LL00" })).toEqual({
      inputMode: "text",
      upperCase: true,
    });
  });
});
