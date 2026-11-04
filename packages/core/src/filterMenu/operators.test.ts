import { describe, expect, test } from "vitest";

import type { ColumnType, FilterOperator } from "../types";
import {
  defaultFilterOperators,
  filterOperandArity,
  filterOperatorFamily,
  formatFilterOperand,
  parseFilterOperand,
} from "./operators";

const everyType: readonly (ColumnType | undefined)[] = [
  "string",
  "number",
  "decimal",
  "currency",
  "percent",
  "boolean",
  "date",
  "dateTime",
  "time",
  undefined,
];

describe("filterOperatorFamily", () => {
  test("reads each column type as the family it filters as", () => {
    expect(everyType.map(filterOperatorFamily)).toEqual([
      "text",
      "number",
      "number",
      "number",
      "number",
      "boolean",
      "date",
      "date",
      "date",
      "text",
    ]);
  });
});

describe("defaultFilterOperators", () => {
  test("text: contains first, then equality, the ends and blanks", () => {
    const text = [
      "contains",
      "notContains",
      "eq",
      "ne",
      "startsWith",
      "endsWith",
      "isEmpty",
      "isNotEmpty",
    ];
    expect(defaultFilterOperators("string")).toEqual(text);
    expect(defaultFilterOperators(undefined)).toEqual(text);
  });

  test("numbers: equality, the orderings, between and blanks", () => {
    const number = [
      "eq",
      "ne",
      "gt",
      "gte",
      "lt",
      "lte",
      "between",
      "isEmpty",
      "isNotEmpty",
    ];
    for (const type of ["number", "decimal", "currency", "percent"] as const) {
      expect(defaultFilterOperators(type)).toEqual(number);
    }
  });

  test("dates: equality, before, after, between and blanks", () => {
    expect(defaultFilterOperators("date")).toEqual([
      "eq",
      "ne",
      "lt",
      "gt",
      "between",
      "isEmpty",
      "isNotEmpty",
    ]);
  });

  test("date-times and times: no equality, which an instant seldom meets", () => {
    const instant = ["lt", "gt", "between", "isEmpty", "isNotEmpty"];
    expect(defaultFilterOperators("dateTime")).toEqual(instant);
    expect(defaultFilterOperators("time")).toEqual(instant);
  });

  test("booleans: equality and blanks", () => {
    expect(defaultFilterOperators("boolean")).toEqual([
      "eq",
      "isEmpty",
      "isNotEmpty",
    ]);
  });

  test("never offers in, the checklist's operator", () => {
    for (const type of everyType) {
      expect(defaultFilterOperators(type)).not.toContain("in");
    }
  });
});

describe("filterOperandArity", () => {
  test("none for the blanks, two for between, one for the rest", () => {
    const arity = (operators: readonly FilterOperator[]) =>
      operators.map(filterOperandArity);
    expect(arity(["isEmpty", "isNotEmpty"])).toEqual([0, 0]);
    expect(arity(["between"])).toEqual([2]);
    expect(
      arity([
        "eq",
        "ne",
        "contains",
        "notContains",
        "startsWith",
        "endsWith",
        "gt",
        "gte",
        "lt",
        "lte",
        "in",
      ]),
    ).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
  });
});

