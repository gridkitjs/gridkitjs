import type { PointerEvent as ReactPointerEvent } from "react";
import {
  resolveKeyboardDropTarget,
  type ColumnOrderState,
  type GroupByState,
} from "@gridkitjs/core";
import { resolveColumnDropTarget, type ColumnDropTarget } from "@gridkitjs/dom";
import type { ResolvedColumn } from "./DataGrid";
import useDragReorder from "./useDragReorder";

interface UseColumnDragOptions {
  order: ColumnOrderState;
  /** What a drop onto the group-by bar is resolved against. */
  groupBy: GroupByState;
  /** Column ids whose header may be dragged into the group-by bar at all. */
  groupByDraggableIds: ReadonlySet<string>;
  onDrop: (target: ColumnDropTarget, movedId: string) => void;
}

export interface ColumnDragApi<Row> {
  /** The column being dragged, for as long as the drag lasts. */
  draggedColumnId: string | null;
  /** Where it would land if released now. */
  dropTarget: ColumnDropTarget | null;
  /** Where the element trailing the pointer sits, as a CSS `transform`. */
  ghostTransform: string | null;
  startDrag: (
    entry: ResolvedColumn<Row>,
    event: ReactPointerEvent<HTMLElement>,
  ) => void;
  /** Moves a column one place left (`-1`) or right (`1`). */
  moveByKeyboard: (entry: ResolvedColumn<Row>, direction: -1 | 1) => void;
  /**
   * Whether the column's last press opened a drag, so the click that follows
   * its release is not a click, for a header that has something of its own to
   * do with one. Reading it clears it.
   */
  justDragged: (columnId: string) => boolean;
}

/**
 * Turns a pointer drag over the header into a drop target, leaving `onDrop` to
 * apply it. Built on `useDragReorder`'s shared pointer mechanics, with
 * `@gridkitjs/dom`'s `resolveColumnDropTarget` as the hit-testing: another
 * header (reorder among columns) or the group-by bar (add this column to the
 * grouping), tried in that order.
 */
export default function useColumnDrag<Row>({
  order,
  groupBy,
  groupByDraggableIds,
  onDrop,
}: UseColumnDragOptions): ColumnDragApi<Row> {
  const drag = useDragReorder<ColumnDropTarget>({
    resolveTarget: (clientX, clientY, movedId) =>
      resolveColumnDropTarget(clientX, clientY, movedId, {
        order,
        groupBy,
        groupByDraggableIds,
      }),
    onDrop,
  });

  function startDrag(
    entry: ResolvedColumn<Row>,
    event: ReactPointerEvent<HTMLElement>,
  ): void {
    drag.startDrag(entry.id, event.currentTarget, event);
  }

  function moveByKeyboard(entry: ResolvedColumn<Row>, direction: -1 | 1): void {
    const beforeId = resolveKeyboardDropTarget(order, entry.id, direction);
    if (beforeId === undefined) {
      return;
    }
    onDrop({ kind: "column-order", beforeId }, entry.id);
  }

  // A new object each render, as `useColumnResize` returns: the handlers close
  // over `order`/`groupBy`, and a stable identity would buy nothing.
  return {
    draggedColumnId: drag.draggedId,
    dropTarget: drag.dropTarget,
    ghostTransform: drag.ghostTransform,
    startDrag,
    moveByKeyboard,
    justDragged: drag.justDragged,
  };
}
