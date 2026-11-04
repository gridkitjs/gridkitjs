import type { GridMessages } from "../messages";
import { reportError } from "../util/report";
import { buildExportTable, type ExportSource } from "./buildExportTable";
import type { ExportFile, ExportWriter, GridExportOptions } from "./writer";

/**
 * What `exportFile` exports from: an `ExportSource` whose messages are the
 * grid's whole set, since a writer may print any of them. A
 * `GridCommandContext` is one as it stands.
 */
export interface ExportFileSource<Row> extends ExportSource<Row> {
  readonly messages: GridMessages;
}

/**
 * `fileName` with `extension` after it, unless it already ends with it — so
 * `"orders"` and `"orders.csv"` both save as `orders.csv`.
 */
function withExtension(fileName: string, extension: string): string {
  const suffix = `.${extension}`;
  return fileName.toLowerCase().endsWith(suffix.toLowerCase())
    ? fileName
    : fileName + suffix;
}

/** `format` when it is a writer, else the one registered for it — reported when there is none. */
function writerFor(
  format: string | ExportWriter,
  writers: ReadonlyMap<string, ExportWriter>,
): ExportWriter | null {
  if (typeof format !== "string") {
    return format;
  }
  const writer = writers.get(format);
  if (writer === undefined) {
    reportError(
      `there is no export writer for \`${format}\` — register one through \`exportWriters\`.`,
    );
    return null;
  }
  return writer;
}

function fileNameFor(options: GridExportOptions, writer: ExportWriter): string {
  const { fileName = "export" } = options;
  const name =
    typeof fileName === "function" ? fileName(writer.format) : fileName;
  return withExtension(name, writer.fileExtension);
}

/**
 * The grid's view exported as a file of `format`: the table `options`
 * narrow, written by that format's writer among `writers` (see
 * `resolveExportWriters`) — or by `format` itself, when it is a writer —
 * and named. A writer that returns a promise gives a promise of the file.
 *
 * A format no writer is registered for is reported and gives `null`, so a
 * renderer saves nothing rather than failing.
 */
export function exportFile<Row>(
  source: ExportFileSource<Row>,
  format: string | ExportWriter,
  options: GridExportOptions,
  writers: ReadonlyMap<string, ExportWriter>,
): ExportFile | Promise<ExportFile> | null {
  const writer = writerFor(format, writers);
  if (writer === null) {
    return null;
  }
  const content = writer.write(buildExportTable(source, options), {
    locale: source.options.locale,
    messages: source.messages,
    options,
  });
  const fileName = fileNameFor(options, writer);
  const { mimeType } = writer;
  return content instanceof Promise
    ? content.then((resolved) => ({ fileName, mimeType, content: resolved }))
    : { fileName, mimeType, content };
}
