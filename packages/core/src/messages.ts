import type { SortDirection } from "./types";

/**
 * Every string a grid shows or announces of its own — the pager, the group-by
 * bar, the loading row, the text of a boolean or missing value, the labels of
 * its built-in commands, the names of its menus, toolbar and column chooser,
 * and the live-region
 * announcements — so a grid can
 * speak a language other than English. A message that names something takes
 * a function, so a translation can put the name where its own grammar wants
 * it.
 *
 * Text the data supplies (cells, headers, labels) is not here: it is already
 * the app's to choose. Nor is formatting — dates and numbers follow
 * `locale`.
 */
export interface GridMessages {
  /** The pager's accessible name. */
  pagerLabel: string;
  previousPage: string;
  nextPage: string;
  /** The page-size control's label. */
  pageSizeLabel: string;
  /** A numbered pager button's accessible name. */
  pageButtonLabel: (page: number) => string;
  /**
   * The compact pager's status, and what a page change announces. `page`
   * counts from one, and is `0` while there are no pages.
   */
  pageStatus: (page: number, pageCount: number) => string;
  /** The row shown while `infiniteScroll` loads more. */
  loadingMore: string;
  /** A boolean cell's text. */
  booleanTrue: string;
  booleanFalse: string;
  /** What a group header names a group of missing values. */
  blankGroupValue: string;
  /** The group-by bar's accessible name. */
  groupByBarLabel: string;
  /** Shown in an empty group-by bar a header can be dragged into. */
  groupByBarPlaceholder: string;
  /** A group-by chip's accessible name. `level` counts from one. */
  groupByChipLabel: (
    columnName: string,
    level: number,
    levelCount: number,
  ) => string;
  /** A group-by chip's remove button's accessible name. */
  removeGroupBy: (columnName: string) => string;
  /** Announced when a resize ends, `width` in whole pixels. */
  columnResized: (columnName: string, width: number) => string;
  /** Announced when a column is moved. `position` counts from one. */
  columnMoved: (
    columnName: string,
    position: number,
    columnCount: number,
  ) => string;
  /** Announced when a column is sorted. `key` is its place in the sort, from one. */
  columnSorted: (
    columnName: string,
    direction: SortDirection,
    key: number,
    keyCount: number,
  ) => string;
  /** Announced when a column leaves the sort. */
  sortCleared: (columnName: string) => string;
  /** Announced when a column is grouped by. `level` counts from one. */
  groupedBy: (columnName: string, level: number, levelCount: number) => string;
  /** Announced when a column leaves the grouping. */
  groupingRemoved: (columnName: string) => string;
  groupExpanded: string;
  groupCollapsed: string;
  allGroupsExpanded: string;
  allGroupsCollapsed: string;
  /** Announced when one change selects or deselects more than one row or column. */
  selectedCount: (count: number, target: "rows" | "columns") => string;
  /** Announced when a cell is selected. `rowNumber` counts from one. */
  cellSelected: (columnName: string, rowNumber: number) => string;
  /** Announced when one column is hidden. */
  columnHidden: (columnName: string) => string;
  /** Announced when one column is shown. */
  columnShown: (columnName: string) => string;
  /** Announced when one change hides more than one column. */
  columnsHidden: (count: number) => string;
  /** Announced when one change shows more than one column. */
  columnsShown: (count: number) => string;
  /**
   * Announced when one action autofits more than one column, as
   * `column.autoFitAll` does, in place of each column's `columnResized`.
   */
  columnsAutoFitted: (count: number) => string;
  /** A column header's context menu's accessible name. */
  headerMenuLabel: (columnName: string) => string;
  /** A data cell's context menu's accessible name — a menu for its row. */
  cellMenuLabel: string;
  /** A group header row's context menu's accessible name. */
  groupMenuLabel: string;
  /** The accessible name of the menu in the body's empty space. */
  bodyMenuLabel: string;
  /** The built-in `sort.ascending` command's label. */
  sortAscending: string;
  sortDescending: string;
  /** `sort.clear`: takes one column out of the sort. */
  clearSort: string;
  /** `sort.clearAll` */
  clearAllSorting: string;
  /** `group.add`, naming the column it groups by. */
  groupByColumn: (columnName: string) => string;
  /** `group.clearAll`. `group.remove` reads `removeGroupBy`, as the group-by chip's button does. */
  ungroupAll: string;
  expandAllGroups: string;
  collapseAllGroups: string;
  /** `column.hide` */
  hideColumn: string;
  /** `column.autoFit`: sizes the column to its content. */
  autoFitColumn: string;
  autoFitAllColumns: string;
  /** `selection.selectAllRows` */
  selectAllRows: string;
  /** `selection.clear` */
  clearSelection: string;
  /** `filter.clearAll`, which clears the search too. */
  clearFilters: string;
  /** `column.choose`, which opens the column chooser. */
  chooseColumns: string;
  /** The toolbar's accessible name, unless its `label` gives one. */
  toolbarLabel: string;
  /** The toolbar's search box's accessible name. */
  searchLabel: string;
  /** Shown in the toolbar's empty search box. */
  searchPlaceholder: string;
  /** The toolbar's "More" button, holding the items that do not fit. */
  moreToolbarItems: string;
  /** Announced when a search settles: how many rows it found. */
  searchResults: (count: number) => string;
  /** The column chooser's accessible name. */
  columnChooserLabel: string;
  /** The column chooser's search box's accessible name. */
  columnChooserSearchLabel: string;
  /** The column chooser's checkbox showing or hiding every column its search lists. */
  showAllColumns: string;
  /** Shown in the column chooser when its search matches no column. */
  noMatchingColumns: string;
  /** The toolbar's `"export"` dropdown, listing the export commands. */
  exportMenu: string;
  /** `export.csv` */
  exportCsv: string;
  /** `export.json` */
  exportJson: string;
  /** `export.xlsx`, shown once an xlsx writer is registered. */
  exportXlsx: string;
  /** `export.pdf`, shown once a PDF writer is registered. */
  exportPdf: string;
  /** `exportSelection.csv`: the selected rows only. */
  exportSelectionCsv: string;
  /** `exportSelection.json` */
  exportSelectionJson: string;
  /** `exportSelection.xlsx` */
  exportSelectionXlsx: string;
  /** Announced when an export's writer fails, so no file is saved. */
  exportFailed: string;
}

