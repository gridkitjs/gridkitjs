import { useMemo, type KeyboardEvent as ReactKeyboardEvent } from "react";
import type {
  CellSelectionMode,
  CellSelectionState,
  GridState,
  SelectableConfig,
  SelectedCellRef,
  SelectIntent,
  SelectionMode,
} from "@gridkitjs/core";
import type { DataGridController } from "./useGridController";

/**
 * The modifiers a Space or Enter keydown carries, for a caller that means to
 * hand them to `intentOf` as a click's modifiers would be. Space builds a
 * selection up and Enter replaces it, as in the body — so Space is mapped to
 * act like Ctrl, matching Ctrl-click and the plain click they stand in for.
 */
export function keyboardSelectIntent(event: ReactKeyboardEvent): {
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
} {
  return {
    ctrlKey: event.key === " " || event.ctrlKey,
    metaKey: event.metaKey,
    shiftKey: event.shiftKey,
  };
}

interface UseGridSelectionOptions<Row> {
  controller: DataGridController<Row>;
  state: GridState<Row>;
  selectable: SelectableConfig | undefined;
}

export interface GridSelectionApi {
  rowMode: SelectionMode;
  columnMode: SelectionMode;
  cellMode: CellSelectionMode;
  /** Whether a plain click on a row toggles it — `selectable.toggleOnClick`. */
  toggleOnClick: boolean;
  /**
   * Lookups for the render pass. The state itself stays an ordered list, which
   * is what makes the most recent selection its last entry.
   */
  selectedRowIds: ReadonlySet<string>;
  selectedColumnIds: ReadonlySet<string>;
  selectedCell: CellSelectionState;
  selectRow: (rowId: string, intent: SelectIntent) => void;
  selectColumn: (columnId: string, intent: SelectIntent) => void;
  selectCell: (cell: SelectedCellRef, intent: SelectIntent) => void;
  selectAllRows: () => void;
  /** Lets go of every selection at once, as Escape does. */
  clear: () => void;
}

/**
 * The selection as the header and body draw and change it. The selections
 * themselves, the intent each click carries and the callbacks it fires all
 * live in the grid's controller; this hook only adds the lookups a render
 * pass wants and names the actions the components call.
 */
export default function useGridSelection<Row>({
  controller,
  state,
  selectable,
}: UseGridSelectionOptions<Row>): GridSelectionApi {
  const selectedRowIds = useMemo(
    () => new Set(state.rowSelection),
    [state.rowSelection],
  );
  const selectedColumnIds = useMemo(
    () => new Set(state.columnSelection),
    [state.columnSelection],
  );

  // A new object each render, as the other hooks here return.
  return {
    rowMode: selectable?.rows ?? false,
    columnMode: selectable?.columns ?? false,
    cellMode: selectable?.cells ?? false,
    toggleOnClick: selectable?.toggleOnClick ?? false,
    selectedRowIds,
    selectedColumnIds,
    selectedCell: state.cellSelection,
    selectRow: controller.selectRow,
    selectColumn: controller.selectColumn,
    selectCell: controller.selectCell,
    selectAllRows: controller.selectAllRows,
    clear: controller.clearSelection,
  };
}
