import { describe, expect, test } from "vitest";

import { defaultFormsMessages } from "../messages/formsMessages";
import { parsed } from "../parse";
import type { Schedule } from "../schedule";
import { formatText, textParser } from "../text";
import { requiredRule } from "../validation/validators";
import {
  createFieldController,
  type FieldOptions,
} from "./createFieldController";
import type { FieldHandlers, NoDetails } from "./events";
import type { TextEdit } from "./plan";
import { shownMessages } from "./state";

type Options = Partial<FieldOptions<string, NoDetails, string>>;
type HandlerName = keyof FieldHandlers<string, NoDetails, string>;

/**
 * A text field on a controller, its handlers recording every call in order
 * before running the ones `options` gives.
 */
function textField(options: Options = {}) {
  const calls: { name: HandlerName; event: object }[] = [];
  const record = (name: HandlerName, event: object) => {
    calls.push({ name, event });
  };
  const controller = createFieldController<string, NoDetails, string>({
    defaultParse: textParser(),
    defaultFormat: formatText,
    messages: defaultFormsMessages,
    ...options,
    onFocus: (event) => {
      record("onFocus", event);
      options.onFocus?.(event);
    },
    onBeforeInput: (event) => {
      record("onBeforeInput", event);
      options.onBeforeInput?.(event);
    },
    onInput: (event) => {
      record("onInput", event);
      options.onInput?.(event);
    },
    onBeforeChange: (event) => {
      record("onBeforeChange", event);
      options.onBeforeChange?.(event);
    },
    onChange: (event) => {
      record("onChange", event);
      options.onChange?.(event);
    },
    onValidate: (event) => {
      record("onValidate", event);
      options.onValidate?.(event);
    },
    onBeforeCommit: (event) => {
      record("onBeforeCommit", event);
      return options.onBeforeCommit?.(event);
    },
    onCommit: (event) => {
      record("onCommit", event);
      options.onCommit?.(event);
    },
    onBlur: (event) => {
      record("onBlur", event);
      options.onBlur?.(event);
    },
  });
  return {
    controller,
    calls,
    names: () => calls.map((call) => call.name),
    event: (name: HandlerName) =>
      calls.findLast((call) => call.name === name)?.event,
    clear: () => {
      calls.length = 0;
    },
  };
}

/** Typing that leaves `text` in the control. */
function typed(text: string, isComposing = false): TextEdit<string> {
  return {
    text,
    source: "typing",
    nativeEvent: `input ${text}`,
    input: {
      inputType: isComposing ? "insertCompositionText" : "insertText",
      data: text.slice(-1),
      selectionStart: text.length,
      selectionEnd: text.length,
      isComposing,
    },
  };
}

/** Lets every promise already settled run its callbacks. */
async function settle(): Promise<void> {
  for (let turn = 0; turn < 10; turn++) {
    await Promise.resolve();
  }
}

/** A `Schedule` whose timers run only when the test says. */
function fakeSchedule() {
  const timers: { callback: () => void; delay: number; cancelled: boolean }[] =
    [];
  const schedule: Schedule = (callback, delay) => {
    const timer = { callback, delay, cancelled: false };
    timers.push(timer);
    return () => {
      timer.cancelled = true;
    };
  };
  return {
    schedule,
    timers,
    live: () => timers.filter((timer) => !timer.cancelled),
    fire: () => {
      for (const timer of timers.splice(0)) {
        if (!timer.cancelled) {
          timer.callback();
        }
      }
    },
  };
}