describe("parseFilterOperand", () => {
  test("empty text is no operand, whatever the column", () => {
    for (const type of everyType) {
      expect(parseFilterOperand("", type)).toBeUndefined();
    }
  });

  test("text: as typed, spaces and all", () => {
    expect(parseFilterOperand(" West ", "string")).toBe(" West ");
    expect(parseFilterOperand("12", undefined)).toBe("12");
  });

  test("numbers: a point for decimals, an optional sign and exponent", () => {
    expect(parseFilterOperand("12", "number")).toBe(12);
    expect(parseFilterOperand("-1.5", "currency")).toBe(-1.5);
    expect(parseFilterOperand(".5", "percent")).toBe(0.5);
    expect(parseFilterOperand("2e3", "decimal")).toBe(2000);
    expect(parseFilterOperand(" 42 ", "number")).toBe(42);
  });

  test("numbers: rejects what a number input never gives, rather than guess", () => {
    for (const text of [
      "12abc",
      "1,5",
      "1,500",
      "abc",
      "0x10",
      "Infinity",
      "1e999",
      ".",
      "-",
      " ",
    ]) {
      expect(parseFilterOperand(text, "number")).toBeUndefined();
    }
  });

  test("dates: a day at its local midnight", () => {
    const day = parseFilterOperand("2024-03-01", "date");
    expect(day).toBeInstanceOf(Date);
    expect(day).toEqual(new Date(2024, 2, 1));
  });

  test("dates: a moment at its local time, seconds and milliseconds optional", () => {
    expect(parseFilterOperand("2024-03-01T09:30", "dateTime")).toEqual(
      new Date(2024, 2, 1, 9, 30),
    );
    expect(parseFilterOperand("2024-03-01T09:30:15", "dateTime")).toEqual(
      new Date(2024, 2, 1, 9, 30, 15),
    );
    expect(parseFilterOperand("2024-03-01T09:30:15.5", "time")).toEqual(
      new Date(2024, 2, 1, 9, 30, 15, 500),
    );
    expect(parseFilterOperand("2024-03-01T09:30", "date")).toEqual(
      new Date(2024, 2, 1, 9, 30),
    );
  });

  test("dates: rejects a day or time that doesn't exist, and other spellings", () => {
    for (const text of [
      "2024-02-30",
      "2023-02-29",
      "2024-13-01",
      "2024-00-10",
      "2024-03-01T24:00",
      "2024-03-01T10:60",
      "2024-03-01T10:00:60",
      "0099-01-01",
      "2024-3-1",
      "03/01/2024",
      "2024-03-01Z",
      "yesterday",
    ]) {
      expect(parseFilterOperand(text, "date")).toBeUndefined();
    }
    expect(parseFilterOperand("2024-02-29", "date")).toEqual(
      new Date(2024, 1, 29),
    );
  });

  test("booleans: true or false, nothing else", () => {
    expect(parseFilterOperand("true", "boolean")).toBe(true);
    expect(parseFilterOperand("false", "boolean")).toBe(false);
    expect(parseFilterOperand("yes", "boolean")).toBeUndefined();
    expect(parseFilterOperand("TRUE", "boolean")).toBeUndefined();
  });
});

describe("formatFilterOperand", () => {
  test("a blank operand is empty", () => {
    expect(formatFilterOperand(null, "number")).toBe("");
    expect(formatFilterOperand(undefined, "date")).toBe("");
  });

  test("text, numbers and booleans as text", () => {
    expect(formatFilterOperand("West", "string")).toBe("West");
    expect(formatFilterOperand(-1.5, "currency")).toBe("-1.5");
    expect(formatFilterOperand(true, "boolean")).toBe("true");
  });

  test("a date column's day, as a date input takes it", () => {
    expect(formatFilterOperand(new Date(2024, 2, 1), "date")).toBe(
      "2024-03-01",
    );
    expect(formatFilterOperand(new Date(2024, 2, 1, 9, 30), "date")).toBe(
      "2024-03-01",
    );
  });

  test("a date-time or time column's moment, as a date-time input takes it", () => {
    expect(formatFilterOperand(new Date(2024, 2, 1), "dateTime")).toBe(
      "2024-03-01T00:00",
    );
    expect(formatFilterOperand(new Date(2024, 11, 31, 9, 5), "time")).toBe(
      "2024-12-31T09:05",
    );
    expect(
      formatFilterOperand(new Date(2024, 2, 1, 9, 30, 15), "dateTime"),
    ).toBe("2024-03-01T09:30:15");
    expect(
      formatFilterOperand(new Date(2024, 2, 1, 9, 30, 15, 50), "dateTime"),
    ).toBe("2024-03-01T09:30:15.050");
  });

  test("a date column's string operand reads as the date it names, else as it is", () => {
    expect(formatFilterOperand("2024-03-01T09:30", "dateTime")).toBe(
      "2024-03-01T09:30",
    );
    expect(formatFilterOperand("soon", "date")).toBe("soon");
  });

  test("round-trips each family through its input", () => {
    const roundTrips: readonly [string, ColumnType | undefined][] = [
      ["West", "string"],
      ["12.25", "number"],
      ["-3", "currency"],
      ["2024-03-01", "date"],
      ["2024-03-01T00:00", "dateTime"],
      ["2024-03-01T09:30:15.250", "dateTime"],
      ["2024-03-01T18:45", "time"],
      ["false", "boolean"],
    ];
    for (const [text, type] of roundTrips) {
      expect(formatFilterOperand(parseFilterOperand(text, type), type)).toBe(
        text,
      );
    }
  });
});
