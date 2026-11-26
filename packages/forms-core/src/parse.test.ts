import { describe, expect, test } from "vitest";

import { createFieldController } from "./field/createFieldController";
import { defaultFormsMessages } from "./messages/formsMessages";
import { parsed, unreadable, type Formatter, type Parser } from "./parse";
import { formatText, textParser } from "./text";

function textController(
  parse?: Parser<string>,
  format?: Formatter<string>,
  defaultValue: string | null = null,
) {
  const controller = createFieldController<string>({
    defaultParse: textParser({ trim: true }),
    defaultFormat: formatText,
    messages: defaultFormsMessages,
    parse,
    format,
    defaultValue,
  });
  controller.focus(null);
  return controller;
}

function type(
  controller: ReturnType<typeof textController>,
  text: string,
): void {
  controller.input({ text, source: "typing", nativeEvent: null, input: null });
}

describe("parse", () => {
  test("can change one case and leave the rest to the input's own reading", () => {
    const controller = textController((text, { defaultParse }) =>
      text === "n/a" ? parsed(null) : defaultParse(text),
    );
    type(controller, "abc ");
    expect(controller.getState().value).toBe("abc");
    type(controller, "n/a");
    expect(controller.getState().value).toBeNull();
  });

  test("can refuse text, with the catalogue's words", () => {
    const controller = textController((text, { defaultParse, messages }) =>
      /\d/.test(text) ? unreadable(messages.unreadable) : defaultParse(text),
    );
    type(controller, "a1");
    expect(controller.getState().value).toBeNull();
    expect(controller.getMessages()).toMatchObject([
      { text: "This value can't be read", code: "unreadable", source: "parse" },
    ]);
  });
});

describe("format", () => {
  test("can change one case and leave the rest to the input's own writing", () => {
    const controller = textController(
      undefined,
      (value, { defaultFormat }) =>
        value === null ? "(none)" : defaultFormat(value),
      "abc",
    );
    expect(controller.getText()).toBe("abc");
    controller.setValue(null);
    expect(controller.getText()).toBe("(none)");
  });
});
