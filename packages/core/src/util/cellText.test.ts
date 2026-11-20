import { describe, expect, test } from "vitest";

import type { ColumnType } from "../types";
import {
  cellDate,
  formatCellEditText,
  parseCellText,
  sameCellValue,
} from "./cellText";

function valueOf(text: string, type: ColumnType | undefined): unknown {
  const parsed = parseCellText(text, type);
  return parsed.kind === "value" ? parsed.value : parsed;
}

describe("parseCellText", () => {
  test.each([undefined, "string"] as const)(
    "keeps text as typed on a %s column, an empty one included",
    (type) => {
      expect(valueOf("  West  ", type)).toBe("  West  ");
      expect(valueOf("12abc", type)).toBe("12abc");
      expect(valueOf("", type)).toBe("");
    },
  );

  test.each(["number", "decimal", "currency", "percent"] as const)(
    "reads a %s column's text as a point-decimal number",
    (type) => {
      expect(valueOf("12", type)).toBe(12);
      expect(valueOf(" -1.5 ", type)).toBe(-1.5);
      expect(valueOf("0.25", type)).toBe(0.25);
      expect(valueOf("1e3", type)).toBe(1000);
    },
  );

  test.each(["number", "decimal", "currency", "percent"] as const)(
    "reads a %s column's empty text as blank and anything else as unreadable",
    (type) => {
      expect(valueOf("", type)).toBeNull();
      expect(valueOf("   ", type)).toBeNull();
      expect(parseCellText("12abc", type)).toEqual({ kind: "unreadable" });
      expect(parseCellText("1,5", type)).toEqual({ kind: "unreadable" });
      expect(parseCellText("Infinity", type)).toEqual({ kind: "unreadable" });
    },
  );

  test("reads a date column's yyyy-mm-dd as that local day", () => {
    expect(valueOf("2024-03-01", "date")).toEqual(new Date(2024, 2, 1));
    expect(valueOf("", "date")).toBeNull();
  });

  test.each(["dateTime", "time"] as const)(
    "reads a %s column's yyyy-mm-ddThh:mm as that local moment",
    (type) => {
      expect(valueOf("2024-03-01T09:30", type)).toEqual(
        new Date(2024, 2, 1, 9, 30),
      );
      expect(valueOf("2024-03-01T09:30:15", type)).toEqual(
        new Date(2024, 2, 1, 9, 30, 15),
      );
      expect(valueOf("", type)).toBeNull();
    },
  );

  test.each(["date", "dateTime", "time"] as const)(
    "reads text naming no date on a %s column as unreadable",
    (type) => {
      expect(parseCellText("2024-02-30", type)).toEqual({ kind: "unreadable" });
      expect(parseCellText("tomorrow", type)).toEqual({ kind: "unreadable" });
      expect(parseCellText("2024-03-01T25:00", type)).toEqual({
        kind: "unreadable",
      });
    },
  );

  test("reads a boolean column's true and false, and empty as blank", () => {
    expect(valueOf("true", "boolean")).toBe(true);
    expect(valueOf("false", "boolean")).toBe(false);
    expect(valueOf("", "boolean")).toBeNull();
    expect(parseCellText("yes", "boolean")).toEqual({ kind: "unreadable" });
  });
});

describe("formatCellEditText", () => {
  test("shows a blank value as empty text on every column", () => {
    for (const value of [null, undefined, ""]) {
      expect(formatCellEditText(value, undefined)).toBe("");
      expect(formatCellEditText(value, "number")).toBe("");
      expect(formatCellEditText(value, "date")).toBe("");
    }
  });

  test("shows text, numbers and booleans as String does", () => {
    expect(formatCellEditText("West", "string")).toBe("West");
    expect(formatCellEditText(12.5, "currency")).toBe("12.5");
    expect(formatCellEditText(0.25, "percent")).toBe("0.25");
    expect(formatCellEditText(true, "boolean")).toBe("true");
  });

  test("shows a date as its column's input takes it", () => {
    const moment = new Date(2024, 2, 1, 9, 30);
    expect(formatCellEditText(moment, "date")).toBe("2024-03-01");
    expect(formatCellEditText(moment, "dateTime")).toBe("2024-03-01T09:30");
    expect(formatCellEditText(moment, "time")).toBe("2024-03-01T09:30");
  });

  test("shows a yyyy-mm-dd string as that day, wherever the runtime is", () => {
    expect(formatCellEditText("2024-03-01", "date")).toBe("2024-03-01");
    expect(formatCellEditText("2024-03-01", "dateTime")).toBe(
      "2024-03-01T00:00",
    );
  });

  test("shows a value naming no date on a date column as it is", () => {
    expect(formatCellEditText("soon", "date")).toBe("soon");
  });

  test("reads back through parseCellText to the same value", () => {
    const cases: readonly [unknown, ColumnType | undefined][] = [
      ["West", undefined],
      [42, "number"],
      [0.25, "percent"],
      [false, "boolean"],
      [new Date(2024, 2, 1), "date"],
      [new Date(2024, 2, 1, 9, 30, 15), "dateTime"],
    ];
    for (const [value, type] of cases) {
      expect(valueOf(formatCellEditText(value, type), type)).toEqual(value);
    }
  });
});

describe("cellDate", () => {
  test("reads a yyyy-mm-dd string as the local day", () => {
    expect(cellDate("2024-03-01")).toEqual(new Date(2024, 2, 1));
  });

  test("reads a Date and any other date string as Date does", () => {
    const date = new Date(2024, 2, 1, 9);
    expect(cellDate(date)).toBe(date);
    expect(cellDate("2024-03-01T09:00:00Z")).toEqual(
      new Date("2024-03-01T09:00:00Z"),
    );
  });

  test("reads anything else as no date", () => {
    expect(cellDate("soon")).toBeUndefined();
    expect(cellDate(12)).toBeUndefined();
    expect(cellDate(new Date(Number.NaN))).toBeUndefined();
  });
});

describe("sameCellValue", () => {
  test("treats every blank as the same value", () => {
    expect(sameCellValue(null, "", undefined)).toBe(true);
    expect(sameCellValue(undefined, null, "number")).toBe(true);
  });

  test("compares dates by instant on a date column", () => {
    expect(
      sameCellValue(new Date(2024, 2, 1), new Date(2024, 2, 1), "date"),
    ).toBe(true);
    expect(sameCellValue("2024-03-01", new Date(2024, 2, 1), "date")).toBe(
      true,
    );
    expect(
      sameCellValue(new Date(2024, 2, 1), new Date(2024, 2, 2), "date"),
    ).toBe(false);
  });

  test("compares anything else by Object.is", () => {
    expect(sameCellValue(1, 1, "number")).toBe(true);
    expect(sameCellValue(Number.NaN, Number.NaN, "number")).toBe(true);
    expect(sameCellValue(1, "1", "number")).toBe(false);
    expect(sameCellValue("West", "west", undefined)).toBe(false);
    expect(sameCellValue(null, 0, "number")).toBe(false);
    // A date is not compared by instant off a date column.
    expect(
      sameCellValue(new Date(2024, 2, 1), new Date(2024, 2, 1), undefined),
    ).toBe(false);
  });
});
