import type {
  ColumnConstraints,
  ColumnDefinition,
  ColumnResizeSession,
  ColumnResolveOptions,
  ColumnSizeDefaults,
  ColumnSizingState,
  ResolvedColumn,
} from "../types";
import { alignmentForType, getColumnId, resolveColumnLabel } from "./grid";

/**
 * Applied to any column that does not size itself. The minimum is a width a
 * header stays legible at rather than a measured value — a column dragged
 * narrower than this reads as a rendering fault.
 */
export const DEFAULT_COLUMN_SIZES: ColumnSizeDefaults = {
  width: 150,
  minWidth: 40,
  maxWidth: Number.POSITIVE_INFINITY,
};

/** How far one arrow key press moves a column edge. */
export const KEYBOARD_STEP = 10;

function withDefaults(
  defaults?: Partial<ColumnSizeDefaults>,
): ColumnSizeDefaults {
  return { ...DEFAULT_COLUMN_SIZES, ...defaults };
}

/**
 * The bounds `column` may be sized between. Resolved in one place so that a
 * drag, a clamp and an auto-fit cannot disagree about a column's limits.
 */
export function resolveColumnConstraints<Row>(
  column: ColumnDefinition<Row, unknown>,
  defaults?: Partial<ColumnSizeDefaults>,
): ColumnConstraints {
  const resolved = withDefaults(defaults);
  return {
    minWidth: column.minWidth ?? resolved.minWidth,
    maxWidth: column.maxWidth ?? resolved.maxWidth,
  };
}

/** Holds `width` within `constraints`. */
export function clampColumnWidth(
  width: number,
  constraints: ColumnConstraints,
): number {
  return Math.min(Math.max(width, constraints.minWidth), constraints.maxWidth);
}

/**
 * Pairs each column with everything needed to render it — the width it sits
 * at, the label its header shows, whether it may be resized and how its cells
 * align. Widths take the first of the sizing state, the column's own `width`,
 * and the default, then clamp.
 *
 * The sizing state winning means a user's drag outlives a re-render; a column
 * absent from it still tracks a `width` edited in the definition.
 */
export function resolveColumnWidths<Row, Node>(
  columns: readonly ColumnDefinition<Row, Node>[],
  sizing: ColumnSizingState,
  options?: ColumnResolveOptions,
): readonly ResolvedColumn<Row, Node>[] {
  const resolved = withDefaults(options?.sizes);

  return columns.map((column) => {
    const id = getColumnId(column);
    const stored = sizing[id];

    return {
      column,
      id,
      sized: stored !== undefined,
      width: clampColumnWidth(
        stored ?? column.width ?? resolved.width,
        resolveColumnConstraints(column, resolved),
      ),
      label: resolveColumnLabel(column),
      resizable: column.resizable ?? options?.resizable ?? false,
      reorderable: column.reorderable ?? options?.reorderable ?? false,
      groupByDraggable:
        column.groupByDraggable ?? options?.groupByDraggable ?? false,
      alignment: column.alignment ?? alignmentForType(column.type ?? "string"),
    };
  });
}

export function totalColumnWidth<Row, Node>(
  resolved: readonly ResolvedColumn<Row, Node>[],
): number {
  return resolved.reduce((total, entry) => total + entry.width, 0);
}

/**
 * Opens a resize. The session captures its constraints and starting point up
 * front, so applying a pointer position later is arithmetic on numbers alone —
 * which is what keeps the drag testable without a DOM.
 *
 * @param startPosition Where the pointer went down, on the axis being dragged.
 */
export function beginColumnResize<Row>(
  column: ColumnDefinition<Row, unknown>,
  startWidth: number,
  startPosition: number,
  defaults?: Partial<ColumnSizeDefaults>,
): ColumnResizeSession {
  return {
    columnId: getColumnId(column),
    startWidth,
    startPosition,
    constraints: resolveColumnConstraints(column, defaults),
  };
}

/**
 * The width the dragged column takes with the pointer at `position`. The delta
 * is signed, so a right-to-left adapter negates it and nothing else changes.
 */
export function applyColumnResize(
  session: ColumnResizeSession,
  position: number,
): number {
  return clampColumnWidth(
    session.startWidth + (position - session.startPosition),
    session.constraints,
  );
}

interface SizingEntry<Row, Node> {
  entry: ResolvedColumn<Row, Node>;
  width: number;
  bound: number;
  adjustable: boolean;
}

/**
 * Whether `item` has reached `bound` in the direction it moves toward — above
 * it for a column growing to a `maxWidth`, below it for one shrinking to a
 * `minWidth`.
 */
function reachedBound<Row, Node>(
  width: number,
  item: SizingEntry<Row, Node>,
): boolean {
  return item.bound > item.width ? width >= item.bound : width <= item.bound;
}

