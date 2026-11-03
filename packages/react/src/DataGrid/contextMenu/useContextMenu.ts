import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { flushSync } from "react-dom";
import {
  contextMenuEntries,
  HEADER_ROW,
  resolveMenu,
  type GridCommandTarget,
  type GridContextMenuArea,
  type GridMessages,
  type GridOptions,
  type ResolvedMenuEntry,
  type ResolvedMenuItem,
} from "@gridkitjs/core";
import {
  attachContextMenuTrigger,
  type ContextMenuRequest,
  type OverlayAnchor,
} from "@gridkitjs/dom";
import type { GridCommandsApi } from "../commands/useGridCommands";
import { overlayThemeClassName } from "../overlay/Overlay";
import type { DataGridController } from "../useGridController";
import type { GridNavigationApi } from "../useGridNavigation";
import type { GridSelectionApi } from "../useGridSelection";

interface UseContextMenuOptions<Row> {
  /** The grid's root element: a menu is asked for on what is inside it. */
  rootRef: RefObject<HTMLElement | null>;
  headerTableRef: RefObject<HTMLTableElement | null>;
  contextMenu: GridOptions<Row>["contextMenu"];
  controller: DataGridController<Row>;
  commands: GridCommandsApi<Row>;
  nav: GridNavigationApi;
  selection: GridSelectionApi;
  messages: GridMessages;
  /** What a column is called in a menu's name. */
  columnName: (columnId: string) => string;
}

/** The context menu open now. */
export interface OpenContextMenu {
  /** Counts the openings, so one opened over another replaces it. */
  readonly key: number;
  readonly target: GridCommandTarget;
  readonly entries: readonly ResolvedMenuEntry[];
  /** Its accessible name. */
  readonly label: string;
  /** The point it was asked for at, or its cell when asked for by a key. */
  readonly anchor: OverlayAnchor;
  /** The cell it opened on, which has focus first and gets it back after. */
  readonly cell: HTMLElement;
  readonly themeClassName: string;
}

export interface ContextMenuApi {
  menu: OpenContextMenu | null;
  /** Whether a column header opens a menu — for its `aria-keyshortcuts`. */
  headerMenu: boolean;
  /** Runs the item the user chose, then closes the menu. */
  run: (item: ResolvedMenuItem) => void;
  close: () => void;
}

/** Where a menu was asked for: its target, and the cell it is drawn on. */
interface FoundTarget {
  readonly area: GridContextMenuArea;
  readonly target: GridCommandTarget;
  readonly cell: HTMLTableCellElement;
  readonly rowIndex: number;
  readonly label: string;
}

/**
 * The grid's context menu. `@gridkitjs/dom`'s trigger reports a right-click,
 * Shift+F10 or the ContextMenu key inside the grid; the `contextMenu` option
 * and `@gridkitjs/core`'s `resolveMenu` say what menu that place has; this
 * holds which one is open and does what opening it means in the grid.
 *
 * Opening one on a column that is not selected selects it first, where
 * columns are selectable, as a click on it would — opening one inside the
 * selection keeps it, so a menu can act on everything selected. Focus moves
 * to the cell first, so closing the menu returns it there. A place whose menu
 * resolves to nothing shows the browser's own.
 */
export default function useContextMenu<Row>({
  rootRef,
  headerTableRef,
  contextMenu,
  controller,
  commands,
  nav,
  selection,
  messages,
  columnName,
}: UseContextMenuOptions<Row>): ContextMenuApi {
  const [menu, setMenu] = useState<OpenContextMenu | null>(null);
  const openings = useRef(0);
  const enabled = contextMenu !== undefined && contextMenu !== false;

  function targetOf(element: Element): FoundTarget | null {
    const headerRow = headerTableRef.current?.tHead?.rows[0];
    const cell = element.closest<HTMLTableCellElement>(
      "th[data-gridkit-column]",
    );
    const columnId = cell?.getAttribute("data-gridkit-column");
    if (
      cell === null ||
      cell.parentElement !== headerRow ||
      columnId === null ||
      columnId === undefined
    ) {
      return null;
    }
    return {
      area: "header",
      target: { area: "header", columnId },
      cell,
      rowIndex: HEADER_ROW,
      label: messages.headerMenuLabel(columnName(columnId)),
    };
  }

  /**
   * Selects what the menu opens on unless it is selected already, and says
   * whether it did. A column a user cannot select is left alone.
   */
  function selectTarget(target: GridCommandTarget): boolean {
    if (
      target.area !== "header" ||
      selection.columnMode === false ||
      controller.getState().columnSelection.includes(target.columnId)
    ) {
      return false;
    }
    controller.selectColumn(target.columnId, "replace");
    return true;
  }

  /**
   * Drawn at once, not with the next render: the grid's focus follows a move
   * once it is drawn, and a move still pending when the menu opens would
   * pull focus back out of it.
   */
  function focusCell({ cell, rowIndex }: FoundTarget): void {
    if (document.activeElement === cell) {
      return;
    }
    flushSync(() => {
      nav.focusCell(rowIndex, cell.cellIndex);
    });
    cell.focus({ preventScroll: true });
  }

  function handleRequest({ target, point }: ContextMenuRequest): boolean {
    const found = targetOf(target);
    if (found === null) {
      return false;
    }
    const entries = contextMenuEntries(contextMenu, found.area);
    const resolve = () =>
      resolveMenu(entries, {
        commands: commands.commands,
        context: commands.contextFor(found.target),
      });
    let resolved = resolve();
    if (resolved.length === 0) {
      return false;
    }
    // Resolved again against the selection the menu now acts on.
    if (selectTarget(found.target)) {
      resolved = resolve();
    }
    focusCell(found);
    openings.current += 1;
    setMenu({
      key: openings.current,
      target: found.target,
      entries: resolved,
      label: found.label,
      anchor: point ?? found.cell,
      cell: found.cell,
      themeClassName: overlayThemeClassName(rootRef.current),
    });
    return true;
  }

  // The trigger is attached once, and hears every request through this.
  const latestRequest = useRef(handleRequest);
  useLayoutEffect(() => {
    latestRequest.current = handleRequest;
  });

  useEffect(() => {
    const root = rootRef.current;
    if (!enabled || root === null) {
      return undefined;
    }
    return attachContextMenuTrigger(root, {
      onRequest: (request) => latestRequest.current(request),
    });
  }, [rootRef, enabled]);

  /**
   * The cell a menu returns focus to can go with what the menu did — a
   * hidden column takes its header — and focus then falls to the page.
   * It goes to the cell now holding the grid's tab stop instead.
   */
  const shown = useRef<OpenContextMenu | null>(null);
  useLayoutEffect(() => {
    const closed = shown.current;
    shown.current = menu;
    if (
      menu === null &&
      closed !== null &&
      !closed.cell.isConnected &&
      document.activeElement === document.body
    ) {
      nav.focusTabStop();
    }
  });

  function close(): void {
    setMenu(null);
  }

  return {
    menu,
    headerMenu: contextMenuEntries(contextMenu, "header").length > 0,
    run: (item) => {
      item.run();
      close();
    },
    close,
  };
}
