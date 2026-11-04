// React components will be exported from here. They consume the framework-agnostic logic in @gridkitjs/core.
export {
  DataGrid,
  type Borders,
  type CellSelectEvent,
  type CellSelectionChangeEvent,
  type ColumnDefinition,
  type ColumnSelectEvent,
  type ColumnSelectionChangeEvent,
  type ColumnsSelectEvent,
  type DataColumn,
  type DataGridApi,
  type DataGridProps,
  type GroupByBarVisibility,
  type HoverableConfig,
  type InfiniteScrollConfig,
  type PagerConfig,
  type PagerTemplateContext,
  type ReactRenderSlots,
  type ResizeMode,
  type ResolvedColumn,
  type SelectedCell,
  type SelectedColumn,
} from "./DataGrid/DataGrid";
// Re-exported so a consumer wiring up resize or selection, or typing a
// standalone cellTemplate, needs one import and not two. The row payloads name
// no node type of their own, so they come straight from core.
export type {
  CellSelectionMode,
  CellSelectionState,
  CellTemplateContext,
  ColumnResizeEvent,
  ColumnSizeDefaults,
  ColumnSizingState,
  ColumnVisibilityEvent,
  ColumnVisibilityState,
  ContextMenuOpenChangeEvent,
  FilterChangeEvent,
  FilterEntry,
  FilterState,
  GridCommand,
  GridCommandEvent,
  GridCommandTarget,
  GridContextMenuOptions,
  GridContextMenuRequest,
  GridContextMenuTarget,
  GridMessages,
  GridOptions,
  GridState,
  GridToolbarOptions,
  MenuEntry,
  SerializedGridState,
  ResolvedRow,
  RowPointerEvent,
  RowProps,
  RowSelectEvent,
  RowSelectionChangeEvent,
  RowsSelectEvent,
  SelectableConfig,
  SelectedCellRef,
  SelectionMode,
  SelectionState,
  ToolbarEntry,
} from "@gridkitjs/core";

// Re-exported for the same reason: saving `getState()` as JSON goes through it.
export { serializeGridState } from "@gridkitjs/core";

// Reactive hooks for building custom UI outside the grid's own DOM, each
// subscribing to `DataGridApi.subscribe` via `useSyncExternalStore`.
export { default as usePaginationState } from "./DataGrid/hooks/usePaginationState";
export type { PaginationStateApi } from "./DataGrid/hooks/usePaginationState";
export { default as useGroupByState } from "./DataGrid/hooks/useGroupByState";
export type { GroupByStateApi } from "./DataGrid/hooks/useGroupByState";
export { default as useColumnSortState } from "./DataGrid/hooks/useColumnSortState";
export { default as useSelectionState } from "./DataGrid/hooks/useSelectionState";
export type { SelectionStateApi } from "./DataGrid/hooks/useSelectionState";
export { default as useAggregateState } from "./DataGrid/hooks/useAggregateState";
export { default as useColumnSizingState } from "./DataGrid/hooks/useColumnSizingState";
export { default as useColumnOrderState } from "./DataGrid/hooks/useColumnOrderState";
export { default as useColumnVisibilityState } from "./DataGrid/hooks/useColumnVisibilityState";
export { default as useFilterState } from "./DataGrid/hooks/useFilterState";
export type { FilterStateApi } from "./DataGrid/hooks/useFilterState";

// Re-exported so typing an export — its options, a writer of the app's own,
// the file a writer gives — needs no import from core.
export type {
  ExportFile,
  ExportOptions,
  ExportWriter,
  GridExportOptions,
} from "@gridkitjs/core";
