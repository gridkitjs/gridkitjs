/**
 * One entry per row: its measured height once known, `undefined` until then.
 * A row never yet rendered (or rendered but not yet observed) falls back to
 * `visibleRange`'s own `estimatedHeight` argument.
 */
export type RowHeights = readonly (number | undefined)[];

export interface VisibleRange {
  readonly startIndex: number;
  readonly endIndex: number; // inclusive
  /** Total height of every row before `startIndex` — the leading spacer's height. */
  readonly offsetBefore: number;
  /** Total height of every row after `endIndex` — the trailing spacer's height. */
  readonly offsetAfter: number;
}

/**
 * Which rows of a dynamic-height, virtualized list fall within
 * `[scrollTop, scrollTop + viewportHeight)`, padded by `overscan` rows on
 * each side and clamped to the array's own bounds.
 *
 * Walks a cumulative-offset prefix sum built from `heights` (measured height
 * where known, `estimatedHeight` otherwise) rather than assuming a uniform
 * row height — this codebase's rows are not uniform (`.is-wrapped` cells,
 * group header/summary rows), so a fixed-height virtualizer would either
 * break wrapping or force it out of scope.
 *
 * `O(n)` in `heights.length`. Deliberately not a Fenwick tree or a
 * binary-searchable prefix-sum structure — that optimization belongs in the
 * mutable React-side cache that already owns mutability
 * (`useRowVirtualizer`), not in this pure function's contract, and is not
 * worth taking on until a profiled scenario actually shows it matters at
 * realistic row counts.
 */
export function visibleRange(
  heights: RowHeights,
  estimatedHeight: number,
  scrollTop: number,
  viewportHeight: number,
  overscan: number,
): VisibleRange {
  const rowCount = heights.length;
  if (rowCount === 0) {
    return { startIndex: 0, endIndex: -1, offsetBefore: 0, offsetAfter: 0 };
  }

  function heightAt(index: number): number {
    return heights[index] ?? estimatedHeight;
  }

  const viewportBottom = scrollTop + viewportHeight;

  // The first row whose bottom edge crosses `scrollTop` — everything before
  // it is fully scrolled past. `top` tracks that row's own top edge (the
  // cumulative height of every row before it) as the walk advances. Stops at
  // the last row rather than walking off the end when `scrollTop` reaches or
  // exceeds the total height.
  let start = 0;
  let top = 0;
  while (start < rowCount - 1 && top + heightAt(start) <= scrollTop) {
    top += heightAt(start);
    start += 1;
  }
  const startTop = top;

  // From `start`, the last row whose top edge is still above `viewportBottom`
  // — the first row no longer even partially visible ends the walk one row
  // earlier than it, or the array itself runs out first. `bottom` tracks the
  // current row's own bottom edge.
  let end = start;
  let bottom = startTop + heightAt(start);
  while (end < rowCount - 1 && bottom < viewportBottom) {
    end += 1;
    bottom += heightAt(end);
  }

  const overscanStart = Math.max(0, start - overscan);
  const overscanEnd = Math.min(rowCount - 1, end + overscan);

  let offsetBefore = 0;
  for (let index = 0; index < overscanStart; index++) {
    offsetBefore += heightAt(index);
  }
  let offsetAfter = 0;
  for (let index = overscanEnd + 1; index < rowCount; index++) {
    offsetAfter += heightAt(index);
  }

  return {
    startIndex: overscanStart,
    endIndex: overscanEnd,
    offsetBefore,
    offsetAfter,
  };
}
