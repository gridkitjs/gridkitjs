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
  hasContextMenu,
  HEADER_ROW,
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
  bodyCellFrom,
  bodyRowFrom,
  findBodyRow,
  groupRowFrom,
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
  bodyTableRef: RefObject<HTMLTableElement | null>;
  /** The body's scrolling region, whose empty space is the `body` area. */
  bodyScrollRef: RefObject<HTMLElement | null>;
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
  /** Runs the item the user chose, reporting it if it ran, then closes the menu. */
  run: (item: ResolvedMenuItem) => void;
  close: () => void;
}

/** The cell a menu opens on, by its place in the grid's focus. */
interface TargetCell {
  readonly element: HTMLTableCellElement;
  readonly rowIndex: number;
  readonly columnIndex: number;
}

/** Where a menu was asked for: its target, and what it is drawn beside. */
interface FoundTarget {
  readonly target: GridContextMenuTarget;
  /** `null` in the body's empty space. */
  readonly cell: TargetCell | null;
  /** What a menu opened without a point goes beside: the cell, or the body. */
  readonly anchor: Element;
  readonly label: string;
}

/**
 * The grid's context menu. `@gridkitjs/dom`'s trigger reports a right-click,
 * Shift+F10 or the ContextMenu key inside the grid; the `contextMenu` option
 * and `@gridkitjs/core`'s `resolveMenu` say what menu that place has; this
 * holds which one is open and does what opening it means in the grid.
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

  function headerTarget(element: Element): FoundTarget | null {
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
      target: { area: "header", columnId },
      cell: {
        element: cell,
        rowIndex: HEADER_ROW,
        columnIndex: cell.cellIndex,
      },
      anchor: cell,
      label: messages.headerMenuLabel(columnName(columnId)),
    };
  }

  /**
   * Body row `rowIndex`'s cell `columnIndex`, when `element` is in it — not
   * in a table some cell template holds, which has rows of its own.
   */
  function bodyCell(
    element: Element,
    rowIndex: number,
    columnIndex: number,
  ): TargetCell | null {
    const cell = findBodyRow(bodyTableRef.current, rowIndex)?.cells[
      columnIndex
    ];
    return cell?.contains(element)
      ? { element: cell, rowIndex, columnIndex }
      : null;
  }

  /**
   * A data cell or a group row of the body, read off the rows on the page,
   * or the body's empty space. A group's summary row, which has nothing of
   * its own to act on, has no grid menu — nor has anything outside the body,
   * such as the footer, the pager or the group-by bar.
   */
  function bodyTarget(element: Element): FoundTarget | null {
    const body = bodyScrollRef.current;
    if (body === null || !body.contains(element)) {
      return null;
    }
    const { pageRows } = controller.getView();
    const group = groupRowFrom(element);
    if (group !== null) {
      const entry = pageRows[group.rowIndex];
      const cell = bodyCell(element, group.rowIndex, 0);
      if (
        entry === undefined ||
        !("kind" in entry) ||
        entry.kind !== "group" ||
        cell === null
      ) {
        return null;
      }
      return {
        target: {
          area: "group",
          groupId: group.groupId,
          columnId: entry.columnId,
        },
        cell,
        anchor: cell.element,
        label: messages.groupMenuLabel,
      };
    }
    const position = bodyCellFrom(element);
    if (position !== null) {
      const entry = pageRows[position.rowIndex];
      const cell = bodyCell(element, position.rowIndex, position.columnIndex);
      if (entry === undefined || "kind" in entry || cell === null) {
        return null;
      }
      return {
        target: {
          area: "cell",
          rowId: entry.rowId,
          columnId: position.columnId,
        },
        cell,
        anchor: cell.element,
        label: messages.cellMenuLabel,
      };
    }
    if (bodyRowFrom(element) !== null) {
      return null;
    }
    return {
      target: { area: "body" },
      cell: null,
      anchor: body,
      label: messages.bodyMenuLabel,
    };
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

  /**
   * Drawn at once, not with the next render: the grid's focus follows a move
   * once it is drawn, and a move still pending when the menu opens would
   * pull focus back out of it.
   */
  function focusCell({ element, rowIndex, columnIndex }: TargetCell): void {
    if (document.activeElement === element) {
      return;
    }
    flushSync(() => {
      nav.focusCell(rowIndex, columnIndex);
    });
    element.focus({ preventScroll: true });
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

  function handleRequest({ target, point }: ContextMenuRequest): boolean {
    const found = headerTarget(target) ?? bodyTarget(target);
    if (found === null) {
      return false;
    }
    let resolved = resolveFor(found.target);
    if (resolved.length === 0) {
      return false;
    }
    // Resolved again against the selection the menu now acts on.
    if (selectTarget(found.target)) {
      resolved = resolveFor(found.target);
    }
    if (found.cell !== null) {
      focusCell(found.cell);
    }
    openings.current += 1;
    setMenu({
      key: openings.current,
      target: found.target,
      entries: resolved,
      label: found.label,
      anchor: point ?? found.anchor,
      cell: found.cell?.element ?? null,
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
      closed.cell !== null &&
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
    opens: (area) => hasContextMenu(contextMenu, area),
    run: (item) => {
      if (item.run() && menu !== null) {
        commands.report(item.id, menu.target, "contextMenu");
      }
      close();
    },
    close,
  };
}
