import {
  createGridController,
  defaultMessages,
  type ExportFileSource,
  exportFile,
  type GridOptions,
  resolveExportWriters,
} from "@gridkitjs/core";
import { strFromU8, unzipSync } from "fflate";
import { describe, expect, test } from "vitest";

import { resolveSheetName, xlsxWriter } from "./xlsxWriter";

interface Order {
  Id: number;
  City: string;
  Region: string;
  Amount: number;
  Placed: Date;
}

const orders: Order[] = [
  {
    Id: 1,
    City: "Скопје",
    Region: "Македонија",
    Amount: 1250.5,
    Placed: new Date(2026, 10, 4),
  },
  {
    Id: 2,
    City: "Čakovec",
    Region: "Hrvatska",
    Amount: 80,
    Placed: new Date(2026, 9, 1),
  },
  {
    Id: 3,
    City: "Đakovo & Žminj",
    Region: "Hrvatska",
    Amount: 19.99,
    Placed: new Date(2026, 0, 15),
  },
];

function source(options: GridOptions<Order> = {}): ExportFileSource<Order> {
  const controller = createGridController<Order>({
    dataSource: orders,
    getRowId: (row) => String(row.Id),
    columns: [
      { field: "Id", type: "number" },
      { field: "City" },
      { field: "Region" },
      {
        field: "Amount",
        type: "currency",
        format: { currency: "EUR" },
        width: 140,
      },
      { field: "Placed", type: "date" },
    ],
    locale: "en-US",
    ...options,
  });
  return {
    view: controller.getView(),
    state: controller.getState(),
    options: controller.getOptions(),
    messages: defaultMessages,
  };
}

/** Exports `source` through `writer` and unzips the file's parts as text. */
async function exportParts(
  exportSource: ExportFileSource<Order>,
  writer = xlsxWriter(),
): Promise<{
  fileName: string;
  mimeType: string;
  parts: Record<string, string>;
}> {
  const file = await exportFile(
    exportSource,
    writer,
    { fileName: "orders" },
    resolveExportWriters([writer]),
  );
  if (file === null || typeof file.content === "string") {
    throw new Error("expected the workbook's bytes");
  }
  const parts = Object.fromEntries(
    Object.entries(unzipSync(file.content)).map(([path, bytes]) => [
      path,
      strFromU8(bytes),
    ]),
  );
  return { fileName: file.fileName, mimeType: file.mimeType, parts };
}

