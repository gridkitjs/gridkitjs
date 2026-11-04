import { escapeXml, XML_DECLARATION } from "../xml";

/** How a cell looks: its number format code (General when absent) and weight. */
export interface CellStyle {
  readonly numberFormat?: string | undefined;
  readonly bold?: boolean | undefined;
}

/**
 * The workbook's styles, collected while the sheet is written: each cell
 * asks for the index of its style, and the styles part then lists exactly
 * the styles some cell used.
 */
export interface StyleSheet {
  /** The index a cell's `s` attribute names for `style`; `0` is the plain default. */
  readonly index: (style: CellStyle) => number;
  /** The styles part, holding every style `index` has handed out. */
  readonly xml: () => string;
}

/** Excel numbers custom formats from here; lower ids are its built-ins. */
const FIRST_CUSTOM_FORMAT = 164;

const FONT = '<sz val="11"/><name val="Calibri"/><family val="2"/>';

/**
 * The fonts, fills, borders and cell style every styles part carries.
 * Excel reserves the first two fills, so both are written though no cell
 * is filled.
 */
const FONTS = `<fonts count="2"><font>${FONT}</font><font><b/>${FONT}</font></fonts>`;
const FILLS =
  '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>';
const BORDERS =
  '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>';
const CELL_STYLE_FORMATS =
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>';
const CELL_STYLES =
  '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>';

export function createStyleSheet(): StyleSheet {
  const formatIds = new Map<string, number>();
  const styles = new Map<string, number>([["0|", 0]]);
  const cellFormats = [
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>',
  ];

  function formatId(code: string | undefined): number {
    if (code === undefined) {
      return 0;
    }
    let id = formatIds.get(code);
    if (id === undefined) {
      id = FIRST_CUSTOM_FORMAT + formatIds.size;
      formatIds.set(code, id);
    }
    return id;
  }

  function index({ numberFormat, bold = false }: CellStyle): number {
    const key = `${bold ? "1" : "0"}|${numberFormat ?? ""}`;
    const existing = styles.get(key);
    if (existing !== undefined) {
      return existing;
    }
    const added = cellFormats.length;
    cellFormats.push(
      `<xf numFmtId="${String(formatId(numberFormat))}" fontId="${bold ? "1" : "0"}" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>`,
    );
    styles.set(key, added);
    return added;
  }

  function xml(): string {
    const numberFormats =
      formatIds.size === 0
        ? ""
        : `<numFmts count="${String(formatIds.size)}">${[...formatIds]
            .map(
              ([code, id]) =>
                `<numFmt numFmtId="${String(id)}" formatCode="${escapeXml(code)}"/>`,
            )
            .join("")}</numFmts>`;
    return `${XML_DECLARATION}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${numberFormats}${FONTS}${FILLS}${BORDERS}${CELL_STYLE_FORMATS}<cellXfs count="${String(cellFormats.length)}">${cellFormats.join("")}</cellXfs>${CELL_STYLES}</styleSheet>`;
  }

  return { index, xml };
}
