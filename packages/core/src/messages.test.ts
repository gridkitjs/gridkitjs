import { describe, expect, test } from "vitest";
import {
  defaultMessages,
  resolveMessages,
  type GridMessages,
} from "./messages";

/**
 * Every message rendered to text, functions called with sample arguments, so
 * the defaults can be compared with the strings the grid has always shown.
 */
function rendered(messages: GridMessages): Record<keyof GridMessages, string> {
  return {
    pagerLabel: messages.pagerLabel,
    previousPage: messages.previousPage,
    nextPage: messages.nextPage,
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
    expect(rendered(defaultMessages)).toEqual({
      pagerLabel: "Pagination",
      previousPage: "Previous",
      nextPage: "Next",
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
});

describe("resolveMessages", () => {
  test("is the defaults themselves when given none", () => {
    expect(resolveMessages(undefined)).toBe(defaultMessages);
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