describe("an asynchronous onBeforeCommit", () => {
  test("commits once it resolves", async () => {
    const gate = Promise.withResolvers<undefined>();
    const field = textField({ onBeforeCommit: () => gate.promise });
    const { controller } = field;
    controller.focus("focus");
    controller.input(typed("a"));
    field.clear();
    expect(controller.commit("enter", "Enter")).toEqual({ kind: "checking" });
    expect(controller.getState().phase).toMatchObject({
      kind: "checking",
      trigger: "enter",
      leaving: false,
    });
    expect(field.names()).toEqual(["onBeforeCommit"]);

    gate.resolve(undefined);
    await settle();
    expect(field.names()).toEqual(["onBeforeCommit", "onCommit"]);
    expect(field.event("onCommit")).toMatchObject({
      trigger: "enter",
      value: "a",
      previousValue: null,
      changed: true,
      nativeEvent: "Enter",
    });
    expect(controller.getState().phase).toEqual({
      kind: "editing",
      initialValue: null,
      committedValue: "a",
    });
  });

  test("refuses with the message it gives once it has waited", async () => {
    const gate = Promise.withResolvers<undefined>();
    const field = textField({
      onBeforeCommit: async (event) => {
        await gate.promise;
        event.preventDefault({ text: "Taken", code: "duplicate" });
      },
    });
    const { controller } = field;
    controller.focus(null);
    controller.input(typed("a"));
    controller.commit("enter", null);
    gate.resolve(undefined);
    await settle();
    expect(field.names()).not.toContain("onCommit");
    expect(controller.getState().refusal).toEqual({
      severity: "error",
      text: "Taken",
      code: "duplicate",
      source: "commit",
    });
    expect(controller.getState().phase.kind).toBe("editing");
    expect(controller.getState().revealed).toBe(true);
  });

  test("refuses with checkFailed when it rejects", async () => {
    const field = textField({
      onBeforeCommit: () => Promise.reject(new Error("offline")),
    });
    const { controller } = field;
    controller.focus(null);
    controller.input(typed("a"));
    controller.commit("enter", null);
    await settle();
    expect(field.names()).not.toContain("onCommit");
    expect(controller.getState().refusal?.text).toBe(
      "This value could not be checked",
    );
  });

  test("ignores a refusal made after it settled", async () => {
    const held: { refuseLate: () => void } = { refuseLate: () => {} };
    const field = textField({
      onBeforeCommit: (event) => {
        held.refuseLate = () => {
          event.preventDefault("Too late");
        };
        return Promise.resolve();
      },
    });
    const { controller } = field;
    controller.focus(null);
    controller.commit("enter", null);
    await settle();
    held.refuseLate();
    expect(field.names()).toContain("onCommit");
    expect(controller.getState().refusal).toBeNull();
  });

  test("ignores the answer of a check that typing superseded", async () => {
    const gates = [
      Promise.withResolvers<undefined>(),
      Promise.withResolvers<undefined>(),
    ];
    let asked = 0;
    const field = textField({
      onBeforeCommit: () => gates[asked++]?.promise,
    });
    const { controller } = field;
    controller.focus(null);
    controller.input(typed("a"));
    controller.commit("enter", null);
    controller.input(typed("ab"));
    expect(controller.getState().phase.kind).toBe("editing");

    gates[0]?.resolve(undefined);
    await settle();
    expect(field.names()).not.toContain("onCommit");

    controller.commit("enter", null);
    gates[1]?.resolve(undefined);
    await settle();
    expect(field.event("onCommit")).toMatchObject({ value: "ab" });
  });

  test("waits for the same check when asked to commit again", () => {
    const field = textField({ onBeforeCommit: () => new Promise(() => {}) });
    const { controller } = field;
    controller.focus(null);
    controller.commit("enter", null);
    expect(controller.commit("enter", null)).toEqual({ kind: "checking" });
    expect(field.names().filter((name) => name === "onBeforeCommit")).toEqual([
      "onBeforeCommit",
    ]);
  });

  test("ignores the answer after destroy", async () => {
    const gate = Promise.withResolvers<undefined>();
    const field = textField({ onBeforeCommit: () => gate.promise });
    const { controller } = field;
    controller.focus(null);
    controller.commit("enter", null);
    controller.destroy();
    gate.resolve(undefined);
    await settle();
    expect(field.names()).not.toContain("onCommit");
  });

  test("holds onBlur until it answers", async () => {
    const gate = Promise.withResolvers<undefined>();
    const field = textField({ onBeforeCommit: () => gate.promise });
    const { controller } = field;
    controller.focus(null);
    controller.input(typed("a"));
    field.clear();
    controller.commit("enter", null);
    controller.blur("focusout");
    expect(field.names()).toEqual(["onBeforeCommit"]);
    expect(controller.getState().phase).toMatchObject({
      kind: "checking",
      leaving: true,
    });

    gate.resolve(undefined);
    await settle();
    expect(field.names()).toEqual(["onBeforeCommit", "onCommit", "onBlur"]);
    expect(field.event("onBlur")).toMatchObject({ nativeEvent: "focusout" });
    expect(controller.getState().phase.kind).toBe("idle");
  });

  test("on Tab, reports onCommit then onBlur, and the blur commits nothing more", async () => {
    const gate = Promise.withResolvers<undefined>();
    const field = textField({ onBeforeCommit: () => gate.promise });
    const { controller } = field;
    controller.focus(null);
    controller.input(typed("a"));
    field.clear();
    controller.commit("tab", "Tab");
    expect(controller.getState().phase).toMatchObject({
      kind: "checking",
      trigger: "tab",
      leaving: true,
    });
    controller.blur("focusout");
    gate.resolve(undefined);
    await settle();
    expect(field.names()).toEqual(["onBeforeCommit", "onCommit", "onBlur"]);
    expect(field.event("onCommit")).toMatchObject({ trigger: "tab" });

    controller.blur("focusout again");
    expect(field.names()).toHaveLength(3);
  });

  test("ends the edit on a refusal after focus left, then onBlur", async () => {
    const gate = Promise.withResolvers<undefined>();
    const field = textField({
      onBeforeCommit: async (event) => {
        await gate.promise;
        event.preventDefault("Taken");
      },
    });
    const { controller } = field;
    controller.focus(null);
    controller.input(typed("a"));
    field.clear();
    controller.blur("focusout");
    expect(controller.getState().phase).toMatchObject({
      kind: "checking",
      trigger: "blur",
      leaving: true,
    });
    gate.resolve(undefined);
    await settle();
    expect(field.names()).toEqual(["onBeforeCommit", "onBlur"]);
    expect(controller.getState().phase.kind).toBe("idle");
    expect(controller.getState().refusal?.text).toBe("Taken");
  });
});

