// Framework-agnostic grid logic: the grid's options and controller, column
// inference, sizing, ordering, selection, sorting, the filtering engine,
// grouping, aggregates, paging, the composed view, value formatting,
// virtualization math and keyboard navigation. Kept free of React and the DOM
// so it is testable in Node and reusable from any renderer.
export type {
  AggregateFn,
  AggregateResults,
  AggregateSpec,
  AggregateState,
  BuiltInAggregate,
  CellTemplateContext,
  ColumnDefinition,
  FieldPath,
  CellSelectEvent,
  CellSelectionChangeEvent,
  CellSelectionMode,
  CellSelectionState,
  ColumnAlignment,
  ColumnConstraints,
  ColumnOrderEvent,
  ColumnOrderState,
  ColumnResizeEvent,
  ColumnResizeSession,
  ColumnResolveOptions,
  ColumnSelectEvent,
  ColumnSelectionChangeEvent,
  ColumnSizeDefaults,
  ColumnSizingState,
  ColumnSortEntry,
  ColumnSortEvent,
  ColumnSortState,
  ColumnsSelectEvent,
  ColumnType,
  ColumnVisibilityEvent,
  ColumnVisibilityState,
  ColumnWrapConfig,
  DataColumn,
  DisplayRow,
  DropSide,
  FilterChangeEvent,
  FilterEntry,
  FilterPredicate,
  FilterState,
  FooterTemplateContext,
  GridState,
  GridView,
  GridViewInput,
  GridViewOptions,
  GroupAggregateDisplay,
  GroupByEntry,
  GroupByEvent,
  GroupByState,
  GroupExpansionEvent,
  GroupExpansionState,
  GroupFilterEntry,
  PaginationChangeEvent,
  PaginationState,
  PredicateFilterEntry,
  ResizeMode,
  ResolvedColumn,
  ResolvedGroupRow,
  ResolvedGroupSummaryRow,
  ResolvedRow,
  RowSelectEvent,
  RowSelectionChangeEvent,
  RowsSelectEvent,
  SelectableConfig,
  SelectedCell,
  SelectedCellRef,
  SelectedColumn,
  SelectIntent,
  SelectionDiff,
  SelectionMode,
  SelectionState,
  SortDirection,
  TextFilterEntry,
  ValueFilterEntry,
} from "./types";
export type {
  Borders,
  GridOptions,
  GroupByBarVisibility,
  HoverableConfig,
} from "./options";
export type {
  GridController,
  GridControllerOptions,
} from "./controller/gridController";
export { createGridController } from "./controller/createGridController";
export type { KeyShortcutCapabilities } from "./util/grid";
export {
  accessDotted,
  alignmentForType,
  buildKeyShortcuts,
  defineColumnsFromRows,
  getColumnId,
  resolveColumnHeaderText,
  resolveColumnLabel,
  resolveRowId,
} from "./util/grid";
export type { GridFocus, NavigationModifiers } from "./util/navigation";
export { clampFocus, HEADER_ROW, nextFocusForKey } from "./util/navigation";
export {
  applyColumnOrder,
  moveColumnBefore,
  movesColumn,
  resolveDataColumns,
  resolveDropBefore,
  resolveKeyboardDropTarget,
} from "./util/ordering";
export {
  applySelectionIntent,
  clearSelection,
  diffSelection,
  intentOf,
  isSameCell,
  selectAll,
  selectCell,
  selectOnly,
  selectRange,
  toggleCellSelection,
  toggleSelection,
} from "./util/selection";
export {
  DEFAULT_COLUMN_SIZES,
  KEYBOARD_STEP,
  applyColumnResize,
  beginColumnResize,
  clampColumnWidth,
  fitColumnsToWidth,
  resolveColumnConstraints,
  resolveColumnWidths,
  revertColumnSize,
  sizeColumnToContent,
  totalColumnWidth,
} from "./util/sizing";
export {
  compareValues,
  sortDirectionFor,
  sortPriorityFor,
  sortRows,
  toggleColumnSort,
} from "./util/sorting";
export {
  clearAllFilters,
  filterQueryFor,
  filterRows,
  matchesQuery,
  setColumnFilter,
} from "./util/filtering";
export {
  collapseAllGroups,
  expandAllGroups,
  groupRowId,
  groupRows,
  moveGroupByBefore,
  movesGroupBy,
  toggleGroupExpansion,
} from "./util/grouping";
export {
  resolveCell,
  resolveColumns,
  resolveRows,
  resolveShownRows,
} from "./util/rows";
export type { PaginatedRows } from "./util/paging";
export { paginateRows } from "./util/paging";
export type { PaginationWindowEntry } from "./util/paginationWindow";
export { paginationWindow } from "./util/paginationWindow";
export { computeAggregates, withGroupAggregates } from "./util/aggregation";
export {
  applyColumnVisibility,
  isColumnVisible,
  setColumnVisibility,
} from "./util/visibility";
export { createGridViewResolver, resolveGridView } from "./util/view";
export type { FormatLocale } from "./util/format";
export { formatAggregateValue, formatCellValue } from "./util/format";
export type { RowHeights, VisibleRange } from "./util/virtualization";
export { visibleRange } from "./util/virtualization";
