import { useEffect, useRef, useState } from "react";
import type {
  ColumnSortState,
  FilterState,
  GridCommandTarget,
  GridContextMenuTarget,
  SerializedGridState,
} from "@gridkitjs/core";
import {
  DataGrid,
  serializeGridState,
  type DataGridApi,
  type DataGridProps,
} from "@gridkitjs/react";

interface RowWithId {
  readonly id: string;
}

export interface ImperativeApiGridProps<Row extends RowWithId> extends Omit<
  DataGridProps<Row>,
  "ref" | "getRowId"
> {
  /** Row id `scroll-to-row` scrolls to, and column id `scroll-to-column` scrolls to. */
  scrollRowId?: string;
  scrollColumnId?: string;
  focusRowIndex?: number;
  focusColumnIndex?: number;
  /** Column ids `hide-columns` hides and `show-columns` shows. */
  visibilityColumnIds?: readonly string[];
  /** The filter `set-filter` applies. */
  filterToSet?: FilterState<Row>;
  /** Row ids `select-rows` selects. */
  selectRowIds?: readonly string[];
  /** The sort `set-column-sort` applies. */
  sortToSet?: ColumnSortState;
  /** The column `auto-fit-column` sizes to its content. */
  autoFitColumnId?: string;
  /** The columns `fit-columns` sizes to their content; every column shown when left out. */
  autoFitColumnIds?: readonly string[];
  /** Where `open-context-menu` opens the context menu, and the point beside which, if any. */
  contextMenuTarget?: GridContextMenuTarget;
  contextMenuPoint?: { readonly x: number; readonly y: number };
  /** The command `run-command` runs, and where; `{ area: "grid" }` when left out. */
  commandId?: string;
  commandTarget?: GridCommandTarget;
}

/**
 * A test-only harness for `DataGrid`'s `ref` prop. Playwright CT's
 * function-prop bridge only supports fire-and-forget async handlers — the
 * same limitation `RowIdentifiedGrid` and `ButtonCellGrid` work around for
 * `getRowId`/`cellTemplate` — so a spec can't pass a `ref` in directly and
 * expect synchronous reads. Instead, the ref is held here, entirely
 * browser-side, and every action/read is driven through plain buttons and a
 * JSON status element a spec can query with ordinary locators.
 *
 * `getRowId` is likewise wired internally (to `row.id`) rather than left to
 * the default position-based id, for the same cross-bridge reason
 * `RowIdentifiedGrid` gives — and so `scrollRowId` can name a row by its own
 * identity rather than its position.
 *
 * Reading state is a separate button from triggering an action, deliberately:
 * `focusCell` still only queues a React state update, which isn't visible on
 * `gridRef.current` until React has re-rendered, and one `report` button
 * keeps every read on the same footing whichever action came before it.
 *
 * The grid is wrapped in its own fixed-height, scrollable container (rather
 * than relying on `gridkit-data-grid-viewport`, which only scrolls
 * horizontally by design) so `scrollToRow` has a bounded scrollable ancestor
 * to move — a real embedding page would supply the same thing.
 */
