import type { FilterState, GridMessages } from "@gridkitjs/core";
import useAnnounceWhenDrawn, { resultCount } from "../useAnnounceWhenDrawn";
import type { DataGridController } from "../useGridController";

/**
 * How a filter menu applies a filter: it becomes the grid's filter, and once
 * the grid has drawn the rows it keeps, how many they are of all the rows is
 * announced — `filterResults`, "3 of 10 rows". Under `dataMode: "server"`
 * the grid holds one page and knows no total without the filter, so once
 * the server's rows arrive it announces their `rowCount` alone,
 * `searchResults` ("3 rows found"). Held by the panel host, which outlives
 * the menu: the menu closes as it applies, before the rows are drawn.
 */
export default function useApplyFilter<Row>(
  controller: DataGridController<Row>,
  messages: GridMessages,
  announce: (text: string) => void,
): (filter: FilterState<Row>) => void {
  const announceWhenDrawn = useAnnounceWhenDrawn(announce, controller);

  return (filter) => {
    announceWhenDrawn({
      drawn: () => controller.getState().filter === filter,
      text: () =>
        controller.getOptions().dataMode === "server"
          ? messages.searchResults(resultCount(controller))
          : messages.filterResults(
              resultCount(controller),
              controller.getOptions().dataSource?.length ?? 0,
            ),
    });
    controller.setFilter(filter);
  };
}
