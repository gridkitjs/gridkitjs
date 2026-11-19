import { useRef, useState } from "react";
import type { ColumnSortState, FilterState } from "@gridkitjs/core";
import { DataGrid, type DataGridProps } from "@gridkitjs/react";
import {
  answerOrders,
  serverOrderColumns,
  type ServerOrder,
} from "../../src/demos/serverOrders";

export interface ServerInfiniteGridProps extends Omit<
  DataGridProps<ServerOrder>,
  | "columns"
  | "dataSource"
  | "getRowId"
  | "dataMode"
  | "rowCount"
  | "infiniteScroll"
  | "paginated"
> {
  /** Rows each load appends. */
  chunkSize?: number;
  /** Milliseconds each load takes. Kept short so tests don't wait on it. */
  delay?: number;
  /** Whether the server sorts; `false` answers in id order whatever the sort. */
  serverSorts?: boolean;
}

/**
 * Infinite scroll under `dataMode: "server"`, over the same pretend server
 * as `ServerDataGrid`: each `onLoadMore` fetches the next chunk of the
 * current sort and filter and appends it, and a new sort or filter starts
 * the list again. An answer to a load made before the list started again
 * is dropped. `data-testid="load-count"` counts the chunks appended.
 */
export default function ServerInfiniteGrid({
  chunkSize = 20,
  delay = 20,
  serverSorts = true,
  ...props
}: ServerInfiniteGridProps) {
  const [sort, setSort] = useState<ColumnSortState>([]);
  const [filter, setFilter] = useState<FilterState<ServerOrder>>([]);
  const [rows, setRows] = useState<readonly ServerOrder[]>([]);
  const [total, setTotal] = useState<number | undefined>(undefined);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadCount, setLoadCount] = useState(0);
  /** Bumped as the list starts again, so a load from before is dropped. */
  const generation = useRef(0);

  function onLoadMore(): void {
    const asked = generation.current;
    const answer = answerOrders(
      {
        sort,
        filter,
        page: { pageIndex: rows.length / chunkSize, pageSize: chunkSize },
      },
      { sorted: serverSorts },
    );
    setIsLoadingMore(true);
    setTimeout(() => {
      if (asked !== generation.current) return;
      setRows((current) => [...current, ...answer.rows]);
      setTotal(answer.total);
      setLoadCount((count) => count + 1);
      setIsLoadingMore(false);
    }, delay);
  }

  function startOver(): void {
    generation.current += 1;
    setRows([]);
    setTotal(undefined);
    setIsLoadingMore(false);
  }

  return (
    <div>
      <DataGrid
        label="Server orders, scrolling"
        {...props}
        columns={serverOrderColumns}
        dataSource={rows}
        getRowId={(row) => row.id}
        dataMode="server"
        {...(total !== undefined && { rowCount: total })}
        onColumnSortChange={(event) => {
          setSort(event.sort);
          startOver();
        }}
        onFilterChange={(event) => {
          setFilter(event.filter);
          startOver();
        }}
        infiniteScroll={{
          hasMore: total === undefined || rows.length < total,
          isLoadingMore,
          onLoadMore,
        }}
      />
      <output data-testid="load-count">{loadCount}</output>
    </div>
  );
}
