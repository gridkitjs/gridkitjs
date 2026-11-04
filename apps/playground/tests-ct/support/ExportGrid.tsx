import { useRef, useState } from "react";
import type { ColumnDefinition } from "@gridkitjs/core";
import { xlsxWriter } from "@gridkitjs/export-xlsx";
import {
  DataGrid,
  type DataGridApi,
  type DataGridProps,
  type ExportWriter,
  type GridExportOptions,
} from "@gridkitjs/react";

interface Row {
  id: string;
  name: string;
  region: string;
  score: number;
  code: string;
  notes: string;
}

const rows: Row[] = [
  {
    id: "r1",
    name: "Alice",
    region: "West",
    score: 30,
    code: "A1",
    notes: "x",
  },
  { id: "r2", name: "Bravo", region: "East", score: 9, code: "B2", notes: "y" },
  {
    id: "r3",
    name: "Charlie",
    region: "West",
    score: 21,
    code: "C3",
    notes: "z",
  },
  {
    id: "r4",
    name: "Delta",
    region: "East",
    score: 14,
    code: "D4",
    notes: "w",
  },
];

const columns: readonly ColumnDefinition<Row>[] = [
  { field: "name", header: "Name", width: 120 },
  { field: "region", header: "Region", width: 100 },
  { field: "score", header: "Score", width: 80, type: "number" },
  { field: "code", header: "Code", width: 80, hidden: true },
  { field: "notes", header: "Notes", width: 80, exportable: false },
];

/** Writes every exported row's cells, space-separated, rows split by ` | `. */
const linesWriter: ExportWriter = {
  format: "lines",
  fileExtension: "txt",
  mimeType: "text/plain",
  write: (table) =>
    table.rows
      .map((row) => row.cells.map((cell) => cell.text).join(" "))
      .join(" | "),
};

/** A PDF writer that always fails, as one whose library would not load. */
const failingWriter: ExportWriter = {
  format: "pdf",
  fileExtension: "pdf",
  mimeType: "application/pdf",
  write: () => Promise.reject(new Error("the PDF library did not load")),
};

/** The real xlsx writer, made once as an app would. */
const realWriters: readonly ExportWriter[] = [
  xlsxWriter({ sheetName: "Players" }),
];

export interface ExportGridProps extends Omit<
  DataGridProps<Row>,
  "columns" | "dataSource" | "getRowId" | "exportWriters" | "ref"
> {
  /**
   * Registers two writers a spec cannot pass, being functions: an xlsx one
   * that writes the bytes of `rows: N` only once "Finish writing" is
   * pressed, and a PDF one that always fails.
   */
  readonly withWriters?: boolean;
  /** Registers the real xlsx writer, `@gridkitjs/export-xlsx`'s. */
  readonly withXlsxWriter?: boolean;
  /** What "Export data" passes to `exportData`; `"csv"` when left out. */
  readonly dataFormat?: string;
  readonly dataOptions?: GridExportOptions;
}

/**
 * A grid of four rows — Name, Region, Score, a hidden Code and an
 * unexportable Notes column — whose ref a spec drives through buttons:
 * "Export data" calls `exportData(dataFormat, dataOptions)`, "Export lines"
 * `exportData` with a writer of the fixture's own. Either writes what the
 * `Blob` held — its type, whether its bytes begin with a UTF-8 byte order
 * mark, and its text — or the rejection's message to `result`.
 */
export default function ExportGrid({
  withWriters = false,
  withXlsxWriter = false,
  dataFormat = "csv",
  dataOptions,
  ...props
}: ExportGridProps) {
  const gridRef = useRef<DataGridApi<Row>>(null);
  const finishRef = useRef<(() => void) | null>(null);
  const [result, setResult] = useState("");
  const [writers] = useState<readonly ExportWriter[]>(() => [
    {
      format: "xlsx",
      fileExtension: "xlsx",
      mimeType: "application/octet-stream",
      write: (table) =>
        new Promise((resolve) => {
          finishRef.current = () => {
            resolve(
              new TextEncoder().encode(`rows: ${String(table.rows.length)}`),
            );
          };
        }),
    },
    failingWriter,
  ]);

  async function show(blob: Promise<Blob> | undefined): Promise<void> {
    try {
      const resolved = await blob;
      if (resolved === undefined) return;
      const bytes = new Uint8Array(await resolved.arrayBuffer());
      setResult(
        JSON.stringify({
          type: resolved.type,
          bom: bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf,
          text: await resolved.text(),
        }),
      );
    } catch (error) {
      setResult(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <div>
      <DataGrid
        label="Export grid"
        {...props}
        ref={gridRef}
        columns={columns}
        dataSource={rows}
        getRowId={(row) => row.id}
        exportWriters={
          withXlsxWriter ? realWriters : withWriters ? writers : undefined
        }
      />
      <button
        type="button"
        onClick={() => {
          void show(gridRef.current?.exportData(dataFormat, dataOptions));
        }}
      >
        Export data
      </button>
      <button
        type="button"
        onClick={() => {
          void show(gridRef.current?.exportData(linesWriter));
        }}
      >
        Export lines
      </button>
      <button
        type="button"
        onClick={() => {
          finishRef.current?.();
        }}
      >
        Finish writing
      </button>
      <output data-testid="result">{result}</output>
    </div>
  );
}
