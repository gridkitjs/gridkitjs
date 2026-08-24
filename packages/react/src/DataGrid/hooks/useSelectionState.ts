import { useCallback, type RefObject } from "react";
import type { CellSelectionState, SelectionState } from "@gridkitjs/core";
import type { DataGridApi } from "../DataGrid";
import useGridSnapshot from "./useGridSnapshot";

const FALLBACK_SELECTION: SelectionState = [];
const FALLBACK_CELL_SELECTION: CellSelectionState = null;

export interface SelectionStateApi {
  rowSelection: SelectionState;
  columnSelection: SelectionState;
  cellSelection: CellSelectionState;
  clearSelection: () => void;
  selectAllRows: () => void;
}

/**
 * Reactive row/column/cell selection state read off a mounted
 * `DataGridComponent`'s `ref`, for a "N rows selected" toolbar living
 * outside the grid's own DOM. One combined hook rather than three, matching
 * how `useGridSelection` already treats all three as one concern
 * internally.
 *
 * Before the grid mounts, the row/column fields read as empty arrays and
 * the cell field reads `null`; the actions are no-ops.
 */
export default function useSelectionState<Row>(
  gridRef: RefObject<DataGridApi<Row> | null>,
): SelectionStateApi {
  const rowSelection = useGridSnapshot(
    gridRef,
    useCallback((api: DataGridApi<Row>) => api.getRowSelection(), []),
    FALLBACK_SELECTION,
  );
  const columnSelection = useGridSnapshot(
    gridRef,
    useCallback((api: DataGridApi<Row>) => api.getColumnSelection(), []),
    FALLBACK_SELECTION,
  );
  const cellSelection = useGridSnapshot(
    gridRef,
    useCallback((api: DataGridApi<Row>) => api.getCellSelection(), []),
    FALLBACK_CELL_SELECTION,
  );

  return {
    rowSelection,
    columnSelection,
    cellSelection,
    clearSelection: () => {
      gridRef.current?.clearSelection();
    },
    selectAllRows: () => {
      gridRef.current?.selectAllRows();
    },
  };
}
