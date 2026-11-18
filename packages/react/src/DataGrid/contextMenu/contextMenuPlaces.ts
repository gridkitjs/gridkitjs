import {
  bodyFocus,
  headerFocus,
  type DisplayRow,
  type GridContextMenuTarget,
  type GridFocus,
} from "@gridkitjs/core";
import {
  bodyCellFrom,
  bodyRowFrom,
  findBodyRow,
  groupRowFrom,
  writingDirection,
  type OverlayAnchor,
} from "@gridkitjs/dom";

/** The cell a menu opens on, with its place in the grid's focus. */
export interface TargetCell {
  readonly element: HTMLTableCellElement;
  readonly focus: GridFocus;
}

/** Where a context menu opens: its target, and what it is drawn on. */
export interface ContextMenuPlace {
  readonly target: GridContextMenuTarget;
  /** The cell that has focus while it is open; `null` in the body's empty space. */
  readonly cell: TargetCell | null;
  /**
   * What it goes beside when asked for without a point: the cell — or, for a
   * cell scrolled out of the grid's view, the nearest point on that view's
   * edge — or the body's corner.
   */
  readonly anchor: OverlayAnchor;
}

/** The parts of the grid, as drawn now, that a place is found among. */
export interface GridParts<Row> {
  /** The tables' scroll area, which scrolls the rows both ways. */
  readonly scroller: HTMLElement | null;
  /** Sticks to the scroll area's top, over the rows scrolled under it. */
  readonly headerTable: HTMLTableElement | null;
  readonly bodyTable: HTMLTableElement | null;
  /** The body's rowgroup, whose empty space is the `body` area. */
  readonly body: HTMLElement | null;
  /** Sticks to the scroll area's bottom, over the rows scrolled under it. */
  readonly footerTable: HTMLTableElement | null;
  /** The columns shown, in order — what a cell's column index counts. */
  readonly columns: readonly { readonly id: string }[];
  /** How much of the view's width the pinned columns cover at each edge. */
  readonly pinnedWidths: { readonly start: number; readonly end: number };
  /** The rows of the page, as `data-gridkit-row-index` counts them. */
  readonly pageRows: readonly DisplayRow<Row>[];
}

function headerCell(
  parts: GridParts<unknown>,
  columnIndex: number,
): TargetCell | null {
  const element = parts.headerTable?.tHead?.rows[0]?.cells[columnIndex];
  return element === undefined
    ? null
    : { element, focus: headerFocus(columnIndex) };
}

function bodyCell(
  parts: GridParts<unknown>,
  rowIndex: number,
  columnIndex: number,
): TargetCell | null {
  const element = findBodyRow(parts.bodyTable, rowIndex)?.cells[columnIndex];
  return element === undefined
    ? null
    : { element, focus: bodyFocus(rowIndex, columnIndex) };
}

/**
 * Whether `element` is a cell that pinned columns can cover: one that
 * scrolls sideways in a grid with columns pinned.
 */
function underPinnedColumns(
  element: Element,
  parts: GridParts<unknown>,
): boolean {
  return (
    parts.pinnedWidths.start + parts.pinnedWidths.end > 0 &&
    element instanceof HTMLTableCellElement &&
    !element.matches(".is-pinned-start, .is-pinned-end")
  );
}

/**
 * The part of the viewport where `element` can be seen: its grid's scrolled
 * view; for a body cell only the part of it between the header and the
 * footer, and for a cell pinned columns can cover only the part of the
 * scrollport between them.
 */
