import {
  exportPrintDocument,
  type PrintDocument,
  type PrintOptions,
} from "@gridkitjs/core";
import { printDocument, printStyles } from "@gridkitjs/dom";
import type { GridCommandsApi } from "../commands/useGridCommands";

/** What `DataGridApi` carries for printing. */
export interface GridPrintApi {
  /**
   * Prints the grid's view through the browser's print dialog — every row
   * the filter leaves, across pages and collapsed groups, not only those
   * drawn — under the grid's `print` option with `options` over it, field
   * by field. Resolves once the dialog has closed, or at once while another
   * print is open.
   */
  print(options?: PrintOptions): Promise<void>;
}

/**
 * Puts a print document on paper through a hidden frame, under the print
 * stylesheet for its page with `options.styles` after it. The frame sees
 * none of the page's CSS, the theme's included.
 */
export function printGrid(
  document: PrintDocument,
  { styles = "" }: PrintOptions,
): Promise<void> {
  return printDocument({
    title: document.title,
    bodyHtml: document.bodyHtml,
    styles: printStyles(document.page) + styles,
  });
}

/** `DataGridApi.print`, over the grid as it is when called. */
export function printApi<Row>({
  contextFor,
}: GridCommandsApi<Row>): GridPrintApi {
  return {
    print: (options) => {
      const context = contextFor({ area: "grid" });
      const merged = { ...context.options.print, ...options };
      return printGrid(exportPrintDocument(context, merged), merged);
    },
  };
}
