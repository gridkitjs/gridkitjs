import { describe, expect, test } from "vitest";
import {
  defaultFilterOperators,
  filterOperatorFamily,
} from "./filterMenu/operators";
import {
  createDefaultMessages,
  defaultMessages,
  resolveMessages,
  type GridMessages,
} from "./messages";
import type { ColumnType } from "./types";

/**
 * Every message rendered to text, functions called with sample arguments, so
 * the defaults can be compared with the strings the grid has always shown.
 */
function rendered(messages: GridMessages): Record<keyof GridMessages, string> {
  return {
    pagerLabel: messages.pagerLabel,
    firstPage: messages.firstPage,
    previousPage: messages.previousPage,
    nextPage: messages.nextPage,
    lastPage: messages.lastPage,
    pageSizeLabel: messages.pageSizeLabel,
    pageButtonLabel: messages.pageButtonLabel(3),
    pageStatus: messages.pageStatus(2, 5),
    loadingMore: messages.loadingMore,
    booleanTrue: messages.booleanTrue,
    booleanFalse: messages.booleanFalse,
    blankGroupValue: messages.blankGroupValue,
    groupByBarLabel: messages.groupByBarLabel,
    groupByBarPlaceholder: messages.groupByBarPlaceholder,
    groupByChipLabel: messages.groupByChipLabel("Region", 2, 3),
    removeGroupBy: messages.removeGroupBy("Region"),
    columnResized: messages.columnResized("Name", 120),
    columnMoved: messages.columnMoved("Name", 2, 4),
    columnSorted: messages.columnSorted("Name", "desc", 1, 2),
    sortCleared: messages.sortCleared("Name"),
    groupedBy: messages.groupedBy("Region", 1, 2),
    groupingRemoved: messages.groupingRemoved("Region"),
    groupExpanded: messages.groupExpanded,
    groupCollapsed: messages.groupCollapsed,
    allGroupsExpanded: messages.allGroupsExpanded,
    allGroupsCollapsed: messages.allGroupsCollapsed,
    selectedCount: messages.selectedCount(3, "rows"),
    cellSelected: messages.cellSelected("Name", 4),
    columnHidden: messages.columnHidden("Name"),
    columnShown: messages.columnShown("Name"),
    columnsHidden: messages.columnsHidden(3),
    columnsShown: messages.columnsShown(2),
    columnsAutoFitted: messages.columnsAutoFitted(4),
    headerMenuLabel: messages.headerMenuLabel("Name"),
    cellMenuLabel: messages.cellMenuLabel,
    groupMenuLabel: messages.groupMenuLabel,
    bodyMenuLabel: messages.bodyMenuLabel,
    sortAscending: messages.sortAscending,
    sortDescending: messages.sortDescending,
    clearSort: messages.clearSort,
    clearAllSorting: messages.clearAllSorting,
    groupByColumn: messages.groupByColumn("Region"),
    ungroupAll: messages.ungroupAll,
    expandAllGroups: messages.expandAllGroups,
    collapseAllGroups: messages.collapseAllGroups,
    hideColumn: messages.hideColumn,
    autoFitColumn: messages.autoFitColumn,
    autoFitAllColumns: messages.autoFitAllColumns,
    selectAllRows: messages.selectAllRows,
    clearSelection: messages.clearSelection,
    clearFilters: messages.clearFilters,
    chooseColumns: messages.chooseColumns,
    toolbarLabel: messages.toolbarLabel,
    searchLabel: messages.searchLabel,
    searchPlaceholder: messages.searchPlaceholder,
    moreToolbarItems: messages.moreToolbarItems,
    searchResults: messages.searchResults(3),
    columnChooserLabel: messages.columnChooserLabel,
    columnChooserSearchLabel: messages.columnChooserSearchLabel,
    showAllColumns: messages.showAllColumns,
    noMatchingColumns: messages.noMatchingColumns,
    filterOperatorLabel: messages.filterOperatorLabel("lt", "date"),
    filterBlanks: messages.filterBlanks,
    filterSearchFirst: messages.filterSearchFirst(12000),
    filterMoreValues: messages.filterMoreValues(250),
    openFilter: messages.openFilter,
    clearColumnFilter: messages.clearColumnFilter,
    filterMenuLabel: messages.filterMenuLabel("Name"),
    columnFiltered: messages.columnFiltered,
    applyFilter: messages.applyFilter,
    cancelFilter: messages.cancelFilter,
    customFilter: messages.customFilter,
    filterResults: messages.filterResults(3, 10),
    filterConditionLabel: messages.filterConditionLabel(2),
    filterOperatorFieldLabel: messages.filterOperatorFieldLabel,
    filterValueLabel: messages.filterValueLabel,
    filterFromLabel: messages.filterFromLabel,
    filterToLabel: messages.filterToLabel,
    filterCombinatorLabel: messages.filterCombinatorLabel,
    filterAnd: messages.filterAnd,
    filterOr: messages.filterOr,
    filterValueInvalid: messages.filterValueInvalid("number"),
    filterSearchLabel: messages.filterSearchLabel,
    filterSelectAll: messages.filterSelectAll,
    filterValuesLabel: messages.filterValuesLabel,
    filterByCondition: messages.filterByCondition,
    filterOperatorMenu: messages.filterOperatorMenu("date"),
    filterBackToValues: messages.filterBackToValues,
    exportMenu: messages.exportMenu,
    exportCsv: messages.exportCsv,
    exportJson: messages.exportJson,
    exportXlsx: messages.exportXlsx,
    exportPdf: messages.exportPdf,
    exportSelectionCsv: messages.exportSelectionCsv,
    exportSelectionJson: messages.exportSelectionJson,
    exportSelectionXlsx: messages.exportSelectionXlsx,
    exportFailed: messages.exportFailed,
    copyCell: messages.copyCell,
    copyRow: messages.copyRow,
    copySelection: messages.copySelection,
    copied: messages.copied(3, "rows"),
    copyFailed: messages.copyFailed,
    print: messages.print,
  };
}

