import { describe, expect, test } from "vitest";

import type { ColumnType } from "../types";
import { defaultFilterOperators, filterOperatorFamily } from "./operators";

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
