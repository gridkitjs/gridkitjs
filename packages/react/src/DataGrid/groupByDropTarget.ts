import {
  movesGroupBy,
  resolveDropBefore,
  type GroupByState,
} from "@gridkitjs/core";
import { elementAt, sideOf } from "./useDragReorder";

export interface GroupByDropTarget {
  readonly kind: "group-by";
  readonly beforeColumnId: string | null;
}

/**
 * Where a header or chip dropped at `(clientX, clientY)` would land within
 * the group-by bar, or `null` when the pointer isn't over the bar at all, or
 * when the drop would change nothing. Shared by `useColumnDrag` (a header
 * dragged in from outside the bar) and `useGroupByDrag` (a chip dragged
 * within it), so the two can never disagree about where a drop lands.
 */
export function resolveGroupByDropTarget(
  clientX: number,
  clientY: number,
  movedId: string,
  groupBy: GroupByState,
): GroupByDropTarget | null {
  const overBar = elementAt(clientX, clientY, "[data-gridkit-group-by-bar]");
  if (overBar === null) {
    return null;
  }

  const overChip = elementAt(clientX, clientY, "[data-gridkit-group-chip]");
  const chipId = overChip?.getAttribute("data-gridkit-group-chip");
  const beforeColumnId =
    overChip && chipId
      ? resolveDropBefore(
          groupBy.map((entry) => entry.columnId),
          chipId,
          sideOf(overChip, clientX),
        )
      : null; // Over the (possibly empty) bar itself, past every chip: append.

  return movesGroupBy(groupBy, movedId, beforeColumnId)
    ? { kind: "group-by", beforeColumnId }
    : null;
}
