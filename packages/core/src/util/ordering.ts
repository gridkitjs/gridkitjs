import type {
  ColumnDefinition,
  ColumnOrderState,
  ColumnPin,
  DataColumn,
  DropSide,
} from "../types";
import { getColumnId } from "./grid";

/**
 * Puts `columns` in the order `order` gives. Ids it lists come first, in that
 * order; columns it omits keep their position among the definitions and
 * follow. Ids naming no column are ignored.
 *
 * Tolerating both gaps is what lets a stored order outlive the column list it
 * was made against.
 */
export function applyColumnOrder<Row, Node>(
  columns: readonly ColumnDefinition<Row, Node>[],
  order: ColumnOrderState,
): readonly ColumnDefinition<Row, Node>[] {
  if (order.length === 0) {
    return columns;
  }

  const byId = new Map(columns.map((column) => [getColumnId(column), column]));
  const listed = order
    .map((id) => byId.get(id))
    .filter((column) => column !== undefined);
  const taken = new Set(listed.map((column) => getColumnId(column)));

  return [
    ...listed,
    ...columns.filter((column) => !taken.has(getColumnId(column))),
  ];
}

/**
 * `columns` in the order `order` gives, each paired with its id — the
 * width-free column list the data stages (filter, sort, group, aggregate)
 * read. Ordered here, ahead of sizing, so every later stage sees the one
 * already-ordered list and no part of the grid has to know a reorder
 * happened.
 */
export function resolveDataColumns<Row, Node>(
  columns: readonly ColumnDefinition<Row, Node>[],
  order: ColumnOrderState,
): readonly DataColumn<Row, Node>[] {
  return applyColumnOrder(columns, order).map((column) => ({
    id: getColumnId(column),
    column,
  }));
}

/**
 * The order with `movedId` lifted out and put back in front of `beforeId`, or
 * at the end when that is `null`.
 *
 * Returns `orderedIds` itself when the move changes nothing, so callers can
 * treat an unchanged reference as "no move happened".
 */
export function moveColumnBefore(
  orderedIds: ColumnOrderState,
  movedId: string,
  beforeId: string | null,
): ColumnOrderState {
  if (movedId === beforeId || !orderedIds.includes(movedId)) {
    return orderedIds;
  }

  const without = orderedIds.filter((id) => id !== movedId);
  // Taken after the removal: an index read before it would be one too far
  // right for every move that travels rightwards.
  const target = beforeId === null ? without.length : without.indexOf(beforeId);
  if (target === -1) {
    return orderedIds;
  }

  const next = [...without];
  next.splice(target, 0, movedId);
  return next.every((id, index) => id === orderedIds[index])
    ? orderedIds
    : next;
}

/** Where each pin group sits: the start group first, the end group last. */
const PIN_GROUP_RANK: Readonly<Record<ColumnPin, number>> = {
  start: 0,
  none: 1,
  end: 2,
};

/**
 * `moveColumnBefore`, kept inside the moved column's pin group: a column is
 * pinned or unpinned on purpose, never by being dragged across the boundary.
 * `pinOf` gives each id's pin. A `beforeId` in an earlier group lands the
 * column at the start of its own group, and one in a later group, like
 * `null`, at its end.
 *
 * The end of a group is the end of `orderedIds`: the view lists each group
 * in column order, so a column last in the order is last in its group,
 * wherever the other groups' columns sit. That is also why a move can change
 * `orderedIds` and leave every group as it was — a column already last in
 * its group moved to the end — and such a move hands back `orderedIds`
 * itself, as a move that changes nothing does.
 */
export function moveColumnInPinGroup(
  orderedIds: ColumnOrderState,
  pinOf: (columnId: string) => ColumnPin,
  movedId: string,
  beforeId: string | null,
): ColumnOrderState {
  if (beforeId !== null && !orderedIds.includes(beforeId)) {
    return orderedIds;
  }
  const next = moveColumnBefore(
    orderedIds,
    movedId,
    beforeIdInGroup(orderedIds, pinOf, pinOf(movedId), beforeId),
  );
  const grouped = (ids: ColumnOrderState) =>
    ids.toSorted((a, b) => PIN_GROUP_RANK[pinOf(a)] - PIN_GROUP_RANK[pinOf(b)]);
  const before = grouped(orderedIds);
  return grouped(next).every((id, index) => id === before[index])
    ? orderedIds
    : next;
}

/** `beforeId`, or the nearest gap to it inside the group pinned to `pin`. */
function beforeIdInGroup(
  orderedIds: ColumnOrderState,
  pinOf: (columnId: string) => ColumnPin,
  pin: ColumnPin,
  beforeId: string | null,
): string | null {
  if (beforeId === null) {
    return null;
  }
  const distance = PIN_GROUP_RANK[pinOf(beforeId)] - PIN_GROUP_RANK[pin];
  if (distance === 0) {
    return beforeId;
  }
  return distance > 0
    ? null
    : (orderedIds.find((id) => pinOf(id) === pin) ?? null);
}

/**
 * Whether moving `movedId` in front of `beforeId` would rearrange anything, so
 * that a drop indicator promises exactly the moves that happen.
 *
 * Defined against `moveColumnBefore` rather than restating its conditions, so
 * the two cannot disagree about what a no-op is.
 */
export function movesColumn(
  orderedIds: ColumnOrderState,
  movedId: string,
  beforeId: string | null,
): boolean {
  return moveColumnBefore(orderedIds, movedId, beforeId) !== orderedIds;
}

/**
 * The id a drop on `side` of `targetId` lands in front of, which is `null`
 * past the last column.
 *
 * "After C" and "before D" name the same gap, so collapsing both to one id
 * keeps a drop target a single nullable string.
 */
export function resolveDropBefore(
  orderedIds: ColumnOrderState,
  targetId: string,
  side: DropSide,
): string | null {
  if (side === "before") {
    return targetId;
  }
  const index = orderedIds.indexOf(targetId);
  return index === -1 ? null : (orderedIds[index + 1] ?? null);
}

/**
 * The `beforeId` a keyboard nudge on `columnId` produces, for `onDrop` to
 * apply the same way a pointer drop does — or `undefined` when the nudge is a
 * no-op: `columnId` is not in `orderedIds`, or the nudge would move it left
 * of the start.
 *
 * `null` is a real answer here, not "no-op": it means append to the end, the
 * same convention `moveColumnBefore` uses.
 */
export function resolveKeyboardDropTarget(
  orderedIds: ColumnOrderState,
  columnId: string,
  direction: -1 | 1,
): string | null | undefined {
  const index = orderedIds.indexOf(columnId);
  if (index === -1) {
    return undefined;
  }

  /**
   * Moving right lands in front of the id two along: the gap immediately
   * after a column is the one it already sits in.
   */
  const targetIndex = direction === -1 ? index - 1 : index + 2;
  if (targetIndex < 0) {
    return undefined;
  }

  return orderedIds[targetIndex] ?? null;
}
