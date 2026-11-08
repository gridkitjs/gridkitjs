import {
  Fragment,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  conditionRowsFrom,
  conditionsFromRows,
  describeColumnFilter,
  draftToFilter,
  filterDraftChanged,
  filterEditorReducer,
  initialFilterEditorDraft,
  type ColumnFilterShape,
  type ColumnType,
  type ColumnValueOptions,
  type ConditionRowDraft,
  type FilterEditorDraft,
  type FilterOperator,
  type GridMessages,
  type OperatorFilterEntry,
} from "@gridkitjs/core";
import ConditionRow from "./ConditionRow";
import type { FilterEditorProps } from "./filterEditor";

type Combinator = "and" | "or";

/** The conditions as typed, and how they join. */
interface Draft {
  readonly rows: readonly ConditionRowDraft[];
  readonly combinator: Combinator;
}

const COMBINATORS: readonly Combinator[] = ["and", "or"];

/** No condition marked invalid. */
const NO_ROWS: readonly number[] = [];

/**
 * The values half of the draft `draftToFilter` applies: the simple editor
 * has no checklist, so none.
 */
const NO_VALUES: ColumnValueOptions = {
  options: [],
  total: 0,
  truncated: false,
  blanks: 0,
};

/** Whether two drafts hold the same text in every box, joined alike. */
function sameDraft(a: Draft, b: Draft): boolean {
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
  if (shape.kind !== "conditions") {
    return draft;
  }
  const shown = conditionsFromRows<Row>(rows, columnId, type);
  return shown.invalid.length > 0
    ? draft
    : filterEditorReducer(draft, {
        type: "setConditions",
        conditions: shown.conditions,
      });
}

/**
 * Whether a box in `row` holds what the browser can't read as a number or a
 * date — "1e", a date missing its year — which it reports as empty, so the
 * row would otherwise pass for one left blank.
 */
function holdsUnreadable(row: HTMLElement | null | undefined): boolean {
  return Array.from(row?.querySelectorAll("input") ?? []).some(
    (input) => input.validity.badInput,
  );
}

interface CombinatorChoiceProps {
  /** The radio buttons' shared `name`, unique to the editor. */
  readonly name: string;
  readonly combinator: Combinator;
  readonly messages: GridMessages;
  readonly onChange: (combinator: Combinator) => void;
}

/** And or Or, between the two conditions: native radio buttons, one tab stop. */
function CombinatorChoice({
  name,
  combinator,
  messages,
  onChange,
}: CombinatorChoiceProps) {
  return (
    <div
      role="radiogroup"
      aria-label={messages.filterCombinatorLabel}
      className="filter-menu-combinator"
    >
      {COMBINATORS.map((choice) => (
        <label key={choice} className="filter-menu-combinator-option">
          <input
            type="radio"
            name={name}
            checked={choice === combinator}
            onChange={() => {
              onChange(choice);
            }}
          />
          {choice === "and" ? messages.filterAnd : messages.filterOr}
        </label>
      ))}
    </div>
  );
}

export interface SimpleFilterEditorProps<Row> extends FilterEditorProps<Row> {
  /**
   * The operator its first condition starts at, chosen from the excel
   * editor's operator submenu — which shows this editor in place of its
   * checklist. A checklist's values are that editor's to show, so they are
   * not called a custom filter here then.
   */
  readonly operator?: FilterOperator | undefined;
}

/**
 * A filter menu's simple editor: one condition — an operator and its value —
 * and an optional second, joined to it by and/or. It opens on the column's
 * conditions, read by `@gridkitjs/core`'s `describeColumnFilter` and
 * `conditionRowsFrom`, its first at `operator` when given one. On a filter
 * it cannot show — a checklist's values, or a custom filter — it says so
 * above empty conditions, which replace it once applied.
 *
 * The conditions are text until applied, when `conditionsFromRows` reads
 * them as the column's type filters. A condition missing a value, or holding
 * one that doesn't read, keeps the menu open: its boxes are marked invalid,
 * described by a message, and the first takes focus — unless they are as it
 * opened them, as the empty ones on a column it shows no filter for: OK then
 * closes the menu as Cancel would, rather than asking for a value.
 */
