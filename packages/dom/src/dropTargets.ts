import {
  movesColumn,
  movesGroupBy,
  resolveDropBefore,
  type ColumnOrderState,
  type DropSide,
  type GroupByState,
} from "@gridkitjs/core";

/** A drop into the group-by bar, in front of `beforeColumnId` — `null` to append. */
export interface GroupByDropTarget {
  readonly kind: "group-by";
  readonly beforeColumnId: string | null;
}

/**
 * Where a dragged column header would land: among the other headers, in
 * front of `beforeId` (`null` for the end), or in the group-by bar.
 */
export type ColumnDropTarget =
  | { readonly kind: "column-order"; readonly beforeId: string | null }
  | GroupByDropTarget;

export interface ColumnDropContext {
  /** The ids of the columns on screen, in order — what a drop is resolved among. */
  readonly order: ColumnOrderState;
  /** What a drop onto the group-by bar is resolved against. */
  readonly groupBy: GroupByState;
  /** Column ids whose header may be dragged into the group-by bar at all. */
  readonly groupByDraggableIds: ReadonlySet<string>;
}

/**
 * The closest ancestor of (or the element itself at) `(x, y)` matching
 * `selector`. `closest` is what makes the whole matched element the target:
 * a hit on a descendant (a header's label, a chip's remove button) resolves
 * to it.
 *
 * Hit-tested rather than read from an event's target, which pointer capture
 * pins to the element the drag opened on.
 */
function elementAt(x: number, y: number, selector: string): Element | null {
  return document.elementFromPoint(x, y)?.closest(selector) ?? null;
}

/**
 * Which half of `element` `x` falls in. Read fresh on every move, so a width
 * changed mid-drag cannot leave the midpoint stale.
 */
function sideOf(element: Element, x: number): DropSide {
  const rect = element.getBoundingClientRect();
  return x < rect.left + rect.width / 2 ? "before" : "after";
}

/**
 * Where a header or chip dropped at `(clientX, clientY)` would land within
 * the group-by bar (`[data-gridkit-group-by-bar]`, its chips
 * `[data-gridkit-group-chip]`), or `null` when the pointer isn't over the bar
 * at all, or when the drop would change nothing. Shared by a header dragged
 * in from outside the bar and a chip dragged within it, so the two can never
 * disagree about where a drop lands.
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

/**
 * Where the header of `movedId` dropped at `(clientX, clientY)` would land:
 * before or after another header (`th[data-gridkit-column]`), by which half
 * of it the pointer is over, or else in the group-by bar — or `null` for
 * nowhere a drop would change anything.
 *
 * A column already grouped never targets the bar: reordering it there is its
 * chip's job, not its header's.
 */
export function resolveColumnDropTarget(
  clientX: number,
  clientY: number,
  movedId: string,
  { order, groupBy, groupByDraggableIds }: ColumnDropContext,
): ColumnDropTarget | null {
  const over = elementAt(clientX, clientY, "th[data-gridkit-column]");
  const overId = over?.getAttribute("data-gridkit-column");
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

  const alreadyGrouped = groupBy.some((entry) => entry.columnId === movedId);
  return groupByDraggableIds.has(movedId) && !alreadyGrouped
    ? resolveGroupByDropTarget(clientX, clientY, movedId, groupBy)
    : null;
}
