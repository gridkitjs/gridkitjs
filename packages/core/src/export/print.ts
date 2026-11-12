import type { FormatLocale } from "../util/format";
import { buildExportTable, type ExportSource } from "./buildExportTable";
import { escapeHtml, toHtmlTable } from "./htmlTable";
import type { ExportOptions, ExportTable } from "./types";

/** Which way the paper is turned. */
export type PrintOrientation = "portrait" | "landscape";

/**
 * How a grid prints: which rows and columns (every `ExportOptions` field),
 * the text around the table, and the page it is laid out on. The grid's
 * `print` option.
 */
export interface PrintOptions extends ExportOptions {
  /** A heading above the table, and the printed document's title. */
  readonly title?: string | undefined;
  /** A line under the title. */
  readonly subtitle?: string | undefined;
  /** A line after the table. */
  readonly footer?: string | undefined;
  /**
   * When the print was made, under the title: `true` for now, or a `Date`
   * to print instead. Off by default.
   */
  readonly timestamp?: boolean | Date | undefined;
  /** The language the timestamp is written in. Defaults to the grid's. */
  readonly locale?: FormatLocale;
  /**
   * Which way the paper is turned. Defaults to `"landscape"` for a table of
   * more than six columns, which rarely fits a portrait page, else
   * `"portrait"`.
   */
  readonly orientation?: PrintOrientation | undefined;
  /**
   * A page size CSS names — `"A4"` (the default), `"Letter"`, `"A3"`,
   * `"Legal"`.
   */
  readonly paperSize?: "A4" | "Letter" | (string & {}) | undefined;
  /** Whether each page is numbered, "3 / 12", where the browser can. Defaults to `true`. */
  readonly pageNumbers?: boolean | undefined;
  /**
   * Whether a wide table is squeezed onto the page — a smaller font and
   * fixed column widths that wrap their text — rather than run off its
   * edge. Defaults to `false`.
   */
  readonly fitToWidth?: boolean | undefined;
  /** CSS added after the print stylesheet, to restyle the printed table. */
  readonly styles?: string | undefined;
}

/**
 * The page a print is laid out on, every choice settled — what
 * `@gridkitjs/dom`'s `printStyles` turns into the page's CSS.
 */
export interface PrintPage {
  readonly paperSize: string;
  readonly orientation: PrintOrientation;
  readonly pageNumbers: boolean;
  readonly fitToWidth: boolean;
}

/** A print ready for a renderer to put on paper: what `buildPrintDocument` returns. */
export interface PrintDocument {
  /**
   * The document's title as text, `""` when untitled — what the browser
   * puts in a page's header and names a PDF saved from the print dialog.
   */
  readonly title: string;
  /** The `<body>`'s markup: the heading, the table and the footer, every piece of text escaped. */
  readonly bodyHtml: string;
  readonly page: PrintPage;
}

/** Past this many columns, a page turned on its side by default. */
const PORTRAIT_COLUMN_LIMIT = 6;

/**
 * The orientation `options` ask for, else the one the table's width
 * suggests: landscape once it has more columns than a portrait page
 * comfortably holds.
 */
function resolveOrientation(
  table: ExportTable,
  options: PrintOptions,
): PrintOrientation {
  return (
    options.orientation ??
    (table.columns.length > PORTRAIT_COLUMN_LIMIT ? "landscape" : "portrait")
  );
}

function timestampText(timestamp: true | Date, locale: FormatLocale): string {
  const date = timestamp === true ? new Date() : timestamp;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

/** One line of text in its element, or nothing for a line left out. */
function line(
  tag: string,
  className: string,
  text: string | undefined,
): string {
  return text === undefined || text === ""
    ? ""
    : `<${tag} class="${className}">${escapeHtml(text)}</${tag}>`;
}

/** The title, subtitle and timestamp above the table, or nothing when none is set. */
function headerHtml(options: PrintOptions): string {
  const { timestamp = false } = options;
  const lines =
    line("h1", "gridkit-print-title", options.title) +
    line("p", "gridkit-print-subtitle", options.subtitle) +
    (timestamp === false
      ? ""
      : line(
          "p",
          "gridkit-print-timestamp",
          timestampText(timestamp, options.locale),
        ));
  return lines === ""
    ? ""
    : `<header class="gridkit-print-header">${lines}</header>`;
}

/**
 * The table as a printable document: its heading — the title, subtitle and
 * timestamp `options` set — then the table as `toHtmlTable` writes it, then
 * the footer line, with the page it is laid out on. Every piece of text is
 * escaped. It holds no styles: putting it on paper, with a stylesheet for
 * the page, is the renderer's — `@gridkitjs/dom`'s `printStyles` and
 * `printDocument` in a browser.
 *
 * The heading and footer carry semantic class names for a stylesheet:
 * `gridkit-print-header` around `gridkit-print-title`, `gridkit-print-subtitle` and
 * `gridkit-print-timestamp`, and `gridkit-print-footer`.
 */
export function buildPrintDocument(
  table: ExportTable,
  options: PrintOptions = {},
): PrintDocument {
  const footer = line("footer", "gridkit-print-footer", options.footer);
  return {
    title: options.title ?? "",
    bodyHtml: `${headerHtml(options)}${toHtmlTable(table)}${footer}`,
    page: {
      paperSize: options.paperSize ?? "A4",
      orientation: resolveOrientation(table, options),
      pageNumbers: options.pageNumbers ?? true,
      fitToWidth: options.fitToWidth ?? false,
    },
  };
}

/**
 * What `exportPrintDocument` prints from: an `ExportSource` that may carry
 * the grid's `label`. A `GridCommandContext` is one as it stands.
 */
export interface PrintSource<Row> extends ExportSource<Row> {
  readonly options: ExportSource<Row>["options"] & {
    readonly label?: string | undefined;
  };
}

/**
 * The grid's view as a print document: the table `options` narrow, laid out
 * as `buildPrintDocument` lays it out, with the timestamp in the grid's
 * locale unless `options` name another. Given no `title`, it takes the
 * grid's `label` — the name a screen reader already reads for it; `""`
 * leaves it untitled.
 */
export function exportPrintDocument<Row>(
  source: PrintSource<Row>,
  options: PrintOptions = {},
): PrintDocument {
  return buildPrintDocument(buildExportTable(source, options), {
    ...options,
    title: options.title ?? source.options.label,
    locale: options.locale ?? source.options.locale,
  });
}
