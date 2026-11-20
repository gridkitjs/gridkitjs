import { filterOperatorFamily } from "../filterMenu/operators";
import type { GridMessages } from "../messages";
import type {
  CellEditCommitEvent,
  CellEditDraft,
  CellEditState,
  ColumnDefinition,
  DataColumn,
  GridView,
  ResolvedRow,
  SelectedCellRef,
} from "../types";
import { parseCellText, sameCellValue } from "./cellText";
import { accessDotted } from "./grid";

export const NO_CELL_EDIT: CellEditState = { kind: "idle" };

/**
 * A change to the cell edit, as the controller asks for it. A commit carries
 * what reading the draft needs, resolved by the controller for the cell being
 * edited: its row as the data holds it now, its column and the grid's
 * messages.
 */
export type CellEditAction<Row> =
  | {
      readonly type: "start";
      readonly rowId: string;
      readonly columnId: string;
      readonly draft: CellEditDraft;
    }
  | { readonly type: "setDraft"; readonly draft: CellEditDraft }
  | {
      readonly type: "commit";
      readonly row: ResolvedRow<Row>;
      readonly column: DataColumn<Row, unknown>;
      readonly messages: GridMessages;
    }
  | { readonly type: "cancel" };

/** The edit after an action, and the commit to report, if it made one. */
export interface CellEditResult<Row> {
  readonly state: CellEditState;
  readonly committed: CellEditCommitEvent<Row> | null;
}

/** A draft read as the value to commit, or refused with why. */
type DraftReading =
  | { readonly kind: "value"; readonly value: unknown }
  | { readonly kind: "refused"; readonly message: string };

function settled<Row>(state: CellEditState): CellEditResult<Row> {
  return { state, committed: null };
}

/**
 * Every transition of the cell edit. Pure: the controller calls the app's
 * callback with what a commit returns. A `start` over an open edit leaves it
 * as it is, whichever cell it names; closing that edit first is the
 * controller's to decide.
 */
export function cellEditReducer<Row>(
  state: CellEditState,
  action: CellEditAction<Row>,
): CellEditResult<Row> {
  if (state.kind === "idle") {
    return settled(
      action.type === "start"
        ? {
            kind: "editing",
            rowId: action.rowId,
            columnId: action.columnId,
            draft: action.draft,
          }
        : state,
    );
  }
  switch (action.type) {
    case "start":
      return settled(state);
    case "setDraft":
      return settled({
        kind: "editing",
        rowId: state.rowId,
        columnId: state.columnId,
        draft: action.draft,
      });
    case "commit":
      return commitDraft(state, action);
    case "cancel":
      return settled(NO_CELL_EDIT);
  }
}

/**
 * Parse, compare, validate. An untouched draft or a value equal to the
 * cell's own closes without asking `validate`, so committing an editor the
 * user only looked at always closes it.
 */
function commitDraft<Row>(
  state: Exclude<CellEditState, { kind: "idle" }>,
  { row, column, messages }: Extract<CellEditAction<Row>, { type: "commit" }>,
): CellEditResult<Row> {
  if (state.draft.kind === "current") {
    return settled(NO_CELL_EDIT);
  }
  const reading = readDraft(state.draft, row.row, column.column, messages);
  if (reading.kind === "refused") {
    return settled({ ...state, kind: "invalid", message: reading.message });
  }
  const { field, type, validate } = column.column;
  const previousValue = accessDotted(row.row, field);
  if (sameCellValue(previousValue, reading.value, type)) {
    return settled(NO_CELL_EDIT);
  }
  const message = validate?.(reading.value, row.row) ?? null;
  if (message !== null) {
    return settled({ ...state, kind: "invalid", message });
  }
  return {
    state: NO_CELL_EDIT,
    committed: {
      rowId: row.rowId,
      columnId: column.id,
      field,
      row: row.row,
      value: reading.value,
      previousValue,
    },
  };
}

/**
 * The value a draft other than `current` commits: text through the
 * column's `valueParser`, or its type's reading; a value as it is. Text the
 * type cannot read, and input the editor could not, is refused with the
 * message asking for the column's kind of value.
 */
function readDraft<Row>(
  draft: Exclude<CellEditDraft, { kind: "current" }>,
  row: Row,
  column: ColumnDefinition<Row, unknown>,
  messages: GridMessages,
): DraftReading {
  const unreadable: DraftReading = {
    kind: "refused",
    message: messages.cellEditUnreadable(filterOperatorFamily(column.type)),
  };
  switch (draft.kind) {
    case "value":
      return { kind: "value", value: draft.value };
    case "unreadable":
      return unreadable;
    case "text": {
      if (column.valueParser !== undefined) {
        return { kind: "value", value: column.valueParser(draft.text, row) };
      }
      const parsed = parseCellText(draft.text, column.type);
      return parsed.kind === "value"
        ? { kind: "value", value: parsed.value }
        : unreadable;
    }
  }
}

/**
 * Whether `column`'s `editable` accepts `row`: `true`, or a function
 * returning `true` for it. For a renderer drawing one cell, which already
 * holds both; `isCellEditable` answers for a cell by its address.
 */
export function isColumnEditable<Row, Node>(
  column: ColumnDefinition<Row, Node>,
  row: Row,
): boolean {
  const { editable } = column;
  return typeof editable === "function" ? editable(row) : editable === true;
}

/**
 * Whether `cell` may be edited, both to start an edit and to keep one open:
 * a data row on the current page (`view.displayDataRows`), a shown column
 * (`view.columns`), and the column's `editable` true for that row. Group
 * and summary rows never are.
 */
export function isCellEditable<Row, Node>(
  view: GridView<Row, Node>,
  cell: SelectedCellRef,
): boolean {
  const entry = view.displayDataRows.find(
    (candidate) => candidate.rowId === cell.rowId,
  );
  const column = view.columns.find(
    (candidate) => candidate.id === cell.columnId,
  );
  return (
    entry !== undefined &&
    column !== undefined &&
    isColumnEditable(column.column, entry.row)
  );
}
