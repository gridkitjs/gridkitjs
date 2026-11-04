import type {
  ColumnType,
  ExportCell,
  ExportColumn,
  ExportRow,
  ExportScalar,
  ExportTable,
  ExportTotalRow,
} from "@gridkitjs/core";
import { describe, expect, test } from "vitest";

import { type SheetOptions, sheetXml } from "./sheet";
import { createStyleSheet, type StyleSheet } from "./styles";

function column(
  id: string,
  type: ColumnType = "string",
  format?: Intl.NumberFormatOptions | Intl.DateTimeFormatOptions,
): ExportColumn {
  return { id, header: id, type, format, alignment: "left", width: 140 };
}

function cell(value: ExportScalar, text = String(value ?? "")): ExportCell {
  return { value, text };
}

function dataRow(...cells: ExportCell[]): ExportRow {
  return { kind: "data", rowId: "r", cells };
}

function table(
  columns: readonly ExportColumn[],
  rows: readonly ExportRow[],
  extra: { header?: boolean; footer?: ExportTotalRow } = {},
): ExportTable {
  return {
    columns,
    header: extra.header ?? true,
    rows,
    footer: extra.footer ?? null,
  };
}

interface ParsedCell {
  readonly style: number;
  readonly type: string | undefined;
  /** The `<v>` value, or an inline string's text. */
  readonly content: string;
}

/** Every written cell by its reference, read with a regex rather than an XML library. */
function cellsOf(xml: string): Map<string, ParsedCell> {
  const cells = new Map<string, ParsedCell>();
  for (const match of xml.matchAll(/<c r="([A-Z]+\d+)"([^>]*)>(.*?)<\/c>/g)) {
    const [, reference = "", attributes = "", body = ""] = match;
    const content =
      /<v>(.*?)<\/v>/.exec(body)?.[1] ?? /<t[^>]*>(.*?)<\/t>/.exec(body)?.[1];
    cells.set(reference, {
      style: Number(/ s="(\d+)"/.exec(attributes)?.[1] ?? 0),
      type: / t="(\w+)"/.exec(attributes)?.[1],
      content: content ?? "",
    });
  }
  return cells;
}

/** Each `<row>` element's attributes, in order. */
function rowsOf(xml: string): string[] {
  return [...xml.matchAll(/<row ([^>]*)>/g)].map((match) => match[1] ?? "");
}

function write(
  exportTable: ExportTable,
  options: Partial<SheetOptions> = {},
): { xml: string; cells: Map<string, ParsedCell>; styles: StyleSheet } {
  const styles = options.styles ?? createStyleSheet();
  const xml = sheetXml(exportTable, {
    titleRows: [],
    values: "typed",
    locale: "en-US",
    ...options,
    styles,
  });
  return { xml, cells: cellsOf(xml), styles };
}

describe("sheetXml: header", () => {
  test("writes the column names as a bold first row", () => {
    const { cells, styles } = write(
      table([column("Name"), column("Score")], []),
    );
    const bold = styles.index({ bold: true });
    expect(cells.get("A1")).toEqual({
      style: bold,
      type: "inlineStr",
      content: "Name",
    });
    expect(cells.get("B1")).toEqual({
      style: bold,
      type: "inlineStr",
      content: "Score",
    });
  });

  test("freezes the header row", () => {
    const { xml } = write(table([column("Name")], []));
    expect(xml).toContain(
      '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>',
    );
  });

  test("freezes nothing without a header row", () => {
    const { xml, cells } = write(
      table([column("Name")], [dataRow(cell("Ann"))], { header: false }),
    );
    expect(xml).not.toContain("<pane");
    expect(cells.get("A1")?.content).toBe("Ann");
  });

  test("puts the title rows above the header and freezes them with it", () => {
    const { xml, cells } = write(
      table([column("Name")], [dataRow(cell("Ann"))]),
      { titleRows: ["Sales report", "", "Region: West"] },
    );
    expect(cells.get("A1")?.content).toBe("Sales report");
    expect(cells.has("A2")).toBe(false);
    expect(cells.get("A3")?.content).toBe("Region: West");
    expect(cells.get("A4")?.content).toBe("Name");
    expect(cells.get("A5")?.content).toBe("Ann");
    expect(xml).toContain('<pane ySplit="4" topLeftCell="A5"');
    expect(rowsOf(xml)).toHaveLength(5);
  });
});

