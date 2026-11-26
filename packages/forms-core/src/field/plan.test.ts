import { describe, expect, test } from "vitest";

import { defaultFormsMessages } from "../messages/formsMessages";
import { parsed, unreadable } from "../parse";
import { runValidators, type Validator } from "../validation/validators";
import type { ChangeSource, FieldHandlers, TextInputDetails } from "./events";
import { fieldReducer } from "./fieldReducer";
import {
  runAutofill,
  runBeforeInput,
  runBlur,
  runClear,
  runCommit,
  runEdit,
  runFocus,
  runPick,
  runRead,
  runRevert,
  runValueChange,
  type FieldEnv,
  type TextEdit,
} from "./plan";
import { createFieldState, fieldText, type FieldState } from "./state";

/** Each input's own details, to check they reach every event. */
interface Extra {
  readonly phaseNow: string;
}

type Handlers = FieldHandlers<number, Extra, string>;
type HandlerName = keyof Handlers;

interface Setup {
  readonly value?: number | null;
  readonly phase?: "idle" | "editing";
  readonly format?: (value: number | null) => string;
  readonly validators?: readonly Validator<number>[];
  readonly commitOnLeave?: boolean;
  /** Behaviour behind the recording handlers. */
  readonly on?: Handlers;
}

/**
 * A number field driven straight through the plans, its handlers recording
 * every call in order. Text reads with `Number`; empty text is `null`.
 */
function setup(config: Setup = {}) {
  const value = config.value === undefined ? 1 : config.value;
  let state: FieldState<number> = createFieldState(value, []);
  if (config.phase !== "idle") {
    state = fieldReducer(state, { type: "focus" });
  }
  const calls: { name: HandlerName; event: object }[] = [];
  const on = config.on ?? {};
  const record = (name: HandlerName, event: object) => {
    calls.push({ name, event });
  };
  const handlers: Handlers = {
    onFocus: (event) => {
      record("onFocus", event);
      on.onFocus?.(event);
    },
    onBeforeInput: (event) => {
      record("onBeforeInput", event);
      on.onBeforeInput?.(event);
    },
    onInput: (event) => {
      record("onInput", event);
      on.onInput?.(event);
    },
    onBeforeChange: (event) => {
      record("onBeforeChange", event);
      on.onBeforeChange?.(event);
    },
    onChange: (event) => {
      record("onChange", event);
      on.onChange?.(event);
    },
    onValidate: (event) => {
      record("onValidate", event);
      on.onValidate?.(event);
    },
    onBeforeCommit: (event) => {
      record("onBeforeCommit", event);
      return on.onBeforeCommit?.(event);
    },
    onCommit: (event) => {
      record("onCommit", event);
      on.onCommit?.(event);
    },
    onBlur: (event) => {
      record("onBlur", event);
      on.onBlur?.(event);
    },
  };
  const format =
    config.format ??
    ((shown: number | null) => (shown === null ? "" : String(shown)));
  const env: FieldEnv<number, Extra, string> = {
    get: () => state,
    dispatch: (action) => (state = fieldReducer(state, action)),
    handlers,
    parse: (text) => {
      if (text === "") {
        return parsed(null);
      }
      const number = Number(text);
      return Number.isNaN(number)
        ? unreadable("Enter a number")
        : parsed(number);
    },
    format,
    same: (a, b) => a === b,
    validate: (checked, text) =>
      runValidators(config.validators ?? [], checked, {
        text,
        locale: undefined,
        messages: defaultFormsMessages,
      }),
    details: (current) => ({ phaseNow: current.phase.kind }),
    messages: defaultFormsMessages,
    commitOnLeave: config.commitOnLeave ?? true,
  };

  /** The browser's report of typing `text`, the caret at its end. */
  const typed = (
    text: string,
    source: ChangeSource = "typing",
  ): TextEdit<string> => ({
    text,
    source,
    nativeEvent: `input ${text}`,
    input: {
      inputType: "insertText",
      data: text.slice(-1),
      selectionStart: text.length,
      selectionEnd: text.length,
      isComposing: false,
    },
  });

  return {
    env,
    calls,
    get state() {
      return state;
    },
    get text() {
      return fieldText(state, format);
    },
    names: () => calls.map((call) => call.name),
    /** The event of the call named `name`, the last one when there are several. */
    event: (name: HandlerName) =>
      calls.findLast((call) => call.name === name)?.event,
    clear: () => {
      calls.length = 0;
    },
    typed,
    /** Types `text` and reads it at once, as the controller does with no delay. */
    type: (text: string, source?: ChangeSource) => {
      const edit = typed(text, source);
      const before = state.draft;
      if (runEdit(env, edit)) {
        runRead(env, before, edit);
      }
    },
    commit: (trigger: "enter" | "tab", nativeEvent = `keydown ${trigger}`) =>
      runCommit(env, { trigger, source: "typing", nativeEvent, attempt: 1 })
        .outcome,
  };
}

