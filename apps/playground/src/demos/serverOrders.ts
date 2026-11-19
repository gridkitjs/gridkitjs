import {
  resolveGridView,
  type ColumnDefinition,
  type ColumnSortState,
  type FilterState,
  type PaginationState,
} from "@gridkitjs/core";

export interface ServerOrder {
  id: string;
  customer: string;
  region: string;
  total: number;
}

/** What the grid's state asks the server for. */
export interface OrderQuery {
  readonly sort: ColumnSortState;
  readonly filter: FilterState<ServerOrder>;
  readonly page: PaginationState;
}

/** One page of the result, and how many rows the whole result holds. */
export interface OrderPage {
  readonly rows: readonly ServerOrder[];
  readonly total: number;
}

export const serverOrderColumns: readonly ColumnDefinition<ServerOrder>[] = [
  { field: "id", header: "Order", width: 100 },
  { field: "customer", header: "Customer", width: 150 },
  { field: "region", header: "Region", width: 110 },
  { field: "total", header: "Total", width: 110, type: "number" },
];

const regions = ["North", "South", "East", "West"];

/** 95 orders: ids `o1` to `o95`, 23 customers, four regions. */
export const serverOrders: readonly ServerOrder[] = Array.from(
  { length: 95 },
  (_unused, index) => ({
    id: `o${String(index + 1)}`,
    customer: `Customer ${String((index % 23) + 1)}`,
    region: regions[index % regions.length] ?? "North",
    total: 10 + ((index * 37) % 990),
  }),
);

/**
 * The server's answer to `query`, worked out with `resolveGridView`, the
 * function the grid itself sorts, filters and pages with, so it agrees with
 * a client grid exactly. `sorted: false` leaves the rows in id order
 * whatever the query's sort, as a server that ignores it would.
 */
export function answerOrders(
  query: OrderQuery,
  { sorted = true }: { readonly sorted?: boolean } = {},
): OrderPage {
  const view = resolveGridView({
    rows: serverOrders,
    getRowId: (row) => row.id,
    columns: serverOrderColumns,
    state: {
      columnSort: sorted ? query.sort : [],
      filter: query.filter,
      pagination: query.page,
    },
    options: { paginated: true },
  });
  return {
    rows: view.displayDataRows.map(({ row }) => row),
    total: view.rows.length,
  };
}

/** `answerOrders`, after `delay` milliseconds of pretend network. */
export function fetchOrders(
  query: OrderQuery,
  delay: number,
): Promise<OrderPage> {
  const page = answerOrders(query);
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(page);
    }, delay);
  });
}
