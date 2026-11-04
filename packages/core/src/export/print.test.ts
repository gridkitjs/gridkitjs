import { describe, expect, test } from "vitest";

import { toHtmlTable } from "./htmlTable";
import { buildPrintDocument } from "./print";
import type { ExportColumn, ExportTable } from "./types";

function column(id: string): ExportColumn {
  return { id, header: id, type: "string", alignment: "left", width: 100 };
}

function tableOf(columnCount: number): ExportTable {
  const columns = Array.from({ length: columnCount }, (_, index) =>
    column(`C${String(index + 1)}`),
  );
  return {
    columns,
    header: true,
    rows: [
      {
        kind: "data",
        rowId: "r1",
        cells: columns.map(() => ({ value: "<b>", text: "<b>" })),
      },
    ],
    footer: null,
  };
}

const table = tableOf(3);

describe("buildPrintDocument", () => {
  test("is the table alone, untitled, on an A4 portrait page with page numbers", () => {
    expect(buildPrintDocument(table)).toEqual({
      title: "",
      bodyHtml: toHtmlTable(table),
      page: {
        paperSize: "A4",
        orientation: "portrait",
        pageNumbers: true,
        fitToWidth: false,
      },
    });
  });

  test("puts the title and subtitle in a header above the table", () => {
    const document = buildPrintDocument(table, {
      title: "Orders",
      subtitle: "Q1, West",
    });
    expect(document.title).toBe("Orders");
    expect(document.bodyHtml).toBe(
      '<header class="gridkit-print-header">' +
        '<h1 class="print-title">Orders</h1>' +
        '<p class="print-subtitle">Q1, West</p>' +
        `</header>${toHtmlTable(table)}`,
    );
  });

  test("puts the footer after the table", () => {
    const { bodyHtml } = buildPrintDocument(table, { footer: "Confidential" });
    expect(bodyHtml).toBe(
      `${toHtmlTable(table)}<footer class="gridkit-print-footer">Confidential</footer>`,
    );
  });

  test("leaves out a line set to empty text", () => {
    const { bodyHtml } = buildPrintDocument(table, {
      title: "",
      subtitle: "",
      footer: "",
    });
    expect(bodyHtml).toBe(toHtmlTable(table));
  });

  test("escapes the title, subtitle and footer, and the cells", () => {
    const { title, bodyHtml } = buildPrintDocument(table, {
      title: "<script>A & B</script>",
      subtitle: '"quoted"',
      footer: "it's <i>",
    });
    expect(title).toBe("<script>A & B</script>");
    expect(bodyHtml).toContain(
      '<h1 class="print-title">&lt;script&gt;A &amp; B&lt;/script&gt;</h1>',
    );
    expect(bodyHtml).toContain(
      '<p class="print-subtitle">&quot;quoted&quot;</p>',
    );
    expect(bodyHtml).toContain(
      '<footer class="gridkit-print-footer">it&#39;s &lt;i&gt;</footer>',
    );
    expect(bodyHtml).toContain("<td>&lt;b&gt;</td>");
    expect(bodyHtml).not.toContain("<script>");
    expect(bodyHtml).not.toContain("<i>");
  });

  describe("timestamp", () => {
    const date = new Date(2026, 2, 5, 14, 30);

    test("prints a given date in the locale, medium date and short time", () => {
      const { bodyHtml } = buildPrintDocument(table, {
        timestamp: date,
        locale: "en-US",
      });
      const text = new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
      expect(bodyHtml).toContain(
        `<header class="gridkit-print-header"><p class="print-timestamp">${text}</p></header>`,
      );
      expect(text).toContain("Mar 5, 2026");
    });

    test("writes the date in the locale it is given", () => {
      const { bodyHtml } = buildPrintDocument(table, {
        timestamp: date,
        locale: "de-DE",
      });
      expect(bodyHtml).toContain("05.03.2026");
    });

    test("prints now for true", () => {
      const before = new Date();
      const { bodyHtml } = buildPrintDocument(table, {
        timestamp: true,
        locale: "en-US",
      });
      const year = String(before.getFullYear());
      expect(bodyHtml).toMatch(
        new RegExp(`<p class="print-timestamp">[^<]*${year}[^<]*</p>`),
      );
    });

    test("prints nothing when false, as by default", () => {
      expect(
        buildPrintDocument(table, { timestamp: false }).bodyHtml,
      ).not.toContain("print-timestamp");
      expect(buildPrintDocument(table).bodyHtml).not.toContain(
        "print-timestamp",
      );
    });

    test("follows the title and subtitle", () => {
      const { bodyHtml } = buildPrintDocument(table, {
        title: "T",
        subtitle: "S",
        timestamp: date,
      });
      expect(bodyHtml.indexOf("print-subtitle")).toBeLessThan(
        bodyHtml.indexOf("print-timestamp"),
      );
      expect(bodyHtml.indexOf("print-title")).toBeLessThan(
        bodyHtml.indexOf("print-subtitle"),
      );
    });
  });

  describe("page", () => {
    test("turns a table of more than six columns to landscape", () => {
      expect(buildPrintDocument(tableOf(6)).page.orientation).toBe("portrait");
      expect(buildPrintDocument(tableOf(7)).page.orientation).toBe("landscape");
    });

    test("keeps the orientation asked for, whatever the width", () => {
      expect(
        buildPrintDocument(tableOf(7), { orientation: "portrait" }).page
          .orientation,
      ).toBe("portrait");
      expect(
        buildPrintDocument(tableOf(2), { orientation: "landscape" }).page
          .orientation,
      ).toBe("landscape");
    });

    test("takes the paper size, page numbers and fit to width", () => {
      expect(
        buildPrintDocument(table, {
          paperSize: "Letter",
          pageNumbers: false,
          fitToWidth: true,
        }).page,
      ).toEqual({
        paperSize: "Letter",
        orientation: "portrait",
        pageNumbers: false,
        fitToWidth: true,
      });
    });

    test("leaves the export options and the styles to the caller", () => {
      expect(
        buildPrintDocument(table, {
          scope: "page",
          columns: "all",
          styles: "td { color: red }",
        }),
      ).toEqual(buildPrintDocument(table));
    });
  });

  test("prints a table without rows or a header", () => {
    const empty: ExportTable = {
      columns: [column("A")],
      header: false,
      rows: [],
      footer: null,
    };
    expect(buildPrintDocument(empty).bodyHtml).toBe(
      '<table class="gridkit-export-table"><tbody></tbody></table>',
    );
  });
});