describe("a keystroke", () => {
  test("fires onInput, then onBeforeChange, onChange and onValidate", () => {
    const field = setup();
    field.type("12");
    expect(field.names()).toEqual([
      "onInput",
      "onBeforeChange",
      "onChange",
      "onValidate",
    ]);
    const input: TextInputDetails = {
      inputType: "insertText",
      data: "2",
      selectionStart: 2,
      selectionEnd: 2,
      isComposing: false,
    };
    expect(field.event("onInput")).toMatchObject({
      value: 1,
      previousValue: 1,
      text: "12",
      previousText: "1",
      source: "typing",
      nativeEvent: "input 12",
      input,
    });
    for (const name of ["onBeforeChange", "onChange"] as const) {
      expect(field.event(name)).toMatchObject({
        value: 12,
        previousValue: 1,
        text: "12",
        previousText: "1",
        source: "typing",
        input,
      });
    }
    expect(field.event("onValidate")).toMatchObject({
      value: 12,
      messages: [],
      valid: true,
    });
    expect(field.state.value).toBe(12);
    expect(field.state.draft).toEqual({
      kind: "text",
      text: "12",
      reading: { kind: "value", value: 12 },
    });
  });

  test("fires no onBeforeChange or onChange when the text reads as the value held", () => {
    const field = setup();
    field.type("12");
    field.clear();
    field.type("12.");
    field.type("12.0");
    expect(field.names()).toEqual(["onInput", "onInput"]);
    expect(field.state.value).toBe(12);
    expect(field.text).toBe("12.0");
  });

  test.each(["paste", "drop", "undo"] as const)(
    "carries the source %s and the browser's report to every event",
    (source) => {
      const field = setup();
      field.type("34", source);
      for (const call of field.calls) {
        expect(call.event).toMatchObject({
          source,
          nativeEvent: "input 34",
          input: { inputType: "insertText", data: "4" },
        });
      }
    },
  );

  test("passes the input's details on every event", () => {
    const field = setup();
    field.type("12");
    field.commit("enter");
    for (const call of field.calls) {
      expect(call.event).toHaveProperty("phaseNow");
    }
    expect(field.event("onInput")).toMatchObject({ phaseNow: "editing" });
  });

  test("runs the validators after the change", () => {
    const field = setup({
      validators: [
        (value) => (value !== null && value > 100 ? "Too much" : null),
      ],
    });
    field.type("150");
    expect(field.event("onValidate")).toMatchObject({
      valid: false,
      messages: [{ severity: "error", text: "Too much", source: "validate" }],
    });
    expect(field.state.validation).toHaveLength(1);
  });

  test("does nothing when the text is the same", () => {
    const field = setup();
    field.type("1");
    expect(field.calls).toEqual([]);
  });
});

