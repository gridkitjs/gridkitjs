import { createPortal } from "react-dom";
import {
  buildKeyShortcuts,
  intentOf,
  isColumnFiltered,
  KEYBOARD_STEP,
  resolveColumnFilterMenu,
  sortDirectionFor,
  sortPriorityFor,
  type GridMessages,
  type GridState,
} from "@gridkitjs/core";
import type { ResolvedColumn } from "../DataGrid";
import { ariaAttr } from "../ariaAttr";
import { classNames } from "../classNames";
import {
  ChevronsUpDownIcon,
  ChevronUpIcon,
  FilterIcon,
  GroupIcon,
} from "../icons";
import { isOwnEvent } from "../isOwnEvent";
import type { GridPanelsApi } from "../panels/useGridPanels";
import type { ColumnDragApi } from "../useColumnDrag";
import type { ColumnResizeApi } from "../useColumnResize";
import { HEADER_ROW, type GridNavigationApi } from "../useGridNavigation";
import {
  keyboardSelectIntent,
  type GridSelectionApi,
} from "../useGridSelection";
import type { DataGridController } from "../useGridController";

interface GridHeaderProps<Row> {
  columns: readonly ResolvedColumn<Row>[];
  resize: ColumnResizeApi<Row>;
  drag: ColumnDragApi<Row>;
  /** What a header toggle changes — the sort and the group-by stack. */
  controller: DataGridController<Row>;
  /** The state this render draws: the sort, grouping and filter the headers show. */
  state: GridState<Row>;
  sortableColumns: boolean;
  groupableColumns: boolean;
  groupToggleIconColumns: boolean;
  /** Whether a header opens the grid's context menu, which its `aria-keyshortcuts` says. */
  headerMenu: boolean;
  /** Where a header opens its column's filter menu. */
  panels: GridPanelsApi;
  messages: GridMessages;
  nav: GridNavigationApi;
  selection: GridSelectionApi;
}

