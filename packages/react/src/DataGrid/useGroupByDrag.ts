import type { PointerEvent as ReactPointerEvent } from "react";
import type { GroupByState } from "@gridkitjs/core";
import {
  resolveGroupByDropTarget,
  type GroupByDropTarget,
} from "./groupByDropTarget";
import useDragReorder from "./useDragReorder";

interface UseGroupByDragOptions {
  groupBy: GroupByState;
  onDrop: (movedColumnId: string, beforeColumnId: string | null) => void;
}

export interface GroupByDragApi {
  /** The chip being dragged, for as long as the drag lasts. */
  draggedColumnId: string | null;
  /** Where it would land if released now. */
  dropTarget: GroupByDropTarget | null;
  /** Where the element trailing the pointer sits, as a CSS `transform`. */
  ghostTransform: string | null;
  startDrag: (columnId: string, event: ReactPointerEvent<HTMLElement>) => void;
  /** Whether the gesture that just ended was a drag rather than a click. */
  justDragged: () => boolean;
}

/**
 * Drag-to-reorder for chips inside the group-by bar, built on the same
 * `useDragReorder` mechanics `useColumnDrag` uses for headers — only the
 * hit-testing (`resolveGroupByDropTarget`, shared with a header dropped in
 * from outside the bar) differs.
 */
export default function useGroupByDrag({
  groupBy,
  onDrop,
}: UseGroupByDragOptions): GroupByDragApi {
  const drag = useDragReorder<GroupByDropTarget>({
    resolveTarget: (clientX, clientY, movedId) =>
      resolveGroupByDropTarget(clientX, clientY, movedId, groupBy),
    onDrop: (target, movedId) => {
      onDrop(movedId, target.beforeColumnId);
    },
  });

  return {
    draggedColumnId: drag.draggedId,
    dropTarget: drag.dropTarget,
    ghostTransform: drag.ghostTransform,
    startDrag: (columnId, event) => {
      drag.startDrag(columnId, event.currentTarget, event);
    },
    justDragged: drag.justDragged,
  };
}
