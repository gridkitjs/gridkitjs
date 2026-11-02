import { createPortal } from "react-dom";
import {
  resolveColumnLabel,
  resolveKeyboardDropTarget,
  type GridMessages,
  type GroupByState,
} from "@gridkitjs/core";
import type { GroupByDropTarget } from "@gridkitjs/dom";
import type { ColumnDefinition, ResolvedColumn } from "../DataGrid";
import { classNames } from "../classNames";
import useGroupByDrag from "../useGroupByDrag";
import type { DataGridController } from "../useGridController";

interface GroupByBarProps<Row> {
  columns: readonly ResolvedColumn<Row>[];
  /** Every column's definition by id, hidden ones included, so a chip for a hidden column still carries its label. */
  definitions: ReadonlyMap<string, ColumnDefinition<Row>>;
  groupBy: GroupByState;
  /** What a chip's drag, move or remove button changes. */
  controller: DataGridController<Row>;
  /** A column's accessible name — see `DataGrid.tsx`'s own `columnName`. */
  columnName: (columnId: string) => string;
  /** Whether the header drag currently open (if any) could drop into this bar. */
  headerDragEligible: boolean;
  /**
   * Whether the header drag currently open (if any) is for a column already
   * in the group-by stack — a drag this bar rejects outright, since
   * repositioning a grouped column is the chip's job, not the header's.
   */
  headerDragBlocked: boolean;
  /** That header drag's own target within this bar, or `null`. */
  headerDropTarget: GroupByDropTarget | null;
  messages: GridMessages;
}

/**
 * The active group-by stack, outer to inner, as removable, reorderable
 * chips — and the drop target for a header dragged in from outside it.
 * Each column's own header already carries a group toggle (a pointer
 * affordance, plus `Alt+ArrowDown`) for adding or removing a level without
 * dragging at all; this bar shows the resulting stack, lets a level be
 * removed from it directly, lets a chip be dragged to reorder the stack (or
 * moved via `Ctrl+ArrowLeft`/`Ctrl+ArrowRight` on a focused one), and — for
 * a column whose header sets `groupByDraggable` and isn't grouped yet —
 * accepts a header dropped onto it, at whatever position among the existing
 * chips it's released. A header for a column already in the stack is
 * rejected outright (`is-drag-blocked`, `cursor: not-allowed`): the header
 * only ever adds, and repositioning an existing level is the chip's job.
 *
 * Whether this component mounts at all is `DataGrid.tsx`'s call
 * (`groupByBarVisibility`), not this component's own — it never bails out
 * on its own initiative once rendered.
 *
 * Chips sit outside the grid's own single-roving-tabstop model: there is no
 * shared index to keep in sync the way a row or a header cell has, so each
 * chip (and its own remove button) is simply, always `tabIndex={0}` — plain
 * DOM tab order, no roving-focus bookkeeping.
 */
export default function GroupByBar<Row>({
  columns,
  definitions,
  groupBy,
  controller,
  columnName,
  headerDragEligible,
  headerDragBlocked,
  headerDropTarget,
  messages,
}: GroupByBarProps<Row>) {
  const groupByIds = groupBy.map((entry) => entry.columnId);

  const chipDrag = useGroupByDrag({
    groupBy,
    onDrop: (movedId, beforeColumnId) => {
      controller.moveGroupBy(movedId, beforeColumnId);
    },
  });

  // Mutually exclusive by construction — one pointer, so at most one of "a
  // chip dragged within this bar" and "a header dragged in from outside it"
  // is ever active at once.
  const activeDropTarget = chipDrag.dropTarget ?? headerDropTarget;
  const isDragTarget = chipDrag.draggedColumnId !== null || headerDragEligible;
  const showPlaceholder =
    groupBy.length === 0 && columns.some((entry) => entry.groupByDraggable);

  function labelFor(columnId: string) {
    const definition = definitions.get(columnId);
    return definition === undefined ? columnId : resolveColumnLabel(definition);
  }

  function moveByKeyboard(columnId: string, direction: -1 | 1): void {
    const beforeColumnId = resolveKeyboardDropTarget(
      groupByIds,
      columnId,
      direction,
    );
    if (beforeColumnId === undefined) {
      return;
    }
    controller.moveGroupBy(columnId, beforeColumnId);
  }

  return (
    <div
      className={classNames(
        "gridkit-group-by-bar",
        isDragTarget ? "is-drag-target" : "",
        headerDragBlocked ? "is-drag-blocked" : "",
      )}
      data-gridkit-group-by-bar=""
      role="group"
      aria-label={messages.groupByBarLabel}
    >
      {showPlaceholder && (
        <span className="group-by-bar-placeholder">
          {messages.groupByBarPlaceholder}
        </span>
      )}
      {groupBy.map((entry, index) => {
        const dropBefore = activeDropTarget?.beforeColumnId === entry.columnId;
        const dropAfter =
          activeDropTarget?.beforeColumnId === null &&
          index === groupBy.length - 1;
        const dragging = chipDrag.draggedColumnId === entry.columnId;

        return (
          <span
            key={entry.columnId}
            className={classNames(
              "group-by-chip",
              dragging ? "is-dragging" : "",
              dropBefore ? "is-drop-before" : "",
              dropAfter ? "is-drop-after" : "",
            )}
            data-gridkit-group-chip={entry.columnId}
            tabIndex={0}
            aria-label={messages.groupByChipLabel(
              columnName(entry.columnId),
              index + 1,
              groupBy.length,
            )}
            aria-keyshortcuts="Control+ArrowLeft Control+ArrowRight"
            onPointerDown={(event) => {
              chipDrag.startDrag(entry.columnId, event);
            }}
            onKeyDown={(event) => {
              const horizontal =
                event.key === "ArrowLeft" || event.key === "ArrowRight";
              if (horizontal && event.ctrlKey) {
                event.preventDefault();
                moveByKeyboard(
                  entry.columnId,
                  event.key === "ArrowLeft" ? -1 : 1,
                );
              }
            }}
          >
            <span className="group-by-chip-label">
              {labelFor(entry.columnId)}
            </span>
            <button
              type="button"
              className="group-by-chip-remove"
              aria-label={messages.removeGroupBy(columnName(entry.columnId))}
              onPointerDown={(event) => {
                // Otherwise the chip's own `onPointerDown` sees this bubble
                // up and starts a drag — the same reason the header's own
                // sort toggle stops it.
                event.stopPropagation();
              }}
              onClick={() => {
                controller.toggleGroupBy(entry.columnId);
              }}
            >
              ×
            </button>
          </span>
        );
      })}
      {/*
       * Portalled to the body, the same reason the header's own drag ghost
       * is: inside the viewport the overflow that makes the grid scroll
       * would clip it, and this bar sits right above that viewport.
       */}
      {chipDrag.draggedColumnId !== null &&
        chipDrag.ghostTransform !== null &&
        createPortal(
          <span
            className="group-by-chip drag-ghost"
            style={{ transform: chipDrag.ghostTransform }}
            aria-hidden="true"
          >
            {labelFor(chipDrag.draggedColumnId)}
          </span>,
          document.body,
        )}
    </div>
  );
}
