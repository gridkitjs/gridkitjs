import {
  describeColumnFilter,
  filterDraftChanged,
  filterEditorReducer,
  initialFilterEditorDraft,
  toValuesDraft,
  type ColumnFilterShape,
  type ColumnValueOptions,
  type FilterEditorAction,
  type FilterEditorDraft,
  type FilterState,
  type ValuesDraft,
} from "@gridkitjs/core";

/** What an excel editor opened with, read from the column's filter. */
export interface OpenedValues<Row> {
  /** The grid's filter it was read from. */
  readonly over: FilterState<Row>;
  readonly shape: ColumnFilterShape<Row>;
  /** On its conditions when the column's filter is conditions. */
  readonly draft: FilterEditorDraft<Row>;
}

/**
 * An excel editor's state: what it opened with, and the user's checklist.
 * Conditions are the simple editor's, shown in place of the checklist with
 * a state of its own, so the draft here stays on its checklist.
 */
export interface ExcelEditorState<Row> {
  readonly opened: OpenedValues<Row>;
  readonly draft: ValuesDraft<Row>;
}

/** What the checklist does to its draft: any draft action but conditions. */
export type ChecklistAction<Row> = Exclude<
  FilterEditorAction<Row>,
  { readonly type: "setConditions" }
>;

export type ExcelEditorAction<Row> =
  | ChecklistAction<Row>
  /** The grid's filter changed while the editor is open: what it now reads. */
  | { readonly type: "filterChanged"; readonly opened: OpenedValues<Row> };

/** What an excel editor opens with over `filter`, listing `values`. */
export function openValues<Row>(
  filter: FilterState<Row>,
  columnId: string,
  values: ColumnValueOptions,
): OpenedValues<Row> {
  const shape = describeColumnFilter(filter, columnId);
  return {
    over: filter,
    shape,
    draft: initialFilterEditorDraft(shape, values),
  };
}

/** An excel editor's state as it opens on `opened`. */
export function initialExcelEditorState<Row>(
  opened: OpenedValues<Row>,
): ExcelEditorState<Row> {
  return { opened, draft: toValuesDraft(opened.draft) };
}

/**
 * Whether the editor opens alike on what `a` and `b` read: the same note,
 * the same values listed, checked alike. The list is compared by identity:
 * the grid hands back the same one while nothing it is counted from changes.
 */
function showsAlike<Row>(a: OpenedValues<Row>, b: OpenedValues<Row>): boolean {
  return (
    a.shape.kind === b.shape.kind &&
    a.draft.options === b.draft.options &&
    !filterDraftChanged(a.draft, b.draft)
  );
}

/**
 * The next state after `action`: the draft as `filterEditorReducer` changes
 * it. A change to the grid's filter that the editor would open on
 * differently starts it again on that, as reopening it would, dropping
 * what was checked; one it would open on alike leaves the draft be.
 */
export function excelEditorReducer<Row>(
  state: ExcelEditorState<Row>,
  action: ExcelEditorAction<Row>,
): ExcelEditorState<Row> {
  if (action.type === "filterChanged") {
    return showsAlike(state.opened, action.opened)
      ? { ...state, opened: action.opened }
      : initialExcelEditorState(action.opened);
  }
  // Only narrows the type: a checklist action leaves the draft on its checklist.
  return {
    ...state,
    draft: toValuesDraft(filterEditorReducer(state.draft, action)),
  };
}
