import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  contextMenuEntries,
  hasContextMenu,
  isSameCell,
  resolveMenu,
  type GridContextMenuArea,
  type GridContextMenuTarget,
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
import {
  placeAt,
  placeOf,
  type ContextMenuPlace,
  type GridParts,
} from "./contextMenuPlaces";

interface UseContextMenuOptions<Row> {
  /** The grid's root element: a menu is asked for on what is inside it. */
  rootRef: RefObject<HTMLElement | null>;
  headerTableRef: RefObject<HTMLTableElement | null>;
  bodyTableRef: RefObject<HTMLTableElement | null>;
  /** The body's scrolling region, whose empty space is the `body` area. */
  bodyScrollRef: RefObject<HTMLElement | null>;
  contextMenu: GridOptions<Row>["contextMenu"];
  onContextMenuOpenChange: GridOptions<Row>["onContextMenuOpenChange"];
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
  readonly target: GridContextMenuTarget;
  readonly entries: readonly ResolvedMenuEntry[];
  /** Its accessible name. */
  readonly label: string;
  /** The point it was asked for at, or its cell when asked for by a key. */
  readonly anchor: OverlayAnchor;
  /**
   * The cell it opened on, which has focus first and gets it back after —
   * `null` in the body's empty space, which leaves focus where it was.
   */
  readonly cell: HTMLElement | null;
  readonly themeClassName: string;
}

export interface ContextMenuApi {
  menu: OpenContextMenu | null;
  /** Whether `area` opens a menu — for the `aria-keyshortcuts` of its cells. */
  opens: (area: GridContextMenuArea) => boolean;
  /**
   * Opens the menu `target` has, as a right-click there would, beside
   * `anchor` or below its cell, and says whether it did: not for a target
   * that is not on screen, or whose menu is empty.
   */
  open: (target: GridContextMenuTarget, anchor?: OverlayAnchor) => boolean;
  /** Runs the item the user chose, reporting it if it ran, then closes the menu. */
  run: (item: ResolvedMenuItem) => void;
  close: () => void;
}

/**
 * The grid's context menu. `@gridkitjs/dom`'s trigger reports a right-click,
 * Shift+F10 or the ContextMenu key inside the grid, and the ref can ask for
 * one too; the `contextMenu` option and `@gridkitjs/core`'s `resolveMenu`
 * say what menu that place has; this holds which one is open, tells
 * `onContextMenuOpenChange`, and does what opening it means in the grid.
 *
 * Opening one on a column, row or cell that is not selected selects it
 * first, where that kind is selectable, as a click on it would — opening one
 * inside the selection keeps it, so a menu can act on everything selected.
 * Focus moves to the cell first, so closing the menu returns it there. A
 * place whose menu resolves to nothing shows the browser's own.
 */
export default function useContextMenu<Row>({
  rootRef,
  headerTableRef,
  bodyTableRef,
  bodyScrollRef,
  contextMenu,
  onContextMenuOpenChange,
  controller,
  commands,
  nav,
  selection,
  messages,
  columnName,
}: UseContextMenuOptions<Row>): ContextMenuApi {
  const [menu, setMenu] = useState<OpenContextMenu | null>(null);
  /** The menu open as of the last change, ahead of the render that draws it. */
  const current = useRef<OpenContextMenu | null>(null);
  const openings = useRef(0);
  const enabled = contextMenu !== undefined && contextMenu !== false;

  function parts(): GridParts<Row> {
    const { columns, pageRows } = controller.getView();
    return {
      headerTable: headerTableRef.current,
      bodyTable: bodyTableRef.current,
      body: bodyScrollRef.current,
      columns,
      pageRows,
    };
  }

  function labelOf(target: GridContextMenuTarget): string {
    switch (target.area) {
      case "header":
        return messages.headerMenuLabel(columnName(target.columnId));
      case "cell":
        return messages.cellMenuLabel;
      case "group":
        return messages.groupMenuLabel;
      case "body":
        return messages.bodyMenuLabel;
    }
  }

  /**
   * Selects what the menu opens on unless it is selected already, and says
   * whether it did. Each kind follows its own `selectable` mode, as a click
   * does — a cell's row and the cell itself apart — and a kind a user cannot
   * select is left alone.
   */
  function selectTarget(target: GridContextMenuTarget): boolean {
    const state = controller.getState();
    if (target.area === "header") {
      if (
        selection.columnMode === false ||
        state.columnSelection.includes(target.columnId)
      ) {
        return false;
      }
      controller.selectColumn(target.columnId, "replace");
      return true;
    }
    if (target.area !== "cell") {
      return false;
    }
    const cell = { rowId: target.rowId, columnId: target.columnId };
    const selectRow =
      selection.rowMode !== false && !state.rowSelection.includes(target.rowId);
    const selectCell =
      selection.cellMode !== false && !isSameCell(state.cellSelection, cell);
    if (selectRow) {
      controller.selectRow(target.rowId, "replace");
    }
    if (selectCell) {
      controller.selectCell(cell, "replace");
    }
    return selectRow || selectCell;
  }

  /** The menu `target` has, over the grid as it is now. */
  function resolveFor(
    target: GridContextMenuTarget,
  ): readonly ResolvedMenuEntry[] {
    const context = commands.contextFor(target);
    return resolveMenu(contextMenuEntries(contextMenu, context), {
      commands: commands.commands,
      context,
    });
  }

  /**
   * Shows `next` in place of the menu open, or closes it with `null`, and
   * tells `onContextMenuOpenChange` — the one closing first.
   */
  function show(next: OpenContextMenu | null): void {
    const previous = current.current;
    if (previous === next) {
      return;
    }
    current.current = next;
    setMenu(next);
    if (previous !== null) {
      onContextMenuOpenChange?.({ open: false, target: previous.target });
    }
    if (next !== null) {
      onContextMenuOpenChange?.({ open: true, target: next.target });
    }
  }

  function openAt(
    { target, cell, anchor }: ContextMenuPlace,
    point: OverlayAnchor | null,
  ): boolean {
    let resolved = resolveFor(target);
    if (resolved.length === 0) {
      return false;
    }
    // Resolved again against the selection the menu now acts on.
    if (selectTarget(target)) {
      resolved = resolveFor(target);
    }
    if (cell !== null && document.activeElement !== cell.element) {
      // Focused without scrolling first: a scroll would close the menu about
      // to open beside it. Moving the tab stop after it then finds the cell
      // focused already.
      cell.element.focus({ preventScroll: true });
      nav.focusCellNow(cell.rowIndex, cell.columnIndex);
    }
    openings.current += 1;
    show({
      key: openings.current,
      target,
      entries: resolved,
      label: labelOf(target),
      anchor: point ?? anchor,
      cell: cell?.element ?? null,
      themeClassName: overlayThemeClassName(rootRef.current),
    });
    return true;
  }

  function handleRequest({ target, point }: ContextMenuRequest): boolean {
    const place = placeAt(target, parts());
    return place !== null && openAt(place, point);
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
      closed.cell !== null &&
      !closed.cell.isConnected &&
      document.activeElement === document.body
    ) {
      nav.focusTabStop();
    }
  });

  function close(): void {
    show(null);
  }

  return {
    menu,
    opens: (area) => hasContextMenu(contextMenu, area),
    open: (target, anchor) => {
      const place = placeOf(target, parts());
      return place !== null && openAt(place, anchor ?? null);
    },
    run: (item) => {
      const open = current.current;
      if (item.run() && open !== null) {
        commands.report(item.id, open.target, "contextMenu");
      }
      close();
    },
    close,
  };
}
