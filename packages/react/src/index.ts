// React components will be exported from here. They consume the framework-agnostic logic in @gridkitjs/core.
export {
  DataGridComponent,
  type Borders,
  type CellSelectEvent,
  type CellSelectionChangeEvent,
  type ColumnDefinition,
  type ColumnSelectEvent,
  type ColumnSelectionChangeEvent,
  type ColumnsSelectEvent,
  type DataGridApi,
  type DataGridProps,
  type GroupByBarVisibility,
  type HoverableConfig,
  type PagerConfig,
  type PagerTemplateContext,
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
  ResolvedRow,
  RowSelectEvent,
  RowSelectionChangeEvent,
  RowsSelectEvent,
  SelectableConfig,
  SelectedCellRef,
  SelectionMode,
  SelectionState,
} from "@gridkitjs/core";

// Reactive hooks for building custom UI outside the grid's own DOM, each
// subscribing to `DataGridApi.subscribe` via `useSyncExternalStore`.
export { default as usePaginationState } from "./DataGrid/hooks/usePaginationState";
export type { PaginationStateApi } from "./DataGrid/hooks/usePaginationState";
