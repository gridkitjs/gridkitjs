import { useEffect, useState } from "react";
import { DataGrid } from "@gridkitjs/react";
import {
  fetchOrders,
  serverOrderColumns,
  type OrderPage,
  type OrderQuery,
} from "./serverOrders";

/** How long the pretend server takes to answer. */
const LATENCY_MS = 600;

/**
 * `dataMode: "server"` over a pretend server that sorts, filters and pages
 * 95 orders. The grid holds the sort, filter and page and reports each
 * change; this component fetches the page they name, shows `loading` while
 * it is in flight, and drops the answer to a request a newer one replaced.
 */
export function ServerDataGrid() {
  const [query, setQuery] = useState<OrderQuery>({
    sort: [],
    filter: [],
    page: { pageIndex: 0, pageSize: 10 },
  });
  const [answer, setAnswer] = useState<{
    readonly query: OrderQuery;
    readonly page: OrderPage;
  } | null>(null);

  useEffect(() => {
    let current = true;
    void fetchOrders(query, LATENCY_MS).then((page) => {
      if (current) setAnswer({ query, page });
    });
    return () => {
      current = false;
    };
  }, [query]);

  return (
    <DataGrid
      columns={serverOrderColumns}
      dataSource={answer?.page.rows ?? []}
      getRowId={(row) => row.id}
      label="Orders from a server"
      dataMode="server"
      rowCount={answer?.page.total ?? 0}
      loading={answer?.query !== query}
      toolbar
      sortableColumns
      filterableColumns
      paginated
      columnSort={query.sort}
      filter={query.filter}
      pagination={query.page}
      pager={{ variant: "numbered", sizeOptions: [10, 25, 50] }}
      selectable={{ rows: "multiple" }}
      onColumnSortChange={(event) => {
        setQuery((last) => ({
          ...last,
          sort: event.sort,
          page: { ...last.page, pageIndex: 0 },
        }));
      }}
      onFilterChange={(event) => {
        setQuery((last) => ({
          ...last,
          filter: event.filter,
          page: { ...last.page, pageIndex: 0 },
        }));
      }}
      onPaginationChange={(event) => {
        setQuery((last) => ({ ...last, page: event.pagination }));
      }}
    />
  );
}
