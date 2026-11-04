import { describe, expect, test } from "vitest";

import { defaultMessages } from "../messages";
import type { ExportTable } from "./types";
import {
  csvWriter,
  type ExportWriteContext,
  type ExportWriter,
  jsonWriter,
  resolveExportWriters,
} from "./writer";

const table: ExportTable = {
  columns: [
    { id: "Name", header: "Name", type: "string", alignment: "left", width: 1 },
    {
      id: "Amount",
      header: "Amount",
      type: "number",
      alignment: "right",
      width: 1,
    },
  ],
  header: true,
  rows: [
    {
      kind: "data",
      rowId: "1",
      cells: [
        { value: "Ana", text: "Ana" },
        { value: 1.5, text: "1,5" },
      ],
    },
  ],
  footer: null,
};

/** The byte order mark a CSV starts with, spelled out so it shows. */
const BOM = String.fromCharCode(0xfeff);

function context(
  overrides: Partial<ExportWriteContext> = {},
): ExportWriteContext {
  return {
    locale: undefined,
    messages: defaultMessages,
    options: {},
    ...overrides,
  };
}

describe("csvWriter", () => {
  test("is CSV, typed for a spreadsheet to read as UTF-8", () => {
    expect(csvWriter).toMatchObject({
      format: "csv",
      fileExtension: "csv",
      mimeType: "text/csv;charset=utf-8",
    });
  });

  test("writes the table with toCsv's defaults", () => {
    expect(csvWriter.write(table, context())).toBe(
      `${BOM}Name,Amount\r\nAna,"1,5"`,
    );
  });

  test("reads its settings from the options' csv", () => {
    expect(
      csvWriter.write(
        table,
        context({ options: { csv: { bom: false, eol: "\n" } } }),
      ),
    ).toBe('Name,Amount\nAna,"1,5"');
  });

  test("reads the grid's locale for an automatic delimiter", () => {
    expect(
      csvWriter.write(
        table,
        context({
          locale: "de-DE",
          options: { csv: { bom: false, delimiter: "auto" } },
        }),
      ),
    ).toBe("Name;Amount\r\nAna;1,5");
  });

  test("a csv locale of its own wins over the grid's", () => {
    expect(
      csvWriter.write(
        table,
        context({
          locale: "de-DE",
          options: { csv: { bom: false, delimiter: "auto", locale: "en-US" } },
        }),
      ),
    ).toBe('Name,Amount\r\nAna,"1,5"');
  });
});

describe("jsonWriter", () => {
  test("is JSON", () => {
    expect(jsonWriter).toMatchObject({
      format: "json",
      fileExtension: "json",
      mimeType: "application/json",
    });
  });

  test("writes the data rows with typed values", () => {
    expect(jsonWriter.write(table, context())).toBe(
      '[{"Name":"Ana","Amount":1.5}]',
    );
  });

  test("reads its settings from the options' json", () => {
    expect(
      jsonWriter.write(
        table,
        context({ options: { json: { keys: "header", space: 1 } } }),
      ),
    ).toBe('[\n {\n  "Name": "Ana",\n  "Amount": 1.5\n }\n]');
  });
});

describe("resolveExportWriters", () => {
  const xlsx: ExportWriter = {
    format: "xlsx",
    fileExtension: "xlsx",
    mimeType: "application/vnd.ms-excel",
    write: () => new Uint8Array(),
  };

  test("holds CSV and JSON by default", () => {
    expect([...resolveExportWriters(undefined)]).toEqual([
      ["csv", csvWriter],
      ["json", jsonWriter],
    ]);
  });

  test("adds the writers given, by format", () => {
    expect(resolveExportWriters([xlsx]).get("xlsx")).toBe(xlsx);
  });

  test("a writer for a built-in's format replaces it", () => {
    const csv: ExportWriter = { ...csvWriter, mimeType: "text/plain" };

    expect(resolveExportWriters([csv]).get("csv")).toBe(csv);
  });
});