export default function ImperativeApiGrid<Row extends RowWithId>({
  scrollRowId,
  scrollColumnId,
  focusRowIndex,
  focusColumnIndex,
  visibilityColumnIds,
  filterToSet,
  selectRowIds,
  sortToSet,
  autoFitColumnId,
  autoFitColumnIds,
  contextMenuTarget,
  contextMenuPoint,
  commandId,
  commandTarget,
  ...props
}: ImperativeApiGridProps<Row>) {
  const gridRef = useRef<DataGridApi<Row>>(null);
  const [status, setStatus] = useState("");
  /** What `save-state` stored, as JSON — the way a real page would keep it. */
  const [savedState, setSavedState] = useState<string | null>(null);
  /** What the last `openContextMenu` or `runCommand` call returned. */
  const [result, setResult] = useState("");
  /** Bumped by `open-in-effect`, whose effect then opens the menu. */
  const [effectOpenings, setEffectOpenings] = useState(0);

  // From an effect, as a consumer opening the menu on some change of its own
  // would: the grid must not render synchronously from inside one.
  useEffect(() => {
    if (effectOpenings > 0 && contextMenuTarget !== undefined) {
      gridRef.current?.openContextMenu(contextMenuTarget, contextMenuPoint);
    }
  }, [effectOpenings, contextMenuTarget, contextMenuPoint]);

  function report(): void {
    const api = gridRef.current;
    if (api === null) return;
    setStatus(
      JSON.stringify({
        hasElement: api.element !== null,
        hasTable: api.table !== null,
        rowCount: api.getRows().length,
        rowIds: api.getRows().map((row) => row.rowId),
        columnIds: api.getColumns().map((column) => column.id),
        dataColumnIds: api.getDataColumns().map((column) => column.id),
        columnVisibility: api.getColumnVisibility(),
        columnSizing: api.getColumnSizing(),
        columnOrder: api.getColumnOrder(),
        columnSort: api.getColumnSort(),
        filter: api.getFilter(),
        groupBy: api.getGroupBy(),
        groupExpansion: api.getGroupExpansion(),
        displayRowCount: api.getDisplayRows().length,
        pageRowIds: api
          .getPageRows()
          .map((entry) => ("kind" in entry ? entry.groupId : entry.rowId)),
        pagination: api.getPagination(),
        pageCount: api.getPageCount(),
        rowSelection: api.getRowSelection(),
        selectedRowIds: api.getSelectedRows().map((row) => row.rowId),
        columnSelection: api.getColumnSelection(),
        cellSelection: api.getCellSelection(),
        focusedCell: api.getFocusedCell(),
        columnWidths: api
          .getColumns()
          .map((column) => [column.id, column.width]),
      }),
    );
  }

  return (
    <div>
      <div
        data-testid="scroll-container"
        style={{ maxHeight: 160, overflow: "auto" }}
      >
        <DataGrid {...props} getRowId={(row) => row.id} ref={gridRef} />
      </div>
      <button
        type="button"
        onClick={() => {
          gridRef.current?.focusCell(focusRowIndex ?? 0, focusColumnIndex ?? 0);
        }}
      >
        focus-cell
      </button>
      <button
        type="button"
        onClick={() => {
          gridRef.current?.selectAllRows();
        }}
      >
        select-all-rows
      </button>
      <button
        type="button"
        onClick={() => {
          gridRef.current?.clearSelection();
        }}
      >
        clear-selection
      </button>
      <button
        type="button"
        onClick={() => {
          gridRef.current?.expandAllGroups();
        }}
      >
        expand-all-groups
      </button>
      <button
        type="button"
        onClick={() => {
          gridRef.current?.collapseAllGroups();
        }}
      >
        collapse-all-groups
      </button>
      <button
        type="button"
        onClick={() => {
          gridRef.current?.nextPage();
        }}
      >
        next-page
      </button>
      <button
        type="button"
        onClick={() => {
          gridRef.current?.previousPage();
        }}
      >
        previous-page
      </button>
      <button
        type="button"
        onClick={() => {
          if (scrollRowId !== undefined) {
            gridRef.current?.scrollToRow(scrollRowId);
          }
        }}
      >
        scroll-to-row
      </button>
      <button
        type="button"
        onClick={() => {
          if (scrollColumnId !== undefined) {
            gridRef.current?.scrollToColumn(scrollColumnId);
          }
        }}
      >
        scroll-to-column
      </button>
      <button
        type="button"
        onClick={() => {
          gridRef.current?.hideColumns(visibilityColumnIds ?? []);
        }}
      >
        hide-columns
      </button>
      <button
        type="button"
        onClick={() => {
          gridRef.current?.showColumns(visibilityColumnIds ?? []);
        }}
      >
        show-columns
      </button>
      <button
        type="button"
        onClick={() => {
          gridRef.current?.setFilter(filterToSet ?? []);
        }}
      >
        set-filter
      </button>
      <button
        type="button"
        onClick={() => {
          gridRef.current?.selectRows(selectRowIds ?? []);
        }}
      >
        select-rows
      </button>
      <button
        type="button"
        onClick={() => {
          gridRef.current?.setColumnSort(sortToSet ?? []);
        }}
      >
        set-column-sort
      </button>
      <button
        type="button"
        onClick={() => {
          if (autoFitColumnId !== undefined) {
            gridRef.current?.autoFitColumn(autoFitColumnId);
          }
        }}
      >
        auto-fit-column
      </button>
      <button
        type="button"
        onClick={() => {
          gridRef.current?.autoFitColumns(autoFitColumnIds);
        }}
      >
        fit-columns
      </button>
      <button
        type="button"
        onClick={() => {
          const api = gridRef.current;
          if (api !== null && contextMenuTarget !== undefined) {
            setResult(
              String(api.openContextMenu(contextMenuTarget, contextMenuPoint)),
            );
          }
        }}
      >
        open-context-menu
      </button>
      <button
        type="button"
        onClick={() => {
          setEffectOpenings((count) => count + 1);
        }}
      >
        open-in-effect
      </button>
      <button
        type="button"
        onClick={() => {
          gridRef.current?.closeContextMenu();
        }}
      >
        close-context-menu
      </button>
      <button
        type="button"
        onClick={() => {
          const api = gridRef.current;
          if (api !== null && commandId !== undefined) {
            setResult(String(api.runCommand(commandId, commandTarget)));
          }
        }}
      >
        run-command
      </button>
      <button
        type="button"
        onClick={() => {
          const api = gridRef.current;
          if (api !== null) {
            setSavedState(JSON.stringify(serializeGridState(api.getState())));
          }
        }}
      >
        save-state
      </button>
      <button
        type="button"
        onClick={() => {
          if (savedState !== null) {
            gridRef.current?.restoreState(
              JSON.parse(savedState) as SerializedGridState<Row>,
            );
          }
        }}
      >
        restore-state
      </button>
      <button type="button" onClick={report}>
        report
      </button>
      <pre data-testid="imperative-status">{status}</pre>
      <output data-testid="imperative-result">{result}</output>
    </div>
  );
}