export default function SimpleFilterEditor<Row>({
  column,
  menu,
  controller,
  messages,
  initialFocusRef,
  applyFilter,
  operator,
  ref,
}: SimpleFilterEditorProps<Row>) {
  const type = column.column.type;
  // Read once, as the menu opens: from then on the draft is the user's.
  const [opened] = useState(() => {
    const shape = describeColumnFilter(controller.getState().filter, column.id);
    const rows = conditionRowsFrom(shape, menu.operators, type);
    const draft: Draft = {
      // Its typed values kept, as picking the operator in the row keeps them.
      rows:
        operator === undefined
          ? rows
          : rows.map((row, index) =>
              index === 0 ? { ...row, operator } : row,
            ),
      combinator: shape.kind === "conditions" ? shape.combinator : "and",
    };
    return {
      custom:
        shape.kind === "custom" ||
        (shape.kind === "values" && operator === undefined),
      draft,
      filterDraft: filterDraftShown(shape, rows, column.id, type),
    };
  });
  const [draft, setDraft] = useState(opened.draft);
  const [invalid, setInvalid] = useState(NO_ROWS);
  const rowElements = useRef<(HTMLDivElement | null)[]>([]);
  const invalidMessageId = useId();
  const combinatorName = useId();

  function update(next: Draft): void {
    setDraft(next);
    setInvalid(NO_ROWS);
  }

  /**
   * Puts `conditions` in place of every entry about the column — unless
   * they are the column's own, so a filter set in code stays as written.
   */
  function applyConditions(
    conditions: readonly OperatorFilterEntry<Row>[],
  ): void {
    const applied = filterEditorReducer(opened.filterDraft, {
      type: "setConditions",
      conditions,
      combinator: draft.combinator,
    });
    if (filterDraftChanged(opened.filterDraft, applied)) {
      applyFilter(
        draftToFilter(applied, column.id, controller.getState().filter),
      );
    }
  }

  useImperativeHandle(ref, () => ({
    apply: () => {
      const parsed = conditionsFromRows<Row>(draft.rows, column.id, type);
      const unreadable = draft.rows.map((_, index) =>
        holdsUnreadable(rowElements.current[index]),
      );
      const marked = draft.rows.flatMap((_, index) =>
        parsed.invalid.includes(index) || unreadable[index] === true
          ? [index]
          : [],
      );
      if (marked.length === 0) {
        applyConditions(parsed.conditions);
        return true;
      }
      // Nothing typed since it opened: OK closes it, as Cancel would, rather
      // than asking for a value.
      if (sameDraft(draft, opened.draft) && !unreadable.includes(true)) {
        return true;
      }
      setInvalid(marked);
      return false;
    },
  }));

  // After the render marking it, so the box is invalid as it takes focus.
  useLayoutEffect(() => {
    const [first] = invalid;
    if (first !== undefined) {
      rowElements.current[first]
        ?.querySelector<HTMLElement>('[aria-invalid="true"]')
        ?.focus();
    }
  }, [invalid]);

  return (
    <div className="filter-menu-conditions">
      {opened.custom && (
        <p className="filter-menu-custom">{messages.customFilter}</p>
      )}
      {draft.rows.map((row, index) => (
        // A row is its place: the first condition, or the second.
        <Fragment key={index}>
          {index > 0 && (
            <CombinatorChoice
              name={combinatorName}
              combinator={draft.combinator}
              messages={messages}
              onChange={(combinator) => {
                update({ ...draft, combinator });
              }}
            />
          )}
          <ConditionRow
            ref={(element) => {
              rowElements.current[index] = element;
            }}
            row={row}
            position={index + 1}
            menu={menu}
            type={type}
            messages={messages}
            invalidMessageId={
              invalid.includes(index) ? invalidMessageId : undefined
            }
            focusRef={index === 0 ? initialFocusRef : undefined}
            onChange={(next) => {
              update({
                ...draft,
                rows: draft.rows.map((current, at) =>
                  at === index ? next : current,
                ),
              });
            }}
          />
        </Fragment>
      ))}
      {invalid.length > 0 && (
        <p id={invalidMessageId} className="filter-menu-invalid">
          {messages.filterValueInvalid(menu.family)}
        </p>
      )}
    </div>
  );
}