export default function GridHeader<Row>({
  columns,
  resize,
  drag,
  controller,
  state,
  sortableColumns,
  groupableColumns,
  groupToggleIconColumns,
  headerMenu,
  panels,
  messages,
  nav,
  selection,
}: GridHeaderProps<Row>) {
  const { columnSort, groupBy, filter } = state;
  // Only meaningful for the "column-order" branch — a drop headed for the
  // group-by bar instead (`kind: "group-by"`) draws no indicator here at
  // all; `GroupByBar` draws its own from the same `drag.dropTarget`.
  const beforeId =
    drag.dropTarget?.kind === "column-order"
      ? drag.dropTarget.beforeId
      : undefined;
  const draggedEntry =
    columns.find((entry) => entry.id === drag.draggedColumnId) ?? null;

  /**
   * Opens the column's filter menu, or closes it when it is the one open: a
   * press on the header it opened from leaves it open, so pressing its
   * button again is the way back out.
   */
  function toggleFilterMenu(columnId: string): void {
    const panel = panels.current();
    if (
      panel?.kind === "filter" &&
      panel.target.area === "header" &&
      panel.target.columnId === columnId
    ) {
      panels.close();
    } else {
      panels.open("filter", { area: "header", columnId });
    }
  }

  return (
    <thead role="rowgroup">
      <tr className="grid-header" role="row" aria-rowindex={1}>
        {columns.map((entry, index) => {
          const { column } = entry;
          const resizing = resize.activeColumnId === entry.id;
          const dragging = drag.draggedColumnId === entry.id;

          /**
           * Drawn on the gap's own edge, so the one gap between two columns is
           * marked once. No guard against the dragged column: the hook reports
           * only gaps that would move it.
           */
          const dropBefore = beforeId !== undefined && beforeId === entry.id;
          const dropAfter = beforeId === null && index === columns.length - 1;
          const selected = selection.selectedColumnIds.has(entry.id);
          const sortable = column.sortable ?? sortableColumns;
          const sortDirection = sortDirectionFor(columnSort, entry.id);
          // Only meaningful once two or more columns are stacked.
          const sortPriority = sortPriorityFor(columnSort, entry.id);
          const groupable = column.groupable ?? groupableColumns;
          // Purely a rendering choice — see the prop's own doc comment. Never
          // gates `groupable` itself, `aria-keyshortcuts`, or `Alt+ArrowDown`.
          const showGroupToggleIcon =
            column.groupToggleIcon ?? groupToggleIconColumns;
          const isGrouped = groupBy.some(
            (level) => level.columnId === entry.id,
          );
          const filterable =
            resolveColumnFilterMenu(controller.getOptions(), column) !== null;
          // Shown, and described, only where the header opens the menu that
          // changes it: a grid filtering a column in code alone keeps its
          // headers as they were.
          const filtered = filterable && isColumnFiltered(filter, entry.id);

          const shortcuts = buildKeyShortcuts({
            reorderable: entry.reorderable,
            resizable: entry.resizable,
            sortable,
            groupable,
            filterable,
            contextMenu: headerMenu,
          });

          return (
            <th
              key={entry.id}
              scope="col"
              // Explicit, like every structural role in the grid: each
              // `<table>` is `role="presentation"`, so the rows and cells
              // belong to the `grid`/`treegrid` wrapper rather than to a
              // native table, and only an explicit role survives that.
              role="columnheader"
              data-gridkit-column={entry.id}
              aria-colindex={index + 1}
              tabIndex={nav.tabIndexFor(HEADER_ROW, index)}
              {...ariaAttr(
                selection.columnMode !== false,
                "aria-selected",
                selected,
              )}
              onFocus={() => {
                nav.focusCell(HEADER_ROW, index);
              }}
              onClick={(event) => {
                /*
                 * A drag ends in a click on the header it started from, and a
                 * resize in one on the handle inside it. Neither is the press
                 * that selects a column, so both are shown the door here —
                 * the drag by the distance it travelled, the resize by where
                 * it began.
                 */
                if (drag.justDragged()) {
                  return;
                }
                if (
                  event.target instanceof Element &&
                  (event.target.closest(".header-resize-handle") !== null ||
                    event.target.closest(".header-sort-toggle") !== null ||
                    event.target.closest(".header-group-toggle") !== null ||
                    event.target.closest(".header-filter-toggle") !== null)
                ) {
                  return;
                }
                selection.selectColumn(entry.id, intentOf(event));
              }}
              onKeyDown={(event) => {
                if (!isOwnEvent(event)) return;
                const horizontal =
                  event.key === "ArrowLeft" || event.key === "ArrowRight";
                const direction = event.key === "ArrowLeft" ? -1 : 1;

                if (horizontal && event.ctrlKey && entry.reorderable) {
                  event.preventDefault();
                  drag.moveByKeyboard(entry, direction);
                  return;
                }
                if (horizontal && event.altKey && entry.resizable) {
                  event.preventDefault();
                  resize.nudge(entry, direction * KEYBOARD_STEP);
                  return;
                }
                // The keyboard equivalent of double-clicking the resize
                // handle, which auto-fits the column to its content.
                if (event.key === "Enter" && event.altKey && entry.resizable) {
                  event.preventDefault();
                  resize.sizeToContent(entry);
                  return;
                }
                if (event.key === "ArrowUp" && event.altKey && sortable) {
                  event.preventDefault();
                  controller.toggleColumnSort(entry.id, {
                    stack: event.shiftKey,
                  });
                  return;
                }
                // Shift sets the filter menu apart from grouping, which
                // holds Alt+ArrowDown — the key Excel opens its filter with.
                if (
                  event.key === "ArrowDown" &&
                  event.altKey &&
                  event.shiftKey &&
                  filterable
                ) {
                  event.preventDefault();
                  toggleFilterMenu(entry.id);
                  return;
                }
                if (
                  event.key === "ArrowDown" &&
                  event.altKey &&
                  !event.shiftKey &&
                  groupable
                ) {
                  event.preventDefault();
                  controller.toggleGroupBy(entry.id);
                  return;
                }
                // Space builds a selection up and Enter replaces it, as in the
                // body. Taken either way, or Space scrolls the grid away.
                if (event.key === " " || event.key === "Enter") {
                  event.preventDefault();
                  selection.selectColumn(
                    entry.id,
                    intentOf(keyboardSelectIntent(event)),
                  );
                  return;
                }
                nav.onKeyDown(event);
              }}
              className={classNames(
                "header-cell",
                // The grab affordance a header showing either drag
                // destination shares — a column dragged only for grouping
                // (`groupByDraggable` without `reorderable`) grabs the same
                // way one dragged only for reordering does.
                entry.reorderable || entry.groupByDraggable
                  ? "is-reorderable"
                  : "",
                selected ? "is-selected" : "",
                resizing ? "is-resizing" : "",
                dragging ? "is-dragging" : "",
                dropBefore ? "is-drop-before" : "",
                dropAfter ? "is-drop-after" : "",
                column.wrap?.header ? "is-wrapped" : "",
                column.headerClassName ?? "",
              )}
              {...ariaAttr(shortcuts !== "", "aria-keyshortcuts", shortcuts)}
              {...ariaAttr(
                filtered,
                "aria-description",
                messages.columnFiltered,
              )}
              {...ariaAttr<"aria-sort", "ascending" | "descending">(
                sortable && sortDirection !== null,
                "aria-sort",
                sortDirection === "asc" ? "ascending" : "descending",
              )}
              {...((entry.reorderable || entry.groupByDraggable) && {
                onPointerDown: (event) => {
                  drag.startDrag(entry, event);
                },
              })}
            >
              {groupable && showGroupToggleIcon && (
                /*
                 * Inline, before the label, rather than absolutely
                 * positioned like the sort toggle and resize handle: those
                 * two already share the header's right edge, and a third
                 * overlay there would need its own carve-out. Sitting in
                 * normal flow costs nothing but a few pixels of label width.
                 * A pointer affordance only, same as the other two — the
                 * keyboard equivalent is Alt+ArrowDown on the header itself.
                 */
                <span
                  className={classNames(
                    "header-group-toggle",
                    isGrouped ? "is-grouped" : "",
                  )}
                  aria-hidden="true"
                  tabIndex={-1}
                  onPointerDown={(event) => {
                    // See the sort toggle's own note: otherwise a
                    // reorderable header's drag would swallow this click.
                    event.stopPropagation();
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    controller.toggleGroupBy(entry.id);
                  }}
                >
                  <GroupIcon />
                </span>
              )}
              {entry.label}
              {sortable && (
                /*
                 * A pointer affordance only, and hidden from assistive
                 * technology like the resize handle: the keyboard equivalent
                 * lives on the header itself, under Alt+ArrowUp (plain) /
                 * Alt+Shift+ArrowUp (stacking).
                 */
                <span
                  className={classNames(
                    "header-sort-toggle",
                    sortDirection !== null ? `is-sorted-${sortDirection}` : "",
                  )}
                  aria-hidden="true"
                  tabIndex={-1}
                  onPointerDown={(event) => {
                    /*
                     * Otherwise a reorderable header's own `onPointerDown`
                     * sees this bubble up and starts a column drag, whose
                     * pointer capture then redirects the click that
                     * follows to the `th` — the same reason `startResize`
                     * stops it for the resize handle.
                     */
                    event.stopPropagation();
                  }}
                  onClick={(event) => {
                    controller.toggleColumnSort(entry.id, {
                      stack: event.shiftKey,
                    });
                  }}
                >
                  {sortDirection === null ? (
                    <ChevronsUpDownIcon />
                  ) : (
                    <ChevronUpIcon />
                  )}
                  {sortPriority !== null && sortPriority > 1 && (
                    <span className="header-sort-priority">{sortPriority}</span>
                  )}
                </span>
              )}
              {filterable && (
                /*
                 * A pointer affordance only, like the sort toggle: the
                 * keyboard opens the menu from the header itself, under
                 * Alt+Shift+ArrowDown, and a screen reader hears the
                 * filtered state as the header's description.
                 */
                <span
                  className={classNames(
                    "header-filter-toggle",
                    filtered ? "is-filtered" : "",
                  )}
                  aria-hidden="true"
                  tabIndex={-1}
                  onPointerDown={(event) => {
                    // See the sort toggle's own note.
                    event.stopPropagation();
                  }}
                  onClick={() => {
                    toggleFilterMenu(entry.id);
                  }}
                >
                  <FilterIcon />
                </span>
              )}
              {entry.resizable && (
                /*
                 * A pointer affordance only, and hidden from assistive
                 * technology accordingly: a focusable handle per column would
                 * put N tab stops inside a widget that is meant to have one.
                 * The keyboard resizes from the header itself, under Alt.
                 */
                <span
                  className="header-resize-handle"
                  aria-hidden="true"
                  tabIndex={-1}
                  onPointerDown={(event) => {
                    resize.startResize(entry, event);
                  }}
                  onDoubleClick={() => {
                    resize.sizeToContent(entry);
                  }}
                />
              )}
            </th>
          );
        })}
      </tr>
      {/*
       * Portalled to the body, and not only because a `div` cannot sit in a
       * `tr`: inside the viewport the overflow that makes the grid scroll
       * would clip it.
       */}
      {draggedEntry !== null &&
        drag.ghostTransform !== null &&
        createPortal(
          <div
            className="gridkit-data-grid header-cell drag-ghost"
            style={{
              width: draggedEntry.width,
              transform: drag.ghostTransform,
            }}
            aria-hidden="true"
          >
            {draggedEntry.label}
          </div>,
          document.body,
        )}
    </thead>
  );
}