describe("sheetXml: typed values", () => {
  test("writes a number as a number in its column's format", () => {
    const { cells, styles } = write(
      table(
        [column("Price", "currency", { currency: "USD" })],
        [dataRow(cell(1234.5, "$1,234.50"))],
      ),
    );
    expect(cells.get("A2")).toEqual({
      style: styles.index({ numberFormat: '"$"#,##0.00' }),
      type: undefined,
      content: "1234.5",
    });
  });

  test("writes a number in a column without a format in General", () => {
    const { cells } = write(
      table([column("Id", "number")], [dataRow(cell(7))]),
    );
    expect(cells.get("A2")).toEqual({
      style: 0,
      type: undefined,
      content: "7",
    });
  });

  test("writes a boolean as a boolean", () => {
    const { cells } = write(
      table(
        [column("A", "boolean"), column("B", "boolean")],
        [dataRow(cell(true, "Yes"), cell(false, "No"))],
      ),
    );
    expect(cells.get("A2")).toEqual({ style: 0, type: "b", content: "1" });
    expect(cells.get("B2")).toEqual({ style: 0, type: "b", content: "0" });
  });

  test("writes a date as a serial number in a date format", () => {
    const { cells, styles } = write(
      table(
        [column("Day", "date"), column("At", "dateTime")],
        [
          dataRow(
            cell(new Date(2026, 10, 4), "11/4/2026"),
            cell(new Date(2026, 10, 4, 18), "11/4/2026, 6:00:00 PM"),
          ),
        ],
      ),
    );
    expect(cells.get("A2")).toEqual({
      style: styles.index({ numberFormat: "yyyy-mm-dd" }),
      type: undefined,
      content: "46330",
    });
    expect(cells.get("B2")).toEqual({
      style: styles.index({ numberFormat: "yyyy-mm-dd hh:mm:ss" }),
      type: undefined,
      content: "46330.75",
    });
  });

  test("writes a string as the text the grid shows", () => {
    const { cells } = write(
      table([column("Status")], [dataRow(cell("A", "Active"))]),
    );
    expect(cells.get("A2")).toEqual({
      style: 0,
      type: "inlineStr",
      content: "Active",
    });
  });

  test("writes what Excel cannot hold as a number or date as text", () => {
    const { cells } = write(
      table(
        [column("N", "number"), column("D", "date")],
        [dataRow(cell(Number.NaN, "NaN"), cell(new Date(1850, 0, 1), "1850"))],
      ),
    );
    expect(cells.get("A2")?.type).toBe("inlineStr");
    expect(cells.get("A2")?.content).toBe("NaN");
    expect(cells.get("B2")?.content).toBe("1850");
  });

  test("leaves an empty cell out", () => {
    const { cells } = write(
      table([column("A"), column("B")], [dataRow(cell(null), cell("x"))]),
    );
    expect(cells.has("A2")).toBe(false);
    expect(cells.get("B2")?.content).toBe("x");
  });

  test("writes a missing value the grid prints text for as that text", () => {
    const { cells } = write(table([column("A")], [dataRow(cell(null, "—"))]));
    expect(cells.get("A2")?.content).toBe("—");
  });
});

describe('sheetXml: values: "text"', () => {
  test("writes every cell as the text the grid shows", () => {
    const { cells } = write(
      table(
        [column("Score", "number"), column("Ok", "boolean")],
        [dataRow(cell(1234.5, "1,234.5"), cell(true, "Yes"))],
      ),
      { values: "text" },
    );
    expect(cells.get("A2")).toEqual({
      style: 0,
      type: "inlineStr",
      content: "1,234.5",
    });
    expect(cells.get("B2")?.content).toBe("Yes");
  });
});

