import { describe, expect, test } from "vitest";

import type { ColumnDefinition, ColumnType } from "../types";
import { formatAggregateValue, formatCellValue } from "./format";

interface SampleRow {
  Name: string;
  Amount: number;
}

/** 15 March 2024, 13:05:09 local time — local, so every assertion holds in any time zone. */
const march15 = new Date(2024, 2, 15, 13, 5, 9);

function column(
  type: ColumnType | undefined,
  extra: Partial<ColumnDefinition<SampleRow>> = {},
): ColumnDefinition<SampleRow> {
  return type === undefined
    ? { field: "Amount", ...extra }
    : { field: "Amount", type, ...extra };
}

describe("formatCellValue", () => {
  test.each<ColumnType | undefined>([
    undefined,
    "string",
    "number",
    "currency",
    "date",
    "boolean",
  ])("renders null and undefined as empty text under type %s", (type) => {
    expect(formatCellValue(null, column(type))).toBe("");
    expect(formatCellValue(undefined, column(type))).toBe("");
  });

  test("passes a string through untouched", () => {
    expect(formatCellValue("West", column("string"))).toBe("West");
    expect(formatCellValue("12.5", column("number"))).toBe("12.5");
  });

  test("prints a number under a non-numeric type as-is", () => {
    expect(formatCellValue(1234.5678, column(undefined))).toBe("1234.5678");
    expect(formatCellValue(1001, column("string"))).toBe("1001");
  });

  test("formats number and decimal through Intl.NumberFormat", () => {
    expect(formatCellValue(1234.5, column("number"), "en-US")).toBe("1,234.5");
    expect(formatCellValue(1234.5, column("decimal"), "en-US")).toBe("1,234.5");
    expect(formatCellValue(10n, column("number"), "en-US")).toBe("10");
  });

  test("honours the column's number format", () => {
    expect(
      formatCellValue(
        1234.5,
        column("number", { format: { maximumFractionDigits: 0 } }),
        "en-US",
      ),
    ).toBe("1,235");
  });

  test("formats for a fixed locale", () => {
    expect(formatCellValue(1234.5, column("number"), "de-DE")).toBe("1.234,5");
    expect(formatCellValue(1234.5, column("number"), ["de-DE", "en-US"])).toBe(
      "1.234,5",
    );
  });

  test("shows a currency symbol once format.currency names one", () => {
    expect(
      formatCellValue(
        1234.5,
        column("currency", { format: { currency: "USD" } }),
        "en-US",
      ),
    ).toBe("$1,234.50");
    expect(
      formatCellValue(
        1234.5,
        column("currency", {
          format: { currency: "EUR", maximumFractionDigits: 0 },
        }),
        "en-US",
      ),
    ).toBe("€1,235");
  });

  test("falls back to two fraction digits for a currency with no format.currency", () => {
    expect(formatCellValue(1234.5, column("currency"), "en-US")).toBe(
      "1,234.50",
    );
    expect(formatCellValue(3, column("currency"), "en-US")).toBe("3.00");
  });

  test("reads a percent as a fraction, as Intl does", () => {
    expect(formatCellValue(0.25, column("percent"), "en-US")).toBe("25%");
    expect(
      formatCellValue(
        0.125,
        column("percent", { format: { maximumFractionDigits: 1 } }),
        "en-US",
      ),
    ).toBe("12.5%");
  });

  test("prints only the date of a Date under date", () => {
    expect(formatCellValue(march15, column("date"), "en-US")).toBe("3/15/2024");
    expect(formatCellValue(march15, column("date"), "en-GB")).toBe(
      "15/03/2024",
    );
  });

  test("prints only the time of a Date under time", () => {
    expect(formatCellValue(march15, column("time"), "en-GB")).toBe("13:05:09");
  });

  test("prints date and time of a Date under dateTime, or with no type", () => {
    expect(formatCellValue(march15, column("dateTime"), "en-GB")).toBe(
      "15/03/2024, 13:05:09",
    );
    expect(formatCellValue(march15, column(undefined), "en-GB")).toBe(
      "15/03/2024, 13:05:09",
    );
  });

  test("matches Date.prototype.toLocaleString with no format or locale", () => {
    expect(formatCellValue(march15, column("dateTime"))).toBe(
      march15.toLocaleString(),
    );
    expect(formatCellValue(march15, column("date"))).toBe(
      march15.toLocaleDateString(),
    );
    expect(formatCellValue(march15, column("time"))).toBe(
      march15.toLocaleTimeString(),
    );
  });

  test("lets a date format replace the type's fields", () => {
    expect(
      formatCellValue(
        march15,
        column("date", { format: { dateStyle: "long" } }),
        "en-US",
      ),
    ).toBe("March 15, 2024");
  });

  test("prints an invalid Date rather than throwing", () => {
    expect(formatCellValue(new Date(Number.NaN), column("date"))).toBe(
      "Invalid Date",
    );
  });

  test("prints a boolean as true or false", () => {
    expect(formatCellValue(true, column("boolean"))).toBe("true");
    expect(formatCellValue(false, column(undefined))).toBe("false");
  });

  test("writes a plain object or array as JSON", () => {
    expect(formatCellValue({ tag: "x" }, column(undefined))).toBe(
      '{"tag":"x"}',
    );
    expect(formatCellValue([1, 2], column(undefined))).toBe("[1,2]");
  });

  test("gives valueFormatter precedence over format and type", () => {
    const formatted = column("currency", {
      format: { currency: "USD" },
      valueFormatter: (value, row) =>
        `${String(value)} for ${row?.Name ?? "nobody"}`,
    });

    expect(
      formatCellValue(5, formatted, "en-US", { Name: "Ada", Amount: 5 }),
    ).toBe("5 for Ada");
    expect(formatCellValue(null, formatted)).toBe("null for nobody");
  });

  test("reuses one formatter per type, locale and format", () => {
    const format = { maximumFractionDigits: 1 };
    const first = formatCellValue(1.25, column("number", { format }), "en-US");
    const second = formatCellValue(2.75, column("number", { format }), "de-DE");

    expect([first, second]).toEqual(["1.3", "2,8"]);
    expect(formatCellValue(1.25, column("number", { format }), "en-US")).toBe(
      "1.3",
    );
  });
});

