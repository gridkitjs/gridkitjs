import { useRef, useState } from "react";
import {
  DataGridComponent,
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
}

/**
 * A test-only harness for `DataGridComponent`'s `ref` prop. Playwright CT's
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
 * an action like `focusCell` or `selectAllRows` only queues a React state
 * update, which isn't visible on `gridRef.current` until after the state
 * setter's own event handler has returned and React has re-rendered. Reading
 * inside the same handler that wrote would return the previous render's
 * value.
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
  ...props
}: ImperativeApiGridProps<Row>) {
  const gridRef = useRef<DataGridApi<Row>>(null);
  const [status, setStatus] = useState("");

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
        columnSizing: api.getColumnSizing(),
        columnOrder: api.getColumnOrder(),
        columnSort: api.getColumnSort(),
        groupBy: api.getGroupBy(),
        groupExpansion: api.getGroupExpansion(),
        displayRowCount: api.getDisplayRows().length,
        rowSelection: api.getRowSelection(),
        columnSelection: api.getColumnSelection(),
        cellSelection: api.getCellSelection(),
        focusedCell: api.getFocusedCell(),
      }),
    );
  }

  return (
    <div>
      <div
        data-testid="scroll-container"
        style={{ maxHeight: 160, overflow: "auto" }}
      >
        <DataGridComponent
          {...props}
          getRowId={(row) => row.id}
          ref={gridRef}
        />
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
      <button type="button" onClick={report}>
        report
      </button>
      <pre data-testid="imperative-status">{status}</pre>
    </div>
  );
}