describe("a controlled value", () => {
  test("starts the field, over defaultValue", () => {
    expect(
      textField({ value: "x", defaultValue: "y" }).controller.getState().value,
    ).toBe("x");
    expect(
      textField({ value: null, defaultValue: "y" }).controller.getState().value,
    ).toBeNull();
    expect(textField({ defaultValue: "y" }).controller.getState().value).toBe(
      "y",
    );
  });

  test("is adopted silently while idle, and validated", () => {
    const field = textField({ value: "a", validators: [requiredRule()] });
    const { controller } = field;
    controller.sync(null);
    expect(field.calls).toEqual([]);
    expect(controller.getState().value).toBeNull();
    expect(controller.getText()).toBe("");
    expect(controller.getState().validation).toMatchObject([
      { code: "required" },
    ]);
  });

  test("is held while the user types, and adopted once the edit ends", () => {
    const field = textField({ value: "a" });
    const { controller } = field;
    controller.focus(null);
    controller.input(typed("ab"));
    expect(controller.getState().value).toBe("ab");

    // The app did not take the value: its prop is still "a".
    controller.sync("a");
    expect(controller.getState().value).toBe("ab");
    expect(controller.getText()).toBe("ab");

    controller.commit("enter", null);
    field.clear();
    controller.sync("a");
    expect(field.calls).toEqual([]);
    expect(controller.getState().value).toBe("a");
    expect(controller.getText()).toBe("a");
    expect(controller.getState().phase).toMatchObject({
      kind: "editing",
      committedValue: "a",
    });
  });

  test("is held off while a check is pending", () => {
    const field = textField({
      value: "a",
      onBeforeCommit: () => new Promise(() => {}),
    });
    const { controller } = field;
    controller.focus(null);
    controller.commit("enter", null);
    controller.sync("z");
    expect(controller.getState().value).toBe("a");
  });
});

