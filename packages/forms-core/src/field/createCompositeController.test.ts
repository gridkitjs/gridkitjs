import { describe, expect, test } from "vitest";

import { defaultFormsMessages } from "../messages/formsMessages";
import { numberFormatter, numberParser } from "../number/numberField";
import { numberRangeKind } from "../number/numberRange";
import type { Range, RangeOptions } from "../range/range";
import {
  rangeDetails,
  rangeEnds,
  readRangeEnds,
  type RangeDetails,
  type RangeEnds,
} from "../range/rangeField";
import {
  createCompositeController,
  type CompositeFieldOptions,
  type PartController,
} from "./createCompositeController";
import type { FieldHandlers } from "./events";
import type { TextEdit } from "./plan";

type NumberRange = Range<number>;
type Details = RangeDetails<number>;
type Options = CompositeFieldOptions<
  NumberRange,
  RangeEnds<number>,
  Details,
  string
>;
type HandlerName = keyof FieldHandlers<NumberRange, Details, string>;

const HANDLERS: readonly HandlerName[] = [
  "onFocus",
  "onBeforeInput",
  "onInput",
  "onBeforeChange",
  "onChange",
  "onValidate",
  "onBeforeCommit",
  "onCommit",
  "onBlur",
];

/**
 * A number range from two number parts, as `NumberRangeInput` builds it,
 * recording every handler call in order before running the ones
 * `handlers` gives.
 */
function numberRange(
  range: RangeOptions<number> = {},
  overrides: Partial<Options> = {},
) {
  const calls: { name: HandlerName; event: Record<string, unknown> }[] = [];
  const recorded = Object.fromEntries(
    HANDLERS.map((name) => [
      name,
      (event: Record<string, unknown>) => {
        calls.push({ name, event });
        const own = overrides[name] as
          ((event: Record<string, unknown>) => void) | undefined;
        own?.(event);
      },
    ]),
  );
  const part = {
    defaultParse: numberParser({ locale: "en-US" }),
    defaultFormat: numberFormatter<number>({ locale: "en-US" }),
  };
  const options: Options = {
    messages: defaultFormsMessages,
    locale: "en-US",
    parts: { start: part, end: part },
    assemble: (ends, context) =>
      readRangeEnds(numberRangeKind, ends, range, undefined, context),
    split: (value) =>
      rangeEnds(numberRangeKind, value, range.bounds ?? "[)", undefined),
    join: (texts) => `${texts.start} – ${texts.end}`,
    equals: (a, b) => a.start === b.start && a.end === b.end,
    details: (current, _previous, { changed, texts }) =>
      rangeDetails(
        numberRangeKind,
        current.value,
        changed,
        texts,
        range.bounds ?? "[)",
        undefined,
      ),
    ...overrides,
    ...recorded,
  };
  const composite = createCompositeController(options);
  const { start, end } = composite.parts;
  return {
    composite,
    start,
    end,
    names: () => calls.map((call) => call.name),
    events: (name: HandlerName) =>
      calls.filter((call) => call.name === name).map((call) => call.event),
    clear: () => {
      calls.length = 0;
    },
  };
}

/** Types `text` over a part's text, as forms-dom reports a keystroke. */
function type(part: PartController<number, string>, text: string): void {
  const edit: TextEdit<string> = {
    text,
    source: "typing",
    nativeEvent: "input",
    input: null,
  };
  const decision = part.beforeInput({ ...edit, cancelable: true });
  if (decision.kind === "allow") {
    part.input(edit);
  }
}

