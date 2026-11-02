import {
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import {
  applyColumnResize,
  beginColumnResize,
  clampColumnWidth,
  resolveColumnConstraints,
  sizeColumnToContent,
  type ColumnSizeDefaults,
} from "@gridkitjs/core";
import type { ResolvedColumn } from "./DataGrid";
import measureColumnContent from "./measureColumnContent";
import { startPointerGesture } from "./pointerGesture";
import type { DataGridController } from "./useGridController";

interface UseColumnResizeOptions<Row> {
  tableRef: RefObject<HTMLTableElement | null>;
  controller: DataGridController<Row>;
  columnSizeDefaults?: Partial<ColumnSizeDefaults> | undefined;
}

export interface ColumnResizeApi<Row> {
  /** The column being dragged, for as long as the drag lasts. */
  activeColumnId: string | null;
  startResize: (
    entry: ResolvedColumn<Row>,
    event: ReactPointerEvent<HTMLElement>,
  ) => void;
  sizeToContent: (entry: ResolvedColumn<Row>) => void;
  nudge: (entry: ResolvedColumn<Row>, delta: number) => void;
}

/**
 * Turns pointer and keyboard input into column widths. Every width it produces
 * comes from `@gridkitjs/core` and is applied by the grid's controller; this
 * hook only supplies the coordinates, and holds which column is being dragged.
 */
export default function useColumnResize<Row>({
  tableRef,
  controller,
  columnSizeDefaults,
}: UseColumnResizeOptions<Row>): ColumnResizeApi<Row> {
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);

  function startResize(
    entry: ResolvedColumn<Row>,
    event: ReactPointerEvent<HTMLElement>,
  ): void {
    const handle = event.currentTarget;
    const { pointerId } = event;
    const session = beginColumnResize(
      entry.column,
      entry.width,
      event.clientX,
      columnSizeDefaults,
    );
    /** The sizing as the drag found it, which Escape puts the column back to. */
    const base = controller.getState().columnSizing;
    let width = session.startWidth;

    // Otherwise the drag selects the header text it started on.
    event.preventDefault();
    event.stopPropagation();
    setActiveColumnId(session.columnId);

    startPointerGesture(handle, pointerId, {
      onMove(moveEvent) {
        width = applyColumnResize(session, moveEvent.clientX);
        controller.resizeColumn(session.columnId, width, "move");
      },
      onEnd() {
        setActiveColumnId(null);
        // A click with no intervening `move` — as every double-click's two
        // constituent clicks are — leaves `width` at `startWidth`. Committing
        // that anyway would fire a spurious onColumnResize on every click.
        if (width !== session.startWidth) {
          controller.resizeColumn(session.columnId, width, "end");
        }
      },
      /**
       * Escape puts back only the dragged column's pre-drag width, merged
       * into whatever the sizing state is *now* — not the `base` snapshot
       * taken at drag-start — so a different column resized via keyboard
       * while this drag was still open keeps its change instead of being
       * clobbered by a stale restore.
       */
      onCancel() {
        setActiveColumnId(null);
        controller.cancelColumnResize(
          session.columnId,
          base,
          session.startWidth,
        );
      },
    });
  }

  function sizeToContent(entry: ResolvedColumn<Row>): void {
    const table = tableRef.current;
    if (table === null) {
      return;
    }

    const measured = measureColumnContent(table, entry.id);
    if (measured === null) {
      return;
    }

    controller.resizeColumn(
      entry.id,
      sizeColumnToContent(
        measured,
        resolveColumnConstraints(entry.column, columnSizeDefaults),
      ),
      "end",
    );
  }

  function nudge(entry: ResolvedColumn<Row>, delta: number): void {
    controller.resizeColumn(
      entry.id,
      clampColumnWidth(
        entry.width + delta,
        resolveColumnConstraints(entry.column, columnSizeDefaults),
      ),
      "end",
    );
  }

  // A new object each render, as the other hooks here return.
  return { activeColumnId, startResize, sizeToContent, nudge };
}
