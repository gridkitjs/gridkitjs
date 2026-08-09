import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { buildKeyShortcuts, intentOf, KEYBOARD_STEP } from "@gridkitjs/core";
import type { ResolvedColumn } from "../DataGrid";
import { ariaAttr } from "../ariaAttr";
import { classNames } from "../classNames";
import type { ColumnDragApi } from "../useColumnDrag";
import type { ColumnResizeApi } from "../useColumnResize";
import type { ColumnSortApi } from "../useColumnSort";
import { HEADER_ROW, type GridNavigationApi } from "../useGridNavigation";
import {
  keyboardSelectIntent,
  type GridSelectionApi,
} from "../useGridSelection";
import type { RowGroupingApi } from "../useRowGrouping";

interface GridHeaderProps<Row> {
  columns: readonly ResolvedColumn<Row>[];
  resize: ColumnResizeApi<Row>;
  drag: ColumnDragApi<Row>;
  sort: ColumnSortApi<Row>;
  sortableColumns: boolean;
  grouping: RowGroupingApi<Row>;
  groupableColumns: boolean;
  nav: GridNavigationApi;
  selection: GridSelectionApi;
}

/** The common attributes behind every icon here — just the `<path>`s differ. */
function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/**
 * The two glyphs a sort toggle shows: a neutral hint before a column has a
 * direction, and a single chevron reused for both directions once it does —
 * `theme-tailwind` rotates it 180° for `desc` rather than swapping icons.
 */
function ChevronsUpDownIcon() {
  return (
    <Icon>
      <path d="m7 15 5 5 5-5" />
      <path d="m7 9 5-5 5 5" />
    </Icon>
  );
}

function ChevronUpIcon() {
  return (
    <Icon>
      <path d="m18 15-6-6-6 6" />
    </Icon>
  );
}

/** Three stacked panes, standing in for "group by this column". */
function GroupIcon() {
  return (
    <Icon>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="8.5" y="14" width="7" height="7" rx="1" />
    </Icon>
  );
}

export default function GridHeader<Row>({
  columns,
  resize,
  drag,
  sort,
  sortableColumns,
  grouping,
  groupableColumns,
  nav,
  selection,
}: GridHeaderProps<Row>) {
  const { beforeId } = drag.dropTarget ?? {};
  const draggedEntry =
    columns.find((entry) => entry.id === drag.draggedColumnId) ?? null;

  return (
    <thead>
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
          const sortDirection = sort.directionFor(entry.id);
          const sortPriority = sort.priorityFor(entry.id);
          const groupable = column.groupable ?? groupableColumns;
          const isGrouped = grouping.groupBy.some(
            (level) => level.columnId === entry.id,
          );

          const shortcuts = buildKeyShortcuts({
            reorderable: entry.reorderable,
            resizable: entry.resizable,
            sortable,
            groupable,
          });

          return (
            <th
              key={entry.id}
              scope="col"
              // Explicit, matching `GridRow.tsx`'s `role="gridcell"` on the
              // body `<td>`: both sit inside a `<table role="grid">`, and
              // mixing that non-native ancestor role with descendants that
              // rely on implicit native role mapping is inconsistently
              // resolved across browser/AT combinations.
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
                    event.target.closest(".header-group-toggle") !== null)
                ) {
                  return;
                }
                selection.selectColumn(entry.id, intentOf(event));
              }}
              onKeyDown={(event) => {
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
                  sort.toggle(entry, { shiftKey: event.shiftKey });
                  return;
                }
                if (event.key === "ArrowDown" && event.altKey && groupable) {
                  event.preventDefault();
                  grouping.toggleGroupBy(entry.id);
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
                entry.reorderable ? "is-reorderable" : "",
                selected ? "is-selected" : "",
                resizing ? "is-resizing" : "",
                dragging ? "is-dragging" : "",
                dropBefore ? "is-drop-before" : "",
                dropAfter ? "is-drop-after" : "",
                column.wrap?.header ? "is-wrapped" : "",
                column.headerClassName ?? "",
              )}
              {...ariaAttr(shortcuts !== "", "aria-keyshortcuts", shortcuts)}
              {...ariaAttr<"aria-sort", "ascending" | "descending">(
                sortable && sortDirection !== null,
                "aria-sort",
                sortDirection === "asc" ? "ascending" : "descending",
              )}
              {...(entry.reorderable && {
                onPointerDown: (event) => {
                  drag.startDrag(entry, event);
                },
              })}
            >
              {groupable && (
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
                    grouping.toggleGroupBy(entry.id);
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
                     * `setPointerCapture` then redirects the click that
                     * follows to the `th` — the same reason `startResize`
                     * stops it for the resize handle.
                     */
                    event.stopPropagation();
                  }}
                  onClick={(event) => {
                    sort.toggle(entry, { shiftKey: event.shiftKey });
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
