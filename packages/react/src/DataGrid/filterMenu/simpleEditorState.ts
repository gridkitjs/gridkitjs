import {
  conditionRowsFrom,
  conditionsFromRows,
  describeColumnFilter,
  initialFilterEditorDraft,
  type ColumnFilterShape,
  type ColumnType,
  type ColumnValueOptions,
  type ConditionRowDraft,
  type FilterEditorDraft,
  type FilterOperator,
  type FilterState,
} from "@gridkitjs/core";

export type Combinator = "and" | "or";

/** The conditions as typed, and how they join. */
export interface ConditionRowsDraft {
  readonly rows: readonly ConditionRowDraft[];
  readonly combinator: Combinator;
}

/** What a simple editor opened with, read from the column's filter. */
export interface OpenedConditions<Row> {
  /** The grid's filter it was read from. */
  readonly over: FilterState<Row>;
  /** Whether the editor can't show the column's filter: "Custom filter". */
  readonly custom: boolean;
  /** The boxes as they opened. */
  readonly draft: ConditionRowsDraft;
  /** The column's filter as a draft, for `filterDraftChanged`. */
  readonly filterDraft: FilterEditorDraft<Row>;
}

/** A simple editor's state: the draft, and what its last OK marked. */
export interface SimpleEditorState<Row> {
  readonly opened: OpenedConditions<Row>;
  readonly draft: ConditionRowsDraft;
  /** The rows the last OK marked invalid, until the draft next changes. */
  readonly invalid: readonly number[];
}

export type SimpleEditorAction<Row> =
  | {
      readonly type: "editRow";
      readonly index: number;
      readonly row: ConditionRowDraft;
    }
  | { readonly type: "setCombinator"; readonly combinator: Combinator }
  | { readonly type: "markInvalid"; readonly rows: readonly number[] }
  /** The grid's filter changed while the editor is open: what it now reads. */
  | { readonly type: "filterChanged"; readonly opened: OpenedConditions<Row> };

/** No condition marked invalid. */
const NO_ROWS: readonly number[] = [];

/**
 * The values the column's filter is drafted over: the simple editor has no
 * checklist, so none.
 */
const NO_VALUES: ColumnValueOptions = {
  options: [],
  total: 0,
  truncated: false,
  blanks: 0,
};

/**
 * The draft standing for the column's filter `shape`, for
 * `filterDraftChanged` to tell an apply that changes nothing. Its conditions
 * are read back from the boxes showing them, `rows`, as the conditions
 * applied will be: a date set in code as a string, or a time to the second,
 * then compares equal to the day or minute its box shows.
 */
function filterDraftShown<Row>(
  shape: ColumnFilterShape<Row>,
  rows: readonly ConditionRowDraft[],
  columnId: string,
  type: ColumnType | undefined,
): FilterEditorDraft<Row> {
  const draft = initialFilterEditorDraft(shape, {
    ...NO_VALUES,
    columnType: type,
  });
  if (draft.kind !== "conditions") {
    return draft;
  }
  const shown = conditionsFromRows<Row>(rows, columnId, type);
  return shown.invalid.length > 0
    ? draft
    : { ...draft, conditions: shown.conditions };
}

/**
 * What a simple editor opens with over `filter`: the column's conditions,
 * the first at `operator` when given one, chosen from the excel editor's
 * operator menu. A checklist's values are that editor's to show, so with an
 * operator they are not called a custom filter.
 */
export function openConditions<Row>(
  filter: FilterState<Row>,
  columnId: string,
  operators: readonly FilterOperator[],
  type: ColumnType | undefined,
  operator: FilterOperator | undefined,
): OpenedConditions<Row> {
  const shape = describeColumnFilter(filter, columnId);
  const rows = conditionRowsFrom(shape, operators, type);
  return {
    over: filter,
    custom:
      shape.kind === "custom" ||
      (shape.kind === "values" && operator === undefined),
    draft: {
      // Its typed values kept, as picking the operator in the row keeps them.
      rows:
        operator === undefined
          ? rows
          : rows.map((row, index) =>
              index === 0 ? { ...row, operator } : row,
            ),
      combinator: shape.kind === "conditions" ? shape.combinator : "and",
    },
    filterDraft: filterDraftShown(shape, rows, columnId, type),
  };
}

/** A simple editor's state as it opens on `opened`. */
export function initialSimpleEditorState<Row>(
  opened: OpenedConditions<Row>,
): SimpleEditorState<Row> {
  return { opened, draft: opened.draft, invalid: NO_ROWS };
}

/** Whether two drafts hold the same text in every box, joined alike. */
export function sameConditionRows(
  a: ConditionRowsDraft,
  b: ConditionRowsDraft,
): boolean {
  return (
    a.combinator === b.combinator &&
    a.rows.length === b.rows.length &&
    a.rows.every((row, index) => {
      const other = b.rows[index];
      return (
        other !== undefined &&
        row.operator === other.operator &&
        row.text === other.text &&
        row.textTo === other.textTo
      );
    })
  );
}

/** Whether the editor opens alike on what `a` and `b` read. */
function showsAlike<Row>(
  a: OpenedConditions<Row>,
  b: OpenedConditions<Row>,
): boolean {
  return a.custom === b.custom && sameConditionRows(a.draft, b.draft);
}

/**
 * The next state after `action`. An edit clears what OK marked. A change to
 * the grid's filter that the editor would open on differently starts it
 * again on that, as reopening it would, dropping what was typed; one it
 * would open on alike, such as another column's, leaves the draft be.
 */
export function simpleEditorReducer<Row>(
  state: SimpleEditorState<Row>,
  action: SimpleEditorAction<Row>,
): SimpleEditorState<Row> {
  switch (action.type) {
    case "editRow":
      return {
        ...state,
        draft: {
          ...state.draft,
          rows: state.draft.rows.map((row, index) =>
            index === action.index ? action.row : row,
          ),
        },
        invalid: NO_ROWS,
      };
    case "setCombinator":
      return {
        ...state,
        draft: { ...state.draft, combinator: action.combinator },
        invalid: NO_ROWS,
      };
    case "markInvalid":
      return { ...state, invalid: action.rows };
    case "filterChanged":
      return showsAlike(state.opened, action.opened)
        ? { ...state, opened: action.opened }
        : initialSimpleEditorState(action.opened);
  }
}
