import {
  Fragment,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useReducer,
  useRef,
} from "react";
import type {
  FilterOperator,
  GridMessages,
  OperatorFilterEntry,
} from "@gridkitjs/core";
import {
  conditionsFromRows,
  draftToFilter,
  filterDraftChanged,
  filterEditorReducer,
} from "@gridkitjs/core/renderer";
import ConditionRow from "./ConditionRow";
import type { FilterEditorProps } from "./filterEditor";
import {
  initialSimpleEditorState,
  openConditions,
  sameConditionRows,
  simpleEditorReducer,
  type Combinator,
} from "./simpleEditorState";

const COMBINATORS: readonly Combinator[] = ["and", "or"];

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
 *
 * Set in code while it is open, the column's filter shows in place of what
 * was typed, as it would on reopening the menu.
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
  const filter = controller.getState().filter;
  const open = (over: typeof filter) =>
    openConditions(over, column.id, menu.operators, type, operator);
  const [{ opened, draft, invalid }, dispatch] = useReducer(
    simpleEditorReducer<Row>,
    filter,
    (over) => initialSimpleEditorState(open(over)),
  );
  // Set in code while the menu is open — `setFilter`, a controlled `filter`.
  if (filter !== opened.over) {
    dispatch({ type: "filterChanged", opened: open(filter) });
  }
  const rowElements = useRef<(HTMLDivElement | null)[]>([]);
  const invalidMessageId = useId();
  const combinatorName = useId();

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
      if (
        sameConditionRows(draft, opened.draft) &&
        !unreadable.includes(true)
      ) {
        return true;
      }
      dispatch({ type: "markInvalid", rows: marked });
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
                dispatch({ type: "setCombinator", combinator });
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
              dispatch({ type: "editRow", index, row: next });
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
