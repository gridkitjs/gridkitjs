import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
} from "react";
import {
  clampFocus,
  nextFocusForKey,
  HEADER_ROW,
  type GridFocus,
} from "@gridkitjs/core";

export { HEADER_ROW, type GridFocus };

/** Rows a page key moves when the viewport cannot be measured. */
const FALLBACK_PAGE = 10;

interface UseGridNavigationOptions {
  tableRef: RefObject<HTMLTableElement | null>;
  rowCount: number;
  columnCount: number;
  /**
   * Rows the vertical navigation keys step over rather than land a tab stop
   * on — a group's own summary row (`groupAggregateDisplay: "row"`), which
   * still occupies a real row slot for `rowCount` purposes but is
   * presentational, not a stop of its own. Left unset (skips nothing) for a
   * grid with no such rows.
   */
  isSkippableRow?: ((rowIndex: number) => boolean) | undefined;
}

export interface GridNavigationApi {
  focus: GridFocus;
  /**
   * `0` for the focused cell and `-1` for every other. A grid is one tab stop:
   * tabbing reaches it, and the arrow keys move within it.
   */
  tabIndexFor: (rowIndex: number, columnIndex: number) => 0 | -1;
  /** Moves the tab stop, and the browser's focus with it. */
  focusCell: (rowIndex: number, columnIndex: number) => void;
  /** Handles the navigation keys, leaving every other key to bubble. */
  onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void;
}

/**
 * `0` for the column holding the tab stop and `-1` for every other.
 * Standalone rather than reached only through the hook's own `tabIndexFor`,
 * because `GridRow` is `memo()`-wrapped and cannot take the whole `nav`
 * object as a prop without defeating that boundary. Takes the row's own
 * already-narrowed `focusedColumnIndex` (`null` when focus sits on a
 * different row) rather than a `rowIndex`/`GridFocus` pair, since that
 * narrowing — done once per row in `GridBody` — is what keeps a focus move
 * from re-rendering every row instead of the two it actually touches.
 */
export function tabIndexFor(
  columnIndex: number,
  focusedColumnIndex: number | null,
): 0 | -1 {
  return columnIndex === focusedColumnIndex ? 0 : -1;
}

/**
 * The cell at a coordinate, found through the table's own row and cell
 * collections rather than a selector.
 *
 * Ids can hold anything a consumer's data holds, and an attribute selector
 * built from one would have to escape it; positions need no quoting.
 *
 * `columnIndex` is clamped to the row's own last cell rather than read
 * directly: a group-header row renders one `<td colSpan>` regardless of
 * `columnCount`, so a focus arriving from a data row further right (or a
 * `columnIndex` a keyboard `End` left behind) would otherwise address a cell
 * that row doesn't have.
 */
function cellAt(table: HTMLTableElement, focus: GridFocus): HTMLElement | null {
  const row =
    focus.rowIndex === HEADER_ROW
      ? (table.tHead?.rows[0] ?? null)
      : (table.tBodies[0]?.rows[focus.rowIndex] ?? null);
  if (row === null) {
    return null;
  }
  const columnIndex = Math.min(focus.columnIndex, row.cells.length - 1);
  return row.cells[columnIndex] ?? null;
}

/**
 * Moves one tab stop around the grid, which is what `role="grid"` obliges:
 * arrow keys travel cell to cell and Tab passes the whole grid by.
 *
 * Separate from selection because focus and selection are different states — a
 * cell is focused while travelling before anything is selected, and every cell
 * of a range is selected without being focused. Navigation also has to work
 * with selection turned off entirely, so it cannot depend on it.
 */
export default function useGridNavigation({
  tableRef,
  rowCount,
  columnCount,
  isSkippableRow,
}: UseGridNavigationOptions): GridNavigationApi {
  const [stored, setStored] = useState<GridFocus>({
    rowIndex: HEADER_ROW,
    columnIndex: 0,
  });

  /**
   * Clamped on the way out rather than written back, so that a coordinate
   * pushed out of range by a change to the data is restored when the data
   * comes back — and so the effect below cannot chase its own output.
   * Memoized on the individual coordinates rather than recomputed on every
   * render: `clampFocus` always returns a fresh object, and `getFocusedCell`
   * on `DataGridApi` hands this same value to `useSyncExternalStore`-based
   * hooks, which need a referentially stable snapshot when nothing changed.
   */
  const focus = useMemo(
    () => clampFocus(stored, rowCount, columnCount),
    [stored, rowCount, columnCount],
  );

  /**
   * Whether the browser's focus still has to be moved to match. Without it
   * every render would pull focus into the grid, including the first.
   */
  const pending = useRef(false);

  useEffect(() => {
    if (!pending.current) {
      return;
    }
    pending.current = false;
    const table = tableRef.current;
    if (table === null) {
      return;
    }
    cellAt(table, { rowIndex: focus.rowIndex, columnIndex: focus.columnIndex })
      // Focusing the cell the browser already sits on is a no-op, which is what
      // makes one method serve both a key press and a cell reporting a click.
      ?.focus();
  }, [tableRef, focus.rowIndex, focus.columnIndex]);

  /** How many rows fit the viewport, which is what a page key should move. */
  function pageSize(): number {
    const table = tableRef.current;
    const firstRow = table?.tBodies[0]?.rows[0];
    const viewport = table?.parentElement;
    if (
      firstRow === undefined ||
      viewport === null ||
      viewport === undefined ||
      firstRow.offsetHeight === 0
    ) {
      return FALLBACK_PAGE;
    }
    return Math.max(
      1,
      Math.floor(viewport.clientHeight / firstRow.offsetHeight),
    );
  }

  function focusCell(rowIndex: number, columnIndex: number): void {
    const next = clampFocus({ rowIndex, columnIndex }, rowCount, columnCount);
    if (
      next.rowIndex === focus.rowIndex &&
      next.columnIndex === focus.columnIndex
    ) {
      return;
    }
    pending.current = true;
    setStored(next);
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLElement>): void {
    const next = nextFocusForKey(
      event.key,
      {
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        altKey: event.altKey,
        shiftKey: event.shiftKey,
      },
      focus,
      rowCount,
      columnCount,
      pageSize(),
      isSkippableRow,
    );
    if (next === null) {
      return;
    }

    // Taken even when the move lands nowhere: an arrow at the last row would
    // otherwise scroll the page out from under the grid.
    event.preventDefault();
    focusCell(next.rowIndex, next.columnIndex);
  }

  // A new object each render, as the other hooks here return: the handlers
  // close over the focus they move from.
  return {
    focus,
    tabIndexFor: (rowIndex, columnIndex) =>
      tabIndexFor(
        columnIndex,
        rowIndex === focus.rowIndex ? focus.columnIndex : null,
      ),
    focusCell,
    onKeyDown,
  };
}
