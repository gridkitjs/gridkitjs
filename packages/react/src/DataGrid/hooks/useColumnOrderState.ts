import { useCallback, type RefObject } from "react";
import type { ColumnOrderState } from "@gridkitjs/core";
import type { DataGridApi } from "../DataGrid";
import useGridSnapshot from "./useGridSnapshot";

const FALLBACK_ORDER: ColumnOrderState = [];

/**
 * Reactive column-order state read off a mounted `DataGrid`'s
 * `ref`. Reads only; change the order through the ref's `setColumnOrder`,
 * or hold it yourself with the controlled `columnOrder` prop.
 *
 * Before the grid mounts, reads as an empty array.
 */
export default function useColumnOrderState<Row>(
  gridRef: RefObject<DataGridApi<Row> | null>,
): ColumnOrderState {
  return useGridSnapshot(
    gridRef,
    useCallback((api: DataGridApi<Row>) => api.getColumnOrder(), []),
    FALLBACK_ORDER,
  );
}
