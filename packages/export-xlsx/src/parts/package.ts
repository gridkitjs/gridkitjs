import { XML_DECLARATION } from "../xml";

/**
 * The parts that hold a workbook together and never change: what each part
 * is, where the workbook starts, and which sheet and styles it has. The
 * minimum ECMA-376 asks of a SpreadsheetML package with one sheet.
 */

/** Where each part sits in the zip, a part name to its path. */
export const PART_PATHS = {
  contentTypes: "[Content_Types].xml",
  packageRelationships: "_rels/.rels",
  workbook: "xl/workbook.xml",
  workbookRelationships: "xl/_rels/workbook.xml.rels",
  sheet: "xl/worksheets/sheet1.xml",
  styles: "xl/styles.xml",
} as const;

const SPREADSHEET =
  "application/vnd.openxmlformats-officedocument.spreadsheetml";
const RELATIONSHIPS =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

export const CONTENT_TYPES_XML = `${XML_DECLARATION}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/${PART_PATHS.workbook}" ContentType="${SPREADSHEET}.sheet.main+xml"/><Override PartName="/${PART_PATHS.sheet}" ContentType="${SPREADSHEET}.worksheet+xml"/><Override PartName="/${PART_PATHS.styles}" ContentType="${SPREADSHEET}.styles+xml"/></Types>`;

export const PACKAGE_RELATIONSHIPS_XML = `${XML_DECLARATION}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${RELATIONSHIPS}/officeDocument" Target="${PART_PATHS.workbook}"/></Relationships>`;

/** Targets are relative to the workbook's own folder, `xl/`. */
export const WORKBOOK_RELATIONSHIPS_XML = `${XML_DECLARATION}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${RELATIONSHIPS}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${RELATIONSHIPS}/styles" Target="styles.xml"/></Relationships>`;
