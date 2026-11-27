import { describe, expect, test } from "vitest";

import { defaultFormsMessages } from "../messages/formsMessages";
import { numberRangeKind } from "../number/numberRange";
import {
  orderRange,
  rangeIncludes,
  rangeSpan,
  resolveRange,
  sameRange,
  shownEnd,
  type RangeKind,
  type RangeValue,
} from "./range";
import { rangeDetails, rangeEnds, readRangeEnds } from "./rangeField";
import { endsRule, maxSpanRule, minSpanRule } from "./rules";

// Two kinds that are not numbers, as `forms-dates` will write them.

/** "22:00": minutes into the day. */
function minutesOf(time: string): number {
  const [hours = "0", minutes = "0"] = time.split(":");
  return Number(hours) * 60 + Number(minutes);
}

interface OvernightFlags {
  readonly overnight: boolean;
}

/** A time range that may cross midnight when its context allows it. */
const timeKind: RangeKind<
  string,
  OvernightFlags,
  number,
  { readonly overnight: boolean }
> = {
  compare: (a, b) => minutesOf(a) - minutesOf(b),
  orient: (start, end, { overnight }) => {
    if (minutesOf(end) >= minutesOf(start)) {
      return { kind: "ordered", flags: { overnight: false } };
    }
    return overnight
      ? { kind: "ordered", flags: { overnight: true } }
      : { kind: "reversed" };
  },
  openFlags: { overnight: false },
  span: (start, end, { overnight }) =>
    minutesOf(end) - minutesOf(start) + (overnight ? 24 * 60 : 0),
  compareSpans: (a, b) => a - b,
};

/**
 * Whole days, numbered, stored half-open (the day after the last), its
 * span in hours by a context that knows each day's length, as a time zone
 * does across a daylight-saving change.
 */
interface DayContext {
  readonly hoursOf: (day: number) => number;
}
interface LastWeekRule {
  readonly days: number;
}
const dayKind: RangeKind<
  number,
  Record<never, never>,
  number,
  DayContext,
  LastWeekRule
> = {
  compare: (a, b) => a - b,
  orient: (start, end) =>
    end >= start ? { kind: "ordered", flags: {} } : { kind: "reversed" },
  openFlags: {},
  span: (start, end, _flags, { hoursOf }) => {
    let hours = 0;
    for (let day = start; day < end; day += 1) {
      hours += hoursOf(day);
    }
    return hours;
  },
  compareSpans: (a, b) => a - b,
  toStoredEnd: (shown) => shown + 1,
  toShownEnd: (stored) => stored - 1,
  resolve: (rule) => ({ start: 100 - rule.days, end: 100 }),
};

/** Day 88 is 23 hours long, day 300 is 25: clocks go forward, then back. */
const zone: DayContext = {
  hoursOf: (day) => (day === 88 ? 23 : day === 300 ? 25 : 24),
};

describe("orderRange", () => {
  test("both ends open is no range", () => {
    expect(orderRange(numberRangeKind, null, null, {}, undefined)).toEqual({
      kind: "none",
    });
  });

  test("one open end keeps the kind's open flags", () => {
    expect(
      orderRange(timeKind, "09:00", null, {}, { overnight: true }),
    ).toEqual({
      kind: "range",
      range: { start: "09:00", end: null, overnight: false },
      swapped: false,
    });
    expect(orderRange(numberRangeKind, null, 20, {}, undefined)).toEqual({
      kind: "range",
      range: { start: null, end: 20 },
      swapped: false,
    });
  });

  test("swaps a reversed entry by default", () => {
    expect(orderRange(numberRangeKind, 20, 10, {}, undefined)).toEqual({
      kind: "range",
      range: { start: 10, end: 20 },
      swapped: true,
    });
  });

  test("refuses a reversed entry with reversed: error", () => {
    expect(
      orderRange(numberRangeKind, 20, 10, { reversed: "error" }, undefined),
    ).toEqual({ kind: "unreadable", reason: "reversed" });
  });

  test("a half-open range from a value to itself is empty, unless allowEmpty", () => {
    expect(orderRange(numberRangeKind, 10, 10, {}, undefined)).toEqual({
      kind: "unreadable",
      reason: "empty",
    });
    expect(
      orderRange(numberRangeKind, 10, 10, { allowEmpty: true }, undefined),
    ).toMatchObject({ kind: "range", range: { start: 10, end: 10 } });
  });

  test("a closed range from a value to itself is one point", () => {
    expect(
      orderRange(numberRangeKind, 10, 10, { bounds: "[]" }, undefined),
    ).toMatchObject({ kind: "range", range: { start: 10, end: 10 } });
  });

  test("a flag lets the end come before the start: overnight", () => {
    expect(
      orderRange(timeKind, "22:00", "06:00", {}, { overnight: true }),
    ).toEqual({
      kind: "range",
      range: { start: "22:00", end: "06:00", overnight: true },
      swapped: false,
    });
  });

  test("without the flag, the same entry is reversed: swapped or refused", () => {
    expect(
      orderRange(timeKind, "22:00", "06:00", {}, { overnight: false }),
    ).toEqual({
      kind: "range",
      range: { start: "06:00", end: "22:00", overnight: false },
      swapped: true,
    });
    expect(
      orderRange(
        timeKind,
        "22:00",
        "06:00",
        { reversed: "error" },
        { overnight: false },
      ),
    ).toEqual({ kind: "unreadable", reason: "reversed" });
  });

  test("stores a half-open end through toStoredEnd, so one day shown is not empty", () => {
    expect(orderRange(dayKind, 1, 1, {}, zone)).toEqual({
      kind: "range",
      range: { start: 1, end: 2 },
      swapped: false,
    });
    expect(orderRange(dayKind, 31, 1, {}, zone)).toEqual({
      kind: "range",
      range: { start: 1, end: 32 },
      swapped: true,
    });
  });

  test("a closed range stores the end as shown", () => {
    expect(orderRange(dayKind, 1, 31, { bounds: "[]" }, zone)).toMatchObject({
      range: { start: 1, end: 31 },
    });
  });
});