describe("onBeforeInput", () => {
  test("sees the proposed text and the value held, and allows by default", () => {
    const field = setup();
    const decision = runBeforeInput(field.env, {
      ...field.typed("12"),
      cancelable: true,
    });
    expect(decision).toEqual({ kind: "allow" });
    expect(field.event("onBeforeInput")).toMatchObject({
      value: 1,
      previousValue: 1,
      text: "12",
      previousText: "1",
      cancelable: true,
      defaultPrevented: false,
    });
    expect(field.state.draft).toEqual({ kind: "current" });
  });

  test("preventDefault stops the edit", () => {
    let prevented = false;
    const field = setup({
      on: {
        onBeforeInput: (event) => {
          event.preventDefault();
          prevented = event.defaultPrevented;
        },
      },
    });
    expect(
      runBeforeInput(field.env, { ...field.typed("12"), cancelable: true }),
    ).toEqual({ kind: "prevent" });
    expect(prevented).toBe(true);
  });

  test("setData rewrites what is inserted", () => {
    const field = setup({
      on: {
        onBeforeInput: (event) => {
          event.setData("9");
        },
      },
    });
    expect(
      runBeforeInput(field.env, { ...field.typed("12"), cancelable: true }),
    ).toEqual({ kind: "rewrite", data: "9" });
  });

  test("does nothing an input method owns", () => {
    const field = setup({
      on: {
        onBeforeInput: (event) => {
          event.preventDefault();
          event.setData("9");
        },
      },
    });
    expect(
      runBeforeInput(field.env, { ...field.typed("12"), cancelable: false }),
    ).toEqual({ kind: "allow" });
  });
});

describe("onBeforeChange", () => {
  test("setValue replaces the value downstream, the text formatted to it", () => {
    const field = setup({
      on: {
        onBeforeChange: (event) => {
          event.setValue(100);
        },
      },
    });
    field.type("150");
    expect(field.names()).toEqual([
      "onInput",
      "onBeforeChange",
      "onChange",
      "onValidate",
    ]);
    expect(field.event("onBeforeChange")).toMatchObject({ value: 150 });
    expect(field.event("onChange")).toMatchObject({
      value: 100,
      previousValue: 1,
      text: "100",
      previousText: "1",
    });
    expect(field.event("onValidate")).toMatchObject({ value: 100 });
    expect(field.state.value).toBe(100);
    expect(field.text).toBe("100");
  });

  test("setValue to the value held changes nothing but the text", () => {
    const field = setup({
      on: {
        onBeforeChange: (event) => {
          event.setValue(1);
        },
      },
    });
    field.type("150");
    expect(field.names()).toEqual(["onInput", "onBeforeChange"]);
    expect(field.state.value).toBe(1);
    expect(field.text).toBe("1");
  });

  test("preventDefault stops the chain and puts the typed text back", () => {
    let prevented = false;
    const field = setup({
      on: {
        onBeforeChange: (event) => {
          event.preventDefault();
          event.setValue(5);
          prevented = event.defaultPrevented;
        },
      },
    });
    field.type("12");
    expect(field.names()).toEqual(["onInput", "onBeforeChange"]);
    expect(prevented).toBe(true);
    expect(field.state.value).toBe(1);
    expect(field.state.draft).toEqual({ kind: "current" });
    expect(field.text).toBe("1");
  });
});

describe("text that cannot be read", () => {
  test("keeps the value, and reports onValidate when readability flips", () => {
    const field = setup({ value: 12 });
    field.type("12a");
    expect(field.names()).toEqual(["onInput", "onValidate"]);
    expect(field.event("onValidate")).toMatchObject({
      value: 12,
      text: "12a",
      previousText: "12",
      valid: false,
      messages: [
        { severity: "error", text: "Enter a number", code: "unreadable" },
      ],
    });
    expect(field.state.value).toBe(12);

    field.clear();
    field.type("12ab");
    expect(field.names()).toEqual(["onInput"]);

    field.clear();
    field.type("12");
    expect(field.names()).toEqual(["onInput", "onValidate"]);
    expect(field.event("onValidate")).toMatchObject({ valid: true });
  });

  test("commits nothing: Enter shows why and keeps editing", () => {
    const field = setup({ value: 12 });
    field.type("12a");
    field.clear();
    expect(field.commit("enter")).toEqual({ kind: "unreadable" });
    expect(field.calls).toEqual([]);
    expect(field.state.revealed).toBe(true);
    expect(field.state.phase.kind).toBe("editing");
  });

  test("commits nothing on blur, which still reports onBlur", () => {
    const field = setup({ value: 12 });
    field.type("12a");
    field.clear();
    runBlur(field.env, "focusout", 1);
    expect(field.names()).toEqual(["onBlur"]);
    expect(field.state.phase.kind).toBe("idle");
    expect(field.state.revealed).toBe(true);
    expect(field.state.value).toBe(12);
  });
});

