import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type RefObject,
} from "react";
import {
  contextMenuEntries,
  isSameCell,
  resolveMenu,
  type CellSelectionState,
  type GridContextMenuArea,
  type GridContextMenuTarget,
  type GridMessages,
  type GridOptions,
  type ResolvedMenuEntry,
  type ResolvedMenuItem,
} from "@gridkitjs/core";
import { hasContextMenu } from "@gridkitjs/core/renderer";
import {
  attachContextMenuTrigger,
  type ContextMenuRequest,
  type OverlayAnchor,
} from "@gridkitjs/dom";
import type { GridCommandsApi } from "../commands/useGridCommands";
import { overlayThemeClassName } from "../overlay/Overlay";
import type { GridOverlayApi } from "../overlay/useGridOverlay";
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
  /** The grid's one open overlay, the menu among them. */
  overlay: GridOverlayApi;
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
  /** See `GridOverlayApi`. */
  returnFocusFallback: () => HTMLElement | null;
  /** Runs the item the user chose, reporting it if it ran, then closes the menu. */
  run: (item: ResolvedMenuItem) => void;
  close: () => void;
}

/**
 * The grid's context menu. `@gridkitjs/dom`'s trigger reports a right-click,
 * Shift+F10 or the ContextMenu key inside the grid, and the ref can ask for
 * one too; the `contextMenu` option and `@gridkitjs/core`'s `resolveMenu`
 * say what menu that place has; this opens it as the grid's one overlay
 * (see `useGridOverlay`, which tells `onContextMenuOpenChange`) and does
 * what opening it means in the grid.
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
  overlay,
  controller,
  commands,
  nav,
  selection,
  messages,
  columnName,
}: UseContextMenuOptions<Row>): ContextMenuApi {
  const { drawn, close: closeOverlay } = overlay;
  const openings = useRef(0);
  const enabled = contextMenu !== undefined && contextMenu !== false;

  function parts(): GridParts<Row> {
    const { columns, pageRows } = controller.getView();
    return {
      root: rootRef.current,
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
    const cell = {
      kind: "cell",
      rowId: target.rowId,
      columnId: target.columnId,
    } satisfies CellSelectionState;
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
      nav.focusCellNow(cell.focus);
    }
    openings.current += 1;
    overlay.open({
      kind: "contextMenu",
      menu: {
        key: openings.current,
        target,
        entries: resolved,
        label: labelOf(target),
        anchor: point ?? anchor,
        cell: cell?.element ?? null,
        themeClassName: overlayThemeClassName(rootRef.current),
      },
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

  const close = useCallback(() => {
    closeOverlay("contextMenu");
  }, [closeOverlay]);

  // A menu open as `contextMenu` turns off, or as the grid unmounts, closes
  // with it.
  useEffect(() => (enabled ? close : undefined), [enabled, close]);

  return {
    menu: drawn.kind === "contextMenu" ? drawn.menu : null,
    opens: (area) => hasContextMenu(contextMenu, area),
    open: (target, anchor) => {
      const place = placeOf(target, parts());
      return place !== null && openAt(place, anchor ?? null);
    },
    returnFocusFallback: overlay.returnFocusFallback,
    run: (item) => {
      const open = overlay.current();
      if (item.run() && open.kind === "contextMenu") {
        commands.report(item.id, open.menu.target, "contextMenu");
      }
      // A panel the item opened has replaced the menu already, and stays.
      close();
    },
    close,
  };
}
