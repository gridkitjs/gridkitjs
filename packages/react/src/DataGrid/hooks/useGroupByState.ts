import { useCallback, type RefObject } from "react";
import {
  ALL_EXPANDED,
  type GroupByState,
  type GroupExpansionState,
} from "@gridkitjs/core";
import type { DataGridApi } from "../DataGrid";
import useGridSnapshot from "./useGridSnapshot";

const FALLBACK_GROUP_BY: GroupByState = [];
const FALLBACK_EXPANSION: GroupExpansionState = ALL_EXPANDED;

export interface GroupByStateApi {
  groupBy: GroupByState;
  groupExpansion: GroupExpansionState;
  expandAllGroups: () => void;
  collapseAllGroups: () => void;
}

/**
 * Reactive group-by and group-expansion state read off a mounted
 * `DataGrid`'s `ref`, for a group-by bar or summary sidebar living
 * outside the grid's own DOM.
 *
 * The ref's `setGroupBy` and `setGroupExpansion` change the grouping and the
 * group expansion for a custom group-by UI; this hook carries only the
 * all-at-once expansion actions. A specific
 * group's own computed aggregates are read off `getDisplayRows()`'s
 * per-header `aggregates` field instead of a getter here — see
 * `useAggregateState` for the grand-total equivalent.
 *
 * Before the grid mounts, `groupBy` reads as empty, `groupExpansion` as
 * `ALL_EXPANDED`, and the actions are no-ops.
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