describe("defaultMessages", () => {
  test("has a default for every key", () => {
    const keys = Object.keys(rendered(defaultMessages));
    expect(Object.keys(defaultMessages).sort()).toEqual(keys.sort());
    for (const value of Object.values(defaultMessages)) {
      expect(["string", "function"]).toContain(typeof value);
    }
  });

  test("reads as the grid's own English", () => {
    expect(rendered(createDefaultMessages("en"))).toEqual({
      pagerLabel: "Pagination",
      firstPage: "First",
      previousPage: "Previous",
      nextPage: "Next",
      lastPage: "Last",
      pageSizeLabel: "Rows per page",
      pageButtonLabel: "Page 3",
      pageStatus: "Page 2 of 5",
      loadingMore: "Loading more…",
      booleanTrue: "true",
      booleanFalse: "false",
      blankGroupValue: "(blank)",
      groupByBarLabel: "Grouped by",
      groupByBarPlaceholder: "Drag a column here to group by it",
      groupByChipLabel: "Region, level 2 of 3",
      removeGroupBy: "Stop grouping by Region",
      columnResized: "Name, 120 pixels wide",
      columnMoved: "Name, column 2 of 4",
      columnSorted: "Name sorted descending, key 1 of 2",
      sortCleared: "Name, sort cleared",
      groupedBy: "Grouped by Region, level 1 of 2",
      groupingRemoved: "Region, grouping removed",
      groupExpanded: "Group expanded",
      groupCollapsed: "Group collapsed",
      allGroupsExpanded: "All groups expanded",
      allGroupsCollapsed: "All groups collapsed",
      selectedCount: "3 rows selected",
      cellSelected: "Name, row 4, selected",
      columnHidden: "Name, column hidden",
      columnShown: "Name, column shown",
      columnsHidden: "3 columns hidden",
      columnsShown: "2 columns shown",
      columnsAutoFitted: "4 columns autofitted",
      headerMenuLabel: "Name column menu",
      cellMenuLabel: "Row menu",
      groupMenuLabel: "Group menu",
      bodyMenuLabel: "Grid menu",
      sortAscending: "Sort ascending",
      sortDescending: "Sort descending",
      clearSort: "Clear sort",
      clearAllSorting: "Clear all sorting",
      groupByColumn: "Group by Region",
      ungroupAll: "Ungroup all",
      expandAllGroups: "Expand all groups",
      collapseAllGroups: "Collapse all groups",
      hideColumn: "Hide column",
      autoFitColumn: "Autofit column",
      autoFitAllColumns: "Autofit all columns",
      selectAllRows: "Select all rows",
      clearSelection: "Clear selection",
      clearFilters: "Clear filters",
      chooseColumns: "Choose columns",
      toolbarLabel: "Grid toolbar",
      searchLabel: "Search",
      searchPlaceholder: "Search…",
      moreToolbarItems: "More",
      searchResults: "3 rows found",
      columnChooserLabel: "Columns",
      columnChooserSearchLabel: "Search columns",
      showAllColumns: "Show all",
      noMatchingColumns: "No matching columns",
      filterOperatorLabel: "Before",
      filterBlanks: "(Blanks)",
      filterSearchFirst: "Type to search 12,000 values",
      filterMoreValues: "250 more, refine the search",
      openFilter: "Filter…",
      clearColumnFilter: "Clear filter",
      filterMenuLabel: "Name filter",
      columnFiltered: "Filtered",
      applyFilter: "OK",
      cancelFilter: "Cancel",
      customFilter: "Custom filter",
      filterResults: "3 of 10 rows",
      filterConditionLabel: "Condition 2",
      filterOperatorFieldLabel: "Operator",
      filterValueLabel: "Value",
      filterFromLabel: "From",
      filterToLabel: "To",
      filterCombinatorLabel: "Combine conditions",
      filterAnd: "And",
      filterOr: "Or",
      filterValueInvalid: "Enter a number",
      filterSearchLabel: "Search values",
      filterSelectAll: "Select all",
      filterValuesLabel: "Values",
      filterByCondition: "Filtered by condition",
      filterOperatorMenu: "Date filters",
      filterBackToValues: "Back to values",
      exportMenu: "Export",
      exportCsv: "Export to CSV",
      exportJson: "Export to JSON",
      exportXlsx: "Export to Excel",
      exportPdf: "Export to PDF",
      exportSelectionCsv: "Export selection to CSV",
      exportSelectionJson: "Export selection to JSON",
      exportSelectionXlsx: "Export selection to Excel",
      exportFailed: "Export failed",
      copyCell: "Copy cell",
      copyRow: "Copy row",
      copySelection: "Copy selection",
      copied: "3 rows copied",
      copyFailed: "Copy failed",
      print: "Print",
    });
  });

  test("drops the level or key when there is only one", () => {
    expect(defaultMessages.groupByChipLabel("Region", 1, 1)).toBe("Region");
    expect(defaultMessages.groupedBy("Region", 1, 1)).toBe("Grouped by Region");
    expect(defaultMessages.columnSorted("Name", "asc", 1, 1)).toBe(
      "Name sorted ascending",
    );
  });

  test("counts a selection as none, one or many", () => {
    expect(defaultMessages.selectedCount(0, "rows")).toBe("No rows selected");
    expect(defaultMessages.selectedCount(1, "columns")).toBe(
      "1 column selected",
    );
    expect(defaultMessages.selectedCount(2, "columns")).toBe(
      "2 columns selected",
    );
  });

  test("counts a search's rows as none, one or many", () => {
    expect(defaultMessages.searchResults(0)).toBe("No rows found");
    expect(defaultMessages.searchResults(1)).toBe("1 row found");
    expect(defaultMessages.searchResults(12)).toBe("12 rows found");
  });

  test("counts columns shown or hidden as one or many", () => {
    expect(defaultMessages.columnsShown(1)).toBe("1 column shown");
    expect(defaultMessages.columnsHidden(1)).toBe("1 column hidden");
    expect(defaultMessages.columnsHidden(4)).toBe("4 columns hidden");
  });

  test("counts a copy as one or many", () => {
    expect(defaultMessages.copied(1, "cells")).toBe("1 cell copied");
    expect(defaultMessages.copied(1, "rows")).toBe("1 row copied");
    expect(defaultMessages.copied(2, "columns")).toBe("2 columns copied");
  });

  test("counts columns autofitted as one or many", () => {
    expect(defaultMessages.columnsAutoFitted(1)).toBe("1 column autofitted");
    expect(defaultMessages.columnsAutoFitted(3)).toBe("3 columns autofitted");
  });

  test("labels every operator a filter menu offers by default", () => {
    const labels = (type: ColumnType) =>
      defaultFilterOperators(type).map((operator) =>
        defaultMessages.filterOperatorLabel(
          operator,
          filterOperatorFamily(type),
        ),
      );
    expect(labels("string")).toEqual([
      "Contains",
      "Does not contain",
      "Equals",
      "Does not equal",
      "Starts with",
      "Ends with",
      "Is blank",
      "Is not blank",
    ]);
    expect(labels("number")).toEqual([
      "Equals",
      "Does not equal",
      "Greater than",
      "Greater than or equal to",
      "Less than",
      "Less than or equal to",
      "Between",
      "Is blank",
      "Is not blank",
    ]);
    expect(labels("date")).toEqual([
      "Equals",
      "Does not equal",
      "Before",
      "After",
      "Between",
      "Is blank",
      "Is not blank",
    ]);
    expect(labels("dateTime")).toEqual([
      "Before",
      "After",
      "Between",
      "Is blank",
      "Is not blank",
    ]);
    expect(labels("boolean")).toEqual(["Equals", "Is blank", "Is not blank"]);
  });

  test("reads a date's order as time and every other family's as size", () => {
    const { filterOperatorLabel } = defaultMessages;
    expect(filterOperatorLabel("lte", "date")).toBe("On or before");
    expect(filterOperatorLabel("gte", "date")).toBe("On or after");
    expect(filterOperatorLabel("lt", "number")).toBe("Less than");
    expect(filterOperatorLabel("gt", "text")).toBe("Greater than");
    expect(filterOperatorLabel("contains", "date")).toBe("Contains");
    expect(filterOperatorLabel("in", "text")).toBe("Is one of");
  });

  test("counts the values a checklist waits to search as one or many", () => {
    expect(defaultMessages.filterSearchFirst(1)).toBe("Type to search 1 value");
    expect(createDefaultMessages("en").filterSearchFirst(20000)).toBe(
      "Type to search 20,000 values",
    );
  });

  test("counts the rows a filter keeps of a total of one or many", () => {
    expect(defaultMessages.filterResults(0, 1)).toBe("0 of 1 row");
    expect(defaultMessages.filterResults(1, 1)).toBe("1 of 1 row");
    expect(defaultMessages.filterResults(0, 12)).toBe("0 of 12 rows");
  });

  test("counts in the runtime's own digits", () => {
    const digits = new Intl.NumberFormat();
    expect(defaultMessages.filterResults(1204, 10000)).toBe(
      `${digits.format(1204)} of ${digits.format(10000)} rows`,
    );
  });

  test("asks for the kind of value a condition's column holds", () => {
    const { filterValueInvalid } = defaultMessages;
    expect(filterValueInvalid("text")).toBe("Enter a value");
    expect(filterValueInvalid("number")).toBe("Enter a number");
    expect(filterValueInvalid("date")).toBe("Enter a date");
    expect(filterValueInvalid("boolean")).toBe("Choose a value");
  });

  test("names the menu of conditions after the kind of value its column holds", () => {
    const { filterOperatorMenu } = defaultMessages;
    expect(filterOperatorMenu("text")).toBe("Text filters");
    expect(filterOperatorMenu("number")).toBe("Number filters");
    expect(filterOperatorMenu("date")).toBe("Date filters");
    expect(filterOperatorMenu("boolean")).toBe("Boolean filters");
  });
});

