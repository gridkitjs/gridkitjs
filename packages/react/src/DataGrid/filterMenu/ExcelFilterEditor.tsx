import {
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import type { FilterOperator } from "@gridkitjs/core";
import {
  draftToFilter,
  filterChecklist,
  filterDraftChanged,
  selectAllState,
  type ColumnValueOptions,
  type FilterChecklistItem,
} from "@gridkitjs/core/renderer";
import { ChevronLeftIcon } from "../menu/menuIcons";
import {
  excelEditorReducer,
  initialExcelEditorState,
  openValues,
  type ChecklistAction,
} from "./excelEditorState";
import type { FilterEditorHandle, FilterEditorProps } from "./filterEditor";
import OperatorMenuButton from "./OperatorMenuButton";
import SimpleFilterEditor from "./SimpleFilterEditor";
import ValueChecklist from "./ValueChecklist";

export interface ExcelFilterEditorProps<Row> extends FilterEditorProps<Row> {
  /**
   * The values a column's checklist lists, counted over the rows the other
   * columns' filters keep — the same list again while nothing it is counted
   * from has changed.
   */
  readonly columnValues: (columnId: string) => ColumnValueOptions;
}

/**
 * What the editor shows: the checklist, or a condition at the operator
 * chosen from its menu, in place of the checklist. A condition takes focus
 * as it shows, being shown only once chosen; the checklist does when it
 * comes back from one, giving focus to the button whose menu chose it.
 */
type ExcelEditorMode =
  | { readonly kind: "values"; readonly focusOnMount: boolean }
  | { readonly kind: "condition"; readonly operator: FilterOperator };

const OPENED_ON_VALUES: ExcelEditorMode = {
  kind: "values",
  focusOnMount: false,
};

/** What a checklist item's toggle does to the draft. */
function toggleOf<Row>(item: FilterChecklistItem): ChecklistAction<Row> {
  return item.kind === "blanks"
    ? { type: "setIncludeBlanks", includeBlanks: !item.checked }
    : { type: "toggleValue", value: item.value };
}

/**
 * A filter menu's excel editor: a search box, a "Select all" checkbox and a
 * checklist of the values the column holds, each checked while the filter
 * keeps it — the model being `@gridkitjs/core`'s `filterEditorReducer`,
 * over the column's values as `columnValues` counts them when the menu
 * opens. The values cascade: they are those of the rows the other columns'
 * filters keep.
 *
 * The search narrows the list, and "Select all" acts on what it shows, as
 * in Excel; past the menu's `valueLimit` values the list waits for a search
 * first, and a search matching more lists the first of them. OK applies the
 * draft through `draftToFilter`: everything checked is no filter, anything
 * less one `in` list, OR-ed with "is blank" while the blanks stay checked.
 *
 * Above the search, a "Number filters" button opens a menu of the column's
 * conditions. Choosing one shows the simple editor in place of the
 * checklist, its first condition at the operator chosen, until "Back to
 * values" brings the checklist back as it was left; OK there applies the
 * conditions, which replace the column's values, as Excel's do.
 *
 * Conditions or a custom filter open with every value checked, under a note
 * saying the column is filtered otherwise. OK leaves that filter be while
 * the checked values are those it opened with — `filterDraftChanged` —
 * as it leaves any filter whose values are as they opened.
 *
 * Set in code while it is open, the column's filter shows in place of what
 * was checked, as it would on reopening the menu.
 */
export default function ExcelFilterEditor<Row>({
  column,
  menu,
  controller,
  messages,
  initialFocusRef,
  applyFilter,
  columnValues,
  ref,
}: ExcelFilterEditorProps<Row>) {
  const filter = controller.getState().filter;
  const open = (over: typeof filter) =>
    openValues(over, column.id, columnValues(column.id));
  const [{ opened, draft }, dispatch] = useReducer(
    excelEditorReducer<Row>,
    filter,
    (over) => initialExcelEditorState(open(over)),
  );
  // Set in code while the menu is open — `setFilter`, a controlled `filter`.
  if (filter !== opened.over) {
    dispatch({ type: "filterChanged", opened: open(filter) });
  }
  const [mode, setMode] = useState(OPENED_ON_VALUES);
  const conditions = useRef<FilterEditorHandle>(null);
  const conditionsFocus = useRef<HTMLElement | null>(null);
  const operatorButton = useRef<HTMLButtonElement>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);
  // Each a pass over every value — tens of thousands of them on a large
  // column — so worked out as the draft changes, not again as the editor
  // switches to a condition and back.
  const selectAll = useMemo(() => selectAllState(draft), [draft]);
  const checklist = useMemo(
    () =>
      filterChecklist(draft, {
        valueLimit: menu.valueLimit,
        blanksLabel: messages.filterBlanks,
      }),
    [draft, menu.valueLimit, messages.filterBlanks],
  );

  // A checkbox's mixed state has no attribute, only this property.
  useLayoutEffect(() => {
    if (selectAllRef.current !== null) {
      selectAllRef.current.indeterminate = selectAll === "mixed";
    }
  });

  // Once the side switched to is drawn.
  useLayoutEffect(() => {
    if (mode.kind === "condition") {
      conditionsFocus.current?.focus();
    } else if (mode.focusOnMount) {
      operatorButton.current?.focus();
    }
  }, [mode]);

  useImperativeHandle(ref, () => ({
    apply: () => {
      if (mode.kind === "condition") {
        return conditions.current?.apply() ?? true;
      }
      if (filterDraftChanged(opened.draft, draft)) {
        applyFilter(
          draftToFilter(draft, column.id, controller.getState().filter),
        );
      }
      return true;
    },
  }));

  if (mode.kind === "condition") {
    return (
      <>
        <button
          type="button"
          className="gridkit-filter-menu-back"
          onClick={() => {
            setMode({ kind: "values", focusOnMount: true });
          }}
        >
          <span className="gridkit-filter-menu-back-icon" aria-hidden="true">
            <ChevronLeftIcon />
          </span>
          {messages.filterBackToValues}
        </button>
        <SimpleFilterEditor
          ref={conditions}
          column={column}
          menu={menu}
          controller={controller}
          messages={messages}
          initialFocusRef={(element) => {
            conditionsFocus.current = element;
          }}
          applyFilter={applyFilter}
          operator={mode.operator}
        />
      </>
    );
  }

  const { shape } = opened;
  return (
    <div className="gridkit-filter-menu-values">
      {menu.operators.length > 0 && (
        <OperatorMenuButton
          ref={operatorButton}
          menu={menu}
          active={
            shape.kind === "conditions"
              ? shape.conditions.map((condition) => condition.operator)
              : undefined
          }
          messages={messages}
          onChoose={(operator) => {
            setMode({ kind: "condition", operator });
          }}
        />
      )}
      {(shape.kind === "conditions" || shape.kind === "custom") && (
        <p className="gridkit-filter-menu-custom">
          {shape.kind === "conditions"
            ? messages.filterByCondition
            : messages.customFilter}
        </p>
      )}
      <input
        ref={initialFocusRef}
        type="search"
        className="gridkit-filter-menu-search"
        aria-label={messages.filterSearchLabel}
        placeholder={messages.searchPlaceholder}
        value={draft.search}
        onChange={(event) => {
          dispatch({ type: "search", search: event.currentTarget.value });
        }}
      />
      <label className="gridkit-filter-menu-select-all">
        <input
          ref={selectAllRef}
          type="checkbox"
          checked={selectAll === "checked"}
          // Nothing to act on: the search matches no value.
          disabled={!checklist.needsSearch && checklist.items.length === 0}
          onChange={() => {
            dispatch({ type: "toggleAll" });
          }}
        />
        {messages.filterSelectAll}
      </label>
      {checklist.needsSearch ? (
        <p className="gridkit-filter-menu-search-first">
          {messages.filterSearchFirst(checklist.total)}
        </p>
      ) : (
        <ValueChecklist
          items={checklist.items}
          showCounts={menu.showCounts}
          label={messages.filterValuesLabel}
          onToggle={(item) => {
            dispatch(toggleOf<Row>(item));
          }}
        />
      )}
      {checklist.hiddenCount > 0 && (
        <p role="status" className="gridkit-filter-menu-more">
          {messages.filterMoreValues(checklist.hiddenCount)}
        </p>
      )}
    </div>
  );
}
