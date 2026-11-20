import { resolveMessages } from "../messages";
import type {
  CellEditDraft,
  CellEditState,
  DataColumn,
  GridView,
  ResolvedRow,
  SelectedCellRef,
} from "../types";
import type { CellEditAction } from "../util/cellEdit";
import {
  cellEditReducer,
  isCellEditable,
  NO_CELL_EDIT,
} from "../util/cellEdit";
import type { GridController, GridControllerOptions } from "./gridController";

/** What the cell edit actions need of the controller they belong to. */
export interface CellEditContext<Row, Node> {
  readonly getOptions: () => GridControllerOptions<Row, Node>;
  readonly getView: () => GridView<Row, Node>;
  /** Calls every subscriber. */
  readonly notify: () => void;
}

type CellEditActions<Row, Node> = Pick<
  GridController<Row, Node>,
  | "getCellEdit"
  | "startCellEdit"
  | "setCellEditDraft"
  | "commitCellEdit"
  | "cancelCellEdit"
>;

/** The cell edit as the controller holds it: its actions, and its rule. */
export interface CellEditStore<Row, Node> {
  readonly actions: CellEditActions<Row, Node>;
  /**
   * Cancels, without a report, an edit whose cell `isCellEditable` no longer
   * accepts. The controller runs it after every refresh; it returns whether
   * it cancelled one, which is a change for subscribers.
   */
  readonly dropUneditable: () => boolean;
}

const CURRENT: CellEditDraft = { kind: "current" };

/** The row and column an open edit addresses, as a commit reads them. */
interface EditedCell<Row> {
  readonly row: ResolvedRow<Row>;
  readonly column: DataColumn<Row, unknown>;
}

/**
 * Holds one grid's `CellEditState` and every action on it. Each runs the
 * state through `cellEditReducer`, keeps what it returns and calls
 * subscribers when that is a new object; a commit calls `onCellEditCommit`
 * first, so the callback already reads the closed edit.
 */
export function createCellEditActions<Row, Node>({
  getOptions,
  getView,
  notify,
}: CellEditContext<Row, Node>): CellEditStore<Row, Node> {
  let edit: CellEditState = NO_CELL_EDIT;

  /** Keeps `next`, returning whether it is a change. */
  function store(next: CellEditState): boolean {
    if (next === edit) {
      return false;
    }
    edit = next;
    return true;
  }

  function apply(action: CellEditAction<Row>): void {
    if (store(cellEditReducer(edit, action).state)) {
      notify();
    }
  }

  function editedCell(cell: SelectedCellRef): EditedCell<Row> | null {
    const view = getView();
    const row = view.displayDataRows.find(
      (entry) => entry.rowId === cell.rowId,
    );
    const column = view.dataColumns.find((entry) => entry.id === cell.columnId);
    return row === undefined || column === undefined ? null : { row, column };
  }

  function cancelCellEdit(): void {
    apply({ type: "cancel" });
  }

  /**
   * A cell that no longer resolves would already have been dropped by the
   * refresh that removed it, so an open edit always finds its cell; one
   * that somehow does not is closed, unreported.
   */
  function commitCellEdit(): boolean {
    if (edit.kind === "idle") {
      return false;
    }
    const cell = editedCell(edit);
    if (cell === null) {
      cancelCellEdit();
      return true;
    }
    const options = getOptions();
    const { state, committed } = cellEditReducer(edit, {
      type: "commit",
      ...cell,
      messages: resolveMessages(options.messages, options.locale),
    });
    const changed = store(state);
    if (committed !== null) {
      options.onCellEditCommit?.(committed);
    }
    if (changed) {
      notify();
    }
    return state.kind === "idle";
  }

  /**
   * Checked again after closing another cell's edit: the commit's callback
   * may have changed the grid so that `cell` is no longer editable.
   */
  function startCellEdit(cell: SelectedCellRef, draft = CURRENT): boolean {
    const editable = () => isCellEditable(getView(), cell);
    if (!editable()) {
      return false;
    }
    if (
      edit.kind !== "idle" &&
      (edit.rowId !== cell.rowId || edit.columnId !== cell.columnId)
    ) {
      if (!commitCellEdit()) {
        cancelCellEdit();
      }
      if (!editable()) {
        return false;
      }
    }
    apply({
      type: "start",
      rowId: cell.rowId,
      columnId: cell.columnId,
      draft,
    });
    return true;
  }

  return {
    actions: {
      getCellEdit: () => edit,
      startCellEdit,
      setCellEditDraft(draft) {
        apply({ type: "setDraft", draft });
      },
      commitCellEdit,
      cancelCellEdit,
    },
    dropUneditable() {
      if (edit.kind === "idle" || isCellEditable(getView(), edit)) {
        return false;
      }
      return store(NO_CELL_EDIT);
    },
  };
}
