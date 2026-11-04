import { describe, expect, test } from "vitest";

import { toJson } from "./json";
import type {
  ExportCell,
  ExportColumn,
  ExportScalar,
  ExportTable,
} from "./types";

function column(id: string, header = id): ExportColumn {
  return { id, header, type: "string", alignment: "left", width: 100 };
}

function cell(value: ExportScalar, text = String(value ?? "")): ExportCell {
  return { value, text };
}

const when = new Date(Date.UTC(2024, 2, 15, 9, 30));

const table: ExportTable = {
  columns: [
    column("Name"),
    column("Amount"),
    column("Shipped"),
    column("Paid"),
    column("Notes"),
  ],
  header: true,
  rows: [
    {
      kind: "group",
      level: 0,
      groupId: "g",
      label: "Region: West",
      count: 2,
      cells: [cell(null), cell(1300), cell(null), cell(null), cell(null)],
    },
    {
      kind: "data",
      rowId: "1",
      cells: [
        cell("Ana"),
        cell(1234.5, "1.234,50"),
        cell(when, "15. 3. 2024."),
        cell(true, "Yes"),
        cell(null),
      ],
    },
    {
      kind: "data",
      rowId: "2",
      cells: [
        cell("Bo"),
        cell(65.5),
        cell(null),
        cell(false, "No"),
        cell('say "hi"'),
      ],
    },
    {
      kind: "groupSummary",
      level: 0,
      cells: [cell(null), cell(1300), cell(null), cell(null), cell(null)],
    },
  ],
  footer: {
    kind: "total",
    cells: [cell(null), cell(1300), cell(null), cell(null), cell(null)],
  },
};

describe("toJson", () => {
  test("writes the data rows alone, keyed by column id, with typed values", () => {
    expect(JSON.parse(toJson(table))).toEqual([
      {
        Name: "Ana",
        Amount: 1234.5,
        Shipped: "2024-03-15T09:30:00.000Z",
        Paid: true,
        Notes: null,
      },
      {
        Name: "Bo",
        Amount: 65.5,
        Shipped: null,
        Paid: false,
        Notes: 'say "hi"',
      },
    ]);
  });

  test("indents by space", () => {
    const one: ExportTable = { ...table, rows: table.rows.slice(1, 2) };

    expect(toJson(one, { space: 2 })).toBe(
      [
        "[",
        "  {",
        '    "Name": "Ana",',
        '    "Amount": 1234.5,',
        '    "Shipped": "2024-03-15T09:30:00.000Z",',
        '    "Paid": true,',
        '    "Notes": null',
        "  }",
        "]",
      ].join("\n"),
    );
  });

  test("keys by header text under keys: header, suffixing repeats", () => {
    const repeated: ExportTable = {
      columns: [
        column("a", "Total"),
        column("b", "Total"),
        column("c", "Total (2)"),
        column("d", "Name"),
      ],
      header: true,
      rows: [
        {
          kind: "data",
          rowId: "1",
          cells: [cell(1), cell(2), cell(3), cell("Ana")],
        },
      ],
      footer: null,
    };

    expect(JSON.parse(toJson(repeated, { keys: "header" }))).toEqual([
      { Total: 1, "Total (2)": 2, "Total (2) (2)": 3, Name: "Ana" },
    ]);
  });

  test("writes an invalid date as null", () => {
    const invalid: ExportTable = {
      columns: [column("When")],
      header: true,
      rows: [{ kind: "data", rowId: "1", cells: [cell(new Date(NaN), "")] }],
      footer: null,
    };

    expect(toJson(invalid)).toBe('[{"When":null}]');
  });

  test("writes an empty table as an empty array", () => {
    expect(toJson({ columns: [], header: true, rows: [], footer: null })).toBe(
      "[]",
    );
  });
});
