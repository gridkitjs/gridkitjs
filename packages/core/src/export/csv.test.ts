import { describe, expect, test } from "vitest";

import { createGridController } from "../controller/createGridController";
import { defaultMessages } from "../messages";
import { buildExportTable } from "./buildExportTable";
import { toCsv } from "./csv";
import type {
  ExportCell,
  ExportColumn,
  ExportRow,
  ExportScalar,
  ExportTable,
} from "./types";

function column(id: string): ExportColumn {
  return { id, header: id, type: "string", alignment: "left", width: 100 };
}

function cell(value: ExportScalar, text = String(value ?? "")): ExportCell {
  return { value, text };
}

function dataRow(...cells: ExportCell[]): ExportRow {
  return { kind: "data", rowId: "r", cells };
}

/** A table of one column per id and the given body rows. */
function tableOf(
  ids: readonly string[],
  rows: readonly ExportRow[],
  overrides: Partial<ExportTable> = {},
): ExportTable {
  return {
    columns: ids.map(column),
    header: true,
    rows,
    footer: null,
    ...overrides,
  };
}

/** CSV without the byte order mark, its records split apart. */
function linesOf(table: ExportTable, options = {}): string[] {
  return toCsv(table, { bom: false, ...options }).split("\r\n");
}

describe("toCsv", () => {
  test("writes a header row and a record per row, ending lines with CRLF", () => {
    const table = tableOf(
      ["Name", "Amount"],
      [dataRow(cell("Ana"), cell(5)), dataRow(cell("Bo"), cell(7))],
    );

    expect(toCsv(table, { bom: false })).toBe("Name,Amount\r\nAna,5\r\nBo,7");
  });

  test("starts with a UTF-8 byte order mark unless told not to", () => {
    const table = tableOf(["Name"], [dataRow(cell("Ćirilica"))]);

    expect(toCsv(table)).toBe("﻿Name\r\nĆirilica");
    expect(toCsv(table, { bom: false })).toBe("Name\r\nĆirilica");
  });

  test("leaves the header out when the table has none", () => {
    const table = tableOf(["Name"], [dataRow(cell("Ana"))], { header: false });

    expect(linesOf(table)).toEqual(["Ana"]);
  });

  test("quotes a field holding the delimiter, a quote or a line break", () => {
    const table = tableOf(
      ["A", "B", "C", "D"],
      [
        dataRow(
          cell("Smith, Ana"),
          cell('say "hi"'),
          cell("line one\nline two"),
          cell("plain"),
        ),
      ],
      { header: false },
    );

    expect(toCsv(table, { bom: false })).toBe(
      '"Smith, Ana","say ""hi""","line one\nline two",plain',
    );
  });

  test("quotes a carriage return inside a cell too", () => {
    const table = tableOf(["A"], [dataRow(cell("a\r\nb"))], { header: false });

    expect(toCsv(table, { bom: false })).toBe('"a\r\nb"');
  });

  test("takes another delimiter and line ending", () => {
    const table = tableOf(["A", "B"], [dataRow(cell("1;2"), cell("3,4"))]);

    expect(toCsv(table, { bom: false, delimiter: ";", eol: "\n" })).toBe(
      'A;B\n"1;2";3,4',
    );
  });

  test.each([
    ["mk", ";"],
    ["hr", ";"],
    ["de-DE", ";"],
    ["en", ","],
    ["en-US", ","],
  ])("picks the delimiter for %s under delimiter: auto", (locale, expected) => {
    const table = tableOf(["A", "B"], []);

    expect(toCsv(table, { bom: false, delimiter: "auto", locale })).toBe(
      `A${expected}B`,
    );
  });

  describe("formula neutralising", () => {
    test.each(["=SUM(A1)", "+1+1", "-1+cmd", "@SUM(A1)", "\tx", "\rx"])(
      "prefixes %j with an apostrophe",
      (text) => {
        const table = tableOf(["A"], [dataRow(cell(text))], {
          header: false,
        });

        expect(linesOf(table)[0]?.replace(/^"/, "")).toMatch(/^'/);
      },
    );

    test("quotes a neutralised field that starts with a carriage return", () => {
      const table = tableOf(["A"], [dataRow(cell("\r=1"))], { header: false });

      expect(toCsv(table, { bom: false })).toBe('"\'\r=1"');
    });

    test("keeps the sign of a cell whose value is a number", () => {
      const table = tableOf(
        ["A", "B", "C"],
        [dataRow(cell(-5), cell(-1234.5, "-1,234.50 €"), cell(5, "+5"))],
        { header: false },
      );

      expect(linesOf(table)).toEqual(['-5,"-1,234.50 €",+5']);
    });

    test("still neutralises a formula on a numeric cell's text", () => {
      const table = tableOf(["A"], [dataRow(cell(1, "=1+1"))], {
        header: false,
      });

      expect(linesOf(table)).toEqual(["'=1+1"]);
    });

    test("neutralises the header and group labels too", () => {
      const table: ExportTable = {
        columns: [{ ...column("A"), header: "=A" }],
        header: true,
        rows: [
          {
            kind: "group",
            level: 0,
            groupId: "g",
            label: "@group",
            count: 0,
            cells: [cell(null)],
          },
        ],
        footer: null,
      };

      expect(linesOf(table)).toEqual(["'=A", "'@group"]);
    });

    test("writes every field as it is when turned off", () => {
      const table = tableOf(["A"], [dataRow(cell("=1+1"))], { header: false });

      expect(linesOf(table, { neutralizeFormulas: false })).toEqual(["=1+1"]);
    });
  });

  describe("values", () => {
    const when = new Date(Date.UTC(2024, 2, 15, 9, 30));
    const table = tableOf(
      ["Amount", "When", "Paid", "Name", "Empty"],
      [
        dataRow(
          cell(1234.5, "1.234,50"),
          cell(when, "15. 3. 2024."),
          cell(true, "Yes"),
          cell("Ana"),
          cell(null),
        ),
      ],
      { header: false },
    );

    test("writes each cell's text by default", () => {
      expect(linesOf(table)).toEqual(['"1.234,50",15. 3. 2024.,Yes,Ana,']);
    });

    test("writes typed values plainly under values: raw", () => {
      expect(linesOf(table, { values: "raw" })).toEqual([
        "1234.5,2024-03-15T09:30:00.000Z,true,Ana,",
      ]);
    });

    test("writes an invalid date empty under values: raw", () => {
      const invalid = tableOf(["When"], [dataRow(cell(new Date(NaN), ""))], {
        header: false,
      });

      expect(linesOf(invalid, { values: "raw" })).toEqual([""]);
    });
  });

  describe("groups and totals", () => {
    interface Sale {
      Id: number;
      Region: string;
      Amount: number;
    }

    function exportOf(groupAggregateDisplay: "inline" | "row"): ExportTable {
      const controller = createGridController<Sale>({
        dataSource: [
          { Id: 1, Region: "West", Amount: 100 },
          { Id: 2, Region: "East", Amount: -250 },
          { Id: 3, Region: "West", Amount: 50 },
        ],
        getRowId: (row) => String(row.Id),
        columns: [
          { field: "Region" },
          { field: "Id", type: "number" },
          { field: "Amount", type: "number" },
        ],
        defaultGroupBy: [{ columnId: "Region" }],
        aggregates: [{ columnId: "Amount", fn: "sum" }],
        groupAggregateDisplay,
      });
      return buildExportTable({
        view: controller.getView(),
        state: controller.getState(),
        options: controller.getOptions(),
        messages: defaultMessages,
      });
    }

    test("writes a group's label in the first column and inline aggregates under theirs", () => {
      expect(linesOf(exportOf("inline"))).toEqual([
        "Region,Id,Amount",
        "Region: East,,-250",
        "East,2,-250",
        "Region: West,,150",
        "West,1,100",
        "West,3,50",
        ",,-100",
      ]);
    });

    test("writes summary rows and the footer under their columns", () => {
      expect(linesOf(exportOf("row"))).toEqual([
        "Region,Id,Amount",
        "Region: East,,",
        "East,2,-250",
        ",,-250",
        "Region: West,,",
        "West,1,100",
        "West,3,50",
        ",,150",
        ",,-100",
      ]);
    });
  });

  test("writes an empty table as its header alone", () => {
    expect(toCsv(tableOf(["A", "B"], []), { bom: false })).toBe("A,B");
    expect(toCsv(tableOf([], [], { header: false }), { bom: false })).toBe("");
  });
});
