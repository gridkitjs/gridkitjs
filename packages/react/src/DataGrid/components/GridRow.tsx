import { accessDotted } from "@gridkitjs/core";
import { memo, type ReactNode } from "react";
import type { ResolvedColumn } from "../DataGrid";
import { ariaAttr } from "../ariaAttr";
import { classNames } from "../classNames";
import { tabIndexFor } from "../useGridNavigation";

interface GridRowProps<Row> {
  columns: readonly ResolvedColumn<Row>[];
  rowId: string;
  row: Row;
  rowIndex: number;
  /** This row's absolute position in the whole dataset, unaffected by which page is showing — see `CellTemplateContext.datasetIndex`. */
  datasetIndex: number;
  /** The column being resized, so its cells outline with its header. */
  activeColumnId: string | null;
  selectedColumnIds: ReadonlySet<string>;
  selected: boolean;
  /** Which of this row's cells is the selected one, if any. */
  selectedColumnId: string | null;
  /** Which of this row's cells holds the grid's tab stop, if any. */
  focusedColumnIndex: number | null;
  rowsSelectable: boolean;
  cellsSelectable: boolean;
}

function GridRowComponent<Row>({
  columns,
  rowId,
  row,
  rowIndex,
  datasetIndex,
  activeColumnId,
  selectedColumnIds,
  selected,
  selectedColumnId,
  focusedColumnIndex,
  rowsSelectable,
  cellsSelectable,
}: GridRowProps<Row>) {
  return (
    <tr
      role="row"
      // Two past the index: rows are counted from one, and the header is the
      // first of them. Built from `datasetIndex` rather than the
      // page-relative `rowIndex`, so a paginated grid still reports each
      // row's true position in the whole dataset — the two only diverge once
      // pagination is on.
      aria-rowindex={datasetIndex + 2}
      // Omitted rather than `false` when rows cannot be selected, which would
      // otherwise have every row announce that it is not.
      {...ariaAttr(rowsSelectable, "aria-selected", selected)}
      className={classNames("grid-row", selected ? "is-selected" : "")}
    >
      {columns.map(({ id, column, alignment }, columnIndex) => {
        // Resolved either way, so a template that only formats the value never
        // has to walk the field path a second time.
        const value = accessDotted(row, column.field);
        const cellSelected = id === selectedColumnId;

        return (
          <td
            key={id}
            role="gridcell"
            data-gridkit-column={id}
            aria-colindex={columnIndex + 1}
            tabIndex={tabIndexFor(columnIndex, focusedColumnIndex)}
            {...ariaAttr(cellsSelectable, "aria-selected", cellSelected)}
            {...ariaAttr(cellsSelectable, "aria-keyshortcuts", "Space Enter")}
            className={classNames(
              "grid-cell",
              id === activeColumnId ? "is-resizing" : "",
              cellSelected || selectedColumnIds.has(id) ? "is-selected" : "",
              column.wrap?.cells ? "is-wrapped" : "",
              column.cellClassName ?? "",
            )}
            style={{ textAlign: alignment }}
          >
            {column.cellTemplate
              ? column.cellTemplate({
                  value,
                  row,
                  rowIndex,
                  datasetIndex,
                  rowId,
                  selected,
                })
              : (value as ReactNode)}
          </td>
        );
      })}
    </tr>
  );
}

/**
 * Selection lives at the top of the grid, so any change to it re-renders the
 * whole body — without this boundary a click would rebuild every cell of every
 * row rather than the one or two rows that changed.
 *
 * Every prop above is a scalar or already memoised for that reason, and no
 * handler reaches here at all: the body delegates its events, so a row has
 * nothing to compare that changes each render.
 *
 * `memo` erases the type parameter, and the cast puts it back — the standard
 * price of memoising a generic component.
 */
const GridRow = memo(GridRowComponent) as typeof GridRowComponent;

export default GridRow;