describe("a commit", () => {
  const fixed = (value: number | null) =>
    value === null ? "" : value.toFixed(2);

  test("by Enter fires onBeforeCommit, then onCommit with the text normalized", () => {
    const field = setup({ value: 12, format: fixed });
    field.type("12.5");
    field.clear();
    expect(field.commit("enter")).toEqual({ kind: "accepted" });
    expect(field.names()).toEqual(["onBeforeCommit", "onCommit"]);
    const committed = {
      trigger: "enter",
      changed: true,
      value: 12.5,
      previousValue: 12,
      initialValue: 12,
      text: "12.50",
      previousText: "12.5",
      source: "typing",
      nativeEvent: "keydown enter",
      input: null,
    };
    expect(field.event("onBeforeCommit")).toMatchObject(committed);
    expect(field.event("onCommit")).toMatchObject(committed);
    expect(field.state.phase).toEqual({
      kind: "editing",
      initialValue: 12,
      committedValue: 12.5,
    });
    expect(field.text).toBe("12.50");
  });

  test("compares with the last commit, so Enter again reports no change", () => {
    const field = setup({ value: 12, format: fixed });
    field.type("12.5");
    field.commit("enter");
    field.clear();
    field.commit("enter");
    expect(field.event("onCommit")).toMatchObject({
      changed: false,
      previousValue: 12.5,
      initialValue: 12,
    });
  });

  test("by Tab fires once: the blur that follows reports only onBlur", () => {
    const field = setup();
    field.type("2");
    field.clear();
    expect(field.commit("tab")).toEqual({ kind: "accepted" });
    expect(field.state.phase.kind).toBe("leaving");
    runBlur(field.env, "focusout", 2);
    expect(field.names()).toEqual(["onBeforeCommit", "onCommit", "onBlur"]);
    expect(field.event("onCommit")).toMatchObject({ trigger: "tab" });
    expect(field.event("onBlur")).toMatchObject({
      value: 2,
      text: "2",
      nativeEvent: "focusout",
    });
    expect(field.state.phase.kind).toBe("idle");
  });

  test("by blur fires onBeforeCommit, onCommit, then onBlur", () => {
    const field = setup();
    field.type("2");
    field.clear();
    expect(runBlur(field.env, "focusout", 1)).toBeNull();
    expect(field.names()).toEqual(["onBeforeCommit", "onCommit", "onBlur"]);
    expect(field.event("onCommit")).toMatchObject({
      trigger: "blur",
      nativeEvent: "focusout",
    });
    expect(field.state.phase.kind).toBe("idle");
    expect(field.state.revealed).toBe(true);
  });

  test("on leaving a field that commits as it changes, reports only onBlur", () => {
    const field = setup({ commitOnLeave: false });
    runBlur(field.env, "focusout", 1);
    expect(field.names()).toEqual(["onBlur"]);
    expect(field.state.phase.kind).toBe("idle");
  });

  test("starts a check when onBeforeCommit returns a promise", async () => {
    const field = setup({ on: { onBeforeCommit: () => Promise.resolve() } });
    field.type("2");
    const step = runCommit(field.env, {
      trigger: "enter",
      source: "typing",
      nativeEvent: null,
      attempt: 4,
    });
    expect(step.outcome).toEqual({ kind: "checking" });
    expect(field.state.phase).toMatchObject({
      kind: "checking",
      trigger: "enter",
      attempt: 4,
      leaving: false,
    });
    expect(step.check).toMatchObject({ attempt: 4, quiet: false });
    await expect(step.check?.answer).resolves.toBeNull();
    expect(field.names()).not.toContain("onCommit");
  });
});

