import type { FilterOperatorFamily } from "./filterMenu/operators";
import type { FilterOperator, SortDirection } from "./types";
import type { FormatLocale } from "./util/format";

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
 * `locale`, and so do the counts the defaults print: "1,204 of 10,000 rows"
 * under `"en"`, "1.204 of 10.000 rows" under `"de-DE"`.
 */
export interface GridMessages {
  /** The pager's accessible name. */
  pagerLabel: string;
  /** The pager button to the first page; drawn as an icon, so this is its accessible name. */
  firstPage: string;
  /** The pager button to the previous page; its accessible name. */
  previousPage: string;
  /** The pager button to the next page; its accessible name. */
  nextPage: string;
  /** The pager button to the last page; its accessible name. */
  lastPage: string;
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
  /**
   * A condition's operator, as a filter menu lists it. `family` is the
   * column's (`filterOperatorFamily`), so a date can read `lt` as "Before"
   * where a number reads "Less than".
   */
  filterOperatorLabel: (
    operator: FilterOperator,
    family: FilterOperatorFamily,
  ) => string;
  /** A filter checklist's item for the column's blank cells. */
  filterBlanks: string;
  /**
   * Shown in place of a filter checklist whose column holds more values
   * than `filterMenu.valueLimit`, until something is searched.
   */
  filterSearchFirst: (total: number) => string;
  /** Shown under a searched filter checklist `filterMenu.valueLimit` cut short: how many matches it left out. */
  filterMoreValues: (count: number) => string;
  /** `filter.open`, which opens a column's filter menu. */
  openFilter: string;
  /** `filter.clear`, and the filter menu's button doing the same: clears one column's filter. */
  clearColumnFilter: string;
  /** A column's filter menu's accessible name. */
  filterMenuLabel: (columnName: string) => string;
  /** What a column header is described as while its column is filtered. */
  columnFiltered: string;
  /** The filter menu's button applying what it holds. */
  applyFilter: string;
  /** The filter menu's button closing it without applying. */
  cancelFilter: string;
  /**
   * Shown in a filter menu for a filter its editor cannot show — a
   * predicate, a text query, a group across columns — which applying
   * replaces.
   */
  customFilter: string;
  /** Announced when a filter menu applies: how many rows the filter keeps, of how many. */
  filterResults: (shown: number, total: number) => string;
  /** The accessible name of one of a filter menu's conditions. `position` counts from one. */
  filterConditionLabel: (position: number) => string;
  /** The accessible name of a condition's operator picker. */
  filterOperatorFieldLabel: string;
  /** The accessible name of a condition's value box. */
  filterValueLabel: string;
  /** The accessible name of a `between` condition's first value box, its lower end. */
  filterFromLabel: string;
  /** The accessible name of a `between` condition's second value box, its upper end. */
  filterToLabel: string;
  /** The accessible name of the choice joining a filter menu's two conditions. */
  filterCombinatorLabel: string;
  /** Joins two conditions: a row has to meet both. */
  filterAnd: string;
  /** Joins two conditions: a row has to meet either. */
  filterOr: string;
  /**
   * Shown under a filter menu's conditions when one's value is missing or
   * doesn't read as its column's `family` (`filterOperatorFamily`) — "Enter
   * a number" on a number column.
   */
  filterValueInvalid: (family: FilterOperatorFamily) => string;
  /** The accessible name of a filter checklist's search box. */
  filterSearchLabel: string;
  /** The checkbox above a filter checklist checking every value its search shows. */
  filterSelectAll: string;
  /** The accessible name of a filter checklist's list of values. */
  filterValuesLabel: string;
  /**
   * Shown above a filter checklist whose column is filtered by conditions,
   * which checking values replaces.
   */
  filterByCondition: string;
  /**
   * The excel editor's button opening the conditions its column offers, and
   * that menu's accessible name — "Number filters" on a number column, by
   * its `family` (`filterOperatorFamily`).
   */
  filterOperatorMenu: (family: FilterOperatorFamily) => string;
  /** The button taking the excel editor from a condition back to its checklist. */
  filterBackToValues: string;
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
  /** `copy.cell` */
  copyCell: string;
  /** `copy.row` */
  copyRow: string;
  /** `copy.selection` */
  copySelection: string;
  /** Announced once a copy is on the clipboard. */
  copied: (count: number, unit: "cells" | "rows" | "columns") => string;
  /** Announced when the browser refuses the clipboard, so nothing was copied. */
  copyFailed: string;
  /** `print` */
  print: string;
}

/** Prints a count — "1,204" under `"en"`, "1.204" under `"de-DE"`. */
type CountFormat = (count: number) => string;

function localeKey(locale: FormatLocale): string {
  return typeof locale === "string" ? locale : (locale?.join(",") ?? "");
}