describe("createDefaultMessages", () => {
  test("prints every count in the locale's digits", () => {
    const en = createDefaultMessages("en");
    expect(en.filterResults(1204, 10000)).toBe("1,204 of 10,000 rows");
    expect(en.filterMoreValues(1500)).toBe("1,500 more, refine the search");
    expect(en.copied(2048, "cells")).toBe("2,048 cells copied");
    expect(en.selectedCount(1000, "rows")).toBe("1,000 rows selected");
    expect(en.searchResults(4321)).toBe("4,321 rows found");
    expect(en.columnsHidden(1200)).toBe("1,200 columns hidden");
    expect(en.pageStatus(1000, 1250)).toBe("Page 1,000 of 1,250");
    expect(en.pageButtonLabel(1000)).toBe("Page 1,000");
    expect(en.cellSelected("Name", 1204)).toBe("Name, row 1,204, selected");
    expect(en.columnResized("Name", 1200)).toBe("Name, 1,200 pixels wide");
  });

  test("follows the locale's separators", () => {
    expect(createDefaultMessages("de-DE").filterResults(1204, 10000)).toBe(
      "1.204 of 10.000 rows",
    );
    expect(createDefaultMessages(["mk"]).filterSearchFirst(12000)).toBe(
      "Type to search 12.000 values",
    );
    expect(createDefaultMessages("fr").filterResults(1204, 10000)).toBe(
      "1 204 of 10 000 rows",
    );
  });

  test("leaves small counts as they were", () => {
    expect(createDefaultMessages("de-DE").filterResults(3, 10)).toBe(
      "3 of 10 rows",
    );
  });

  test("prints a count whole", () => {
    expect(createDefaultMessages("en").columnResized("Name", 120.6)).toBe(
      "Name, 121 pixels wide",
    );
  });
});

describe("resolveMessages", () => {
  test("is the defaults themselves when given none", () => {
    expect(resolveMessages(undefined)).toBe(defaultMessages);
  });

  test("is the same defaults for the same locale", () => {
    const de = resolveMessages(undefined, "de-DE");
    expect(resolveMessages(undefined, "de-DE")).toBe(de);
    expect(de.filterResults(1204, 10000)).toBe("1.204 of 10.000 rows");
  });

  test("lays the keys given over the locale's defaults", () => {
    const messages = resolveMessages({ nextPage: "Weiter" }, "de-DE");
    expect(messages.nextPage).toBe("Weiter");
    expect(messages.copied(1500, "rows")).toBe("1.500 rows copied");
  });

  test("replaces only the keys given", () => {
    const messages = resolveMessages({
      previousPage: "Zurück",
      pageStatus: (page, pageCount) =>
        `Seite ${String(page)} von ${String(pageCount)}`,
    });
    expect(messages.previousPage).toBe("Zurück");
    expect(messages.pageStatus(1, 3)).toBe("Seite 1 von 3");
    expect(messages.nextPage).toBe("Next");
    expect(messages.selectedCount).toBe(defaultMessages.selectedCount);
  });
});
