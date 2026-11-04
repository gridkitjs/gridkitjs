import { describe, expect, it } from "vitest";
import { resolveColumnFilterMenu } from "./filterMenu/options";
import { excelFilter } from "./presets";

describe("excelFilter", () => {
  it("turns filtering on with the excel editor and counts", () => {
    expect(excelFilter).toEqual({
      filterableColumns: true,
      filterMenu: { ui: "excel", showCounts: true },
    });
  });

  it("gives every column an excel menu with counts", () => {
    expect(resolveColumnFilterMenu(excelFilter, {})).toMatchObject({
      ui: "excel",
      showCounts: true,
    });
  });

  it("yields to an option spread after it", () => {
    const options = { ...excelFilter, filterMenu: { ui: "simple" } } as const;

    expect(resolveColumnFilterMenu(options, {})).toMatchObject({
      ui: "simple",
      showCounts: false,
    });
  });
});