describe("createCompositeController: typing in a part", () => {
  test("relays each edit as an edit of the joined text, with the end that changed", () => {
    const { start, end, names, events, composite } = numberRange();
    start.focus("focus");
    type(start, "10");

    expect(names()).toEqual([
      "onFocus",
      "onBeforeInput",
      "onInput",
      "onBeforeChange",
      "onChange",
      "onValidate",
    ]);
    expect(events("onInput")[0]).toMatchObject({
      text: "10 – ",
      previousText: " – ",
      changedEnd: "start",
    });
    expect(events("onChange")[0]).toMatchObject({
      value: { start: 10, end: null },
      changedEnd: "start",
      startText: "10",
      span: null,
    });

    type(end, "25");
    expect(events("onChange")[1]).toMatchObject({
      value: { start: 10, end: 25 },
      changedEnd: "end",
      span: 15,
    });
    expect(composite.field.getText()).toBe("10 – 25");
  });

  test("an edit that reads as the same value fires onInput only", () => {
    const { start, names, clear } = numberRange();
    start.focus("focus");
    type(start, "1.5");
    clear();

    type(start, "1.50");

    expect(names()).toEqual(["onBeforeInput", "onInput"]);
  });

  test("the app's onBeforeInput sees the joined text, and may refuse the part's edit", () => {
    const { start, events, composite } = numberRange(
      {},
      {
        onBeforeInput: (event) => {
          if (event.text.includes("9")) {
            event.preventDefault();
          }
        },
      },
    );
    start.focus("focus");
    type(start, "19");

    expect(events("onBeforeInput")[0]).toMatchObject({
      text: "19 – ",
      changedEnd: "start",
    });
    expect(start.getText()).toBe("");
    expect(composite.field.getState().value).toBe(null);
  });

  test("a part that cannot be read makes the field unreadable with its message", () => {
    const { start, composite } = numberRange();
    start.focus("focus");
    type(start, "1,5");

    const { draft } = composite.field.getState();
    expect(draft).toMatchObject({
      kind: "text",
      reading: { kind: "unreadable" },
    });
    expect(composite.field.getMessages()[0]?.text).toContain("decimals");
  });
});

describe("createCompositeController: reversed ends", () => {
  test("swap in the value at once, and change places on screen on commit", () => {
    const { start, end, events, composite } = numberRange();
    start.focus("focus");
    type(start, "20");
    start.commit("tab", "keydown");
    start.blur("blur");
    end.focus("focus");
    type(end, "5");

    expect(events("onChange").at(-1)).toMatchObject({
      value: { start: 5, end: 20 },
    });
    expect([start.getText(), end.getText()]).toEqual(["20", "5"]);

    end.blur("blur");
    composite.leave("blur", "blur");

    expect([start.getText(), end.getText()]).toEqual(["5", "20"]);
    expect(events("onCommit")).toEqual([
      expect.objectContaining({
        value: { start: 5, end: 20 },
        trigger: "blur",
        changedEnd: "both",
      }),
    ]);
  });

  test("with reversed: error, show the message and keep the last value", () => {
    const { start, end, composite } = numberRange({ reversed: "error" });
    start.focus("focus");
    type(start, "20");
    end.focus("focus");
    type(end, "5");

    expect(composite.field.getState().value).toEqual({
      start: 20,
      end: null,
    });
    expect(composite.field.getMessages()[0]?.text).toBe(
      "The end comes before the start",
    );
  });
});

describe("createCompositeController: commits", () => {
  test("Tab between parts commits only the part; leaving commits the field once", () => {
    const { start, end, names, events, composite, clear } = numberRange();
    start.focus("focus");
    type(start, "1.50");
    clear();

    start.commit("tab", "keydown");
    start.blur("blur");
    end.focus("focus");

    expect(names()).toEqual([]);
    expect(start.getText()).toBe("1.5");

    type(end, "3");
    end.commit("tab", "keydown");
    end.blur("blur");
    composite.leave("tab", "blur");

    expect(names().filter((name) => name.includes("Commit"))).toEqual([
      "onBeforeCommit",
      "onCommit",
    ]);
    expect(events("onCommit")[0]).toMatchObject({
      value: { start: 1.5, end: 3 },
      trigger: "tab",
      changed: true,
    });
    expect(names().at(-1)).toBe("onBlur");
  });

  test("Enter in a part commits the field, naming the end that changed", () => {
    const { start, events } = numberRange(
      {},
      { defaultValue: { start: 1, end: 9 } },
    );
    start.focus("focus");
    type(start, "2");

    expect(start.commit("enter", "keydown")).toEqual({ kind: "accepted" });
    expect(events("onCommit")[0]).toMatchObject({
      value: { start: 2, end: 9 },
      trigger: "enter",
      changedEnd: "start",
    });
  });

  test("a commit with nothing changed names no end", () => {
    const { start, events } = numberRange(
      {},
      { defaultValue: { start: 1, end: 9 } },
    );
    start.focus("focus");

    start.commit("enter", "keydown");

    expect(events("onCommit")[0]).toMatchObject({
      changed: false,
      changedEnd: null,
    });
  });
});

