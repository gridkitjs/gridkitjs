import { useCallback, type RefObject } from "react";
import type { ColumnSortState } from "@gridkitjs/core";
import type { DataGridApi } from "../DataGrid";
import useGridSnapshot from "./useGridSnapshot";

const FALLBACK_SORT: ColumnSortState = [];

/**
 * Reactive column-sort state read off a mounted `DataGrid`'s `ref`,
 * for a sort indicator living outside the grid's own DOM.
 *
 * Reads only; change the sort through the ref's `setColumnSort`, or hold it
 * yourself with the controlled `columnSort` prop.
 *
 * Before the grid mounts, reads as an empty array.
 */
export default function useColumnSortState<Row>(
  gridRef: RefObject<DataGridApi<Row> | null>,
): ColumnSortState {
  return useGridSnapshot(
    gridRef,
    useCallback((api: DataGridApi<Row>) => api.getColumnSort(), []),
    FALLBACK_SORT,
  );
}
