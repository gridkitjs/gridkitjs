import type { ColumnType, ExportColumn } from "@gridkitjs/core";
import { describe, expect, test } from "vitest";

import { dateFormatCode, numberFormatCode } from "./formats";

function column(
  type: ColumnType,
  format?: Intl.NumberFormatOptions | Intl.DateTimeFormatOptions,
): ExportColumn {
  return {
    id: "c",
    header: "C",
    type,
    format,
    alignment: "right",
    width: 100,
  };
}

const NBSP = String.fromCharCode(160);

describe("numberFormatCode", () => {
  test("leaves a number column without digits in General", () => {
    expect(numberFormatCode(column("number"), "en-US")).toBeUndefined();
    expect(numberFormatCode(column("decimal"), "en-US")).toBeUndefined();
  });

  test("fixes the decimals a number column names", () => {
    expect(
      numberFormatCode(column("number", { maximumFractionDigits: 0 }), "en"),
    ).toBe("#,##0");
    expect(
      numberFormatCode(column("decimal", { maximumFractionDigits: 2 }), "en"),
    ).toBe("#,##0.00");
    expect(
      numberFormatCode(column("decimal", { minimumFractionDigits: 3 }), "en"),
    ).toBe("#,##0.000");
    expect(
      numberFormatCode(
        column("number", { maximumFractionDigits: 1, useGrouping: false }),
        "en",
      ),
    ).toBe("0.0");
  });

  test("writes a percent with the digits it names", () => {
    expect(numberFormatCode(column("percent"), "en")).toBe("0%");
    expect(
      numberFormatCode(column("percent", { maximumFractionDigits: 2 }), "en"),
    ).toBe("0.00%");
    expect(numberFormatCode(column("number", { style: "percent" }), "en")).toBe(
      "0%",
    );
  });

  test("writes a currency's symbol where the locale puts it", () => {
    expect(
      numberFormatCode(column("currency", { currency: "USD" }), "en-US"),
    ).toBe('"$"#,##0.00');
    expect(
      numberFormatCode(column("currency", { currency: "EUR" }), "de-DE"),
    ).toBe(`#,##0.00"${NBSP}""€"`);
    expect(
      numberFormatCode(column("currency", { currency: "MKD" }), "mk-MK"),
    ).toBe(`#,##0.00"${NBSP}""ден."`);
  });

  test("takes a currency's own digits unless the format names some", () => {
    expect(
      numberFormatCode(column("currency", { currency: "JPY" }), "en-US"),
    ).toBe('"¥"#,##0');
    expect(
      numberFormatCode(
        column("currency", { currency: "USD", maximumFractionDigits: 0 }),
        "en-US",
      ),
    ).toBe('"$"#,##0');
  });

  test("gives a currency without a symbol two decimals", () => {
    expect(numberFormatCode(column("currency"), "en")).toBe("#,##0.00");
  });

  test("falls back to General for what no code reads as", () => {
    expect(
      numberFormatCode(column("number", { notation: "compact" }), "en"),
    ).toBeUndefined();
    expect(
      numberFormatCode(
        column("number", { style: "unit", unit: "meter" }),
        "en",
      ),
    ).toBeUndefined();
    expect(numberFormatCode(column("string"), "en")).toBeUndefined();
    expect(numberFormatCode(column("date"), "en")).toBeUndefined();
  });
});

describe("dateFormatCode", () => {
  test("writes the date alone for a date column", () => {
    expect(dateFormatCode(column("date"))).toBe("yyyy-mm-dd");
  });

  test("writes seconds where the grid prints them", () => {
    expect(dateFormatCode(column("time"))).toBe("hh:mm:ss");
    expect(dateFormatCode(column("dateTime"))).toBe("yyyy-mm-dd hh:mm:ss");
    expect(
      dateFormatCode(column("time", { hour: "2-digit", minute: "2-digit" })),
    ).toBe("hh:mm");
    expect(dateFormatCode(column("dateTime", { timeStyle: "short" }))).toBe(
      "yyyy-mm-dd hh:mm",
    );
    expect(dateFormatCode(column("dateTime", { timeStyle: "medium" }))).toBe(
      "yyyy-mm-dd hh:mm:ss",
    );
  });

  test("writes date and time for a date in any other column", () => {
    expect(dateFormatCode(column("string"))).toBe("yyyy-mm-dd hh:mm:ss");
  });
});
