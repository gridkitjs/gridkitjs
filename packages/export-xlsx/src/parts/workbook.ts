import { escapeXml, XML_DECLARATION } from "../xml";

/** A sheet name as a formula writes it: quoted, a quote inside doubled. */
function quotedSheetName(sheetName: string): string {
  return `'${sheetName.replaceAll("'", "''")}'`;
}

/**
 * The workbook part: its one sheet, and — when the sheet has a header row —
 * that row as the print titles, so a printout repeats the column names on
 * every page as the frozen pane keeps them on screen. `headerRow` is
 * 1-based, as Excel numbers rows.
 */
export function workbookXml(
  sheetName: string,
  headerRow: number | undefined,
): string {
  const printTitles =
    headerRow === undefined
      ? ""
      : `<definedNames><definedName name="_xlnm.Print_Titles" localSheetId="0">${escapeXml(
          `${quotedSheetName(sheetName)}!$${String(headerRow)}:$${String(headerRow)}`,
        )}</definedName></definedNames>`;
  return `${XML_DECLARATION}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/></sheets>${printTitles}</workbook>`;
}