/** "3 columns hidden", "1 column shown", "2 columns autofitted". */
function columnCount(
  count: number,
  change: "hidden" | "shown" | "autofitted",
): string {
  return count === 1
    ? `1 column ${change}`
    : `${String(count)} columns ${change}`;
}

/** "3 rows found", "1 row found", "No rows found". */
function searchResults(count: number): string {
  if (count === 0) {
    return "No rows found";
  }
  return count === 1 ? "1 row found" : `${String(count)} rows found`;
}

/** "3 rows selected", "1 column selected", "No rows selected". */
function selectedCount(count: number, target: "rows" | "columns"): string {
  const noun = target === "rows" ? "row" : "column";
  if (count === 0) {
    return `No ${noun}s selected`;
  }
  return count === 1
    ? `1 ${noun} selected`
    : `${String(count)} ${noun}s selected`;
}

/** The grid's own English, which `messages` replaces key by key. */
export const defaultMessages: GridMessages = {
  pagerLabel: "Pagination",
  previousPage: "Previous",
  nextPage: "Next",
  pageSizeLabel: "Rows per page",
  pageButtonLabel: (page) => `Page ${String(page)}`,
  pageStatus: (page, pageCount) =>
    `Page ${String(page)} of ${String(pageCount)}`,
  loadingMore: "Loading more…",
  booleanTrue: "true",
  booleanFalse: "false",
  blankGroupValue: "(blank)",
  groupByBarLabel: "Grouped by",
  groupByBarPlaceholder: "Drag a column here to group by it",
  groupByChipLabel: (columnName, level, levelCount) =>
    levelCount > 1
      ? `${columnName}, level ${String(level)} of ${String(levelCount)}`
      : columnName,
  removeGroupBy: (columnName) => `Stop grouping by ${columnName}`,
  columnResized: (columnName, width) =>
    `${columnName}, ${String(width)} pixels wide`,
  columnMoved: (columnName, position, columnCount) =>
    `${columnName}, column ${String(position)} of ${String(columnCount)}`,
  columnSorted: (columnName, direction, key, keyCount) => {
    const sorted = `${columnName} sorted ${direction === "asc" ? "ascending" : "descending"}`;
    return keyCount > 1
      ? `${sorted}, key ${String(key)} of ${String(keyCount)}`
      : sorted;
  },
  sortCleared: (columnName) => `${columnName}, sort cleared`,
  groupedBy: (columnName, level, levelCount) =>
    levelCount > 1
      ? `Grouped by ${columnName}, level ${String(level)} of ${String(levelCount)}`
      : `Grouped by ${columnName}`,
  groupingRemoved: (columnName) => `${columnName}, grouping removed`,
  groupExpanded: "Group expanded",
  groupCollapsed: "Group collapsed",
  allGroupsExpanded: "All groups expanded",
  allGroupsCollapsed: "All groups collapsed",
  selectedCount,
  cellSelected: (columnName, rowNumber) =>
    `${columnName}, row ${String(rowNumber)}, selected`,
  columnHidden: (columnName) => `${columnName}, column hidden`,
  columnShown: (columnName) => `${columnName}, column shown`,
  columnsHidden: (count) => columnCount(count, "hidden"),
  columnsShown: (count) => columnCount(count, "shown"),
  columnsAutoFitted: (count) => columnCount(count, "autofitted"),
  headerMenuLabel: (columnName) => `${columnName} column menu`,
  cellMenuLabel: "Row menu",
  groupMenuLabel: "Group menu",
  bodyMenuLabel: "Grid menu",
  sortAscending: "Sort ascending",
  sortDescending: "Sort descending",
  clearSort: "Clear sort",
  clearAllSorting: "Clear all sorting",
  groupByColumn: (columnName) => `Group by ${columnName}`,
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
  searchResults,
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
};

/**
 * `messages` over the defaults — every key the grid needs, whichever the
 * caller gave. The defaults themselves, same object, when it gave none, so a
 * renderer memoising on the result does not see a change that is not one.
 */
export function resolveMessages(
  messages: Partial<GridMessages> | undefined,
): GridMessages {
  return messages === undefined
    ? defaultMessages
    : { ...defaultMessages, ...messages };
}
