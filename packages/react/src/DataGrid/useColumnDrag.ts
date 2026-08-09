import type { PointerEvent as ReactPointerEvent } from "react";
import {
  movesColumn,
  resolveDropBefore,
  resolveKeyboardDropTarget,
  type ColumnOrderState,
  type GroupByState,
} from "@gridkitjs/core";
import type { ResolvedColumn } from "./DataGrid";
import {
  resolveGroupByDropTarget,
  type GroupByDropTarget,
} from "./groupByDropTarget";
import useDragReorder, { elementAt, sideOf } from "./useDragReorder";

/**
 * Where a drop would land. A second drop zone — the group-by bar — is a
 * second member here rather than a reshaping of this state, exactly as
 * originally planned: a header dragged past every other header and onto the
 * bar produces `"group-by"` instead of `"column-order"`, and `handleDrop`
 * switches on `kind`.
 */
export type DropTarget =
  { kind: "column-order"; beforeId: string | null } | GroupByDropTarget;

interface UseColumnDragOptions {
  order: ColumnOrderState;
  /** What a drop onto the group-by bar is resolved against. */
  groupBy: GroupByState;
  /** Column ids whose header may be dragged into the group-by bar at all. */
  groupByDraggableIds: ReadonlySet<string>;
  onDrop: (target: DropTarget, movedId: string) => void;
}

export interface ColumnDragApi<Row> {
  /** The column being dragged, for as long as the drag lasts. */
  draggedColumnId: string | null;
  /** Where it would land if released now. */
  dropTarget: DropTarget | null;
  /** Where the element trailing the pointer sits, as a CSS `transform`. */
  ghostTransform: string | null;
  startDrag: (
    entry: ResolvedColumn<Row>,
    event: ReactPointerEvent<HTMLElement>,
  ) => void;
  /** Moves a column one place left (`-1`) or right (`1`). */
  moveByKeyboard: (entry: ResolvedColumn<Row>, direction: -1 | 1) => void;
  /**
   * Whether the gesture that just ended was a drag rather than a click, for a
   * header that has something of its own to do with a click.
   *
   * Reading it clears it, so that a press which never opened a drag at all —
   * on a column that cannot be reordered — does not see the last one's answer.
   */
  justDragged: () => boolean;
}

/**
 * Turns a pointer drag over the header into a drop target, leaving `onDrop` to
 * apply it. Built on `useDragReorder`'s shared pointer mechanics — this hook
 * supplies only the hit-testing: another header (reorder among columns) or
 * the group-by bar (add this column to the grouping), tried in that order.
 */
export default function useColumnDrag<Row>({
  order,
  groupBy,
  groupByDraggableIds,
  onDrop,
}: UseColumnDragOptions): ColumnDragApi<Row> {
  const drag = useDragReorder<DropTarget>({
    resolveTarget(clientX, clientY, movedId) {
      // Hit-tested rather than read from the event's target, which pointer
      // capture pins to the header the drag opened on.
      const over = elementAt(clientX, clientY, "th[data-gridkit-column]");
      const overId = over?.getAttribute("data-gridkit-column");

      // The rect is read fresh each move, so a width changed mid-drag
      // cannot leave the midpoint stale.
      const beforeId =
        over && overId
          ? resolveDropBefore(order, overId, sideOf(over, clientX))
          : undefined;

      if (beforeId !== undefined) {
        // A gap the column already sits in would promise a move that
        // `moveColumnBefore` then declines to make.
        return movesColumn(order, movedId, beforeId)
          ? { kind: "column-order", beforeId }
          : null;
      }

      return groupByDraggableIds.has(movedId)
        ? resolveGroupByDropTarget(clientX, clientY, movedId, groupBy)
        : null;
    },
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