describe("setValue and reset", () => {
  test("change runs the change chain with the cause given, and no commit", () => {
    const field = textField();
    const { controller } = field;
    controller.focus(null);
    field.clear();
    controller.change("b", {
      source: "step",
      nativeEvent: "keydown ArrowUp",
      input: null,
    });
    expect(field.names()).toEqual(["onBeforeChange", "onChange", "onValidate"]);
    expect(field.event("onChange")).toMatchObject({
      value: "b",
      source: "step",
      nativeEvent: "keydown ArrowUp",
    });
    expect(controller.getState().phase).toMatchObject({
      kind: "editing",
      committedValue: null,
    });
  });

  test("setValue runs the change chain with source api", () => {
    const field = textField();
    field.controller.setValue("x");
    expect(field.names()).toEqual(["onBeforeChange", "onChange", "onValidate"]);
    expect(field.event("onChange")).toMatchObject({
      value: "x",
      source: "api",
      nativeEvent: null,
    });
  });

  test("reset returns to defaultValue, or null, with source api", () => {
    const withDefault = textField({ defaultValue: "d" });
    withDefault.controller.setValue("x");
    withDefault.clear();
    withDefault.controller.reset();
    expect(withDefault.controller.getState().value).toBe("d");
    expect(withDefault.event("onChange")).toMatchObject({
      value: "d",
      previousValue: "x",
      source: "api",
    });

    const plain = textField();
    plain.controller.setValue("x");
    plain.controller.reset();
    expect(plain.controller.getState().value).toBeNull();
  });

  test("reset cancels a reading still waiting", () => {
    const timers = fakeSchedule();
    const field = textField({ changeDelay: 300, schedule: timers.schedule });
    const { controller } = field;
    controller.focus(null);
    controller.input(typed("a"));
    controller.reset();
    expect(timers.live()).toEqual([]);
    field.clear();
    timers.fire();
    expect(field.calls).toEqual([]);
  });
});

describe("a change delay", () => {
  test("fires onInput at once and reads the text once typing pauses", () => {
    const timers = fakeSchedule();
    const field = textField({ changeDelay: 300, schedule: timers.schedule });
    const { controller } = field;
    controller.focus(null);
    field.clear();
    controller.input(typed("a"));
    controller.input(typed("ab"));
    expect(field.names()).toEqual(["onInput", "onInput"]);
    expect(timers.live()).toHaveLength(1);
    expect(timers.timers.map((timer) => timer.delay)).toEqual([300, 300]);

    timers.fire();
    expect(field.names()).toEqual([
      "onInput",
      "onInput",
      "onBeforeChange",
      "onChange",
      "onValidate",
    ]);
    expect(field.event("onChange")).toMatchObject({
      value: "ab",
      previousText: "",
      text: "ab",
    });
  });

  test("reads at once on a commit, cancelling the timer", () => {
    const timers = fakeSchedule();
    const field = textField({ changeDelay: 300, schedule: timers.schedule });
    const { controller } = field;
    controller.focus(null);
    controller.input(typed("a"));
    field.clear();
    controller.commit("enter", null);
    expect(field.names()).toEqual([
      "onBeforeChange",
      "onChange",
      "onValidate",
      "onBeforeCommit",
      "onCommit",
    ]);
    expect(timers.live()).toEqual([]);
  });

  test("reads at once on blur", () => {
    const timers = fakeSchedule();
    const field = textField({ changeDelay: 300, schedule: timers.schedule });
    const { controller } = field;
    controller.focus(null);
    controller.input(typed("a"));
    controller.blur(null);
    expect(controller.getState().value).toBe("a");
    expect(timers.live()).toEqual([]);
  });

  test("is cancelled by destroy", () => {
    const timers = fakeSchedule();
    const field = textField({ changeDelay: 300, schedule: timers.schedule });
    field.controller.focus(null);
    field.controller.input(typed("a"));
    field.controller.destroy();
    expect(timers.live()).toEqual([]);
  });

  test("reads at once with no schedule to wait on", () => {
    const field = textField({ changeDelay: 300 });
    field.controller.focus(null);
    field.controller.input(typed("a"));
    expect(field.controller.getState().value).toBe("a");
  });
});