describe("rangeSpan", () => {
  test("measures through the kind, with its flags and context", () => {
    expect(
      rangeSpan(
        timeKind,
        { start: "22:00", end: "06:00", overnight: true },
        { overnight: true },
      ),
    ).toBe(480);
    expect(
      rangeSpan(
        timeKind,
        { start: "06:00", end: "22:00", overnight: false },
        { overnight: false },
      ),
    ).toBe(960);
  });

  test("a day across a daylight-saving change is 23 or 25 hours", () => {
    expect(rangeSpan(dayKind, { start: 88, end: 89 }, zone)).toBe(23);
    expect(rangeSpan(dayKind, { start: 300, end: 301 }, zone)).toBe(25);
    expect(rangeSpan(dayKind, { start: 10, end: 11 }, zone)).toBe(24);
  });

  test("is null while an end is open", () => {
    expect(rangeSpan(numberRangeKind, { start: 1, end: null }, undefined)).toBe(
      null,
    );
  });

  test("is exact for numbers", () => {
    expect(
      rangeSpan(numberRangeKind, { start: 0.1, end: 0.3 }, undefined),
    ).toBe(0.2);
  });
});

describe("shownEnd", () => {
  test("shows a half-open stored end through toShownEnd", () => {
    expect(shownEnd(dayKind, { start: 1, end: 32 }, "[)", zone)).toBe(31);
    expect(shownEnd(dayKind, { start: 1, end: 31 }, "[]", zone)).toBe(31);
    expect(shownEnd(dayKind, { start: 1, end: null }, "[)", zone)).toBe(null);
  });
});

describe("rangeIncludes", () => {
  const range = { start: 10, end: 20 };

  test("leaves a half-open range's end out, and a closed range's in", () => {
    expect(rangeIncludes(numberRangeKind, range, 10, "[)")).toBe(true);
    expect(rangeIncludes(numberRangeKind, range, 20, "[)")).toBe(false);
    expect(rangeIncludes(numberRangeKind, range, 20, "[]")).toBe(true);
    expect(rangeIncludes(numberRangeKind, range, 9, "[]")).toBe(false);
  });

  test("an open end reaches as far as values go", () => {
    expect(
      rangeIncludes(numberRangeKind, { start: null, end: 5 }, -1e9, "[)"),
    ).toBe(true);
    expect(
      rangeIncludes(numberRangeKind, { start: 5, end: null }, 1e9, "[)"),
    ).toBe(true);
  });

  test("a range over midnight wraps", () => {
    const night = { start: "22:00", end: "06:00", overnight: true };
    expect(rangeIncludes(timeKind, night, "23:30", "[)")).toBe(true);
    expect(rangeIncludes(timeKind, night, "05:59", "[)")).toBe(true);
    expect(rangeIncludes(timeKind, night, "12:00", "[)")).toBe(false);
  });
});

describe("resolveRange", () => {
  test("gives fixed ends back, and resolves a rule through the kind", () => {
    const fixed: RangeValue<number, Record<never, never>, LastWeekRule> = {
      start: 1,
      end: 2,
    };
    const lastWeek: RangeValue<number, Record<never, never>, LastWeekRule> = {
      kind: "relative",
      rule: { days: 7 },
    };
    expect(resolveRange(dayKind, fixed, zone)).toBe(fixed);
    expect(resolveRange(dayKind, lastWeek, zone)).toEqual({
      start: 93,
      end: 100,
    });
  });

  test("throws for a rule when the kind has none to resolve", () => {
    const noRules: RangeKind<
      number,
      Record<never, never>,
      number,
      undefined,
      string
    > = {
      compare: numberRangeKind.compare,
      orient: numberRangeKind.orient,
      openFlags: {},
      span: numberRangeKind.span,
      compareSpans: numberRangeKind.compareSpans,
    };
    expect(() =>
      resolveRange(noRules, { kind: "relative", rule: "today" }, undefined),
    ).toThrow(TypeError);
  });
});

