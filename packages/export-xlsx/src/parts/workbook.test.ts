import { describe, expect, test } from "vitest";

import { workbookXml } from "./workbook";

describe("workbookXml", () => {
  test("names its one sheet", () => {
    expect(workbookXml("Orders", undefined)).toContain(
      '<sheets><sheet name="Orders" sheetId="1" r:id="rId1"/></sheets>',
    );
  });

  test("escapes the sheet name", () => {
    expect(workbookXml("Tom & Jerry", undefined)).toContain(
      'name="Tom &amp; Jerry"',
    );
  });

  test("prints the header row on every page", () => {
    expect(workbookXml("Orders", 3)).toContain(
      `<definedName name="_xlnm.Print_Titles" localSheetId="0">'Orders'!$3:$3</definedName>`,
    );
  });

  test("quotes a sheet name holding a quote in the print titles", () => {
    expect(workbookXml("Q'4 & more", 1)).toContain(
      `>'Q''4 &amp; more'!$1:$1</definedName>`,
    );
  });

  test("leaves the print titles out without a header row", () => {
    expect(workbookXml("Orders", undefined)).not.toContain("definedName");
  });
});
