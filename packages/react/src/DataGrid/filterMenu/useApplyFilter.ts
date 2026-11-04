import { useEffect, useRef } from "react";
import type { FilterState, GridMessages } from "@gridkitjs/core";
import type { DataGridController } from "../useGridController";

/**
 * How a filter menu applies a filter: it becomes the grid's filter, and once
 * the grid has drawn the rows it keeps, how many they are of all the rows is
 * announced — `filterResults`, "3 of 10 rows". Held by the panel host, which
 * outlives the menu: the menu closes as it applies, before the rows are
 * drawn.
 */
export default function useApplyFilter<Row>(
  controller: DataGridController<Row>,
  messages: GridMessages,
  announce: (text: string) => void,
): (filter: FilterState<Row>) => void {
  /** The filter a menu applied, until it is announced. */
  const unannounced = useRef<FilterState<Row> | null>(null);

  // After the render that drew the rows, so the count is theirs — and only
  // once the grid holds the filter, which a controlled one may not.
  useEffect(() => {
    if (unannounced.current === controller.getState().filter) {
      unannounced.current = null;
      announce(
        messages.filterResults(
          controller.getView().rows.length,
          controller.getOptions().dataSource?.length ?? 0,
        ),
      );
    }
  });

  return (filter) => {
    unannounced.current = filter;
    controller.setFilter(filter);
  };
}
