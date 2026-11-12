import type { PrintPage } from "@gridkitjs/core";

/** How far each level of group header steps in, after the cell's own padding. */
const GROUP_INDENT = "12pt";
/** A cell's padding to either side, which a group header's indent adds to. */
const CELL_PADDING_X = "5pt";

/**
 * The deepest group level given its own indent; any deeper shares it. A
 * stylesheet cannot read `data-level` as a length, so each level is a rule.
 */
const DEEPEST_INDENTED_LEVEL = 6;

function pageRules({ paperSize, orientation, pageNumbers }: PrintPage): string {
  const numbers = pageNumbers
    ? `@bottom-right { content: counter(page) " / " counter(pages); font: 8pt system-ui, sans-serif; color: #555; }`
    : "";
  return `@page { size: ${paperSize} ${orientation}; margin: 12mm; ${numbers} }`;
}

function indentRule(selector: string, level: number): string {
  return `${selector} > td:first-child { padding-left: calc(${CELL_PADDING_X} + ${String(level)} * ${GROUP_INDENT}); }`;
}

/**
 * Each group header's label stepped in under its parent's. Every nested
 * header starts at the deepest indent, and the levels above it each step
 * back out to their own — a later rule of the same weight winning.
 */
function groupIndentRules(): string {
  const rules = [
    indentRule(
      '.gridkit-export-group:not([data-level="0"])',
      DEEPEST_INDENTED_LEVEL,
    ),
  ];
  for (let level = 1; level < DEEPEST_INDENTED_LEVEL; level++) {
    rules.push(
      indentRule(`.gridkit-export-group[data-level="${String(level)}"]`, level),
    );
  }
  return rules.join("\n");
}

const BASE_RULES = `html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; background: #fff; color: #000; font: 10pt/1.35 system-ui, sans-serif; }
.gridkit-print-header { margin-bottom: 8pt; }
.gridkit-print-title { margin: 0; font-size: 14pt; }
.gridkit-print-subtitle, .gridkit-print-timestamp { margin: 2pt 0 0; color: #444; }
.gridkit-print-footer { margin-top: 8pt; color: #444; }
.gridkit-export-table { width: 100%; border-collapse: collapse; }
.gridkit-export-table thead { display: table-header-group; }
.gridkit-export-table tfoot { display: table-row-group; }
.gridkit-export-table tr { break-inside: avoid; }
.gridkit-export-table th, .gridkit-export-table td { border: 1px solid #bbb; padding: 3pt ${CELL_PADDING_X}; text-align: left; vertical-align: top; }
.gridkit-export-table th { background: #eee; font-weight: 600; }
.gridkit-export-group > td { background: #f5f5f5; font-weight: 600; }
.gridkit-export-group-summary > td, .gridkit-export-table tfoot td { font-weight: 600; }
.gridkit-export-table tfoot td { border-top: 2px solid #888; }`;

const FIT_TO_WIDTH_RULES = `.gridkit-export-table { table-layout: fixed; font-size: 8pt; }
.gridkit-export-table th, .gridkit-export-table td { overflow-wrap: anywhere; }`;

/**
 * The stylesheet a print of `buildPrintDocument`'s markup needs, for `page`.
 * A print frame sees none of the page's CSS, so this carries what makes the
 * table read on paper and nothing of a theme: the paper's size and
 * orientation; a header row repeated at the top of every page; rows kept
 * whole across a page break; neutral one-pixel borders; group headers
 * stepped in by depth; backgrounds printed as they are rather than dropped
 * to save ink; page numbers in the bottom-right margin, where the browser
 * draws `@page` margin boxes; and for `fitToWidth`, a smaller font in fixed
 * columns that wrap their text.
 *
 * The grand total prints once, after the last row — not repeated at the
 * foot of every page, where browsers repeat a `<tfoot>`, as a total of
 * rows the page does not hold would mislead. Add CSS after it to restyle.
 */
export function printStyles(page: PrintPage): string {
  return [
    pageRules(page),
    BASE_RULES,
    groupIndentRules(),
    page.fitToWidth ? FIT_TO_WIDTH_RULES : "",
  ]
    .filter((rules) => rules !== "")
    .join("\n");
}