function viewOf(element: Element, parts: GridParts<unknown>): DOMRect | null {
  const { scroller } = parts;
  if (scroller === null) {
    return null;
  }
  const view = scroller.getBoundingClientRect();
  let { top, bottom, left, right } = view;
  if (parts.body?.contains(element) === true) {
    top = Math.max(
      top,
      parts.headerTable?.getBoundingClientRect().bottom ?? top,
    );
    bottom = Math.min(
      bottom,
      parts.footerTable?.getBoundingClientRect().top ?? bottom,
    );
  }
  if (underPinnedColumns(element, parts)) {
    // Pinned cells stick to the scrollport's edges, inside the scrollbar.
    const { start, end } = parts.pinnedWidths;
    const rtl = writingDirection(element) === "rtl";
    const portLeft = view.left + scroller.clientLeft;
    left = portLeft + (rtl ? end : start);
    right = portLeft + scroller.clientWidth - (rtl ? start : end);
  }
  return new DOMRect(
    left,
    top,
    Math.max(0, right - left),
    Math.max(0, bottom - top),
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** The x of `box`'s edge where `element`'s lines start: its left, or its right under `dir="rtl"`. */
function inlineStartOf(element: Element, box: DOMRect): number {
  return writingDirection(element) === "rtl" ? box.right : box.left;
}

/**
 * A cell's place, anchored to the cell itself while any of it is in the
 * grid's view (a group row's cell can be wider than the view). One scrolled
 * wholly out of it — the ref can ask for any cell drawn — is
 * anchored to the point of the view nearest its bottom corner at the inline
 * start (the left one, or the right under `dir="rtl"`) instead, so the menu
 * opens at the grid's edge rather than off in the page, over whatever the
 * grid's scrolling hides it under.
 */
function onCell(
  target: GridContextMenuTarget,
  cell: TargetCell | null,
  parts: GridParts<unknown>,
): ContextMenuPlace | null {
  if (cell === null) {
    return null;
  }
  const box = cell.element.getBoundingClientRect();
  const view = viewOf(cell.element, parts);
  if (
    view === null ||
    (box.right > view.left &&
      box.left < view.right &&
      box.bottom > view.top &&
      box.top < view.bottom)
  ) {
    return { target, cell, anchor: cell.element };
  }
  return {
    target,
    cell,
    anchor: {
      x: clamp(inlineStartOf(cell.element, box), view.left, view.right),
      y: clamp(box.bottom, view.top, view.bottom),
    },
  };
}

/**
 * The body's empty space, anchored to the top corner of the part of it in
 * view, at the inline start.
 */
function onBody(
  body: HTMLElement,
  parts: GridParts<unknown>,
): ContextMenuPlace {
  const box = body.getBoundingClientRect();
  const view = viewOf(body, parts) ?? box;
  return {
    target: { area: "body" },
    cell: null,
    anchor: {
      x: inlineStartOf(body, view),
      y: clamp(box.top, view.top, view.bottom),
    },
  };
}

function headerPlaceAt<Row>(
  element: Element,
  parts: GridParts<Row>,
): ContextMenuPlace | null {
  const cell = element.closest<HTMLTableCellElement>("th[data-gridkit-column]");
  const columnId = cell?.getAttribute("data-gridkit-column");
  if (
    cell === null ||
    cell.parentElement !== parts.headerTable?.tHead?.rows[0] ||
    columnId === null ||
    columnId === undefined
  ) {
    return null;
  }
  return onCell(
    { area: "header", columnId },
    headerCell(parts, cell.cellIndex),
    parts,
  );
}

/**
 * A data cell or a group row of the body, read off the rows of the page, or
 * the body's empty space. A cell must be the one `element` is in, not one of
 * a table some cell template holds, which has rows of its own. A group's
 * summary row, with nothing of its own to act on, has no place.
 */
function bodyPlaceAt<Row>(
  element: Element,
  parts: GridParts<Row>,
): ContextMenuPlace | null {
  const { body, pageRows } = parts;
  if (body === null || !body.contains(element)) {
    return null;
  }
  const group = groupRowFrom(element);
  if (group !== null) {
    const entry = pageRows[group.rowIndex];
    const cell = bodyCell(parts, group.rowIndex, 0);
    return entry !== undefined &&
      entry.kind === "group" &&
      cell?.element.contains(element) === true
      ? onCell(
          { area: "group", groupId: entry.groupId, columnId: entry.columnId },
          cell,
          parts,
        )
      : null;
  }
  const position = bodyCellFrom(element);
  if (position !== null) {
    const entry = pageRows[position.rowIndex];
    const cell = bodyCell(parts, position.rowIndex, position.columnIndex);
    return entry !== undefined &&
      entry.kind === "data" &&
      cell?.element.contains(element) === true
      ? onCell(
          { area: "cell", rowId: entry.rowId, columnId: position.columnId },
          cell,
          parts,
        )
      : null;
  }
  return bodyRowFrom(element) === null ? onBody(body, parts) : null;
}

/**
 * The place `element` is in — a header, a data cell, a group row or the
 * body's empty space — or `null` for anything else in the grid: the footer,
 * the pager, the group-by bar.
 */
export function placeAt<Row>(
  element: Element,
  parts: GridParts<Row>,
): ContextMenuPlace | null {
  return headerPlaceAt(element, parts) ?? bodyPlaceAt(element, parts);
}

/**
 * The place `target` names, among what is drawn now — `null` for a column,
 * row or group not on screen: hidden, on another page, in a collapsed group
 * or outside a virtualized window.
 */
export function placeOf<Row>(
  target: GridContextMenuTarget,
  parts: GridParts<Row>,
): ContextMenuPlace | null {
  const columnIndexOf = (columnId: string) =>
    parts.columns.findIndex((column) => column.id === columnId);
  switch (target.area) {
    case "header":
      return onCell(
        target,
        headerCell(parts, columnIndexOf(target.columnId)),
        parts,
      );
    case "cell": {
      const rowIndex = parts.pageRows.findIndex(
        (entry) => entry.kind === "data" && entry.rowId === target.rowId,
      );
      return onCell(
        target,
        bodyCell(parts, rowIndex, columnIndexOf(target.columnId)),
        parts,
      );
    }
    case "group": {
      const rowIndex = parts.pageRows.findIndex(
        (entry) => entry.kind === "group" && entry.groupId === target.groupId,
      );
      return onCell(target, bodyCell(parts, rowIndex, 0), parts);
    }
    case "body":
      return parts.body === null ? null : onBody(parts.body, parts);
  }
}