describe("xlsxWriter", () => {
  test("describes an xlsx file", () => {
    const writer = xlsxWriter();
    expect(writer.format).toBe("xlsx");
    expect(writer.fileExtension).toBe("xlsx");
    expect(writer.mimeType).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
  });

  test("zips every part a workbook needs, content types first", async () => {
    const { fileName, parts } = await exportParts(source());
    expect(fileName).toBe("orders.xlsx");
    expect(Object.keys(parts)).toEqual([
      "[Content_Types].xml",
      "_rels/.rels",
      "xl/workbook.xml",
      "xl/_rels/workbook.xml.rels",
      "xl/worksheets/sheet1.xml",
      "xl/styles.xml",
    ]);
    expect(parts["[Content_Types].xml"]).toContain(
      '<Override PartName="/xl/worksheets/sheet1.xml"',
    );
  });

  test("starts with a zip's signature", async () => {
    const writer = xlsxWriter();
    const content = await writer.write(
      { columns: [], header: false, rows: [], footer: null },
      { locale: undefined, messages: defaultMessages, options: {} },
    );
    // "PK", the local file header every zip begins with.
    expect(content).toBeInstanceOf(Uint8Array);
    expect([content[0], content[1]]).toEqual([0x50, 0x4b]);
  });

  test("keeps Cyrillic and Croatian text intact", async () => {
    const { parts } = await exportParts(source());
    const sheet = parts["xl/worksheets/sheet1.xml"] ?? "";
    expect(sheet).toContain(">Скопје</t>");
    expect(sheet).toContain(">Македонија</t>");
    expect(sheet).toContain(">Čakovec</t>");
    expect(sheet).toContain(">Đakovo &amp; Žminj</t>");
  });

  test("stores numbers and dates typed, in their columns' formats", async () => {
    const { parts } = await exportParts(source());
    const sheet = parts["xl/worksheets/sheet1.xml"] ?? "";
    const styles = parts["xl/styles.xml"] ?? "";
    expect(sheet).toMatch(/<c r="D2" s="\d+"><v>1250.5<\/v><\/c>/);
    expect(sheet).toMatch(/<c r="E2" s="\d+"><v>46330<\/v><\/c>/);
    expect(styles).toContain('formatCode="&quot;€&quot;#,##0.00"');
    expect(styles).toContain('formatCode="yyyy-mm-dd"');
  });

  test("names the sheet and prints its header row on every page", async () => {
    const { parts } = await exportParts(
      source(),
      xlsxWriter({ sheetName: "Orders: 2026/Q4" }),
    );
    expect(parts["xl/workbook.xml"]).toContain('<sheet name="Orders_ 2026_Q4"');
    expect(parts["xl/workbook.xml"]).toContain(
      ">'Orders_ 2026_Q4'!$1:$1</definedName>",
    );
  });

  test("writes header rows above the column names, asking a function per export", async () => {
    const { parts } = await exportParts(
      source(),
      xlsxWriter({
        headerRows: ({ locale }) => ["Orders", `Locale: ${String(locale)}`],
      }),
    );
    const sheet = parts["xl/worksheets/sheet1.xml"] ?? "";
    expect(sheet).toContain(
      '<row r="1"><c r="A1" t="inlineStr"><is><t xml:space="preserve">Orders</t></is></c></row>',
    );
    expect(sheet).toContain(">Locale: en-US</t>");
    expect(sheet).toContain('<pane ySplit="3" topLeftCell="A4"');
    expect(parts["xl/workbook.xml"]).toContain("!$3:$3</definedName>");
  });

  test('writes every cell as text under values: "text"', async () => {
    const { parts } = await exportParts(
      source(),
      xlsxWriter({ values: "text" }),
    );
    const sheet = parts["xl/worksheets/sheet1.xml"] ?? "";
    expect(sheet).toContain(">€1,250.50</t>");
    expect(sheet).not.toContain("<v>");
  });

  test("outlines a grouped export with a bold total", async () => {
    const { parts } = await exportParts(
      source({
        defaultGroupBy: [{ columnId: "Region" }],
        aggregates: [{ columnId: "Amount", fn: "sum" }],
      }),
    );
    const sheet = parts["xl/worksheets/sheet1.xml"] ?? "";
    expect(sheet).toContain(">Region: Hrvatska</t>");
    expect(sheet).toContain('outlineLevel="1"');
    expect(sheet).toContain('<outlinePr summaryBelow="0"/>');
    // Two groups of one and two rows, under a header row, then the total.
    expect(sheet).toMatch(/<row r="7"><c r="D7" s="\d+"><v>1350.49<\/v>/);
  });

  test("rejects rather than throws when the table cannot be written", async () => {
    const writer = xlsxWriter({
      headerRows: () => {
        throw new Error("no header");
      },
    });
    const written = writer.write(
      { columns: [], header: true, rows: [], footer: null },
      { locale: undefined, messages: defaultMessages, options: {} },
    );
    await expect(written).rejects.toThrow("no header");
  });
});

describe("resolveSheetName", () => {
  test("replaces the characters Excel refuses", () => {
    expect(resolveSheetName("a[b]c:d*e?f/g\\h")).toBe("a_b_c_d_e_f_g_h");
  });

  test("cuts a long name to 31 characters", () => {
    expect(resolveSheetName("x".repeat(40))).toHaveLength(31);
    expect(resolveSheetName("Ж".repeat(40))).toBe("Ж".repeat(31));
  });

  test("drops quotes at either end", () => {
    expect(resolveSheetName("'Orders'")).toBe("Orders");
  });

  test("falls back to Sheet1", () => {
    expect(resolveSheetName(undefined)).toBe("Sheet1");
    expect(resolveSheetName("  ")).toBe("Sheet1");
    expect(resolveSheetName("''")).toBe("Sheet1");
  });
});
