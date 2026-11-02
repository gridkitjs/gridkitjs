import {
  clampFocus,
  HEADER_ROW,
  nextFocusForKey,
  type GridFocus,
  type NavigationModifiers,
} from "@gridkitjs/core";

/** Rows a page key moves when the viewport cannot be measured. */
const FALLBACK_PAGE = 10;

/**
 * The window of rows a row virtualizer has drawn, and a way to bring a row
 * into it — what a focus move needs when its target row may not be mounted.
 */
export interface FocusVirtualRange {
  readonly startIndex: number;
  readonly endIndex: number;
  readonly scrollToIndex: (index: number) => void;
}

/** How to find the rendered rows the browser's focus moves among. */
export interface GridFocusRows {
  /** The header row's element, `null` while none is rendered. */
  readonly getHeaderRow: () => HTMLTableRowElement | null;
  /** Body row `rowIndex`'s element — `findBodyRow` finds it — `null` while it is not rendered. */
  readonly getBodyRow: (rowIndex: number) => HTMLTableRowElement | null;
}

export interface GridFocusOptions {
  /** Body rows, counting group headers and summaries — every row a key could step through. */
  readonly rowCount: number;
  readonly columnCount: number;
  /**
   * Rows the vertical keys step over rather than stop on — a group's own
   * summary row, which takes a row slot but is not a stop of its own.
   */
  readonly isSkippableRow?: ((rowIndex: number) => boolean) | undefined;
  /**
   * The window the renderer drew, when rows are virtualized. A move can
   * target a row outside it — `ArrowDown` past its end, or `Ctrl+End` — that
   * no lookup would find until it is scrolled into range.
   */
  readonly virtualRange?: FocusVirtualRange | null | undefined;
}

export interface GridFocusController {
  /**
   * The cell holding the grid's single tab stop, clamped into the current
   * row and column counts. The same object until it changes, so it can serve
   * as a renderer's snapshot.
   */
  readonly getFocus: () => GridFocus;
  /** Calls `listener` whenever the focused cell moves. Returns the unsubscribe. */
  readonly subscribe: (listener: () => void) => () => void;
  /**
   * Replaces the options, as a renderer does on every render with its
   * current counts and window. Calls no listener: the renderer calling it is
   * already drawing.
   */
  readonly setOptions: (options: GridFocusOptions) => void;
  /**
   * Moves the tab stop, and the browser's focus with it once the renderer
   * has drawn the move (see `focusDrawnCell`). Moving to the cell already
   * focused does nothing, which is what lets a cell's own `focus` event
   * report a click through here without a loop.
   */
  readonly focusCell: (rowIndex: number, columnIndex: number) => void;
  /**
   * Moves the tab stop as `key` does — the arrows, Home, End, the page keys,
   * with Ctrl for the grid's corners. Returns whether the key was one of
   * them, in which case the caller prevents its default: taken even when the
   * move lands nowhere, or an arrow at the last row would scroll the page
   * out from under the grid.
   */
  readonly handleKey: (
    key: string,
    modifiers: NavigationModifiers,
    pageSize: number,
  ) => boolean;
  /**
   * Connects the tab stop to the rendered rows, which the browser's focus
   * then follows it among. Returns the function that disconnects them.
   */
  readonly attach: (rows: GridFocusRows) => () => void;
  /**
   * Called by the renderer once it has drawn `drawn` — a value `getFocus`
   * returned — so the browser's focus follows a move to the cell now in the
   * markup. Does nothing unless a move to exactly that drawing is pending.
   */
  readonly focusDrawnCell: (drawn: GridFocus) => void;
}

/**
 * The cell at a coordinate. `columnIndex` is clamped to the row's own last
 * cell rather than read directly: a group-header row renders one
 * `<td colSpan>` regardless of the column count, so a focus arriving from a
 * data row further right would otherwise address a cell that row doesn't
 * have.
 */
function cellIn(
  row: HTMLTableRowElement | null,
  columnIndex: number,
): HTMLElement | null {
  if (row === null) {
    return null;
  }
  return row.cells[Math.min(columnIndex, row.cells.length - 1)] ?? null;
}

/**
 * Body row `rowIndex` in `bodyTable`, by its `data-gridkit-row-index` rather
 * than by its position in `tBodies[0].rows`: a virtualized body holds only a
 * slice of the rows, behind a leading spacer `<tr>`, so once the window
 * scrolls a DOM position no longer matches the row's index in the full array
 * and addresses some other mounted row, or none.
 *
 * The attribute holds a plain integer, so the selector needs no escaping,
 * unlike one built from a consumer's row id.
 */
export function findBodyRow(
  bodyTable: HTMLTableElement | null,
  rowIndex: number,
): HTMLTableRowElement | null {
  return (
    bodyTable?.tBodies[0]?.querySelector<HTMLTableRowElement>(
      `:scope > tr[data-gridkit-row-index="${String(rowIndex)}"]`,
    ) ?? null
  );
}

/**
 * How many rows fit `bodyTable`'s scroll wrapper — its parent, the row area
 * alone, not the header, footer and pager around it — which is what a page
 * key moves. Reads the first rendered row's height, and falls back to ten
 * rows when nothing can be measured.
 */
