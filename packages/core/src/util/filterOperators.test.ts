import { describe, expect, test } from "vitest";

import type { ColumnType, OperatorFilterEntry } from "../types";
import { compileOperatorEntry } from "./filterOperators";

type Operand = OperatorFilterEntry<unknown>["value"];

/** One cell against one operand: the cell, and whether it matches. */
type Case = readonly [cell: unknown, matches: boolean];

/**
 * Every case for one operator under one column type, run through the same
 * compiled test — compiled once, as `filterRows` compiles it.
 */
function check(
  operator: OperatorFilterEntry<unknown>["operator"],
  type: ColumnType | undefined,
  value: Operand,
  cases: readonly Case[],
): void {
  const entry: OperatorFilterEntry<unknown> =
    value === undefined
      ? { columnId: "column", operator }
      : { columnId: "column", operator, value };
  const test = compileOperatorEntry(entry, type);

  expect(cases.map(([cell]) => [cell, test(cell)])).toEqual(
    cases.map(([cell, matches]) => [cell, matches]),
  );
}

const jan = new Date("2024-01-01T00:00:00.000Z");
const feb = new Date("2024-02-01T00:00:00.000Z");
const mar = new Date("2024-03-01T00:00:00.000Z");

/** The three cells every operator reads as empty. */
const empties = [null, undefined, ""] as const;

function emptyCases(matches: boolean): readonly Case[] {
  return empties.map((cell) => [cell, matches]);
}

