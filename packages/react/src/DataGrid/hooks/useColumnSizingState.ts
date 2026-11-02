import { useCallback, type RefObject } from "react";
import type { ColumnSizingState } from "@gridkitjs/core";
import type { DataGridApi } from "../DataGrid";
import useGridSnapshot from "./useGridSnapshot";

const FALLBACK_SIZING: ColumnSizingState = {};

/**
 * Reactive column-sizing state read off a mounted `DataGrid`'s
 * `ref`. Reads only; change the widths through the ref's `setColumnSizing`,
 * or hold them yourself with the controlled `columnSizing` prop.
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