/**
 * Count formats already built, one per locale: building an
 * `Intl.NumberFormat` costs far more than using one.
 */
const countFormats = new Map<string, CountFormat>();

/** A count in `locale`'s digits and separators, whole — a count has no fraction. */
function countFormat(locale: FormatLocale): CountFormat {
  const key = localeKey(locale);
  let format = countFormats.get(key);
  if (format === undefined) {
    const numberFormat = new Intl.NumberFormat(locale, {
      maximumFractionDigits: 0,
    });
    format = (count) => numberFormat.format(count);
    countFormats.set(key, format);
  }
  return format;
}

/** "3 columns hidden", "1 column shown", "2 columns autofitted". */
function columnCount(
  n: CountFormat,
  count: number,
  change: "hidden" | "shown" | "autofitted",
): string {
  return count === 1 ? `1 column ${change}` : `${n(count)} columns ${change}`;
}

/** "3 rows found", "1 row found", "No rows found". */
function searchResults(n: CountFormat, count: number): string {
  if (count === 0) {
    return "No rows found";
  }
  return count === 1 ? "1 row found" : `${n(count)} rows found`;
}

/** "3 rows selected", "1 column selected", "No rows selected". */
function selectedCount(
  n: CountFormat,
  count: number,
  target: "rows" | "columns",
): string {
  const noun = target === "rows" ? "row" : "column";
  if (count === 0) {
    return `No ${noun}s selected`;
  }
  return count === 1 ? `1 ${noun} selected` : `${n(count)} ${noun}s selected`;
}

const operatorLabels: Readonly<Record<FilterOperator, string>> = {
  eq: "Equals",
  ne: "Does not equal",
  contains: "Contains",
  notContains: "Does not contain",
  startsWith: "Starts with",
  endsWith: "Ends with",
  gt: "Greater than",
  gte: "Greater than or equal to",
  lt: "Less than",
  lte: "Less than or equal to",
  between: "Between",
  in: "Is one of",
  isEmpty: "Is blank",
  isNotEmpty: "Is not blank",
};

/** Where a date's order reads as time rather than size. */
const dateOperatorLabels: Readonly<Partial<Record<FilterOperator, string>>> = {
  lt: "Before",
  lte: "On or before",
  gt: "After",
  gte: "On or after",
};

/** "Before" on a date, "Less than" on a number, "Contains" on either. */
function filterOperatorLabel(
  operator: FilterOperator,
  family: FilterOperatorFamily,
): string {
  return (
    (family === "date" ? dateOperatorLabels[operator] : undefined) ??
    operatorLabels[operator]
  );
}

/** "Type to search 12,000 values", "Type to search 1 value". */
function filterSearchFirst(n: CountFormat, total: number): string {
  return total === 1
    ? "Type to search 1 value"
    : `Type to search ${n(total)} values`;
}

/** "1,204 of 10,000 rows", "1 of 1 row". */
function filterResults(n: CountFormat, shown: number, total: number): string {
  return `${n(shown)} of ${n(total)} ${total === 1 ? "row" : "rows"}`;
}

/** What a condition's value box asks for, by the kind of value its column holds. */
const filterValueRequests: Readonly<Record<FilterOperatorFamily, string>> = {
  text: "Enter a value",
  number: "Enter a number",
  date: "Enter a date",
  boolean: "Choose a value",
};

/** The excel editor's menu of conditions, by the kind of value its column holds. */
const filterOperatorMenus: Readonly<Record<FilterOperatorFamily, string>> = {
  text: "Text filters",
  number: "Number filters",
  date: "Date filters",
  boolean: "Boolean filters",
};

/** "1 cell copied", "3 rows copied", "2 columns copied". */
function copied(
  n: CountFormat,
  count: number,
  unit: "cells" | "rows" | "columns",
): string {
  return count === 1
    ? `1 ${unit.slice(0, -1)} copied`
    : `${n(count)} ${unit} copied`;
}

/**
 * The grid's own English, its counts printed in `locale`'s digits —
 * "1,204 of 10,000 rows" under `"en"`, "1.204 of 10.000 rows" under
 * `"de-DE"`. Without a locale, the runtime's own; that one is
 * `defaultMessages`.
 */
