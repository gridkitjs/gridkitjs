import { describe, expect, test } from "vitest";

import { toTsv } from "./tsv";
import type {
  ExportCell,
  ExportColumn,
  ExportScalar,
  ExportTable,
} from "./types";

function column(id: string): ExportColumn {
  return { id, header: id, type: "string", alignment: "left", width: 100 };
}

function cell(value: ExportScalar, text = String(value ?? "")): ExportCell {
  return { value, text };
}

function tableOf(
  ids: readonly string[],
  rows: readonly (readonly ExportCell[])[],
  header = true,
): ExportTable {
  return {
    columns: ids.map(column),
    header,
    rows: rows.map((cells) => ({ kind: "data", rowId: "r", cells })),
    footer: null,
  };
}

describe("toTsv", () => {
  test("separates fields with tabs and records with LF, with no BOM", () => {
    const table = tableOf(
      ["Name", "Amount"],
      [
        [cell("Ana"), cell(5)],
        [cell("Bo"), cell(7)],
      ],
    );

    expect(toTsv(table)).toBe("Name\tAmount\nAna\t5\nBo\t7");
  });

  test("turns a tab or line break inside a cell into a space", () => {
    const table = tableOf(["A"], [[cell("a\tb\nc\r\nd\re")]], false);

    expect(toTsv(table)).toBe("a b c d e");
  });

  test("neither quotes nor neutralises a field", () => {
    const table = tableOf(
      ["A", "B", "C"],
      [[cell("=SUM(A1)"), cell('say "hi"'), cell("a,b")]],
      false,
    );

    expect(toTsv(table)).toBe('=SUM(A1)\tsay "hi"\ta,b');
  });

  test("writes typed values plainly under values: raw", () => {
    const table = tableOf(
      ["Amount", "When"],
      [
        [
          cell(1234.5, "1,234.50"),
          cell(new Date(Date.UTC(2024, 2, 15)), "3/15/2024"),
        ],
      ],
      false,
    );

    expect(toTsv(table)).toBe("1,234.50\t3/15/2024");
    expect(toTsv(table, { values: "raw" })).toBe(
      "1234.5\t2024-03-15T00:00:00.000Z",
    );
  });

  test("writes a group's label in the first column and the footer last", () => {
    const table: ExportTable = {
      columns: [column("Region"), column("Amount")],
      header: false,
      rows: [
        {
          kind: "group",
          level: 0,
          groupId: "g",
          label: "Region: West",
          count: 1,
          cells: [cell(null), cell(100)],
        },
        { kind: "data", rowId: "1", cells: [cell("West"), cell(100)] },
      ],
      footer: { kind: "total", cells: [cell(null), cell(100)] },
    };

    expect(toTsv(table)).toBe("Region: West\t100\nWest\t100\n\t100");
  });
});
