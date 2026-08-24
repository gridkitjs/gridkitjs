import { useCallback, type RefObject } from "react";
import type { ColumnSizingState } from "@gridkitjs/core";
import type { DataGridApi } from "../DataGrid";
import useGridSnapshot from "./useGridSnapshot";

const FALLBACK_SIZING: ColumnSizingState = {};

/**
 * Reactive column-sizing state read off a mounted `DataGridComponent`'s
 * `ref`. Read-only — sizing stays uncontrolled via `defaultColumnSizing`/the
 * grid's own resize handles, the same gap `useColumnSortState` has for sort.
 *
 * Before the grid mounts, reads as an empty object.
 */
export default function useColumnSizingState<Row>(
  gridRef: RefObject<DataGridApi<Row> | null>,
): ColumnSizingState {
  return useGridSnapshot(
    gridRef,
    useCallback((api: DataGridApi<Row>) => api.getColumnSizing(), []),
    FALLBACK_SIZING,
  );
}
