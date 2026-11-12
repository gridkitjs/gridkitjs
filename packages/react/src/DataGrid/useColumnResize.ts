import {
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import type { ColumnSizeDefaults } from "@gridkitjs/core";
import {
  beginColumnResize,
  clampColumnWidth,
  resolveColumnConstraints,
  sizeColumnToContent,
} from "@gridkitjs/core/renderer";
import { measureColumnContent, startColumnResizeGesture } from "@gridkitjs/dom";
import type { ResolvedColumn } from "./DataGrid";
import type { DataGridController } from "./useGridController";
import useGestureSignal from "./useGestureSignal";

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
  /** Sizes a column to its content, and says whether it could: not without cells. */
  sizeToContent: (entry: ResolvedColumn<Row>) => boolean;
  nudge: (entry: ResolvedColumn<Row>, delta: number) => void;
}

/**
 * Turns pointer and keyboard input into column widths. The drag itself is
 * `@gridkitjs/dom`'s `startColumnResizeGesture`, every width comes from
 * `@gridkitjs/core`, and the grid's controller applies them; this hook holds
 * only which column is being dragged. The drag is cancelled with the
 * component, and with its handle should a render remove it
 * (`useGestureSignal`).
 */
export default function useColumnResize<Row>({
  tableRef,
  controller,
  columnSizeDefaults,
}: UseColumnResizeOptions<Row>): ColumnResizeApi<Row> {
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);
  const startGesture = useGestureSignal();

  function startResize(
    entry: ResolvedColumn<Row>,
    event: ReactPointerEvent<HTMLElement>,
  ): void {
    // A press on the handle is never the header's, whichever button made it:
    // a reorderable header's own drag must not see it.
    event.stopPropagation();

    const session = beginColumnResize(
      entry.column,
      entry.width,
      event.clientX,
      columnSizeDefaults,
    );
    /** The sizing as the drag found it, which Escape puts the column back to. */
    const base = controller.getState().columnSizing;

    const handle = event.currentTarget;
    const started = startGesture(handle, (signal) =>
      startColumnResizeGesture(handle, event, session, {
        onMove(width) {
          controller.resizeColumn(session.columnId, width, "move");
        },
        onEnd(width) {
          setActiveColumnId(null);
          if (width !== null) {
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
        signal,
      }),
    );
    if (started) {
      setActiveColumnId(session.columnId);
    }
  }

  function sizeToContent(entry: ResolvedColumn<Row>): boolean {
    const table = tableRef.current;
    if (table === null) {
      return false;
    }

    const measured = measureColumnContent(table, entry.id);
    if (measured === null) {
      return false;
    }

    controller.resizeColumn(
      entry.id,
      sizeColumnToContent(
        measured,
        resolveColumnConstraints(entry.column, columnSizeDefaults),
      ),
      "end",
    );
    return true;
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
