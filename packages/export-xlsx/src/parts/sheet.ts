import type {
  ExportCell,
  ExportColumn,
  ExportTable,
  FormatLocale,
} from "@gridkitjs/core";
import { excelDateSerial } from "../dateSerial";
import { dateFormatCode, numberFormatCode } from "../formats";
import { escapeXml, XML_DECLARATION } from "../xml";
import type { StyleSheet } from "./styles";

/** What the sheet writes beside the table. */
export interface SheetOptions {
  /** Lines of text above the header row, each a row of its own in column A. */
  readonly titleRows: readonly string[];
  /**
   * `"typed"`: numbers, dates and booleans as Excel's own, a string as the
   * text the grid shows. `"text"`: every cell as the text the grid shows.
   */
  readonly values: "typed" | "text";
  /** The grid's locale, which a currency's symbol is read in. */
  readonly locale: FormatLocale;
  /** Collects the style each cell asks for; written as its own part after. */
  readonly styles: StyleSheet;
}

/** The deepest outline Excel can show. */
const MAX_OUTLINE_LEVEL = 7;

/** The most characters an Excel cell holds; it refuses a file with more. */
const MAX_CELL_TEXT = 32_767;

/**
 * A pixel width in Excel's unit, the width of a digit in its default font,
 * which Calibri 11 draws about 7px wide.
 */
const PX_PER_CHARACTER = 7;

const EMPTY_CELL: ExportCell = { value: null, text: "" };

/** A column with what every one of its cells needs, settled once. */
interface ColumnLayout {
  readonly column: ExportColumn;
  /** Its letters in a cell reference: `A`, …, `Z`, `AA`. */
  readonly name: string;
  readonly numberFormat: string | undefined;
  readonly dateFormat: string;
}

/** How a row's cells are written. */
interface RowStyle {
  /** Header, group and total rows are bold. */
  readonly bold: boolean;
  /** Its cells hold aggregate results rather than the column's values. */
  readonly aggregate: boolean;
}

const DATA_ROW: RowStyle = { bold: false, aggregate: false };
const AGGREGATE_ROW: RowStyle = { bold: true, aggregate: true };

function columnName(index: number): string {
  let name = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  }
  return name;
}

function styleAttribute(style: number): string {
  return style === 0 ? "" : ` s="${String(style)}"`;
}

function stringCell(reference: string, text: string, style: number): string {
  return text === ""
    ? ""
    : `<c r="${reference}"${styleAttribute(style)} t="inlineStr"><is><t xml:space="preserve">${escapeXml(
        text.slice(0, MAX_CELL_TEXT),
      )}</t></is></c>`;
}

function valueCell(
  reference: string,
  value: string,
  style: number,
  type?: "b",
): string {
  const typeAttribute = type === undefined ? "" : ` t="${type}"`;
  return `<c r="${reference}"${styleAttribute(style)}${typeAttribute}><v>${value}</v></c>`;
}

function rowXml(
  rowNumber: number,
  cells: readonly string[],
  outlineLevel: number,
): string {
  const outline =
    outlineLevel > 0 ? ` outlineLevel="${String(outlineLevel)}"` : "";
  return `<row r="${String(rowNumber)}"${outline}>${cells.join("")}</row>`;
}

function colsXml(layouts: readonly ColumnLayout[]): string {
  if (layouts.length === 0) {
    return "";
  }
  const cols = layouts.map(({ column }, index) => {
    const width = Math.max(
      1,
      Math.round((column.width / PX_PER_CHARACTER) * 100) / 100,
    );
    const position = String(index + 1);
    return `<col min="${position}" max="${position}" width="${String(width)}" customWidth="1"/>`;
  });
  return `<cols>${cols.join("")}</cols>`;
}

/**
 * The 1-based row the column names stand in — below the title rows — or
 * `undefined` when the table has no header row.
 */
export function headerRowNumber(
  table: ExportTable,
  titleRows: readonly string[],
): number | undefined {
  return table.header ? titleRows.length + 1 : undefined;
}

/**
 * The worksheet part: the title rows, the header row (bold and frozen), and
 * the table's rows in order — group headers bold with their label in the
 * first column and their rows outlined beneath them, so Excel's outline
 * buttons collapse a group as the grid does; summary rows and the grand
 * total bold.
 */
