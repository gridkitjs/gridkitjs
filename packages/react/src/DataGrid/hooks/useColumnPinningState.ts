import { useCallback, type RefObject } from "react";
import type { ColumnPinningState } from "@gridkitjs/core";
import type { DataGridApi } from "../DataGrid";
import useGridSnapshot from "./useGridSnapshot";

const FALLBACK_PINNING: ColumnPinningState = {};

/**
 * Reactive column-pinning state read off a mounted `DataGrid`'s `ref` — the
 * columns pinned or unpinned since it mounted, keyed by id. Read-only:
 * change it through the ref's `pinColumn`/`setColumnPinning`. A column
 * absent from it follows its definition's `pinned`.
 *
 * Before the grid mounts, reads as an empty object.
 */
export default function useColumnPinningState<Row>(
  gridRef: RefObject<DataGridApi<Row> | null>,
): ColumnPinningState {
  return useGridSnapshot(
    gridRef,
    useCallback((api: DataGridApi<Row>) => api.getColumnPinning(), []),
    FALLBACK_PINNING,
  );
}
