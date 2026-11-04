import { describe, expect, test } from "vitest";

import type { FilterOperator } from "../types";
import { defaultFilterOperators } from "./operators";
import { DEFAULT_FILTER_VALUE_LIMIT, resolveColumnFilterMenu } from "./options";

describe("resolveColumnFilterMenu", () => {
  test("no filter menu unless the grid or the column turns it on", () => {
    expect(resolveColumnFilterMenu({}, { type: "string" })).toBeNull();
    expect(
      resolveColumnFilterMenu({ filterableColumns: false }, { type: "string" }),
    ).toBeNull();
  });

  test("grid on, column off: the column has none", () => {
    expect(
      resolveColumnFilterMenu(
        { filterableColumns: true },
        { type: "string", filterable: false },
      ),
    ).toBeNull();
  });

  test("grid off, column on: the column has one", () => {
    expect(
      resolveColumnFilterMenu(
        { filterableColumns: false },
        { type: "number", filterable: true },
      ),
    ).not.toBeNull();
  });

  test("defaults: the simple editor, the type's operators, no counts", () => {
    expect(
      resolveColumnFilterMenu({ filterableColumns: true }, { type: "date" }),
    ).toEqual({
      ui: "simple",
      operators: defaultFilterOperators("date"),
      family: "date",
      showCounts: false,
      valueLimit: DEFAULT_FILTER_VALUE_LIMIT,
    });
    expect(DEFAULT_FILTER_VALUE_LIMIT).toBe(10_000);
  });

  test("takes the grid's settings", () => {
    const menu = resolveColumnFilterMenu(
      {
        filterableColumns: true,
        filterMenu: { ui: "excel", showCounts: true, valueLimit: 500 },
      },
      { type: "boolean" },
    );
    expect(menu).toEqual({
      ui: "excel",
      operators: defaultFilterOperators("boolean"),
      family: "boolean",
      showCounts: true,
      valueLimit: 500,
    });
  });

  test("the column's ui and operators win over the grid's", () => {
    const operators: readonly FilterOperator[] = ["startsWith", "eq"];
    const menu = resolveColumnFilterMenu(
      { filterableColumns: true, filterMenu: { ui: "excel" } },
      { type: "string", filterMenu: { ui: "simple", operators } },
    );
    expect(menu?.ui).toBe("simple");
    expect(menu?.operators).toBe(operators);
  });

  test("a column's ui alone keeps the grid's other settings", () => {
    const menu = resolveColumnFilterMenu(
      { filterableColumns: true, filterMenu: { showCounts: true } },
      { type: "string", filterMenu: { ui: "excel" } },
    );
    expect(menu?.ui).toBe("excel");
    expect(menu?.showCounts).toBe(true);
    expect(menu?.operators).toBe(defaultFilterOperators("string"));
  });

  test("drops in from a column's operators: the checklist is its editor", () => {
    const menu = resolveColumnFilterMenu(
      { filterableColumns: true },
      { type: "string", filterMenu: { operators: ["in", "eq", "contains"] } },
    );
    expect(menu?.operators).toEqual(["eq", "contains"]);
  });

  test("an empty operator list offers no condition", () => {
    const menu = resolveColumnFilterMenu(
      { filterableColumns: true },
      { type: "number", filterMenu: { ui: "excel", operators: [] } },
    );
    expect(menu?.operators).toEqual([]);
  });
});
