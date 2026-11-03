import type { GridController } from "../controller/gridController";
import type { GridMessages } from "../messages";
import type { ResolvedRow, SelectionState } from "../types";
import type {
  GridCommandContext,
  GridCommandHost,
  GridCommandTarget,
} from "./types";

/** What `createCommandContext` builds a context from. */
export interface GridCommandContextInput<Row, Node> {
  readonly controller: GridController<Row, Node>;
  readonly target: GridCommandTarget;
  /** The grid's messages, already laid over the defaults — see `resolveMessages`. */
  readonly messages: GridMessages;
  readonly host: GridCommandHost;
}

/**
 * The rows in `rows` that `selection` names, in `rows`' order. An empty
 * selection — the common case — is answered without walking the rows.
 */
function selectedRowsOf<Row>(
  rows: readonly ResolvedRow<Row>[],
  selection: SelectionState,
): readonly ResolvedRow<Row>[] {
  if (selection.length === 0) {
    return [];
  }
  const selected = new Set(selection);
  return rows.filter((entry) => selected.has(entry.rowId));
}

/**
 * A command context for `target`, over the controller's state, view and
 * options as they are now. The controller itself serves as `actions`, typed
 * down to them, so a command cannot reach `setOptions`.
 *
 * `row` and `column` are looked up once here, against every filtered row and
 * every column, hidden ones included, so a target the API names off screen
 * still resolves.
 */
export function createCommandContext<Row, Node>({
  controller,
  target,
  messages,
  host,
}: GridCommandContextInput<Row, Node>): GridCommandContext<Row> {
  const state = controller.getState();
  const view = controller.getView();
  let selectedRows: readonly ResolvedRow<Row>[] | undefined;

  return {
    target,
    state,
    view,
    options: controller.getOptions(),
    messages,
    actions: controller,
    host,
    row:
      target.area === "cell"
        ? (view.rows.find((entry) => entry.rowId === target.rowId) ?? null)
        : null,
    column:
      "columnId" in target
        ? (view.dataColumns.find((entry) => entry.id === target.columnId) ??
          null)
        : null,
    selectedRows: () =>
      (selectedRows ??= selectedRowsOf(view.rows, state.rowSelection)),
  };
}