describe("sameRange", () => {
  test("compares ends by the kind, and the flags", () => {
    expect(
      sameRange(numberRangeKind, { start: 1, end: 2 }, { start: 1, end: 2 }),
    ).toBe(true);
    expect(
      sameRange(numberRangeKind, { start: 1, end: null }, { start: 1, end: 2 }),
    ).toBe(false);
    expect(
      sameRange(
        timeKind,
        { start: "22:00", end: "06:00", overnight: true },
        { start: "22:00", end: "06:00", overnight: false },
      ),
    ).toBe(false);
  });
});

describe("readRangeEnds and rangeEnds", () => {
  const context = { locale: "en", messages: defaultFormsMessages };

  test("read two ends as the range, null, or a message", () => {
    expect(
      readRangeEnds(
        numberRangeKind,
        { start: 20, end: 10 },
        {},
        undefined,
        context,
      ),
    ).toEqual({ kind: "value", value: { start: 10, end: 20 } });
    expect(
      readRangeEnds(
        numberRangeKind,
        { start: null, end: null },
        {},
        undefined,
        context,
      ),
    ).toEqual({ kind: "value", value: null });
    expect(
      readRangeEnds(
        numberRangeKind,
        { start: 20, end: 10 },
        { reversed: "error" },
        undefined,
        context,
      ),
    ).toEqual({
      kind: "unreadable",
      message: "The end comes before the start",
    });
    expect(
      readRangeEnds(
        numberRangeKind,
        { start: 5, end: 5 },
        {},
        undefined,
        context,
      ),
    ).toEqual({ kind: "unreadable", message: "The range is empty" });
  });

  test("show a stored range's ends, the end as shown", () => {
    expect(rangeEnds(dayKind, { start: 1, end: 32 }, "[)", zone)).toEqual({
      start: 1,
      end: 31,
    });
    expect(rangeEnds(dayKind, null, "[)", zone)).toEqual({
      start: null,
      end: null,
    });
  });
});

describe("rangeDetails", () => {
  test("names the end that changed, the span and both texts", () => {
    expect(
      rangeDetails(
        dayKind,
        { start: 88, end: 89 },
        "all",
        { start: "88", end: "88" },
        "[)",
        zone,
      ),
    ).toEqual({
      changedEnd: "both",
      resolved: { start: 88, end: 89 },
      span: 23,
      bounds: "[)",
      startText: "88",
      endText: "88",
      rule: null,
    });
    expect(
      rangeDetails(
        numberRangeKind,
        null,
        "start",
        { start: "", end: "" },
        "[]",
        undefined,
      ),
    ).toMatchObject({ changedEnd: "start", resolved: null, span: null });
  });
});

describe("span rules", () => {
  const validator = { text: "", locale: "en", messages: defaultFormsMessages };
  const hours = (span: number) => `${String(span)} hours`;

  test("minSpanRule refuses a range shorter than its minimum, measured in the context", () => {
    const rule = minSpanRule(dayKind, 24, () => zone, hours);
    expect(rule({ start: 88, end: 89 }, validator)).toEqual({
      text: "The range must span at least 24 hours",
      code: "rangeTooShort",
    });
    expect(rule({ start: 10, end: 11 }, validator)).toBe(null);
    expect(rule({ start: 10, end: null }, validator)).toBe(null);
    expect(rule(null, validator)).toBe(null);
  });

  test("maxSpanRule refuses a range longer than its maximum", () => {
    const rule = maxSpanRule(dayKind, 24, () => zone, hours);
    expect(rule({ start: 300, end: 301 }, validator)).toEqual({
      text: "The range must span no more than 24 hours",
      code: "rangeTooLong",
    });
    expect(rule({ start: 88, end: 89 }, validator)).toBe(null);
  });

  test("endsRule checks each present end, a shared message once", () => {
    const positive = endsRule<number, Record<never, never>>((value) =>
      value !== null && value < 0 ? "Enter 0 or more" : null,
    );
    expect(positive({ start: -2, end: -1 }, validator)).toEqual([
      "Enter 0 or more",
    ]);
    expect(positive({ start: null, end: 3 }, validator)).toEqual([]);
    expect(positive(null, validator)).toBe(null);
  });
});
