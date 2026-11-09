/**
 * The cell the grid's single tab stop sits on: a header cell, or a cell of
 * body row `rowIndex`. A body focus's `rowIndex` counts from `0`.
 */
export type GridFocus =
  | { readonly area: "header"; readonly columnIndex: number }
  | {
      readonly area: "body";
      readonly rowIndex: number;
      readonly columnIndex: number;
    };

/** The modifier keys held with a navigation key press. */
export interface NavigationModifiers {
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly altKey: boolean;
  readonly shiftKey: boolean;
}

/** The header's cell at `columnIndex`. */
export function headerFocus(columnIndex: number): GridFocus {
  return { area: "header", columnIndex };
}

/** Body row `rowIndex`'s cell at `columnIndex`. */
export function bodyFocus(rowIndex: number, columnIndex: number): GridFocus {
  return { area: "body", rowIndex, columnIndex };
}

/**
 * Holds a coordinate inside the grid, so that a focus surviving a column
 * removal or a shorter page never leaves the grid with no tab stop at all —
 * which is a grid a keyboard cannot reach. A body focus below the last row
 * moves up to it; one above the first row, or in a grid with no rows, moves
 * to the header.
 */
export function clampFocus(
  focus: GridFocus,
  rowCount: number,
  columnCount: number,
): GridFocus {
  const columnIndex = Math.min(
    Math.max(focus.columnIndex, 0),
    Math.max(columnCount - 1, 0),
  );
  switch (focus.area) {
    case "header":
      return headerFocus(columnIndex);
    case "body": {
      const rowIndex = Math.min(focus.rowIndex, rowCount - 1);
      return rowIndex < 0
        ? headerFocus(columnIndex)
        : bodyFocus(rowIndex, columnIndex);
    }
  }
}

/** Never treats any row as unreachable — the default when a caller has no skippable rows at all. */
function noRowsSkippable(): boolean {
  return false;
}

/**
 * The vertical keys count rows on one line running from the header, just
 * above body row `0`, down through the body, so that arrowing up out of the
 * first row reaches the header and a page key starting on the header lands
 * `pageSize` rows down, both as plain arithmetic.
 */
function linePosition(focus: GridFocus): number {
  return focus.area === "header" ? -1 : focus.rowIndex;
}

/** The focus at `line` on the line `linePosition` counts: the header for anything above body row `0`. */
function focusAtLine(line: number, columnIndex: number): GridFocus {
  return line < 0 ? headerFocus(columnIndex) : bodyFocus(line, columnIndex);
}

/**
 * `target` moved on one row at a time in `direction` (`1` or `-1`) until it
 * lands on a row `isSkippableRow` says is reachable, or would run off the
 * bottom of the body trying — in which case it returns `fallback` (where the
 * focus was before this move) instead of an out-of-range row.
 *
 * Deliberately not "step one past the bound" the way an ordinary move here
 * left unclamped would: `clampFocus` downstream holds a row past the end at
 * the last one, and if that last row happens to be the very one that was
 * skippable (a group's own summary row, say), clamping back onto it would
 * silently defeat the skip. Staying at `fallback` is what a "there is
 * nowhere valid to move to" press should do instead — the same way
 * `ArrowLeft` at column 0 already leaves the focus exactly where it was,
 * `clampFocus` is left with nothing to correct either way, and a caller
 * that still wants to detect "did this move go anywhere" can compare the
 * result to the focus itself.
 *
 * The header is never skippable, and a row already past the body's end (a
 * `PageDown` overshoot) has nothing to skip past: both are returned as they
 * are, for `clampFocus` to hold in bounds.
 */
function skipSkippableRows(
  target: GridFocus,
  direction: 1 | -1,
  rowCount: number,
  isSkippableRow: (rowIndex: number) => boolean,
  fallback: GridFocus,
): GridFocus {
  if (target.area === "header") {
    return target;
  }
  let rowIndex = target.rowIndex;
  while (rowIndex < rowCount && isSkippableRow(rowIndex)) {
    const stepped = rowIndex + direction;
    if (stepped >= rowCount) {
      return fallback;
    }
    // Stepping up out of body row 0 lands on the header, which is always a
    // valid stop.
    if (stepped < 0) {
      return headerFocus(target.columnIndex);
    }
    rowIndex = stepped;
  }
  return bodyFocus(rowIndex, target.columnIndex);
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

  const { columnIndex } = focus;

  function moveRows(rows: number): GridFocus {
    return skipSkippableRows(
      focusAtLine(linePosition(focus) + rows, columnIndex),
      rows < 0 ? -1 : 1,
      rowCount,
      isSkippableRow,
      focus,
    );
  }

  switch (key) {
    case "ArrowLeft":
      if (modifiers.ctrlKey) return null;
      return { ...focus, columnIndex: columnIndex - 1 };
    case "ArrowRight":
      if (modifiers.ctrlKey) return null;
      return { ...focus, columnIndex: columnIndex + 1 };
    case "ArrowUp":
      return moveRows(-1);
    case "ArrowDown":
      return moveRows(1);
    // Ctrl takes Home and End to the grid's ends rather than the row's, which
    // is the one place Ctrl is navigation rather than reorder.
    case "Home":
      return modifiers.ctrlKey ? headerFocus(0) : { ...focus, columnIndex: 0 };
    case "End": {
      const rowEnd = { ...focus, columnIndex: columnCount - 1 };
      return modifiers.ctrlKey
        ? skipSkippableRows(
            focusAtLine(rowCount - 1, columnCount - 1),
            -1,
            rowCount,
            isSkippableRow,
            rowEnd,
          )
        : rowEnd;
    }
    case "PageUp":
      return moveRows(-pageSize);
    case "PageDown":
      return moveRows(pageSize);
    default:
      return null;
  }
}