describe("an input method", () => {
  test("reports every update with onInput and reads once composition ends", () => {
    const field = textField();
    const { controller } = field;
    controller.focus(null);
    field.clear();
    controller.input(typed("k", true));
    controller.input(typed("か", true));
    expect(field.names()).toEqual(["onInput", "onInput"]);
    expect(field.event("onInput")).toMatchObject({
      input: { isComposing: true },
    });
    expect(controller.getState().value).toBeNull();

    controller.endComposition("compositionend");
    expect(field.names()).toEqual([
      "onInput",
      "onInput",
      "onBeforeChange",
      "onChange",
      "onValidate",
    ]);
    expect(field.event("onChange")).toMatchObject({
      value: "か",
      previousText: "",
      nativeEvent: "compositionend",
      input: { isComposing: false },
    });

    // A browser that fires the last input after compositionend.
    controller.input(typed("か"));
    expect(field.names()).toHaveLength(5);
  });

  test("ends a composition whose end was not reported at the next plain input", () => {
    const field = textField();
    const { controller } = field;
    controller.focus(null);
    controller.input(typed("か", true));
    controller.input(typed("か"));
    expect(controller.getState().value).toBe("か");
  });

  test("puts back the text from before composing when the change is refused", () => {
    const field = textField({
      defaultValue: "a",
      onBeforeChange: (event) => {
        event.preventDefault();
      },
    });
    const { controller } = field;
    controller.focus(null);
    controller.input(typed("aか", true));
    controller.endComposition(null);
    expect(controller.getText()).toBe("a");
  });
});

describe("a request made from inside a handler", () => {
  test("runs once the current sequence ends", () => {
    let asked = false;
    const field = textField({
      onChange: () => {
        if (!asked) {
          asked = true;
          field.controller.setValue("z");
        }
      },
    });
    const { controller } = field;
    controller.focus(null);
    field.clear();
    controller.input(typed("a"));
    expect(field.names()).toEqual([
      "onInput",
      "onBeforeChange",
      "onChange",
      "onValidate",
      "onBeforeChange",
      "onChange",
      "onValidate",
    ]);
    expect(field.event("onChange")).toMatchObject({
      value: "z",
      previousValue: "a",
      source: "api",
    });
  });

  test("answers a commit with checking, then commits after", () => {
    const outcomes: unknown[] = [];
    const field = textField({
      onValidate: () => {
        outcomes.push(field.controller.commit("enter", null));
      },
    });
    const { controller } = field;
    controller.focus(null);
    field.clear();
    controller.input(typed("a"));
    expect(outcomes).toEqual([{ kind: "checking" }]);
    expect(field.names().slice(-2)).toEqual(["onBeforeCommit", "onCommit"]);
  });

  test("sees the state as the sequence has moved it", () => {
    const seen: (string | null)[] = [];
    const field = textField({
      onChange: () => {
        seen.push(field.controller.getState().value);
      },
    });
    field.controller.focus(null);
    field.controller.input(typed("a"));
    expect(seen).toEqual(["a"]);
  });
});

describe("listeners", () => {
  test("hear once from each request that changes the state", () => {
    const field = textField();
    const { controller } = field;
    let heard = 0;
    const unsubscribe = controller.subscribe(() => {
      heard++;
    });
    controller.focus(null);
    controller.input(typed("a"));
    expect(heard).toBe(2);

    controller.focus(null);
    controller.input(typed("a"));
    expect(heard).toBe(2);

    unsubscribe();
    controller.input(typed("ab"));
    expect(heard).toBe(2);
  });

  test("are not told about new options", () => {
    const field = textField();
    let heard = 0;
    field.controller.subscribe(() => {
      heard++;
    });
    field.controller.setOptions({
      defaultParse: textParser(),
      defaultFormat: formatText,
      messages: defaultFormsMessages,
    });
    expect(heard).toBe(0);
  });

  test("read the same messages until the state changes", () => {
    const field = textField({ validators: [requiredRule()] });
    const { controller } = field;
    const first = controller.getMessages();
    expect(controller.getMessages()).toBe(first);
    expect(first).toMatchObject([{ code: "required" }]);
    controller.setValue("a");
    expect(controller.getMessages()).not.toBe(first);
    expect(controller.getMessages()).toEqual([]);
  });
});

