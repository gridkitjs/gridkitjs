import { afterEach, describe, expect, test, vi } from "vitest";

import { createGridController } from "../controller/createGridController";
import type { GridControllerOptions } from "../controller/gridController";
import { defaultMessages } from "../messages";
import { exportFile, type ExportFileSource } from "./exportFile";
import {
  type ExportWriteContext,
  type ExportWriter,
  resolveExportWriters,
} from "./writer";

/** The global core's `lib` leaves out — see `util/report.ts`. */
declare const console: { error: (message: string) => void };

interface Order {
  Id: number;
  Name: string;
}

function source(
  options: GridControllerOptions<Order> = {},
): ExportFileSource<Order> {
  const controller = createGridController<Order>({
    dataSource: [
      { Id: 1, Name: "Ana" },
      { Id: 2, Name: "Bo" },
    ],
    getRowId: (row) => String(row.Id),
    columns: [{ field: "Id", type: "number" }, { field: "Name" }],
    ...options,
  });
  return {
    view: controller.getView(),
    state: controller.getState(),
    options: controller.getOptions(),
    messages: defaultMessages,
  };
}

const writers = resolveExportWriters(undefined);

/** The byte order mark a CSV starts with, spelled out so it shows. */
const BOM = String.fromCharCode(0xfeff);

/** A writer recording what it was given, writing the column ids. */
function recordingWriter(overrides: Partial<ExportWriter> = {}) {
  const calls: ExportWriteContext[] = [];
  const writer: ExportWriter = {
    format: "ids",
    fileExtension: "txt",
    mimeType: "text/plain",
    write: (table, context) => {
      calls.push(context);
      return table.columns.map((column) => column.id).join(" ");
    },
    ...overrides,
  };
  return { writer, calls };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("exportFile", () => {
  test("writes the view with the format's writer, named export", () => {
    expect(exportFile(source(), "csv", {}, writers)).toEqual({
      fileName: "export.csv",
      mimeType: "text/csv;charset=utf-8",
      content: `${BOM}Id,Name\r\n1,Ana\r\n2,Bo`,
    });
  });

  test("narrows the table by the options", () => {
    const file = exportFile(
      source({ defaultRowSelection: ["2"] }),
      "json",
      { columns: ["Name"], scope: "selection" },
      writers,
    );

    expect(file).toMatchObject({ content: '[{"Name":"Bo"}]' });
  });

  test("passes the format its settings", () => {
    const file = exportFile(
      source(),
      "csv",
      { csv: { bom: false, delimiter: ";" } },
      writers,
    );

    expect(file).toMatchObject({ content: "Id;Name\r\n1;Ana\r\n2;Bo" });
  });

  test("gives the writer the grid's locale and messages, and the options", () => {
    const { writer, calls } = recordingWriter();
    const options = { fileName: "orders" };

    expect(
      exportFile(source({ locale: "mk" }), writer, options, writers),
    ).toMatchObject({ fileName: "orders.txt" });
    expect(calls).toEqual([
      { locale: "mk", messages: defaultMessages, options },
    ]);
  });

  test("takes a writer in place of a format", () => {
    const { writer } = recordingWriter();

    expect(exportFile(source(), writer, {}, writers)).toEqual({
      fileName: "export.txt",
      mimeType: "text/plain",
      content: "Id Name",
    });
  });

  test("uses a writer registered for the format", () => {
    const { writer } = recordingWriter();

    expect(
      exportFile(source(), "ids", {}, resolveExportWriters([writer])),
    ).toMatchObject({ content: "Id Name" });
  });

  test("keeps bytes a writer returns", () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const { writer } = recordingWriter({ write: () => bytes });

    expect(exportFile(source(), writer, {}, writers)).toMatchObject({
      content: bytes,
    });
  });

  test("gives a promise of the file for an asynchronous writer", async () => {
    const { writer } = recordingWriter({
      write: () => Promise.resolve("later"),
    });

    const file = exportFile(source(), writer, {}, writers);

    expect(file).toBeInstanceOf(Promise);
    await expect(file).resolves.toEqual({
      fileName: "export.txt",
      mimeType: "text/plain",
      content: "later",
    });
  });

  test("reports a format with no writer, and gives null", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(exportFile(source(), "xlsx", {}, writers)).toBeNull();
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining("no export writer for `xlsx`"),
    );
  });
});

describe("exportFile: the file's name", () => {
  function nameOf(fileName: string | ((format: string) => string)) {
    const file = exportFile(source(), "csv", { fileName }, writers);
    return file instanceof Promise ? null : file?.fileName;
  }

  test("adds the writer's extension to the name given", () => {
    expect(nameOf("orders")).toBe("orders.csv");
  });

  test("keeps a name already ending with the extension, in any case", () => {
    expect(nameOf("orders.csv")).toBe("orders.csv");
    expect(nameOf("ORDERS.CSV")).toBe("ORDERS.CSV");
  });

  test("asks a function with the format", () => {
    expect(nameOf((format) => `orders-${format}`)).toBe("orders-csv.csv");
  });
});
