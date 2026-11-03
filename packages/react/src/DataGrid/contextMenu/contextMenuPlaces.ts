import {
  HEADER_ROW,
  type DisplayRow,
  type GridContextMenuTarget,
} from "@gridkitjs/core";
import {
  bodyCellFrom,
  bodyRowFrom,
  findBodyRow,
  groupRowFrom,
  type OverlayAnchor,
} from "@gridkitjs/dom";

/** The cell a menu opens on, with its place in the grid's focus. */
export interface TargetCell {
  readonly element: HTMLTableCellElement;
  readonly rowIndex: number;
  readonly columnIndex: number;
}

/** Where a context menu opens: its target, and what it is drawn on. */
export interface ContextMenuPlace {
  readonly target: GridContextMenuTarget;
  /** The cell that has focus while it is open; `null` in the body's empty space. */
  readonly cell: TargetCell | null;
  /** What it goes beside when asked for without a point: the cell, or the body's corner. */
  readonly anchor: OverlayAnchor;
}

/** The parts of the grid, as drawn now, that a place is found among. */
export interface GridParts<Row> {
  readonly headerTable: HTMLTableElement | null;
  readonly bodyTable: HTMLTableElement | null;
  /** The body's scrolling region, whose empty space is the `body` area. */
  readonly body: HTMLElement | null;
  /** The columns shown, in order — what a cell's column index counts. */
  readonly columns: readonly { readonly id: string }[];
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
    : { element, rowIndex: HEADER_ROW, columnIndex };
}

function bodyCell(
  parts: GridParts<unknown>,
  rowIndex: number,
  columnIndex: number,
): TargetCell | null {
  const element = findBodyRow(parts.bodyTable, rowIndex)?.cells[columnIndex];
  return element === undefined ? null : { element, rowIndex, columnIndex };
}

/** A cell's place, anchored to the cell itself. */
function onCell(
  target: GridContextMenuTarget,
  cell: TargetCell | null,
): ContextMenuPlace | null {
  return cell === null ? null : { target, cell, anchor: cell.element };
}

/** The body's empty space, anchored to its top-left corner. */
function onBody(body: HTMLElement): ContextMenuPlace {
  const { left, top } = body.getBoundingClientRect();
  return { target: { area: "body" }, cell: null, anchor: { x: left, y: top } };
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
      "kind" in entry &&
      entry.kind === "group" &&
      cell?.element.contains(element) === true
      ? onCell(
          { area: "group", groupId: entry.groupId, columnId: entry.columnId },
          cell,
        )
      : null;
  }
  const position = bodyCellFrom(element);
  if (position !== null) {
    const entry = pageRows[position.rowIndex];
    const cell = bodyCell(parts, position.rowIndex, position.columnIndex);
    return entry !== undefined &&
      !("kind" in entry) &&
      cell?.element.contains(element) === true
      ? onCell(
          { area: "cell", rowId: entry.rowId, columnId: position.columnId },
          cell,
        )
      : null;
  }
  return bodyRowFrom(element) === null ? onBody(body) : null;
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
      return onCell(target, headerCell(parts, columnIndexOf(target.columnId)));
    case "cell": {
      const rowIndex = parts.pageRows.findIndex(
        (entry) => !("kind" in entry) && entry.rowId === target.rowId,
      );
      return onCell(
        target,
        bodyCell(parts, rowIndex, columnIndexOf(target.columnId)),
      );
    }
    case "group": {
      const rowIndex = parts.pageRows.findIndex(
        (entry) =>
          "kind" in entry &&
          entry.kind === "group" &&
          entry.groupId === target.groupId,
      );
      return onCell(target, bodyCell(parts, rowIndex, 0));
    }
    case "body":
      return parts.body === null ? null : onBody(parts.body);
  }
}
