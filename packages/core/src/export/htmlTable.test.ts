import { describe, expect, test } from "vitest";

import { toHtmlTable } from "./htmlTable";
import type {
  ExportCell,
  ExportColumn,
  ExportGroupRow,
  ExportScalar,
  ExportTable,
} from "./types";

function column(
  id: string,
  alignment: ExportColumn["alignment"] = "left",
): ExportColumn {
  return { id, header: id, type: "string", alignment, width: 100 };
}

function cell(value: ExportScalar, text = String(value ?? "")): ExportCell {
  return { value, text };
}

function group(cells: readonly ExportCell[]): ExportGroupRow {
  return {
    kind: "group",
    level: 1,
    groupId: "g",
    label: "Region: West",
    count: 2,
    cells,
  };
}

const columns = [
  column("Name"),
  column("Code", "center"),
  column("Amount", "right"),
];

function tableOf(overrides: Partial<ExportTable>): ExportTable {
  return { columns, header: true, rows: [], footer: null, ...overrides };
}

describe("toHtmlTable", () => {
  test("writes a head, a body and a foot with the semantic class names", () => {
    const table = tableOf({
      rows: [
        group([cell(null), cell(null), cell(null)]),
        {
          kind: "data",
          rowId: "1",
          cells: [cell("Ana"), cell("A"), cell(5)],
        },
        {
          kind: "groupSummary",
          level: 1,
          cells: [cell(null), cell(null), cell(5)],
        },
      ],
      footer: { kind: "total", cells: [cell(null), cell(null), cell(5)] },
    });

    expect(toHtmlTable(table)).toBe(
      '<table class="gridkit-export-table">' +
        '<thead><tr><th>Name</th><th style="text-align:center">Code</th><th style="text-align:right">Amount</th></tr></thead>' +
        "<tbody>" +
        '<tr class="export-group" data-level="1"><td colspan="3">Region: West</td></tr>' +
        '<tr><td>Ana</td><td style="text-align:center">A</td><td style="text-align:right">5</td></tr>' +
        '<tr class="export-group-summary" data-level="1"><td></td><td style="text-align:center"></td><td style="text-align:right">5</td></tr>' +
        "</tbody>" +
        '<tfoot><tr><td></td><td style="text-align:center"></td><td style="text-align:right">5</td></tr></tfoot>' +
        "</table>",
    );
  });

  test("escapes every piece of text", () => {
    const table: ExportTable = {
      columns: [{ ...column("A"), header: "<b>A & B</b>" }],
      header: true,
      rows: [
        {
          kind: "data",
          rowId: "1",
          cells: [cell(`<script>alert("x" & 'y')</script>`)],
        },
        { ...group([cell(null)]), label: "Tom & <Jerry>" },
      ],
      footer: null,
    };

    const html = toHtmlTable(table, { caption: `"Q1" <sales>` });

    expect(html).toContain("<caption>&quot;Q1&quot; &lt;sales&gt;</caption>");
    expect(html).toContain("<th>&lt;b&gt;A &amp; B&lt;/b&gt;</th>");
    expect(html).toContain(
      "<td>&lt;script&gt;alert(&quot;x&quot; &amp; &#39;y&#39;)&lt;/script&gt;</td>",
    );
    expect(html).toContain("<td>Tom &amp; &lt;Jerry&gt;</td>");
    expect(html).not.toContain("<script>");
  });

  test("spans a group label up to its first inline aggregate", () => {
    const table = tableOf({
      header: false,
      rows: [group([cell(null), cell(null), cell(10)])],
    });

    expect(toHtmlTable(table)).toContain(
      '<tr class="export-group" data-level="1"><td colspan="2">Region: West</td><td style="text-align:right">10</td></tr>',
    );
  });

  test("gives a first-column aggregate's cell to the group label", () => {
    const table = tableOf({
      header: false,
      rows: [group([cell(2), cell(null), cell(10)])],
    });

    expect(toHtmlTable(table)).toContain(
      '<tr class="export-group" data-level="1"><td>Region: West</td><td style="text-align:center"></td><td style="text-align:right">10</td></tr>',
    );
  });

  test("leaves out the head without a header and the foot without a total", () => {
    expect(toHtmlTable(tableOf({ header: false }))).toBe(
      '<table class="gridkit-export-table"><tbody></tbody></table>',
    );
  });
});
