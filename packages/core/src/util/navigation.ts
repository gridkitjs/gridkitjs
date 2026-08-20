/**
 * The header's row index. One coordinate space covers the header and the body
 * so that arrowing up out of the first row reaches the header without a case
 * of its own, and every other move is plain arithmetic.
 */
export const HEADER_ROW = -1;

/** The cell the grid's single tab stop sits on. */
export interface GridFocus {
  readonly rowIndex: number;
  readonly columnIndex: number;
}

/** The modifier keys held with a navigation key press. */
export interface NavigationModifiers {
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly altKey: boolean;
  readonly shiftKey: boolean;
}

/**
 * Holds a coordinate inside the grid, so that a focus surviving a column
 * removal or a shorter page never leaves the grid with no tab stop at all —
 * which is a grid a keyboard cannot reach.
 */
export function clampFocus(
  focus: GridFocus,
  rowCount: number,
  columnCount: number,
): GridFocus {
  return {
    rowIndex: Math.min(Math.max(focus.rowIndex, HEADER_ROW), rowCount - 1),
    columnIndex: Math.min(
      Math.max(focus.columnIndex, 0),
      Math.max(columnCount - 1, 0),
    ),
  };
}

/** Never treats any row as unreachable — the default when a caller has no skippable rows at all. */
function noRowsSkippable(): boolean {
  return false;
}

/**
 * `rowIndex` moved forward one row at a time in `direction` (`1` or `-1`)
 * until it lands on a row `isSkippableRow` says is reachable, or would run
 * off the grid's own bounds (`HEADER_ROW` to `rowCount - 1`) trying — in
 * which case it returns `fallback` (the position before this move started)
 * instead of an out-of-range index.
 *
 * Deliberately not "step one past the bound" the way an ordinary move here
 * left unclamped would: `clampFocus` downstream holds any out-of-range
 * `rowIndex` at the nearest in-range one, and if that nearest row happens
 * to be the very one that was skippable (the grid's actual last row is a
 * group's own summary row, say), clamping back onto it would silently
 * defeat the skip. Staying at `fallback` is what a "there is nowhere valid
 * to move to" press should do instead — the same way `ArrowLeft` at column
 * 0 already leaves `rowIndex`/`columnIndex` exactly where they were,
 * `clampFocus` is left with nothing to correct either way, and a caller
 * that still wants to detect "did this move go anywhere" can compare the
 * result to `focus` itself.
 */
function skipSkippableRows(
  rowIndex: number,
  direction: 1 | -1,
  rowCount: number,
  isSkippableRow: (rowIndex: number) => boolean,
  fallback: number,
): number {
  let next = rowIndex;
  // The header (HEADER_ROW) and anything already out of the body's own
  // [0, rowCount) range are never skippable — an ordinary PageUp/ArrowUp
  // overshoot past the header, in particular, has nothing to skip past, so
  // this function has nothing to do; `clampFocus` downstream still handles
  // holding it in bounds as it always has.
  while (next >= 0 && next < rowCount && isSkippableRow(next)) {
    const stepped = next + direction;
    // Landing on the header itself (moving up from row 0) is always valid —
    // only a step that would leave the header *and* the body's own range
    // behind (moving down past the last row) has nowhere left to go.
    if (stepped < HEADER_ROW || stepped >= rowCount) {
      return fallback;
    }
    next = stepped;
  }
  return next;
}

/**
 * The focus a navigation key press moves to, or `null` when the key isn't
 * this grid's to handle — left for the browser or another handler.
 *
 * `pageSize` is a pre-measured row count rather than a callback: this
 * function takes plain data only, so a caller measures the viewport once and
 * hands over the number.
 *
 * `isSkippableRow` names rows the vertical moves (`ArrowUp`/`ArrowDown`/
 * `PageUp`/`PageDown`/`Ctrl+End`) never land a tab stop on — a group's own
 * summary row (`groupAggregateDisplay: "row"`), which still occupies a real
 * row slot for `rowCount`/`aria-rowindex` purposes but is presentational,
 * not a stop of its own. Left/right and plain `Home`/`End` stay row-scoped
 * and so never consult it. Defaults to skipping nothing, so every existing
 * caller (and every horizontal move) is unaffected.
 */
export function nextFocusForKey(
  key: string,
  modifiers: NavigationModifiers,
  focus: GridFocus,
  rowCount: number,
  columnCount: number,
  pageSize: number,
  isSkippableRow: (rowIndex: number) => boolean = noRowsSkippable,
): GridFocus | null {
  // Alt on an arrow resizes and Ctrl on one reorders; the header claims both
  // before this runs, and elsewhere they belong to the browser.
  if (modifiers.altKey) {
    return null;
  }

  const { rowIndex, columnIndex } = focus;

  switch (key) {
    case "ArrowLeft":
      if (modifiers.ctrlKey) return null;
      return { rowIndex, columnIndex: columnIndex - 1 };
    case "ArrowRight":
      if (modifiers.ctrlKey) return null;
      return { rowIndex, columnIndex: columnIndex + 1 };
    case "ArrowUp":
      return {
        rowIndex: skipSkippableRows(
          rowIndex - 1,
          -1,
          rowCount,
          isSkippableRow,
          rowIndex,
        ),
        columnIndex,
      };
    case "ArrowDown":
      return {
        rowIndex: skipSkippableRows(
          rowIndex + 1,
          1,
          rowCount,
          isSkippableRow,
          rowIndex,
        ),
        columnIndex,
      };
    // Ctrl takes Home and End to the grid's ends rather than the row's, which
    // is the one place Ctrl is navigation rather than reorder.
    case "Home":
      return modifiers.ctrlKey
        ? { rowIndex: HEADER_ROW, columnIndex: 0 }
        : { rowIndex, columnIndex: 0 };
    case "End":
      return modifiers.ctrlKey
        ? {
            rowIndex: skipSkippableRows(
              rowCount - 1,
              -1,
              rowCount,
              isSkippableRow,
              rowIndex,
            ),
            columnIndex: columnCount - 1,
          }
        : { rowIndex, columnIndex: columnCount - 1 };
    case "PageUp":
      return {
        rowIndex: skipSkippableRows(
          rowIndex - pageSize,
          -1,
          rowCount,
          isSkippableRow,
          rowIndex,
        ),
        columnIndex,
      };
    case "PageDown":
      return {
        rowIndex: skipSkippableRows(
          rowIndex + pageSize,
          1,
          rowCount,
          isSkippableRow,
          rowIndex,
        ),
        columnIndex,
      };
    default:
      return null;
  }
}