export function measurePageSize(bodyTable: HTMLTableElement | null): number {
  const firstRow = bodyTable?.tBodies[0]?.rows[0];
  const viewport = bodyTable?.parentElement;
  if (
    firstRow === undefined ||
    viewport === null ||
    viewport === undefined ||
    firstRow.offsetHeight === 0
  ) {
    return FALLBACK_PAGE;
  }
  return Math.max(1, Math.floor(viewport.clientHeight / firstRow.offsetHeight));
}

/**
 * The grid's single tab stop and the keys that move it, which is what
 * `role="grid"` obliges: arrow keys travel cell to cell and Tab passes the
 * whole grid by. The renderer attaches its rows, draws `getFocus()` —
 * `tabindex="0"` on that cell, `-1` on every other — re-reads it when
 * `subscribe` calls, and calls `focusDrawnCell` after drawing.
 *
 * Separate from selection, because focus and selection are different states:
 * a cell is focused while travelling before anything is selected, and every
 * cell of a range is selected without being focused. Navigation also has to
 * work with selection off entirely.
 *
 * Starts on the header row's first cell.
 */
export function createGridFocus(
  initialOptions: GridFocusOptions,
): GridFocusController {
  let options = initialOptions;
  let rows: GridFocusRows | null = null;
  const listeners = new Set<() => void>();

  /**
   * Clamped on the way out rather than written back, so a coordinate pushed
   * out of range by a change to the data is restored when the data comes
   * back.
   */
  let stored: GridFocus = { rowIndex: HEADER_ROW, columnIndex: 0 };
  let snapshot = {
    stored,
    rowCount: options.rowCount,
    columnCount: options.columnCount,
    focus: clampFocus(stored, options.rowCount, options.columnCount),
  };

  /**
   * The move the browser's focus still has to follow, or `null` once it has.
   * Without it every drawing would pull focus into the grid, the first
   * included.
   *
   * Holds the very `stored` object `focusCell` wrote rather than a flag, so
   * only a drawing made from that move can act on it. Under virtualization a
   * scroll can commit a drawing just before a key press, and a renderer may
   * run that older drawing's after-draw step only once the press has marked
   * a new move pending. With a flag, that stale step found its own (still
   * mounted) cell, focused it and cleared the flag, so the new move's own
   * step returned early and never scrolled its row into range.
   */
  let pendingMove: GridFocus | null = null;

  function getFocus(): GridFocus {
    if (
      snapshot.stored !== stored ||
      snapshot.rowCount !== options.rowCount ||
      snapshot.columnCount !== options.columnCount
    ) {
      snapshot = {
        stored,
        rowCount: options.rowCount,
        columnCount: options.columnCount,
        focus: clampFocus(stored, options.rowCount, options.columnCount),
      };
    }
    return snapshot.focus;
  }

  function focusCell(rowIndex: number, columnIndex: number): void {
    const next = clampFocus(
      { rowIndex, columnIndex },
      options.rowCount,
      options.columnCount,
    );
    const current = getFocus();
    if (
      next.rowIndex === current.rowIndex &&
      next.columnIndex === current.columnIndex
    ) {
      return;
    }
    pendingMove = next;
    stored = next;
    for (const listener of listeners) {
      listener();
    }
  }

  return {
    getFocus,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setOptions(next) {
      options = next;
    },
    focusCell,
    handleKey(key, modifiers, pageSize) {
      const next = nextFocusForKey(
        key,
        modifiers,
        getFocus(),
        options.rowCount,
        options.columnCount,
        pageSize,
        options.isSkippableRow,
      );
      if (next === null) {
        return false;
      }
      focusCell(next.rowIndex, next.columnIndex);
      return true;
    },
    attach(next) {
      rows = next;
      return () => {
        if (rows === next) {
          rows = null;
        }
      };
    },
    focusDrawnCell(drawn) {
      if (
        rows === null ||
        pendingMove === null ||
        snapshot.stored !== pendingMove ||
        snapshot.focus !== drawn
      ) {
        return;
      }
      const cell = cellIn(
        drawn.rowIndex === HEADER_ROW
          ? rows.getHeaderRow()
          : rows.getBodyRow(drawn.rowIndex),
        drawn.columnIndex,
      );
      if (cell !== null) {
        pendingMove = null;
        // Focusing the cell the browser already sits on is a no-op, which is
        // what makes one method serve both a key press and a cell reporting
        // a click.
        cell.focus();
        return;
      }

      // The target row isn't mounted — under virtualization, that means it's
      // outside the drawn window rather than an actual failure. Ask for it to
      // be brought into range; the move stays pending, so the next drawing
      // retries once the row mounts. Without virtualization (or for a row
      // out of bounds even for it) there is nothing further to try, so the
      // move is dropped rather than left to retry forever.
      const range = options.virtualRange;
      if (
        range != null &&
        drawn.rowIndex !== HEADER_ROW &&
        (drawn.rowIndex < range.startIndex || drawn.rowIndex > range.endIndex)
      ) {
        range.scrollToIndex(drawn.rowIndex);
        return;
      }
      pendingMove = null;
    },
  };
}
