import { useEffect, useRef, type SubmitEvent } from "react";
import {
  resolveColumnHeaderText,
  resolveMenu,
  type BuiltInCommandId,
  type ResolvedMenuEntry,
  type ResolvedMenuItem,
} from "@gridkitjs/core";
import { resolveColumnFilterMenu } from "@gridkitjs/core/renderer";
import { ariaAttr } from "../ariaAttr";
import { MenuIcon } from "../menu/menuIcons";
import type { GridPanelProps } from "../panels/GridPanels";
import ExcelFilterEditor from "./ExcelFilterEditor";
import type { FilterEditorHandle, FilterEditorProps } from "./filterEditor";
import SimpleFilterEditor from "./SimpleFilterEditor";

/** The sort commands offered above the editor, each hidden where its column cannot sort. */
const SORT_COMMANDS: readonly BuiltInCommandId[] = [
  "sort.ascending",
  "sort.descending",
  "sort.clear",
];

function isItem(entry: ResolvedMenuEntry): entry is ResolvedMenuItem {
  return entry.type === "item";
}

/**
 * A column's filter menu: a dialog below its header holding the column's
 * sort commands, its filter editor — the conditions, or the checklist where
 * its `ui` is `"excel"` — and buttons that clear the filter, cancel or
 * apply. Which sort entries show and whether "Clear filter" can
 * run are the commands' own, resolved by `@gridkitjs/core`'s `resolveMenu`;
 * each runs through the grid's commands, so `onCommand` hears it with the
 * source `"filterMenu"`, and closes the menu, as choosing a menu item does.
 *
 * The editor edits a draft, so nothing filters until it is applied: OK, or
 * Enter in a field, applies it; Cancel, Escape or a click outside drops it.
 * The menu closes once the editor has applied, and stays open while the
 * editor marks what keeps it from applying.
 */
export default function FilterMenu<Row>({
  target,
  controller,
  commands,
  messages,
  close,
  initialFocusRef,
  applyFilter,
  columnValues,
}: GridPanelProps<Row>) {
  const editor = useRef<FilterEditorHandle>(null);
  const column =
    target.area === "header"
      ? controller
          .getView()
          .dataColumns.find((entry) => entry.id === target.columnId)
      : undefined;
  const menu =
    column === undefined
      ? null
      : resolveColumnFilterMenu(controller.getOptions(), column.column);

  // Opened by an app's own command on a column with no menu, or left open as
  // its column loses it: with nothing to show, nothing stays open.
  useEffect(() => {
    if (menu === null) {
      close();
    }
  });

  if (column === undefined || menu === null) {
    return null;
  }

  const resolveOptions = {
    commands: commands.commands,
    context: commands.contextFor(target),
  };
  const sortItems = resolveMenu(SORT_COMMANDS, resolveOptions).filter(isItem);
  const [clearItem] = resolveMenu(["filter.clear"], resolveOptions).filter(
    isItem,
  );

  function run(item: ResolvedMenuItem): void {
    commands.run(item.id, target, "filterMenu");
    close();
  }

  const editorProps: FilterEditorProps<Row> = {
    ref: editor,
    column,
    menu,
    controller,
    messages,
    initialFocusRef,
    applyFilter,
  };

  function apply(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (editor.current?.apply() ?? true) {
      close();
    }
  }

  return (
    <div
      role="dialog"
      aria-label={messages.filterMenuLabel(
        resolveColumnHeaderText(column.column),
      )}
      className="gridkit-filter-menu"
    >
      {/*
       * Not validated by the browser: core reads every operand an editor
       * holds, so a `type="number"` input's whole-number step never blocks
       * an apply with a tooltip of the browser's own.
       */}
      <form
        className="filter-menu-form"
        noValidate
        onSubmit={apply}
        onKeyDown={(event) => {
          // Enter submits a form from its text boxes but not from a picker —
          // a select, or a checklist's list; here it applies from any.
          if (
            event.key === "Enter" &&
            event.target instanceof Element &&
            event.target.closest("select, [role=listbox]") !== null
          ) {
            event.preventDefault();
            event.currentTarget.requestSubmit();
          }
        }}
      >
        {sortItems.length > 0 && (
          <div className="filter-menu-sort">
            {sortItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className="filter-menu-sort-item"
                disabled={item.disabled}
                {...ariaAttr(
                  item.checked !== undefined,
                  "aria-pressed",
                  item.checked,
                )}
                onClick={() => {
                  run(item);
                }}
              >
                <span className="filter-menu-sort-icon" aria-hidden="true">
                  <MenuIcon name={item.icon} />
                </span>
                {item.label}
              </button>
            ))}
          </div>
        )}
        {menu.ui === "excel" ? (
          <ExcelFilterEditor {...editorProps} columnValues={columnValues} />
        ) : (
          <SimpleFilterEditor {...editorProps} />
        )}
        <div className="filter-menu-actions">
          {clearItem !== undefined && (
            <button
              type="button"
              className="filter-menu-clear"
              disabled={clearItem.disabled}
              onClick={() => {
                run(clearItem);
              }}
            >
              {clearItem.label}
            </button>
          )}
          <button type="button" className="filter-menu-cancel" onClick={close}>
            {messages.cancelFilter}
          </button>
          <button type="submit" className="filter-menu-apply">
            {messages.applyFilter}
          </button>
        </div>
      </form>
    </div>
  );
}