describe("sheetXml: groups", () => {
  const columns = [column("Name"), column("Score", "number")];

  test("writes a group header as a bold label above its outlined rows", () => {
    const { xml, cells, styles } = write(
      table(columns, [
        {
          kind: "group",
          level: 0,
          groupId: "g",
          label: "Region: West",
          count: 1,
          cells: [cell(null), cell(null)],
        },
        dataRow(cell("Ann"), cell(5)),
      ]),
    );
    expect(cells.get("A2")).toEqual({
      style: styles.index({ bold: true }),
      type: "inlineStr",
      content: "Region: West",
    });
    expect(rowsOf(xml)).toEqual(['r="1"', 'r="2"', 'r="3" outlineLevel="1"']);
    expect(xml).toContain('<sheetPr><outlinePr summaryBelow="0"/></sheetPr>');
    expect(xml).toContain(
      '<sheetFormatPr defaultRowHeight="15" outlineLevelRow="1"/>',
    );
  });

  test("nests the outline with the groups and keeps summaries at their group's level", () => {
    const group = (level: number): ExportRow => ({
      kind: "group",
      level,
      groupId: String(level),
      label: `Level ${String(level)}`,
      count: 1,
      cells: [cell(null), cell(null)],
    });
    const summary = (level: number): ExportRow => ({
      kind: "groupSummary",
      level,
      cells: [cell(null), cell(5)],
    });
    const { xml } = write(
      table(columns, [
        group(0),
        group(1),
        dataRow(cell("Ann"), cell(5)),
        summary(1),
        summary(0),
      ]),
    );
    expect(rowsOf(xml)).toEqual([
      'r="1"',
      'r="2"',
      'r="3" outlineLevel="1"',
      'r="4" outlineLevel="2"',
      'r="5" outlineLevel="1"',
      'r="6"',
    ]);
    expect(xml).toContain('outlineLevelRow="2"');
  });

  test("writes a group's inline aggregates beside its label", () => {
    const { cells, styles } = write(
      table(columns, [
        {
          kind: "group",
          level: 0,
          groupId: "g",
          label: "Region: West",
          count: 2,
          cells: [cell(2), cell(12)],
        },
      ]),
    );
    expect(cells.get("A2")?.content).toBe("Region: West");
    expect(cells.get("B2")).toEqual({
      style: styles.index({ bold: true }),
      type: undefined,
      content: "12",
    });
  });

  test("outlines nothing without group headers", () => {
    const { xml } = write(
      table(columns, [
        dataRow(cell("Ann"), cell(5)),
        { kind: "groupSummary", level: 0, cells: [cell(null), cell(5)] },
      ]),
    );
    expect(xml).not.toContain("outlineLevel");
    expect(xml).not.toContain("<sheetPr>");
  });
});

describe("sheetXml: aggregates", () => {
  const price = column("Price", "currency", { currency: "USD" });

  test("writes the grand total bold in its column's format", () => {
    const { cells, styles } = write(
      table([price], [dataRow(cell(10, "$10.00"))], {
        footer: { kind: "total", cells: [cell(10, "$10.00")] },
      }),
    );
    expect(cells.get("A3")).toEqual({
      style: styles.index({ numberFormat: '"$"#,##0.00', bold: true }),
      type: undefined,
      content: "10",
    });
  });

  test("writes a count under a formatted column as a plain number", () => {
    const { cells, styles } = write(
      table([price], [], {
        footer: { kind: "total", cells: [cell(1200, "1,200")] },
      }),
    );
    expect(cells.get("A2")?.style).toBe(styles.index({ bold: true }));
  });
});

describe("sheetXml: layout", () => {
  test("sets each column's width from its pixels", () => {
    const { xml } = write(
      table([column("A"), { ...column("B"), width: 100 }], []),
    );
    expect(xml).toContain(
      '<cols><col min="1" max="1" width="20" customWidth="1"/><col min="2" max="2" width="14.29" customWidth="1"/></cols>',
    );
  });

  test("names columns past Z with two letters", () => {
    const columns = Array.from({ length: 28 }, (_, index) =>
      column(`c${String(index)}`),
    );
    const { cells } = write(table(columns, []));
    expect(cells.get("Z1")?.content).toBe("c25");
    expect(cells.get("AA1")?.content).toBe("c26");
    expect(cells.get("AB1")?.content).toBe("c27");
  });

  test("escapes text and cuts it to the most a cell holds", () => {
    const long = "x".repeat(40_000);
    const { cells } = write(
      table(
        [column("A"), column("B")],
        [dataRow(cell("Tom & <Jerry>"), cell(long))],
      ),
    );
    expect(cells.get("A2")?.content).toBe("Tom &amp; &lt;Jerry&gt;");
    expect(cells.get("B2")?.content).toHaveLength(32_767);
  });

  test("lays the parts out in the order the schema asks", () => {
    const { xml } = write(
      table(
        [column("Name")],
        [
          {
            kind: "group",
            level: 0,
            groupId: "g",
            label: "G",
            count: 0,
            cells: [cell(null)],
          },
        ],
      ),
    );
    const order = [
      "<sheetPr>",
      "<sheetViews>",
      "<sheetFormatPr",
      "<cols>",
      "<sheetData>",
    ].map((tag) => xml.indexOf(tag));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(order).not.toContain(-1);
  });
});
