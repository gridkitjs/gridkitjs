import { useCallback, type RefObject } from "react";
import type { GroupByState, GroupExpansionState } from "@gridkitjs/core";
import type { DataGridApi } from "../DataGrid";
import useGridSnapshot from "./useGridSnapshot";

const FALLBACK_GROUP_BY: GroupByState = [];
const FALLBACK_EXPANSION: GroupExpansionState = [];

export interface GroupByStateApi {
  groupBy: GroupByState;
  groupExpansion: GroupExpansionState;
  expandAllGroups: () => void;
  collapseAllGroups: () => void;
}

/**
 * Reactive group-by and group-expansion state read off a mounted
 * `DataGridComponent`'s `ref`, for a group-by bar or summary sidebar living
 * outside the grid's own DOM.
 *
 * `DataGridApi` has no per-group toggle action today, only
 * `expandAllGroups`/`collapseAllGroups` — a custom group-by UI needing to
 * toggle a single group has no imperative action to call yet. A specific
 * group's own computed aggregates are read off `getDisplayRows()`'s
 * per-header `aggregates` field instead of a getter here — see
 * `useAggregateState` for the grand-total equivalent.
 *
 * Before the grid mounts, both fields read as empty and the actions are
 * no-ops.
 */
export default function useGroupByState<Row>(
  gridRef: RefObject<DataGridApi<Row> | null>,
): GroupByStateApi {
  const groupBy = useGridSnapshot(
    gridRef,
    useCallback((api: DataGridApi<Row>) => api.getGroupBy(), []),
    FALLBACK_GROUP_BY,
  );
  const groupExpansion = useGridSnapshot(
    gridRef,
    useCallback((api: DataGridApi<Row>) => api.getGroupExpansion(), []),
    FALLBACK_EXPANSION,
  );

  return {
    groupBy,
    groupExpansion,
    expandAllGroups: () => {
      gridRef.current?.expandAllGroups();
    },
    collapseAllGroups: () => {
      gridRef.current?.collapseAllGroups();
    },
  };
}
