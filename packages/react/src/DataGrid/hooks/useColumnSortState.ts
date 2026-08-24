import { useCallback, type RefObject } from "react";
import type { ColumnSortState } from "@gridkitjs/core";
import type { DataGridApi } from "../DataGrid";
import useGridSnapshot from "./useGridSnapshot";

const FALLBACK_SORT: ColumnSortState = [];

/**
 * Reactive column-sort state read off a mounted `DataGridComponent`'s `ref`,
 * for a sort indicator living outside the grid's own DOM.
 *
 * `DataGridApi` has no sort-mutating action today — sort stays uncontrolled
 * via `defaultColumnSort`/the grid's own header UI, the same gap
 * `useGroupByState` has for group-by. Reads only.
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