describe("the text's purpose", () => {
  /** A field writing "edit:" or "display:" before its value, by the context's purpose. */
  function purposeField() {
    return textField({
      defaultValue: "a",
      defaultFormat: (value, { purpose }) => `${purpose}:${value ?? ""}`,
      defaultParse: (text) => parsed(text.replace(/^\w+:/, "")),
    });
  }

  test("is display while idle and edit once focused", () => {
    const field = purposeField();
    const { controller } = field;
    expect(controller.getText()).toBe("display:a");
    controller.focus(null);
    expect(field.event("onFocus")).toMatchObject({ text: "edit:a" });
    expect(controller.getText()).toBe("edit:a");
  });

  test("an Enter commit reports the edit form, a blur the display form", () => {
    const field = purposeField();
    const { controller } = field;
    controller.focus(null);
    controller.input(typed("edit:b"));
    controller.commit("enter", null);
    expect(field.event("onCommit")).toMatchObject({ text: "edit:b" });
    expect(controller.getText()).toBe("edit:b");

    controller.input(typed("edit:c"));
    controller.blur(null);
    expect(field.event("onBeforeCommit")).toMatchObject({ text: "edit:c" });
    expect(field.event("onCommit")).toMatchObject({ text: "display:c" });
    expect(field.event("onBlur")).toMatchObject({ text: "display:c" });
    expect(controller.getText()).toBe("display:c");
  });

  test("Tab commits in the edit form and the blur after it shows display", () => {
    const field = purposeField();
    const { controller } = field;
    controller.focus(null);
    controller.commit("tab", null);
    expect(field.event("onCommit")).toMatchObject({ text: "edit:a" });
    controller.blur(null);
    expect(field.event("onBlur")).toMatchObject({ text: "display:a" });
  });

  test("the input's own format receives the same purpose as the app's", () => {
    const field = textField({
      defaultValue: "a",
      defaultFormat: (value, { purpose }) => `${purpose}:${value ?? ""}`,
      format: (value, { defaultFormat }) => `[${defaultFormat(value)}]`,
    });
    expect(field.controller.getText()).toBe("[display:a]");
    field.controller.focus(null);
    expect(field.controller.getText()).toBe("[edit:a]");
  });
});

describe("validation", () => {
  test("runs at creation, shown only once revealed", () => {
    const field = textField({ validators: [requiredRule()] });
    const { controller } = field;
    expect(controller.getMessages()).toMatchObject([{ code: "required" }]);
    expect(shownMessages(controller.getState())).toEqual([]);
    controller.reveal();
    expect(shownMessages(controller.getState())).toMatchObject([
      { code: "required" },
    ]);
  });

  test("runs again on reveal", () => {
    let limit = 5;
    const field = textField({
      defaultValue: "abc",
      validators: [
        (value) => (value !== null && value.length > limit ? "Long" : null),
      ],
    });
    expect(field.controller.getMessages()).toEqual([]);
    limit = 2;
    field.controller.reveal();
    expect(field.controller.getMessages()).toMatchObject([{ text: "Long" }]);
  });

  test("a warning is shown but leaves the field valid", () => {
    const field = textField({
      validators: [
        (value) =>
          value === "admin" ? { text: "Reserved", severity: "warning" } : null,
      ],
    });
    field.controller.focus(null);
    field.controller.input(typed("admin"));
    expect(field.event("onValidate")).toMatchObject({
      valid: true,
      messages: [{ severity: "warning", text: "Reserved" }],
    });
    field.controller.commit("enter", null);
    expect(field.names()).toContain("onCommit");
  });
});