export function sheetXml(table: ExportTable, options: SheetOptions): string {
  const { titleRows, values, locale, styles } = options;
  const layouts: ColumnLayout[] = table.columns.map((column, index) => ({
    column,
    name: columnName(index),
    numberFormat: numberFormatCode(column, locale),
    dateFormat: dateFormatCode(column),
  }));
  const plainNumber = new Intl.NumberFormat(locale);
  const boldText = styles.index({ bold: true });

  /**
   * Whether an aggregate result was printed as a plain number rather than
   * by its column's rules — a count, which is a number of rows whatever the
   * column holds — so it is not shown as the column's currency or percent.
   */
  function isPlainNumber(cell: ExportCell, value: number): boolean {
    return cell.text === plainNumber.format(value);
  }

  function cellXml(
    reference: string,
    cell: ExportCell,
    layout: ColumnLayout,
    row: RowStyle,
  ): string {
    const { value } = cell;
    const { bold } = row;
    if (values === "typed") {
      if (typeof value === "number" && Number.isFinite(value)) {
        const numberFormat =
          row.aggregate && isPlainNumber(cell, value)
            ? undefined
            : layout.numberFormat;
        return valueCell(
          reference,
          String(value),
          styles.index({ numberFormat, bold }),
        );
      }
      if (typeof value === "boolean") {
        return valueCell(
          reference,
          value ? "1" : "0",
          styles.index({ bold }),
          "b",
        );
      }
      const serial = value instanceof Date ? excelDateSerial(value) : null;
      if (serial !== null) {
        return valueCell(
          reference,
          String(serial),
          styles.index({ numberFormat: layout.dateFormat, bold }),
        );
      }
    }
    return stringCell(reference, cell.text, styles.index({ bold }));
  }

  function cellsXml(
    rowNumber: number,
    cells: readonly ExportCell[],
    row: RowStyle,
  ): string[] {
    return layouts.map((layout, index) =>
      cellXml(
        `${layout.name}${String(rowNumber)}`,
        cells[index] ?? EMPTY_CELL,
        layout,
        row,
      ),
    );
  }

  const rows: string[] = [];
  const nextRowNumber = () => rows.length + 1;

  for (const text of titleRows) {
    const rowNumber = nextRowNumber();
    rows.push(
      rowXml(rowNumber, [stringCell(`A${String(rowNumber)}`, text, 0)], 0),
    );
  }

  const headerRow = headerRowNumber(table, titleRows);
  if (headerRow !== undefined) {
    const header = layouts.map((layout) =>
      stringCell(
        `${layout.name}${String(headerRow)}`,
        layout.column.header,
        boldText,
      ),
    );
    rows.push(rowXml(headerRow, header, 0));
  }

  // Rows are outlined only beneath group headers; without them, summary
  // rows' levels would outline groups that have no header to collapse into.
  const outlined = table.rows.some((row) => row.kind === "group");
  let depth = 0;
  let deepest = 0;
  for (const row of table.rows) {
    const rowNumber = nextRowNumber();
    let level: number;
    let cells: string[];
    switch (row.kind) {
      case "data":
        level = depth;
        cells = cellsXml(rowNumber, row.cells, DATA_ROW);
        break;
      case "group":
        level = row.level;
        depth = row.level + 1;
        // The label takes the first column, as the grid's group header
        // spans the row; an inline aggregate there gives way to it.
        cells = cellsXml(rowNumber, row.cells, AGGREGATE_ROW);
        cells[0] = stringCell(`A${String(rowNumber)}`, row.label, boldText);
        break;
      case "groupSummary":
        level = row.level;
        depth = row.level;
        cells = cellsXml(rowNumber, row.cells, AGGREGATE_ROW);
        break;
    }
    const outlineLevel = outlined ? Math.min(level, MAX_OUTLINE_LEVEL) : 0;
    deepest = Math.max(deepest, outlineLevel);
    rows.push(rowXml(rowNumber, cells, outlineLevel));
  }

  if (table.footer !== null) {
    const rowNumber = nextRowNumber();
    rows.push(
      rowXml(
        rowNumber,
        cellsXml(rowNumber, table.footer.cells, AGGREGATE_ROW),
        0,
      ),
    );
  }

  // The outline buttons sit beside each group header, above its rows,
  // rather than below them where Excel puts them by default.
  const sheetProperties = outlined
    ? '<sheetPr><outlinePr summaryBelow="0"/></sheetPr>'
    : "";
  const frozenPane =
    headerRow === undefined
      ? ""
      : `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${String(headerRow)}" topLeftCell="A${String(headerRow + 1)}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft"/></sheetView></sheetViews>`;
  const outlineLevels =
    deepest > 0 ? ` outlineLevelRow="${String(deepest)}"` : "";
  return `${XML_DECLARATION}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${sheetProperties}${frozenPane}<sheetFormatPr defaultRowHeight="15"${outlineLevels}/>${colsXml(layouts)}<sheetData>${rows.join("")}</sheetData></worksheet>`;
}