/**
 * Moves every adjustable entry's `width` toward `bound` by its proportional
 * share of `remaining`'s current surplus or deficit, looping so a column
 * clamped at its bound in one pass frees the remainder for the others to
 * absorb in the next.
 */
function redistribute<Row, Node>(
  entries: readonly SizingEntry<Row, Node>[],
  remaining: (sum: number) => number,
): void {
  for (;;) {
    const movable = entries.filter(
      (item) => item.adjustable && !reachedBound(item.width, item),
    );
    const left = remaining(entries.reduce((t, i) => t + i.width, 0));
    if (left <= 0 || movable.length === 0) {
      break;
    }

    const base = movable.reduce((total, item) => total + item.width, 0);
    let clamped = false;

    for (const item of movable) {
      const share =
        base === 0 ? left / movable.length : (left * item.width) / base;
      const next = item.width + (item.bound > item.width ? share : -share);

      if (reachedBound(next, item)) {
        item.width = item.bound;
        clamped = true;
      } else {
        item.width = next;
      }
    }

    if (!clamped) {
      break;
    }
  }
}

/**
 * Fits columns to `availableWidth`: grows them to fill leftover space, or
 * shrinks them to relieve an overflow, in both cases proportionally to each
 * column's current width. Columns the user has sized are left alone in
 * either direction, so dragging one column neither rubber-bands it back nor
 * has it absorb a squeeze meant for the rest.
 *
 * Growing stops at each column's `maxWidth`; shrinking stops at its
 * `minWidth`. If shrinking every adjustable column to its floor still does
 * not reach `availableWidth`, the columns are returned untouched and the
 * container scrolls rather than crushing them further.
 */
export function fitColumnsToWidth<Row, Node>(
  resolved: readonly ResolvedColumn<Row, Node>[],
  availableWidth: number,
  defaults?: Partial<ColumnSizeDefaults>,
): readonly ResolvedColumn<Row, Node>[] {
  const target = Math.floor(availableWidth);
  const total = totalColumnWidth(resolved);
  if (resolved.length === 0 || total === target) {
    return resolved;
  }

  const growing = total < target;
  const entries: SizingEntry<Row, Node>[] = resolved.map((entry) => {
    const constraints = resolveColumnConstraints(entry.column, defaults);
    return {
      entry,
      width: entry.width,
      bound: growing ? constraints.maxWidth : constraints.minWidth,
      adjustable: !entry.sized,
    };
  });

  if (!growing) {
    // Only unsized columns can be shrunk, so if they alone cannot reach the
    // target the grid genuinely cannot fit and should scroll, unchanged.
    const floor = entries.reduce(
      (sum, item) => sum + (item.adjustable ? item.bound : item.width),
      0,
    );
    if (floor > target) {
      return resolved;
    }
  }

  redistribute(entries, (sum) => (growing ? target - sum : sum - target));

  // Fractional widths would leave the table a sub-pixel off its container and
  // show a scrollbar that never goes away, so round every column toward the
  // target and hand the remaining pixels back out (growing) or claw them
  // back (shrinking) one at a time.
  const rounded = entries.map((item) =>
    growing ? Math.floor(item.width) : Math.ceil(item.width),
  );
  let remainder = target - rounded.reduce((total, width) => total + width, 0);

  return entries.map((item, index) => {
    let width = rounded[index] ?? item.width;
    // Rounding toward the target can only ever leave it short when growing
    // (floor) or over when shrinking (ceil), so only one direction is ever
    // live here — but each still needs room left before its own bound.
    const hasRoom = growing ? width < item.bound : width > item.bound;

    if (remainder !== 0 && item.adjustable && hasRoom) {
      width += growing ? 1 : -1;
      remainder += growing ? -1 : 1;
    }

    return { ...item.entry, width };
  });
}

/**
 * The width a column needs to show `measuredWidth` of content.
 *
 * `padding` is an allowance on top of the measurement, since a column sized to
 * exactly its content can still round down into an ellipsis.
 */
export function sizeColumnToContent(
  measuredWidth: number,
  constraints: ColumnConstraints,
  padding = 2,
): number {
  return clampColumnWidth(Math.ceil(measuredWidth + padding), constraints);
}

/**
 * `current` with `columnId` reverted to its width in `base` — or omitted
 * entirely if `base` had none — for Escape to restore a resize in progress.
 *
 * A column with no stored width in `base` is correctly omitted by deleting
 * the key rather than merging its `base` width back in, which would
 * otherwise leave it pinned and hidden from auto-fit.
 */
export function revertColumnSize(
  current: ColumnSizingState,
  base: ColumnSizingState,
  columnId: string,
): ColumnSizingState {
  const next = Object.fromEntries(
    Object.entries(current).filter(([id]) => id !== columnId),
  );
  if (columnId in base) {
    next[columnId] = base[columnId] as number;
  }
  return next;
}