describe("createCompositeController: a value set whole", () => {
  test("onBeforeChange can rewrite the range; the rewrite reaches onChange and the parts", () => {
    const { start, end, events } = numberRange(
      { bounds: "[]" },
      {
        onBeforeChange: (event) => {
          const { value } = event;
          if (value?.end !== null && value?.end !== undefined) {
            event.setValue({ start: value.start, end: value.end - 1 });
          }
        },
      },
    );
    start.focus("focus");
    type(start, "1");
    end.focus("focus");
    type(end, "10");

    expect(events("onChange").at(-1)).toMatchObject({
      value: { start: 1, end: 9 },
    });
    expect(end.getText()).toBe("9");
  });

  test("Escape puts back the last committed range in both parts", () => {
    const { start, end, composite } = numberRange(
      {},
      { defaultValue: { start: 1, end: 9 } },
    );
    start.focus("focus");
    type(start, "abc");
    end.focus("focus");
    type(end, "20");

    expect(end.revert("keydown")).toBe(true);

    expect(composite.field.getState().value).toEqual({ start: 1, end: 9 });
    expect([start.getText(), end.getText()]).toEqual(["1", "9"]);
  });

  test("setValue and clear show in the parts", () => {
    const { start, end, composite } = numberRange();

    composite.field.setValue({ start: 3, end: 4 });
    expect([start.getText(), end.getText()]).toEqual(["3", "4"]);

    composite.field.clear(null);
    expect([start.getText(), end.getText()]).toEqual(["", ""]);
    expect(composite.field.getState().value).toBe(null);
  });

  test("a controlled value arrives in both parts while the user is not typing", () => {
    const { start, end, composite } = numberRange(
      {},
      { value: { start: 1, end: 2 } },
    );
    expect([start.getText(), end.getText()]).toEqual(["1", "2"]);

    composite.field.sync({ start: 5, end: null });

    expect([start.getText(), end.getText()]).toEqual(["5", ""]);
  });

  test("a step in a part is an edit of the field", () => {
    const { start, events } = numberRange(
      {},
      { defaultValue: { start: 1, end: 9 } },
    );
    start.focus("focus");

    start.change(2, { source: "step", nativeEvent: "keydown", input: null });

    expect(start.getText()).toBe("2");
    expect(events("onChange")[0]).toMatchObject({
      value: { start: 2, end: 9 },
      source: "step",
      changedEnd: "start",
    });
  });
});

describe("createCompositeController: state", () => {
  test("getState is one object until the field or a part changes", () => {
    const { start, composite } = numberRange();
    const first = composite.getState();
    expect(composite.getState()).toBe(first);

    start.focus("focus");
    type(start, "4");

    expect(composite.getState()).not.toBe(first);
    expect(composite.getState().parts.start.value).toBe(4);
  });

  test("subscribe hears the parts and the field until unsubscribed", () => {
    const { start, composite } = numberRange();
    let heard = 0;
    const unsubscribe = composite.subscribe(() => {
      heard += 1;
    });
    start.focus("focus");
    type(start, "4");
    expect(heard).toBeGreaterThan(0);

    unsubscribe();
    const before = heard;
    type(start, "5");
    expect(heard).toBe(before);
  });
});