describe("formatAggregateValue", () => {
  const currency = column("currency", { format: { currency: "USD" } });

  test("formats a sum like one of the column's own values", () => {
    expect(
      formatAggregateValue(
        1234.5,
        { columnId: "Amount", fn: "sum" },
        currency,
        "en-US",
      ),
    ).toBe("$1,234.50");
  });

  test("formats a count as a plain number whatever the column's type", () => {
    expect(
      formatAggregateValue(
        1234,
        { columnId: "Amount", fn: "count" },
        currency,
        "en-US",
      ),
    ).toBe("1,234");
    expect(
      formatAggregateValue(
        3,
        { columnId: "Amount", fn: "countDistinct" },
        column("date"),
        "en-US",
      ),
    ).toBe("3");
  });

  test("formats a number reduced from an untyped column as a number", () => {
    expect(
      formatAggregateValue(
        1234.5,
        { columnId: "Amount", fn: "sum" },
        column(undefined),
        "en-US",
      ),
    ).toBe("1,234.5");
  });

  test("lets the column's valueFormatter claim a non-count result", () => {
    const formatted = column(undefined, {
      valueFormatter: (value) => `~${String(value)}`,
    });

    expect(
      formatAggregateValue(7, { columnId: "Amount", fn: "max" }, formatted),
    ).toBe("~7");
    expect(
      formatAggregateValue(7, { columnId: "Amount", fn: "count" }, formatted),
    ).toBe("7");
  });

  test("formats a Date result by the column's type", () => {
    expect(
      formatAggregateValue(
        march15,
        { columnId: "Amount", fn: "max" },
        column("date"),
        "en-GB",
      ),
    ).toBe("15/03/2024");
  });

  test("formats by value alone for a column the grid does not have", () => {
    expect(
      formatAggregateValue(
        1234,
        { columnId: "Missing", fn: "sum" },
        undefined,
        "en-US",
      ),
    ).toBe("1,234");
  });
});
