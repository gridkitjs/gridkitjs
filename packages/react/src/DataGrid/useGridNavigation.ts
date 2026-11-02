import {
  useEffect,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
} from "react";
import { HEADER_ROW, type GridFocus } from "@gridkitjs/core";
import {
  createGridFocus,
  findBodyRow,
  measurePageSize,
  type FocusVirtualRange,
  type GridFocusOptions,
} from "@gridkitjs/dom";

export { HEADER_ROW, type GridFocus };

interface UseGridNavigationOptions {
  headerTableRef: RefObject<HTMLTableElement | null>;
  bodyTableRef: RefObject<HTMLTableElement | null>;
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
  /**
   * The window `useRowVirtualizer` drew, present only when `virtualized` is
   * on, in which case behavior is otherwise unchanged. A focus move can
   * target a row index that isn't currently mounted — `ArrowDown` repeated
   * past the mounted window's end, or `End`/`Ctrl+End` jumping straight to
   * the last row.
   */
  virtualRange?: FocusVirtualRange | null | undefined;
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
 * The grid's single tab stop, kept by `@gridkitjs/dom`'s `createGridFocus`
 * and drawn from it: created once, handed the current counts and window on
 * every render, and subscribed to, so a move re-renders the grid. The
 * header row comes from the header table's own `.tHead`; a body row through
 * `findBodyRow`, by its `data-gridkit-row-index`.
 */
export default function useGridNavigation({
  headerTableRef,
  bodyTableRef,
  rowCount,
  columnCount,
  isSkippableRow,
  virtualRange,
}: UseGridNavigationOptions): GridNavigationApi {
  const options: GridFocusOptions = {
    rowCount,
    columnCount,
    isSkippableRow,
    virtualRange,
  };
  const [gridFocus] = useState(() => createGridFocus(options));
  gridFocus.setOptions(options);
  const focus = useSyncExternalStore(gridFocus.subscribe, gridFocus.getFocus);

  useLayoutEffect(
    () =>
      gridFocus.attach({
        getHeaderRow: () => headerTableRef.current?.tHead?.rows[0] ?? null,
        getBodyRow: (rowIndex) => findBodyRow(bodyTableRef.current, rowIndex),
      }),
    [gridFocus, headerTableRef, bodyTableRef],
  );

  // After every commit rather than only when `focus` changes: under
  // virtualization the target row may mount only in a later drawing, once
  // the window has scrolled to it, and this is what retries.
  useEffect(() => {
    gridFocus.focusDrawnCell(focus);
  });

  // A new object each render, as the other hooks here return: `tabIndexFor`
  // closes over the focus it draws.
  return {
    focus,
    tabIndexFor: (rowIndex, columnIndex) =>
      tabIndexFor(
        columnIndex,
        rowIndex === focus.rowIndex ? focus.columnIndex : null,
      ),
    focusCell: gridFocus.focusCell,
    onKeyDown: (event) => {
      if (
        gridFocus.handleKey(
          event.key,
          event,
          measurePageSize(bodyTableRef.current),
        )
      ) {
        event.preventDefault();
      }
    },
  };
}
