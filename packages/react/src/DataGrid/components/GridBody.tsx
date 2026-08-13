import { useMemo } from "react";
import {
  groupRowId,
  intentOf,
  type AggregateState,
  type DisplayRow,
} from "@gridkitjs/core";
import type { ResolvedColumn } from "../DataGrid";
import type { GridNavigationApi } from "../useGridNavigation";
import type { RowGroupingApi } from "../useRowGrouping";
import {
  keyboardSelectIntent,
  type GridSelectionApi,
} from "../useGridSelection";
import GridGroupRow from "./GridGroupRow";
import GridRow from "./GridRow";

interface GridBodyProps<Row> {
  columns: readonly ResolvedColumn<Row>[];
  rows: readonly DisplayRow<Row>[];
  /** The column being resized, so its cells outline with its header. */
  activeColumnId: string | null;
  nav: GridNavigationApi;
  selection: GridSelectionApi;
  grouping: RowGroupingApi<Row>;
  /** Active aggregates, for a group header to render its own subtotal inline. Empty when none are active. */
  aggregates: AggregateState<Row>;
}

/** Where a cell sits, read off the table's own indices rather than an attribute. */
interface CellPosition {
  rowIndex: number;
  columnIndex: number;
  columnId: string;
}

/**
 * The cell an event happened in. `closest` is what makes the whole cell the
 * target: a click on a template's own markup resolves to the cell holding it.
 *
 * Never matches inside a group-header row: that row's single `<td>` carries
 * no `data-gridkit-column` (it spans every column at once, so no one column
 * id applies), which is what keeps this function — and everything built on
 * it — data-row-only without an explicit `"kind"` check of its own.
 */
function cellFrom(target: EventTarget): CellPosition | null {
  if (!(target instanceof Element)) {
    return null;
  }
  const cell = target.closest("td[data-gridkit-column]");
  const row = cell?.parentElement;
  const columnId = cell?.getAttribute("data-gridkit-column");
  if (
    !(cell instanceof HTMLTableCellElement) ||
    !(row instanceof HTMLTableRowElement) ||
    columnId === null ||
    columnId === undefined
  ) {
    return null;
  }
  return {
    rowIndex: row.sectionRowIndex,
    columnIndex: cell.cellIndex,
    columnId,
  };
}

/** The group-header row an event happened in, if any. */
function groupRowFrom(
  target: EventTarget,
): { rowIndex: number; groupId: string } | null {
  if (!(target instanceof Element)) {
    return null;
  }
  const row = target.closest("tr[data-gridkit-group]");
  const groupId = row?.getAttribute("data-gridkit-group");
  if (
    !(row instanceof HTMLTableRowElement) ||
    groupId === null ||
    groupId === undefined
  ) {
    return null;
  }
  return { rowIndex: row.sectionRowIndex, groupId };
}

interface GroupAriaMeta {
  posinset: number;
  setsize: number;
}

/**
 * `aria-posinset`/`aria-setsize` per group header: its 1-based position
 * among, and count of, the group headers sharing its level and immediate
 * parent. Depth-first order (see `groupRows`) keeps siblings contiguous, so
 * one pass tallies each parent's total and a second assigns each header's
 * position within it.
 */
function groupAriaMeta<Row>(
  rows: readonly DisplayRow<Row>[],
): ReadonlyMap<string, GroupAriaMeta> {
  const totals = new Map<string, number>();
  for (const entry of rows) {
    if (!("kind" in entry)) continue;
    const parentKey = groupRowId(entry.path.slice(0, -1));
    totals.set(parentKey, (totals.get(parentKey) ?? 0) + 1);
  }

  const seen = new Map<string, number>();
  const meta = new Map<string, GroupAriaMeta>();
  for (const entry of rows) {
    if (!("kind" in entry)) continue;
    const parentKey = groupRowId(entry.path.slice(0, -1));
    const posinset = (seen.get(parentKey) ?? 0) + 1;
    seen.set(parentKey, posinset);
    meta.set(entry.groupId, {
      posinset,
      setsize: totals.get(parentKey) ?? posinset,
    });
  }
  return meta;
}

/**
 * Events are delegated to the body rather than bound per cell, which is what
 * lets `GridRow` be memoised: a handler rebuilt each render is a prop that
 * changes each render, and one reaching every row would defeat the boundary
 * entirely.
 */
