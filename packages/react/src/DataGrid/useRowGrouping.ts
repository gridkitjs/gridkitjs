import type { Dispatch, SetStateAction } from "react";
import {
  collapseAllGroups,
  expandAllGroups,
  toggleGroupExpansion,
  type DisplayRow,
  type GroupByEvent,
  type GroupByState,
  type GroupExpansionEvent,
  type GroupExpansionState,
} from "@gridkitjs/core";
import { commitIfChanged } from "./commitIfChanged";

interface UseRowGroupingOptions {
  groupBy: GroupByState;
  setGroupBy: Dispatch<SetStateAction<GroupByState>>;
  expansion: GroupExpansionState;
  setExpansion: Dispatch<SetStateAction<GroupExpansionState>>;
  onGroupByChange?: ((event: GroupByEvent) => void) | undefined;
  onGroupExpansionChange?: ((event: GroupExpansionEvent) => void) | undefined;
}

export interface RowGroupingApi<Row> {
  groupBy: GroupByState;
  expansion: GroupExpansionState;
  isExpanded: (groupId: string) => boolean;
  toggleExpansion: (groupId: string) => void;
  expandAll: () => void;
  collapseAll: (rows: readonly DisplayRow<Row>[]) => void;
  /** Appends or removes columnId from the group-by stack — the state change a group-bar drop or a "group by this column" header action produces. */
  toggleGroupBy: (columnId: string) => void;
  /** Reorders the group-by stack — what dragging within the group bar produces. */
  moveGroupBy: (columnId: string, beforeColumnId: string | null) => void;
}

/**
 * Turns a group-header click, a "group by this column" action, or a
 * group-bar rearrange into the next `GroupByState`/`GroupExpansionState`,
 * committing through `commitIfChanged` exactly as `useColumnSort` does, so a
 * no-op neither re-renders nor fires its `onChange`.
 */
export default function useRowGrouping<Row>({
  groupBy,
  setGroupBy,
  expansion,
  setExpansion,
  onGroupByChange,
  onGroupExpansionChange,
}: UseRowGroupingOptions): RowGroupingApi<Row> {
  function commitExpansion(
    next: GroupExpansionState,
    groupId: string | null,
  ): void {
    commitIfChanged(expansion, next, setExpansion, (committed) => {
      onGroupExpansionChange?.({ groupId, expansion: committed });
    });
  }

  function commitGroupBy(next: GroupByState, columnId: string): void {
    commitIfChanged(groupBy, next, setGroupBy, (committed) => {
      onGroupByChange?.({ columnId, groupBy: committed });
    });
  }

  function toggleGroupBy(columnId: string): void {
    const isGrouped = groupBy.some((entry) => entry.columnId === columnId);
    const next = isGrouped
      ? groupBy.filter((entry) => entry.columnId !== columnId)
      : [...groupBy, { columnId }];
    commitGroupBy(next, columnId);
  }

  function moveGroupBy(columnId: string, beforeColumnId: string | null): void {
    if (columnId === beforeColumnId) {
      return;
    }
    const moved = groupBy.find((entry) => entry.columnId === columnId);
    if (moved === undefined) {
      return;
    }
    const without = groupBy.filter((entry) => entry.columnId !== columnId);
    const targetIndex =
      beforeColumnId === null
        ? without.length
        : without.findIndex((entry) => entry.columnId === beforeColumnId);
    if (targetIndex === -1) {
      return;
    }

    const rearranged = [...without];
    rearranged.splice(targetIndex, 0, moved);
    // Same reference-equality contract `moveColumnBefore` keeps: a move that
    // lands every entry back where it started reports no change at all.
    const next = rearranged.every((entry, index) => entry === groupBy[index])
      ? groupBy
      : rearranged;
    commitGroupBy(next, columnId);
  }

  return {
    groupBy,
    expansion,
    isExpanded: (groupId) => !expansion.includes(groupId),
    toggleExpansion: (groupId) => {
      commitExpansion(toggleGroupExpansion(expansion, groupId), groupId);
    },
    expandAll: () => {
      commitExpansion(expandAllGroups(expansion), null);
    },
    collapseAll: (rows) => {
      commitExpansion(collapseAllGroups(rows), null);
    },
    toggleGroupBy,
    moveGroupBy,
  };
}
