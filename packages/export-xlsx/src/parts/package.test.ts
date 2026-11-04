import { describe, expect, test } from "vitest";

import {
  CONTENT_TYPES_XML,
  PACKAGE_RELATIONSHIPS_XML,
  WORKBOOK_RELATIONSHIPS_XML,
} from "./package";

describe("package parts", () => {
  test("types the workbook, sheet and styles parts", () => {
    expect(CONTENT_TYPES_XML).toContain(
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>',
    );
    expect(CONTENT_TYPES_XML).toContain(
      '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>',
    );
    expect(CONTENT_TYPES_XML).toContain(
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>',
    );
    expect(CONTENT_TYPES_XML).toContain('<Default Extension="rels"');
  });

  test("points the package at the workbook", () => {
    expect(PACKAGE_RELATIONSHIPS_XML).toContain(
      'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"',
    );
  });

  test("points the workbook at its sheet and styles", () => {
    expect(WORKBOOK_RELATIONSHIPS_XML).toContain(
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>',
    );
    expect(WORKBOOK_RELATIONSHIPS_XML).toContain(
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>',
    );
  });

  test("begins every part with the XML declaration", () => {
    for (const part of [
      CONTENT_TYPES_XML,
      PACKAGE_RELATIONSHIPS_XML,
      WORKBOOK_RELATIONSHIPS_XML,
    ]) {
      expect(part.startsWith('<?xml version="1.0" encoding="UTF-8"')).toBe(
        true,
      );
    }
  });
});
