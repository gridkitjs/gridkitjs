import { useLayoutEffect, useRef, useState } from "react";
import { resolveColumnChooser } from "@gridkitjs/core/renderer";
import type { GridPanelProps } from "../panels/GridPanels";

/**
 * The column chooser: a dialog listing every data column, hidden ones
 * included, with a native checkbox each, a search box narrowing the list and
 * a "Show all" checkbox over what the search shows. Which columns it lists,
 * which checkbox is disabled and what "Show all" does are
 * `@gridkitjs/core`'s `resolveColumnChooser`'s; this draws them.
 *
 * Every change applies at once, through `showColumns` and `hideColumns`, so
 * it reports and announces as any other change to the columns does. There
 * is nothing to confirm, so nothing to cancel: Escape or a click outside
 * just closes it.
 */
export default function ColumnChooser<Row>({
  controller,
  messages,
}: GridPanelProps<Row>) {
  const [search, setSearch] = useState("");
  const showAllRef = useRef<HTMLInputElement>(null);
  const { entries, selectAll, toggleAll } = resolveColumnChooser({
    columns: controller.getView().dataColumns,
    visibility: controller.getState().columnVisibility,
    search,
  });

  // A checkbox's mixed state has no attribute, only this property.
  useLayoutEffect(() => {
    if (showAllRef.current !== null) {
      showAllRef.current.indeterminate = selectAll === "mixed";
    }
  });

  function setVisible(columnIds: readonly string[], visible: boolean): void {
    if (visible) {
      controller.showColumns(columnIds);
    } else {
      controller.hideColumns(columnIds);
    }
  }

  return (
    <div
      role="dialog"
      aria-label={messages.columnChooserLabel}
      className="gridkit-column-chooser"
    >
      <input
        type="search"
        className="column-chooser-search"
        aria-label={messages.columnChooserSearchLabel}
        placeholder={messages.searchPlaceholder}
        value={search}
        onChange={(event) => {
          setSearch(event.currentTarget.value);
        }}
      />
      {entries.length === 0 ? (
        <p role="status" className="column-chooser-empty">
          {messages.noMatchingColumns}
        </p>
      ) : (
        <>
          <label className="column-chooser-option column-chooser-all">
            <input
              ref={showAllRef}
              type="checkbox"
              checked={selectAll === "checked"}
              disabled={toggleAll === null}
              onChange={() => {
                if (toggleAll !== null) {
                  setVisible(toggleAll.columnIds, toggleAll.visible);
                }
              }}
            />
            {messages.showAllColumns}
          </label>
          <ul className="column-chooser-list">
            {entries.map((entry) => (
              <li key={entry.columnId}>
                <label className="column-chooser-option">
                  <input
                    type="checkbox"
                    checked={entry.visible}
                    disabled={entry.disabled}
                    onChange={() => {
                      setVisible([entry.columnId], !entry.visible);
                    }}
                  />
                  {entry.label}
                </label>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
