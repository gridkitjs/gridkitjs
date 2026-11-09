import {
  isColumnVisible,
  isGroupExpanded,
  type ColumnResizeEvent,
  type ColumnSortEvent,
  type ColumnVisibilityEvent,
  type GridMessages,
  type GroupByEvent,
  type GroupExpansionEvent,
  type PaginationChangeEvent,
  type SelectionDiffEvent,
} from "@gridkitjs/core";
import type {
  CellSelectionChangeEvent,
  ColumnDefinition,
  DataGridProps,
} from "./DataGrid";

/** The change callbacks of a grid's props that announce what they report. */
type AnnouncedProps<Row> = Pick<
  DataGridProps<Row>,
  | "onColumnResize"
  | "onColumnVisibilityChange"
  | "onColumnSortChange"
  | "onGroupByChange"
  | "onGroupExpansionChange"
  | "onPaginationChange"
  | "onCellSelectionChange"
>;

interface AnnouncedCallbacksOptions<Row> {
  /** The grid's own callbacks, each called before its change is announced. */
  readonly callbacks: AnnouncedProps<Row>;
  readonly announce: (text: string) => void;
  readonly messages: GridMessages;
  /** What a column is called in an announcement. */
  readonly columnName: (columnId: string) => string;
  /** A column's definition by id, hidden or not. */
  readonly columnOf: (columnId: string) => ColumnDefinition<Row> | undefined;
}

/** What the grid hands its controller to hear each change through. */
export interface AnnouncedCallbacks<Row> {
  readonly onColumnResize: (event: ColumnResizeEvent) => void;
  readonly onColumnVisibilityChange: (event: ColumnVisibilityEvent) => void;
  readonly onColumnSortChange: (event: ColumnSortEvent) => void;
  readonly onGroupByChange: (event: GroupByEvent) => void;
  readonly onGroupExpansionChange: (event: GroupExpansionEvent) => void;
  readonly onPaginationChange: (event: PaginationChangeEvent) => void;
  readonly onCellSelectionChange: (
    event: CellSelectionChangeEvent<Row>,
  ) => void;
  readonly onSelectionDiff: (event: SelectionDiffEvent) => void;
}

/**
 * The grid's change callbacks, each wrapped to announce its change in the
 * live region after calling the grid's own — so a change is announced where
 * the controller reports it, the same whether a click, a key, a menu or the
 * ref made it.
 */
export function announcedCallbacks<Row>({
  callbacks,
  announce,
  messages,
  columnName,
  columnOf,
}: AnnouncedCallbacksOptions<Row>): AnnouncedCallbacks<Row> {
  return {
    /**
     * Announced only once the drag ends: the controller reports the
     * continuous `"move"` phase as well, and a live region given every frame
     * of a drag says nothing an assistive technology can keep up with.
     */
    onColumnResize: (event) => {
      callbacks.onColumnResize?.(event);
      if (event.phase === "end") {
        announce(
          messages.columnResized(
            columnName(event.columnId),
            Math.round(event.width),
          ),
        );
      }
    },

    /**
     * Naming a column shown or hidden alone, and counting several — "Show
     * all" in the column chooser, or `hideColumns` given a list. A change
     * that shows some and hides others, as restoring a layout can, has no
     * one thing to say, and says nothing.
     */
    onColumnVisibilityChange: (event) => {
      callbacks.onColumnVisibilityChange?.(event);
      const { columnIds, visibility } = event;
      const [columnId] = columnIds;
      const shownCount = columnIds.filter((id) => {
        const column = columnOf(id);
        return column !== undefined && isColumnVisible(column, visibility);
      }).length;
      if (
        columnId === undefined ||
        (shownCount !== 0 && shownCount !== columnIds.length)
      ) {
        return;
      }
      const shown = shownCount > 0;
      if (columnIds.length > 1) {
        announce(
          shown
            ? messages.columnsShown(columnIds.length)
            : messages.columnsHidden(columnIds.length),
        );
        return;
      }
      announce(
        shown
          ? messages.columnShown(columnName(columnId))
          : messages.columnHidden(columnName(columnId)),
      );
    },

    /** A toggle, a stack, or a clear back to "none" each get their own. */
    onColumnSortChange: (event) => {
      callbacks.onColumnSortChange?.(event);
      const entry = event.sort.find(
        (candidate) => candidate.columnId === event.columnId,
      );
      if (entry === undefined) {
        announce(messages.sortCleared(columnName(event.columnId)));
        return;
      }
      announce(
        messages.columnSorted(
          columnName(event.columnId),
          entry.direction,
          event.sort.indexOf(entry) + 1,
          event.sort.length,
        ),
      );
    },

    onGroupByChange: (event) => {
      callbacks.onGroupByChange?.(event);
      const entry = event.groupBy.find(
        (candidate) => candidate.columnId === event.columnId,
      );
      if (entry === undefined) {
        announce(messages.groupingRemoved(columnName(event.columnId)));
        return;
      }
      announce(
        messages.groupedBy(
          columnName(event.columnId),
          event.groupBy.indexOf(entry) + 1,
          event.groupBy.length,
        ),
      );
    },

    /**
     * `groupId: null` marks `expandAll`/`collapseAll` and
     * `setGroupExpansion`, which touch every group in one call rather than
     * one at a time — announced as a single summary of the mode the groups
     * now follow, instead of naming a group that doesn't apply.
     */
    onGroupExpansionChange: (event) => {
      callbacks.onGroupExpansionChange?.(event);
      if (event.groupId === null) {
        announce(
          event.expansion.mode === "allExpanded"
            ? messages.allGroupsExpanded
            : messages.allGroupsCollapsed,
        );
        return;
      }
      announce(
        isGroupExpanded(event.expansion, event.groupId)
          ? messages.groupExpanded
          : messages.groupCollapsed,
      );
    },

    onPaginationChange: (event) => {
      callbacks.onPaginationChange?.(event);
      announce(
        messages.pageStatus(event.pagination.pageIndex + 1, event.pageCount),
      );
    },

    /**
     * Unlike rows and columns, a cell selection is always exactly one cell —
     * there is no multi-cell range — so it never crosses the count's >1
     * threshold and the focused cell's own `aria-selected` is the only
     * feedback a screen-reader user would otherwise get. Announced on every
     * change that lands on a cell instead.
     */
    onCellSelectionChange: (event) => {
      callbacks.onCellSelectionChange?.(event);
      if (event.selected !== null) {
        announce(
          messages.cellSelected(
            columnName(event.selected.columnId),
            event.selected.rowIndex + 1,
          ),
        );
      }
    },

    /**
     * Announced only for a change touching more than one row or column. A
     * single selection is already carried by the focused member's own
     * `aria-selected`, and repeating it here would talk over that. Counted
     * by id, so rows the change touched off screen — on another page, in a
     * collapsed group — count too.
     */
    onSelectionDiff: (event) => {
      if (event.added.length + event.removed.length > 1) {
        announce(messages.selectedCount(event.selection.length, event.target));
      }
    },
  };
}
