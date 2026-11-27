import { describe, expect, test } from "vitest";

import {
  createDefaultFormsMessages,
  defaultFormsMessages,
  resolveFormsMessages,
  type FormsMessages,
} from "./formsMessages";

/** Every message as text, functions called with sample arguments. */
function rendered(
  messages: FormsMessages,
): Record<keyof FormsMessages, string> {
  return {
    required: messages.required,
    requiredChecked: messages.requiredChecked,
    requiredOn: messages.requiredOn,
    tooShort: messages.tooShort(3),
    tooLong: messages.tooLong(50),
    patternMismatch: messages.patternMismatch,
    unreadable: messages.unreadable,
    notANumber: messages.notANumber,
    numberGrouping: messages.numberGrouping(",", "."),
    numberTooPrecise: messages.numberTooPrecise,
    rangeUnderflow: messages.rangeUnderflow("10"),
    rangeOverflow: messages.rangeOverflow("€100.00"),
    stepMismatch: messages.stepMismatch("0.05"),
    checkFailed: messages.checkFailed,
    clear: messages.clear,
    showPassword: messages.showPassword,
    increase: messages.increase,
    decrease: messages.decrease,
    rangeStart: messages.rangeStart,
    rangeEnd: messages.rangeEnd,
    rangeSeparator: messages.rangeSeparator,
    rangeFrom: messages.rangeFrom("10"),
    rangeUpTo: messages.rangeUpTo("20"),
    rangeReversed: messages.rangeReversed,
    rangeEmpty: messages.rangeEmpty,
    rangeTooShort: messages.rangeTooShort("5"),
    rangeTooLong: messages.rangeTooLong("50"),
    rangeSpanLabel: messages.rangeSpanLabel("10"),
    maskIncomplete: messages.maskIncomplete,
    counter: messages.counter(12, 50),
    counterLabel: messages.counterLabel(50),
    charactersLeft: messages.charactersLeft(5),
    charactersOver: messages.charactersOver(3),
    loading: messages.loading,
    emptyValue: messages.emptyValue,
    displayChecked: messages.displayChecked,
    displayUnchecked: messages.displayUnchecked,
    displayOn: messages.displayOn,
    displayOff: messages.displayOff,
    optional: messages.optional,
    fieldHelp: messages.fieldHelp,
    searchPlaceholder: messages.searchPlaceholder,
    severityLabel: messages.severityLabel("info"),
    severityCount: messages.severityCount("warning", 2),
    messageSummaryTitle: messages.messageSummaryTitle(2),
  };
}

describe("defaultFormsMessages", () => {
  test("holds every key in English", () => {
    expect(rendered(defaultFormsMessages)).toEqual({
      required: "Enter a value",
      requiredChecked: "Check this box to continue",
      requiredOn: "Turn this on to continue",
      tooShort: "Enter at least 3 characters",
      tooLong: "Enter no more than 50 characters",
      patternMismatch: "Enter a value in the expected format",
      unreadable: "This value can't be read",
      notANumber: "Enter a number",
      numberGrouping: "Use “,” for decimals and “.” between thousands",
      numberTooPrecise: "This number has more digits than can be kept exactly",
      rangeUnderflow: "Enter 10 or more",
      rangeOverflow: "Enter €100.00 or less",
      stepMismatch: "Enter a multiple of 0.05",
      checkFailed: "This value could not be checked",
      clear: "Clear",
      showPassword: "Show password",
      increase: "Increase",
      decrease: "Decrease",
      rangeStart: "From",
      rangeEnd: "To",
      rangeSeparator: "–",
      rangeFrom: "from 10",
      rangeUpTo: "up to 20",
      rangeReversed: "The end comes before the start",
      rangeEmpty: "The range is empty",
      rangeTooShort: "The range must span at least 5",
      rangeTooLong: "The range must span no more than 50",
      rangeSpanLabel: "Span: 10",
      maskIncomplete: "Complete this field",
      counter: "12/50",
      counterLabel: "Up to 50 characters",
      charactersLeft: "5 characters left",
      charactersOver: "3 characters too many",
      loading: "Loading",
      emptyValue: "No value",
      displayChecked: "Yes",
      displayUnchecked: "No",
      displayOn: "On",
      displayOff: "Off",
      optional: "optional",
      fieldHelp: "More information",
      searchPlaceholder: "Search",
      severityLabel: "Information",
      severityCount: "2 warnings",
      messageSummaryTitle: "There are 2 problems with this form",
    });
  });

  test("says one in the singular", () => {
    const messages = defaultFormsMessages;
    expect(messages.tooShort(1)).toBe("Enter at least 1 character");
    expect(messages.charactersLeft(1)).toBe("1 character left");
    expect(messages.charactersOver(1)).toBe("1 character too many");
    expect(messages.messageSummaryTitle(1)).toBe(
      "There is 1 problem with this form",
    );
  });

  test("names every severity, and counts each", () => {
    const messages = defaultFormsMessages;
    expect(
      (["error", "warning", "info", "success"] as const).map((severity) => [
        messages.severityLabel(severity),
        messages.severityCount(severity, 1),
        messages.severityCount(severity, 3),
      ]),
    ).toEqual([
      ["Error", "1 error", "3 errors"],
      ["Warning", "1 warning", "3 warnings"],
      ["Information", "1 note", "3 notes"],
      ["Success", "1 confirmation", "3 confirmations"],
    ]);
  });
});

describe("createDefaultFormsMessages", () => {
  test("prints counts in the locale's digits", () => {
    const german = createDefaultFormsMessages("de-DE");
    expect(german.counter(1200, 5000)).toBe("1.200/5.000");
    expect(german.tooLong(1000)).toBe("Enter no more than 1.000 characters");
    expect(createDefaultFormsMessages("en").counter(1200, 5000)).toBe(
      "1,200/5,000",
    );
  });

  test("takes a locale object or a list of locales", () => {
    expect(
      createDefaultFormsMessages(new Intl.Locale("de-DE")).counter(1200, 5000),
    ).toBe("1.200/5.000");
    expect(
      createDefaultFormsMessages(["de-DE", "en"]).counter(1200, 5000),
    ).toBe("1.200/5.000");
  });
});

describe("resolveFormsMessages", () => {
  test("lays a partial set over the defaults", () => {
    const messages = resolveFormsMessages({ required: "Pflichtfeld" });
    expect(messages.required).toBe("Pflichtfeld");
    expect(messages.clear).toBe("Clear");
  });

  test("returns the same defaults for the same locale when nothing is given", () => {
    expect(resolveFormsMessages(undefined)).toBe(defaultFormsMessages);
    expect(resolveFormsMessages(undefined, "de-DE")).toBe(
      resolveFormsMessages(undefined, "de-DE"),
    );
    expect(resolveFormsMessages(undefined, "de-DE").counter(1200, 5000)).toBe(
      "1.200/5.000",
    );
  });

  test("keeps the locale's counts under an override", () => {
    const messages = resolveFormsMessages({ clear: "Leeren" }, "de-DE");
    expect(messages.clear).toBe("Leeren");
    expect(messages.counter(1200, 5000)).toBe("1.200/5.000");
  });
});
