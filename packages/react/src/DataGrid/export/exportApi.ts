import {
  exportFile,
  resolveExportWriters,
  type ExportFile,
  type ExportWriter,
  type GridExportOptions,
} from "@gridkitjs/core";
import type { GridCommandsApi } from "../commands/useGridCommands";

/** What `DataGridApi` carries for exporting. */
export interface GridExportApi {
  /**
   * The grid's view exported as `format` — `"csv"`, `"json"`, a format
   * registered through `exportWriters`, or a writer passed as it is — and
   * handed back as a `Blob`, under the grid's `export` option with
   * `options` over it, field by field. Nothing is downloaded:
   * `runCommand("export.csv")` downloads.
   *
   * Rejects for a format no writer is registered for, and when the writer
   * fails.
   */
  exportData(
    format: string | ExportWriter,
    options?: GridExportOptions,
  ): Promise<Blob>;
}

/**
 * An export's contents as a `Blob` of its media type. Text is stored as
 * UTF-8, a byte order mark the writer put first included, so a CSV opens in
 * a spreadsheet with its accents intact. Bytes are copied: a `Blob` takes
 * no view of shared memory, which a `Uint8Array` may be.
 */
export function exportBlob({ content, mimeType }: ExportFile): Blob {
  const part = typeof content === "string" ? content : content.slice();
  return new Blob([part], { type: mimeType });
}

/** `DataGridApi.exportData`, over the grid as it is when called. */
export function exportApi<Row>({
  contextFor,
}: GridCommandsApi<Row>): GridExportApi {
  return {
    exportData: async (format, options) => {
      const context = contextFor({ area: "grid" });
      const { export: defaults, exportWriters } = context.options;
      const file = exportFile(
        context,
        format,
        { ...defaults, ...options },
        resolveExportWriters(exportWriters),
      );
      // `exportFile` has logged the format by name; the caller is told too.
      if (file === null) {
        throw new Error(
          "DataGrid: there is no export writer for that format — register one through `exportWriters`.",
        );
      }
      return exportBlob(await file);
    },
  };
}