export default function GridBody<Row>({
  columns,
  rows,
  activeColumnId,
  nav,
  selection,
  grouping,
  aggregates,
}: GridBodyProps<Row>) {
  const { selectedCell, rowMode, cellMode } = selection;
  const ariaMeta = useMemo(() => groupAriaMeta(rows), [rows]);

  /** The row and cell an event addresses, resolved once for every handler. */
  function targetOf(
    target: EventTarget,
  ): { position: CellPosition; rowId: string } | null {
    const position = cellFrom(target);
    const entry = position === null ? undefined : rows[position.rowIndex];
    if (position === null || entry === undefined || "kind" in entry) {
      return null;
    }
    return { position, rowId: entry.rowId };
  }

  function select(
    rowId: string,
    columnId: string,
    modifiers: { ctrlKey: boolean; metaKey: boolean; shiftKey: boolean },
  ): void {
    const intent = intentOf(modifiers);
    // Independent of each other: selecting a cell says nothing about its row,
    // so a grid with both on reports both.
    if (rowMode !== false) {
      selection.selectRow(rowId, intent);
    }
    if (cellMode !== false) {
      selection.selectCell({ rowId, columnId }, intent);
    }
  }

  return (
    <tbody
      className="grid-body"
      onFocus={(event) => {
        const group = groupRowFrom(event.target);
        if (group !== null) {
          // One cell for the whole row — see the note on `focused` below.
          nav.focusCell(group.rowIndex, 0);
          return;
        }
        const found = targetOf(event.target);
        if (found === null) return;
        nav.focusCell(found.position.rowIndex, found.position.columnIndex);
      }}
      onClick={(event) => {
        const group = groupRowFrom(event.target);
        if (group !== null) {
          grouping.toggleExpansion(group.groupId);
          return;
        }
        const found = targetOf(event.target);
        if (found === null) return;
        select(found.rowId, found.position.columnId, event);
      }}
      onKeyDown={(event) => {
        const group = groupRowFrom(event.target);
        if (group !== null) {
          // One cell spans every column, so there is nothing to move within —
          // left/right stay a no-op rather than silently moving `nav`'s
          // stored column index off of a cell this row doesn't have.
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            return;
          }
          if (event.key === " " || event.key === "Enter") {
            event.preventDefault();
            grouping.toggleExpansion(group.groupId);
            return;
          }
          nav.onKeyDown(event);
          return;
        }

        // Space builds a selection up and Enter replaces it, matching the
        // Ctrl-click and the plain click they stand in for.
        if (event.key === " " || event.key === "Enter") {
          const found = targetOf(event.target);
          if (found === null) return;
          // Taken whether or not anything is selectable: Space would otherwise
          // scroll the grid out from under the focused cell.
          event.preventDefault();
          select(
            found.rowId,
            found.position.columnId,
            keyboardSelectIntent(event),
          );
          return;
        }
        nav.onKeyDown(event);
      }}
    >
      {rows.map((entry) =>
        "kind" in entry ? (
          <GridGroupRow
            key={entry.groupId}
            columnCount={columns.length}
            groupId={entry.groupId}
            level={entry.level}
            columnLabel={
              columns.find((column) => column.id === entry.columnId)?.label ??
              entry.columnId
            }
            value={entry.value}
            expanded={entry.expanded}
            count={entry.count}
            datasetIndex={entry.datasetIndex}
            posinset={ariaMeta.get(entry.groupId)?.posinset ?? 1}
            setsize={ariaMeta.get(entry.groupId)?.setsize ?? 1}
            aggregates={aggregates}
            results={entry.aggregates}
            columns={columns}
            // Ignores `nav.focus.columnIndex`: with only one cell in this
            // row, whether it holds the tab stop depends on `rowIndex`
            // alone.
            focused={nav.focus.rowIndex === entry.rowIndex}
          />
        ) : (
          <GridRow<Row>
            key={entry.rowId}
            columns={columns}
            rowId={entry.rowId}
            row={entry.row}
            rowIndex={entry.rowIndex}
            datasetIndex={entry.datasetIndex}
            activeColumnId={activeColumnId}
            selectedColumnIds={selection.selectedColumnIds}
            selected={selection.selectedRowIds.has(entry.rowId)}
            /*
             * Narrowed to this row before it crosses the boundary, so that
             * moving the selected cell re-renders the two rows it moved
             * between rather than all of them.
             */
            selectedColumnId={
              selectedCell?.rowId === entry.rowId ? selectedCell.columnId : null
            }
            focusedColumnIndex={
              nav.focus.rowIndex === entry.rowIndex
                ? nav.focus.columnIndex
                : null
            }
            rowsSelectable={rowMode !== false}
            cellsSelectable={cellMode !== false}
          />
        ),
      )}
    </tbody>
  );
}