describe("a refused commit", () => {
  test("keeps editing on Enter, the default message shown as an error", () => {
    const field = setup({
      on: {
        onBeforeCommit: (event) => {
          event.preventDefault();
        },
      },
    });
    field.type("2");
    field.clear();
    expect(field.commit("enter")).toEqual({ kind: "refused" });
    expect(field.names()).toEqual(["onBeforeCommit"]);
    expect(field.state.refusal).toEqual({
      severity: "error",
      text: "This value could not be checked",
      code: "refused",
      source: "commit",
    });
    expect(field.state.revealed).toBe(true);
    expect(field.state.phase).toEqual({
      kind: "editing",
      initialValue: 1,
      committedValue: 1,
    });
    expect(field.state.value).toBe(2);
  });

  test("shows the app's message, and keeps focus on Tab", () => {
    const field = setup({
      on: {
        onBeforeCommit: (event) => {
          event.preventDefault("Taken");
        },
      },
    });
    field.type("2");
    expect(field.commit("tab")).toEqual({ kind: "refused" });
    expect(field.state.refusal?.text).toBe("Taken");
    expect(field.state.phase.kind).toBe("editing");
  });

  test("ends the edit on blur, then reports onBlur", () => {
    const field = setup({
      on: {
        onBeforeCommit: (event) => {
          event.preventDefault("Taken");
        },
      },
    });
    field.type("2");
    field.clear();
    runBlur(field.env, "focusout", 1);
    expect(field.names()).toEqual(["onBeforeCommit", "onBlur"]);
    expect(field.state.phase.kind).toBe("idle");
    expect(field.state.refusal?.text).toBe("Taken");
  });

  test("clears its message once the text changes", () => {
    const field = setup({
      on: {
        onBeforeCommit: (event) => {
          event.preventDefault("Taken");
        },
      },
    });
    field.type("2");
    field.commit("enter");
    field.type("3");
    expect(field.state.refusal).toBeNull();
  });
});

describe("Escape", () => {
  test("puts back the last committed value: onInput, then the change chain", () => {
    const field = setup({ value: 12 });
    field.type("15");
    field.clear();
    expect(runRevert(field.env, "keydown Escape")).toBe(true);
    expect(field.names()).toEqual([
      "onInput",
      "onBeforeChange",
      "onChange",
      "onValidate",
    ]);
    expect(field.event("onInput")).toMatchObject({
      text: "12",
      previousText: "15",
      source: "revert",
      input: null,
      nativeEvent: "keydown Escape",
    });
    expect(field.event("onChange")).toMatchObject({
      value: 12,
      previousValue: 15,
      source: "revert",
    });
    expect(field.state.value).toBe(12);
    expect(field.state.draft).toEqual({ kind: "current" });
  });

  test("puts back text that reads as the committed value, with no change", () => {
    const field = setup({ value: 12 });
    field.type("12.0");
    field.clear();
    expect(runRevert(field.env, null)).toBe(true);
    expect(field.names()).toEqual(["onInput"]);
    expect(field.text).toBe("12");
  });

  test("reports nothing when there is nothing to put back", () => {
    const field = setup({ value: 12 });
    expect(runRevert(field.env, null)).toBe(false);
    expect(field.calls).toEqual([]);
  });

  test("reports nothing on a field that is not being edited", () => {
    const field = setup({ phase: "idle" });
    expect(runRevert(field.env, null)).toBe(false);
    expect(field.calls).toEqual([]);
  });
});

describe("the clear button", () => {
  test("fires onInput, the change to null, onValidate, then the commit", () => {
    const field = setup({ value: 12 });
    const step = runClear(field.env, "click", 1);
    expect(step.outcome).toEqual({ kind: "accepted" });
    expect(field.names()).toEqual([
      "onInput",
      "onBeforeChange",
      "onChange",
      "onValidate",
      "onBeforeCommit",
      "onCommit",
    ]);
    expect(field.event("onInput")).toMatchObject({
      text: "",
      source: "clear",
      input: null,
    });
    expect(field.event("onCommit")).toMatchObject({
      trigger: "clear",
      source: "clear",
      value: null,
      previousValue: 12,
    });
    expect(field.state.value).toBeNull();
  });
});

describe("a pick", () => {
  test("runs the change chain, then the commit, with no onInput", () => {
    const field = setup();
    runPick(field.env, 5, {
      trigger: "picker",
      source: "picker",
      nativeEvent: "click",
      attempt: 1,
    });
    expect(field.names()).toEqual([
      "onBeforeChange",
      "onChange",
      "onValidate",
      "onBeforeCommit",
      "onCommit",
    ]);
    expect(field.event("onChange")).toMatchObject({
      value: 5,
      source: "picker",
      nativeEvent: "click",
    });
    expect(field.event("onCommit")).toMatchObject({ trigger: "picker" });
  });

  test("on an idle field commits with no onFocus or onBlur, and ends idle", () => {
    const field = setup({ phase: "idle" });
    runPick(field.env, 5, {
      trigger: "toggle",
      source: "toggle",
      nativeEvent: "click",
      attempt: 1,
    });
    expect(field.names()).toEqual([
      "onBeforeChange",
      "onChange",
      "onValidate",
      "onBeforeCommit",
      "onCommit",
    ]);
    expect(field.state.phase.kind).toBe("idle");
    expect(field.state.value).toBe(5);
  });
});