export function createDefaultMessages(locale?: FormatLocale): GridMessages {
  const n = countFormat(locale);
  return {
    pagerLabel: "Pagination",
    firstPage: "First",
    previousPage: "Previous",
    nextPage: "Next",
    lastPage: "Last",
    pageSizeLabel: "Rows per page",
    pageButtonLabel: (page) => `Page ${n(page)}`,
    pageStatus: (page, pageCount) => `Page ${n(page)} of ${n(pageCount)}`,
    loadingMore: "Loading more…",
    booleanTrue: "true",
    booleanFalse: "false",
    blankGroupValue: "(blank)",
    groupByBarLabel: "Grouped by",
    groupByBarPlaceholder: "Drag a column here to group by it",
    groupByChipLabel: (columnName, level, levelCount) =>
      levelCount > 1
        ? `${columnName}, level ${n(level)} of ${n(levelCount)}`
        : columnName,
    removeGroupBy: (columnName) => `Stop grouping by ${columnName}`,
    columnResized: (columnName, width) =>
      `${columnName}, ${n(width)} pixels wide`,
    columnMoved: (columnName, position, columnCount) =>
      `${columnName}, column ${n(position)} of ${n(columnCount)}`,
    columnSorted: (columnName, direction, key, keyCount) => {
      const sorted = `${columnName} sorted ${direction === "asc" ? "ascending" : "descending"}`;
      return keyCount > 1
        ? `${sorted}, key ${n(key)} of ${n(keyCount)}`
        : sorted;
    },
    sortCleared: (columnName) => `${columnName}, sort cleared`,
    groupedBy: (columnName, level, levelCount) =>
      levelCount > 1
        ? `Grouped by ${columnName}, level ${n(level)} of ${n(levelCount)}`
        : `Grouped by ${columnName}`,
    groupingRemoved: (columnName) => `${columnName}, grouping removed`,
    groupExpanded: "Group expanded",
    groupCollapsed: "Group collapsed",
    allGroupsExpanded: "All groups expanded",
    allGroupsCollapsed: "All groups collapsed",
    selectedCount: (count, target) => selectedCount(n, count, target),
    cellSelected: (columnName, rowNumber) =>
      `${columnName}, row ${n(rowNumber)}, selected`,
    columnHidden: (columnName) => `${columnName}, column hidden`,
    columnShown: (columnName) => `${columnName}, column shown`,
    columnsHidden: (count) => columnCount(n, count, "hidden"),
    columnsShown: (count) => columnCount(n, count, "shown"),
    columnsAutoFitted: (count) => columnCount(n, count, "autofitted"),
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
    searchResults: (count) => searchResults(n, count),
    columnChooserLabel: "Columns",
    columnChooserSearchLabel: "Search columns",
    showAllColumns: "Show all",
    noMatchingColumns: "No matching columns",
    filterOperatorLabel,
    filterBlanks: "(Blanks)",
    filterSearchFirst: (total) => filterSearchFirst(n, total),
    filterMoreValues: (count) => `${n(count)} more, refine the search`,
    openFilter: "Filter…",
    clearColumnFilter: "Clear filter",
    filterMenuLabel: (columnName) => `${columnName} filter`,
    columnFiltered: "Filtered",
    applyFilter: "OK",
    cancelFilter: "Cancel",
    customFilter: "Custom filter",
    filterResults: (shown, total) => filterResults(n, shown, total),
    filterConditionLabel: (position) => `Condition ${n(position)}`,
    filterOperatorFieldLabel: "Operator",
    filterValueLabel: "Value",
    filterFromLabel: "From",
    filterToLabel: "To",
    filterCombinatorLabel: "Combine conditions",
    filterAnd: "And",
    filterOr: "Or",
    filterValueInvalid: (family) => filterValueRequests[family],
    filterSearchLabel: "Search values",
    filterSelectAll: "Select all",
    filterValuesLabel: "Values",
    filterByCondition: "Filtered by condition",
    filterOperatorMenu: (family) => filterOperatorMenus[family],
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
    copied: (count, unit) => copied(n, count, unit),
    copyFailed: "Copy failed",
    print: "Print",
  };
}

/** The grid's own English, which `messages` replaces key by key. */
export const defaultMessages: GridMessages = createDefaultMessages();

/** The defaults made for each `locale` so far — one object per locale. */
const localeDefaults = new Map<string, GridMessages>();

function defaultsFor(locale: FormatLocale): GridMessages {
  if (locale === undefined) {
    return defaultMessages;
  }
  const key = localeKey(locale);
  let defaults = localeDefaults.get(key);
  if (defaults === undefined) {
    defaults = createDefaultMessages(locale);
    localeDefaults.set(key, defaults);
  }
  return defaults;
}

/**
 * `messages` over the defaults for `locale` — every key the grid needs,
 * whichever the caller gave, the defaults counting in `locale`'s digits. The
 * defaults themselves, same object for the same locale, when it gave none, so
 * a renderer memoising on the result does not see a change that is not one.
 */
export function resolveMessages(
  messages: Partial<GridMessages> | undefined,
  locale?: FormatLocale,
): GridMessages {
  const defaults = defaultsFor(locale);
  return messages === undefined ? defaults : { ...defaults, ...messages };
}
