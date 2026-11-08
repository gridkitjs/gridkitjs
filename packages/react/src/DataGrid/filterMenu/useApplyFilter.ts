import type { FilterState, GridMessages } from "@gridkitjs/core";
import useAnnounceWhenDrawn from "../useAnnounceWhenDrawn";
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
  const announceWhenDrawn = useAnnounceWhenDrawn(announce);

  return (filter) => {
    announceWhenDrawn({
      drawn: () => controller.getState().filter === filter,
      text: () =>
        messages.filterResults(
          controller.getView().rows.length,
          controller.getOptions().dataSource?.length ?? 0,
        ),
    });
    controller.setFilter(filter);
  };
}