describe("a value change", () => {
  const API = { source: "api", nativeEvent: null, input: null } as const;

  test("runs the change chain with its cause, and no commit", () => {
    const field = setup({ phase: "idle" });
    runValueChange(field.env, 7, API);
    expect(field.names()).toEqual(["onBeforeChange", "onChange", "onValidate"]);
    expect(field.event("onChange")).toMatchObject({
      value: 7,
      previousValue: 1,
      source: "api",
      nativeEvent: null,
      input: null,
    });
    expect(field.state.value).toBe(7);
  });

  test("reports a step's source and key", () => {
    const field = setup();
    runValueChange(field.env, 2, {
      source: "step",
      nativeEvent: "keydown ArrowUp",
      input: null,
    });
    expect(field.names()).toEqual(["onBeforeChange", "onChange", "onValidate"]);
    expect(field.event("onBeforeChange")).toMatchObject({
      value: 2,
      source: "step",
      nativeEvent: "keydown ArrowUp",
    });
    expect(field.state.phase.kind).toBe("editing");
  });

  test("replaces typed text, and fires nothing for the value held", () => {
    const field = setup();
    field.type("12.0");
    field.clear();
    runValueChange(field.env, 12, API);
    expect(field.calls).toEqual([]);
    expect(field.state.draft).toEqual({ kind: "current" });
  });

  test("replaces unreadable text even when the value stays", () => {
    const field = setup();
    field.type("1x");
    field.clear();
    runValueChange(field.env, 1, API);
    expect(field.state.draft).toEqual({ kind: "current" });
    expect(field.names()).toEqual(["onValidate"]);
  });
});

describe("autofill", () => {
  test("reads and commits an idle field, with no onFocus or onBlur", () => {
    const field = setup({ phase: "idle" });
    const check = runAutofill(field.env, field.typed("42", "autofill"), 1);
    expect(check).toBeNull();
    expect(field.names()).toEqual([
      "onInput",
      "onBeforeChange",
      "onChange",
      "onValidate",
      "onBeforeCommit",
      "onCommit",
    ]);
    expect(field.event("onCommit")).toMatchObject({
      trigger: "autofill",
      source: "autofill",
      value: 42,
    });
    expect(field.state.phase.kind).toBe("idle");
  });

  test("leaves text that cannot be read idle and shown", () => {
    const field = setup({ phase: "idle" });
    runAutofill(field.env, field.typed("x", "autofill"), 1);
    expect(field.names()).toEqual(["onInput", "onValidate"]);
    expect(field.state.phase.kind).toBe("idle");
    expect(field.state.revealed).toBe(true);
  });

  test("does nothing when the text is the same", () => {
    const field = setup({ phase: "idle" });
    runAutofill(field.env, field.typed("1", "autofill"), 1);
    expect(field.calls).toEqual([]);
    expect(field.state.phase.kind).toBe("idle");
  });
});

describe("focus", () => {
  test("fires onFocus with the value and text, once", () => {
    const field = setup({ phase: "idle", value: 3 });
    runFocus(field.env, "focus");
    runFocus(field.env, "focus");
    expect(field.names()).toEqual(["onFocus"]);
    expect(field.event("onFocus")).toEqual({
      value: 3,
      text: "3",
      nativeEvent: "focus",
    });
    expect(field.state.phase).toEqual({
      kind: "editing",
      initialValue: 3,
      committedValue: 3,
    });
  });

  test("brings a leaving field back to editing without onFocus", () => {
    const field = setup();
    field.commit("tab");
    field.clear();
    runFocus(field.env, "focus");
    expect(field.calls).toEqual([]);
    expect(field.state.phase.kind).toBe("editing");
  });
});
