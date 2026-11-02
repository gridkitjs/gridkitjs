import { useCallback, type RefObject } from "react";
import type { ColumnVisibilityState } from "@gridkitjs/core";
import type { DataGridApi } from "../DataGrid";
import useGridSnapshot from "./useGridSnapshot";

const FALLBACK_VISIBILITY: ColumnVisibilityState = {};

/**
 * Reactive column-visibility state read off a mounted `DataGrid`'s `ref` —
 * the columns shown or hidden since it mounted, keyed by id. Read-only:
 * change it through the ref's `showColumns`/`hideColumns`. A column absent
 * from it follows its definition's `hidden`.
 *
 * Before the grid mounts, reads as an empty object.
 */
export default function useColumnVisibilityState<Row>(
  gridRef: RefObject<DataGridApi<Row> | null>,
): ColumnVisibilityState {
  return useGridSnapshot(
    gridRef,
    useCallback((api: DataGridApi<Row>) => api.getColumnVisibility(), []),
    FALLBACK_VISIBILITY,
  );
}
