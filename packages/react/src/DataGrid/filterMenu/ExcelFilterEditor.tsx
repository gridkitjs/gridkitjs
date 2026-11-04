import {
  useImperativeHandle,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  describeColumnFilter,
  draftToFilter,
  filterChecklist,
  filterEditorReducer,
  initialFilterEditorDraft,
  selectAllState,
  type ColumnValueOptions,
  type FilterChecklistItem,
  type FilterEditorAction,
} from "@gridkitjs/core";
import type { FilterEditorProps } from "./filterEditor";
import ValueChecklist from "./ValueChecklist";

export interface ExcelFilterEditorProps<Row> extends FilterEditorProps<Row> {
  /**
   * The values a column's checklist lists, counted over the rows the other
   * columns' filters keep — the same list again while nothing it is counted
   * from has changed.
   */
  readonly columnValues: (columnId: string) => ColumnValueOptions;
}

/** What a checklist item's toggle does to the draft. */
function toggleOf<Row>(item: FilterChecklistItem): FilterEditorAction<Row> {
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
 * Conditions or a custom filter open with every value checked, under a note
 * saying the column is filtered otherwise. OK leaves that filter be until a
 * value is checked or unchecked, as it leaves any filter whose values are as
 * they opened.
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
  // Read once, as the menu opens: from then on the draft is the user's.
  const [opened] = useState(() => {
    const shape = describeColumnFilter(controller.getState().filter, column.id);
    return {
      kind: shape.kind,
      draft: initialFilterEditorDraft(shape, columnValues(column.id)),
    };
  });
  const [draft, dispatch] = useReducer(filterEditorReducer<Row>, opened.draft);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const selectAll = selectAllState(draft);
  const checklist = filterChecklist(draft, {
    valueLimit: menu.valueLimit,
    blanksLabel: messages.filterBlanks,
  });

  // A checkbox's mixed state has no attribute, only this property.
  useLayoutEffect(() => {
    if (selectAllRef.current !== null) {
      selectAllRef.current.indeterminate = selectAll === "mixed";
    }
  });

  useImperativeHandle(ref, () => ({
    apply: () => {
      const picked =
        draft.checked !== opened.draft.checked ||
        draft.includeBlanks !== opened.draft.includeBlanks;
      if (picked) {
        applyFilter(
          draftToFilter(draft, column.id, controller.getState().filter),
        );
      }
      return true;
    },
  }));

  return (
    <div className="filter-menu-values">
      {(opened.kind === "conditions" || opened.kind === "custom") && (
        <p className="filter-menu-custom">
          {opened.kind === "conditions"
            ? messages.filterByCondition
            : messages.customFilter}
        </p>
      )}
      <input
        ref={initialFocusRef}
        type="search"
        className="filter-menu-search"
        aria-label={messages.filterSearchLabel}
        placeholder={messages.searchPlaceholder}
        value={draft.search}
        onChange={(event) => {
          dispatch({ type: "search", search: event.currentTarget.value });
        }}
      />
      <label className="filter-menu-select-all">
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
        <p className="filter-menu-search-first">
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
        <p role="status" className="filter-menu-more">
          {messages.filterMoreValues(checklist.hiddenCount)}
        </p>
      )}
    </div>
  );
}