describe("compileOperatorEntry", () => {
  describe("eq", () => {
    test("string: equal ignoring case; empty never equal", () => {
      check("eq", "string", "west", [
        ["West", true],
        ["WEST", true],
        ["Western", false],
        ...emptyCases(false),
      ]);
    });

    test("number: numerically; a string cell is never equal", () => {
      check("eq", "number", 10, [
        [10, true],
        [10.5, false],
        ["10", false],
        ...emptyCases(false),
      ]);
    });

    test("date: by time; an ISO-string cell compares as its date", () => {
      check("eq", "date", feb, [
        [new Date(feb.getTime()), true],
        [feb.toISOString(), true],
        [jan, false],
        ["not a date", false],
        ...emptyCases(false),
      ]);
    });

    test("boolean: by value", () => {
      check("eq", "boolean", true, [
        [true, true],
        [false, false],
        ["true", false],
        ...emptyCases(false),
      ]);
    });

    test("an untyped column compares as text", () => {
      check("eq", undefined, 10, [
        ["10", true],
        [10, true],
        [100, false],
      ]);
    });

    test("an operand of the wrong kind matches nothing", () => {
      check("eq", "number", "10", [[10, false], ...emptyCases(false)]);
      check("eq", "boolean", 1, [[true, false]]);
      check("eq", "date", "not a date", [[jan, false]]);
      check("eq", "string", jan, [[String(jan), false]]);
      check("eq", "number", null, [[0, false]]);
      check("eq", "number", [10], [[10, false]]);
    });
  });

  describe("ne", () => {
    test("string: the opposite of eq, empty included", () => {
      check("ne", "string", "west", [
        ["West", false],
        ["East", true],
        ...emptyCases(true),
      ]);
    });

    test("number: a cell of another kind is not equal, so it matches", () => {
      check("ne", "number", 10, [
        [10, false],
        [20, true],
        ["10", true],
        ...emptyCases(true),
      ]);
    });

    test("date", () => {
      check("ne", "dateTime", jan, [
        [jan, false],
        [feb, true],
        ...emptyCases(true),
      ]);
    });

    test("boolean", () => {
      check("ne", "boolean", true, [
        [true, false],
        [false, true],
        ...emptyCases(true),
      ]);
    });

    test("an operand of the wrong kind matches nothing, blanks included", () => {
      check("ne", "number", "10", [[20, false], ...emptyCases(false)]);
    });
  });

  describe("contains", () => {
    test("string: a substring, ignoring case", () => {
      check("contains", "string", "EST", [
        ["West", true],
        ["midWEST", true],
        ["North", false],
        ...emptyCases(false),
      ]);
    });

    test("number: the stringified value", () => {
      check("contains", "number", 2, [
        [123, true],
        [45, false],
        ...emptyCases(false),
      ]);
    });

    test("date: the stringified value", () => {
      check("contains", "date", "2024", [
        [jan, true],
        [new Date("1999-06-15T12:00:00.000Z"), false],
        ...emptyCases(false),
      ]);
    });

    test("boolean: the stringified value", () => {
      check("contains", "boolean", "tru", [
        [true, true],
        [false, false],
        ...emptyCases(false),
      ]);
    });

    test("a Date or a list operand matches nothing", () => {
      check("contains", "string", jan, [[String(jan), false]]);
      check("contains", "string", ["a"], [["a", false]]);
    });
  });

  describe("notContains", () => {
    test("string: the opposite of contains, empty included", () => {
      check("notContains", "string", "est", [
        ["West", false],
        ["North", true],
        ...emptyCases(true),
      ]);
    });

    test("number", () => {
      check("notContains", "number", 2, [
        [123, false],
        [45, true],
        ...emptyCases(true),
      ]);
    });

    test("boolean", () => {
      check("notContains", "boolean", "true", [
        [true, false],
        [false, true],
        ...emptyCases(true),
      ]);
    });

    test("an operand of the wrong kind matches nothing, blanks included", () => {
      check("notContains", "string", null, [
        ["West", false],
        ...emptyCases(false),
      ]);
    });
  });

  describe("startsWith and endsWith", () => {
    test("string, ignoring case", () => {
      check("startsWith", "string", "WE", [
        ["West", true],
        ["Midwest", false],
        ...emptyCases(false),
      ]);
      check("endsWith", "string", "EST", [
        ["Midwest", true],
        ["Westerly", false],
        ...emptyCases(false),
      ]);
    });

    test("number and boolean, stringified", () => {
      check("startsWith", "number", 12, [
        [123, true],
        [312, false],
      ]);
      check("endsWith", "boolean", "se", [
        [false, true],
        [true, false],
      ]);
    });

    test("date, stringified", () => {
      check("startsWith", "date", String(jan).slice(0, 3), [[jan, true]]);
    });
  });

  describe("gt, gte, lt, lte", () => {
    test("number", () => {
      const cells: readonly unknown[] = [5, 10, 20, "20", ...empties];
      const run = (
        operator: "gt" | "gte" | "lt" | "lte",
        expected: readonly boolean[],
      ) => {
        check(
          operator,
          "currency",
          10,
          cells.map((cell, index) => [cell, expected[index] ?? false]),
        );
      };

      run("gt", [false, false, true, false]);
      run("gte", [false, true, true, false]);
      run("lt", [true, false, false, false]);
      run("lte", [true, true, false, false]);
    });

    test("date: chronologically; a string operand is read as a date", () => {
      check("gt", "date", "2024-01-15", [
        [jan, false],
        [feb, true],
        [mar.toISOString(), true],
        ...emptyCases(false),
      ]);
      check("lte", "date", feb, [
        [jan, true],
        [feb, true],
        [mar, false],
        ...emptyCases(false),
      ]);
    });

    test("string: alphabetically, ignoring case", () => {
      check("lt", "string", "m", [
        ["Apple", true],
        ["apple", true],
        ["Zebra", false],
        ...emptyCases(false),
      ]);
      check("gte", "string", "b", [
        ["B", true],
        ["a", false],
      ]);
    });

    test("boolean: false before true", () => {
      check("gt", "boolean", false, [
        [true, true],
        [false, false],
        ...emptyCases(false),
      ]);
      check("lte", "boolean", false, [
        [false, true],
        [true, false],
      ]);
    });

    test("an operand of the wrong kind matches nothing", () => {
      check("gt", "number", "5", [[10, false]]);
      check("lt", "date", 5, [[jan, false]]);
    });
  });

  describe("between", () => {
    test("number: both ends inclusive", () => {
      check(
        "between",
        "number",
        [10, 20],
        [
          [9, false],
          [10, true],
          [15, true],
          [20, true],
          [21, false],
          ["15", false],
          ...emptyCases(false),
        ],
      );
    });

    test("date: mixed Date and string ends", () => {
      check(
        "between",
        "date",
        [jan, "2024-02-01T00:00:00.000Z"],
        [[jan, true], [feb, true], [mar, false], ...emptyCases(false)],
      );
    });

    test("string, ignoring case", () => {
      check(
        "between",
        "string",
        ["b", "d"],
        [
          ["Bob", true],
          ["carol", true],
          ["Eve", false],
        ],
      );
    });

    test("boolean", () => {
      check(
        "between",
        "boolean",
        [false, true],
        [[false, true], [true, true], ...emptyCases(false)],
      );
    });

    test("anything but a pair of the column's kind matches nothing", () => {
      check("between", "number", [10], [[10, false]]);
      check("between", "number", [10, 20, 30], [[15, false]]);
      check("between", "number", [10, null], [[15, false]]);
      check("between", "number", 10, [[10, false]]);
      check("between", "number", [10, "20"], [[15, false]]);
    });
  });

  describe("in", () => {
    test("string: by grouping's key, so case matters", () => {
      check(
        "in",
        "string",
        ["West", "East"],
        [
          ["West", true],
          ["East", true],
          ["west", false],
          ["North", false],
          ...emptyCases(false),
        ],
      );
    });

    test("number: a number never matches its string", () => {
      check(
        "in",
        "number",
        [10, 20],
        [[10, true], [30, false], ["10", false], ...emptyCases(false)],
      );
    });

    test("date: by time, Dates and ISO strings alike", () => {
      check(
        "in",
        "date",
        [jan, mar.toISOString()],
        [
          [new Date(jan.getTime()), true],
          [jan.toISOString(), true],
          [mar, true],
          [feb, false],
          ...emptyCases(false),
        ],
      );
    });

    test("boolean", () => {
      check(
        "in",
        "boolean",
        [false],
        [[false, true], [true, false], ...emptyCases(false)],
      );
    });

    test("a blank in the list matches no blank cell; isEmpty is for those", () => {
      check("in", "string", [null, ""], emptyCases(false));
    });

    test("an empty list, or a single scalar, matches nothing", () => {
      check("in", "string", [], [["West", false]]);
      check("in", "string", "West", [["West", false]]);
    });
  });

  describe("isEmpty and isNotEmpty", () => {
    test.each<ColumnType>(["string", "number", "date", "boolean"])(
      "%s: null, undefined and an empty string are empty",
      (type) => {
        check("isEmpty", type, undefined, [
          ...emptyCases(true),
          [0, false],
          [false, false],
          [" ", false],
          [jan, false],
        ]);
        check("isNotEmpty", type, undefined, [
          ...emptyCases(false),
          [0, true],
          [false, true],
          [jan, true],
        ]);
      },
    );

    test("ignore any value they are given", () => {
      check("isEmpty", "string", "West", [
        [null, true],
        ["West", false],
      ]);
    });
  });
});
