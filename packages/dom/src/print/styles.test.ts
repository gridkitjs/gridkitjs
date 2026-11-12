import type { PrintPage } from "@gridkitjs/core";
import { describe, expect, it } from "vitest";
import { printStyles } from "./styles";

const page: PrintPage = {
  paperSize: "A4",
  orientation: "portrait",
  pageNumbers: true,
  fitToWidth: false,
};

describe("printStyles", () => {
  it("sizes and turns the page, with a 12mm margin", () => {
    expect(printStyles(page)).toContain(
      "@page { size: A4 portrait; margin: 12mm;",
    );
    expect(
      printStyles({ ...page, paperSize: "Letter", orientation: "landscape" }),
    ).toContain("@page { size: Letter landscape;");
  });

  it("numbers the pages in the bottom-right margin box, unless turned off", () => {
    const numbers =
      '@bottom-right { content: counter(page) " / " counter(pages);';
    expect(printStyles(page)).toContain(numbers);
    expect(printStyles({ ...page, pageNumbers: false })).not.toContain(
      "@bottom-right",
    );
  });

  it("repeats the header row on every page and keeps rows whole", () => {
    const styles = printStyles(page);
    expect(styles).toContain(
      ".gridkit-export-table thead { display: table-header-group; }",
    );
    expect(styles).toContain(
      ".gridkit-export-table tr { break-inside: avoid; }",
    );
  });

  it("prints the grand total once, after the last row", () => {
    expect(printStyles(page)).toContain(
      ".gridkit-export-table tfoot { display: table-row-group; }",
    );
  });

  it("lays the table across the page with neutral borders, backgrounds kept", () => {
    const styles = printStyles(page);
    expect(styles).toContain(
      ".gridkit-export-table { width: 100%; border-collapse: collapse; }",
    );
    expect(styles).toContain("border: 1px solid #bbb;");
    expect(styles).toContain(
      "-webkit-print-color-adjust: exact; print-color-adjust: exact;",
    );
  });

  it("steps each group level in, the deepest shared by every level past it", () => {
    const styles = printStyles(page);
    expect(styles).toContain(
      '.gridkit-export-group[data-level="1"] > td:first-child { padding-left: calc(5pt + 1 * 12pt); }',
    );
    expect(styles).toContain(
      '.gridkit-export-group[data-level="5"] > td:first-child { padding-left: calc(5pt + 5 * 12pt); }',
    );
    expect(styles).toContain(
      '.gridkit-export-group:not([data-level="0"]) > td:first-child { padding-left: calc(5pt + 6 * 12pt); }',
    );
    expect(styles).not.toContain('[data-level="6"]');
    // The catch-all comes first, so each level's own rule wins over it.
    expect(styles.indexOf(':not([data-level="0"])')).toBeLessThan(
      styles.indexOf('[data-level="1"]'),
    );
  });

  it("squeezes a wide table onto the page only for fitToWidth", () => {
    const fixed =
      ".gridkit-export-table { table-layout: fixed; font-size: 8pt; }";
    expect(printStyles(page)).not.toContain(fixed);
    const styles = printStyles({ ...page, fitToWidth: true });
    expect(styles).toContain(fixed);
    expect(styles).toContain("overflow-wrap: anywhere;");
  });
});
