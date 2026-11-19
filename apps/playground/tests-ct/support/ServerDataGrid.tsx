import { useEffect, useRef, useState } from "react";
import type { PaginationState } from "@gridkitjs/core";
import {
  DataGrid,
  usePaginationState,
  type DataGridApi,
  type DataGridProps,
} from "@gridkitjs/react";
import {
  answerOrders,
  serverOrderColumns,
  type OrderPage,
  type OrderQuery,
  type ServerOrder,
} from "../../src/demos/serverOrders";

export interface ServerDataGridProps extends Omit<
  DataGridProps<ServerOrder>,
  | "columns"
  | "dataSource"
  | "getRowId"
  | "dataMode"
  | "rowCount"
  | "loading"
  | "ref"
  | "columnSort"
  | "filter"
  | "pagination"
  | "defaultPagination"
> {
  /** Rows on a page to start with. */
  pageSize?: number;
  /** Milliseconds each request takes. Kept short so tests don't wait on it. */
  delay?: number;
  /**
   * Holds every answer until "Answer oldest" or "Answer newest" sends it,
   * in place of answering after `delay`, so a spec decides the order the
   * answers arrive in.
   */
  holdResponses?: boolean;
  /**
   * Holds the sort, filter and page here and passes them back as the
   * controlled props; otherwise the grid holds them and this component
   * follows its callbacks.
   */
  controlled?: boolean;
  /** Leaves `rowCount` out, to see the grid warn. */
  withoutRowCount?: boolean;
  /** The row id "Scroll to row" scrolls to. */
  scrollRowId?: string;
}

/** A request sent, numbered from 1, with the answer the server gives it. */
interface Request {
  readonly id: number;
  readonly answer: OrderPage;
}

/**
 * A grid under `dataMode: "server"` over a pretend server, `answerOrders`,
 * which sorts, filters and pages 95 orders. Like an app, it sends a request
 * whenever the grid reports a new sort, filter or page, sets `loading`
 * while the newest one is in flight, and drops the answer to a request a
 * newer one has replaced. `data-testid="requests"` lists every query sent,
 * as JSON, and `data-testid="hook-pagination"` what `usePaginationState`
 * reads.
 */
export default function ServerDataGrid({
  pageSize = 10,
  delay = 20,
  holdResponses = false,
  controlled = false,
  withoutRowCount = false,
  scrollRowId = "o1",
  ...props
}: ServerDataGridProps) {
  const gridRef = useRef<DataGridApi<ServerOrder>>(null);
  const [query, setQuery] = useState<OrderQuery>(() => ({
    sort: [],
    filter: [],
    page: { pageIndex: 0, pageSize },
  }));
  const [first] = useState<Request>(() => ({
    id: 1,
    answer: answerOrders(query),
  }));
  const [requests, setRequests] = useState<readonly OrderQuery[]>([query]);
  const [held, setHeld] = useState<readonly Request[]>(
    holdResponses ? [first] : [],
  );
  const [shown, setShown] = useState<Request | null>(null);
  /** The newest request's id; an answer to any other is dropped. */
  const latest = useRef(first.id);
  const [selection, setSelection] = useState("");
  const hookPagination = usePaginationState(gridRef);

  useEffect(() => {
    if (holdResponses) return undefined;
    const timer = setTimeout(() => {
      receive(first);
    }, delay);
    return () => {
      clearTimeout(timer);
    };
  }, [first, delay, holdResponses]);

  function receive(request: Request): void {
    if (request.id === latest.current) {
      setShown(request);
    }
  }

  function send(next: OrderQuery): void {
    latest.current += 1;
    const request: Request = { id: latest.current, answer: answerOrders(next) };
    setQuery(next);
    setRequests((current) => [...current, next]);
    if (holdResponses) {
      setHeld((current) => [...current, request]);
      return;
    }
    setTimeout(() => {
      receive(request);
    }, delay);
  }

  /** Sends the held answer at `end` of the queue. */
  function answer(end: "oldest" | "newest"): void {
    const request = end === "oldest" ? held[0] : held.at(-1);
    if (request === undefined) return;
    setHeld((current) => current.filter((entry) => entry !== request));
    receive(request);
  }

  /**
   * The page to fetch with a new sort or filter: the first. An uncontrolled
   * grid has already gone back to it, and reads it out of its state.
   */
  function firstPage(): PaginationState {
    return controlled
      ? { ...query.page, pageIndex: 0 }
      : (gridRef.current?.getState().pagination ?? query.page);
  }

  // Requests are numbered in the order sent, so the newest is the last.
  const loading = shown?.id !== requests.length;

  return (
    <div>
      <DataGrid
        label="Server orders"
        paginated
        {...props}
        ref={gridRef}
        columns={serverOrderColumns}
        dataSource={shown?.answer.rows ?? []}
        getRowId={(row) => row.id}
        dataMode="server"
        {...(!withoutRowCount && { rowCount: shown?.answer.total ?? 0 })}
        loading={loading}
        {...(controlled
          ? {
              columnSort: query.sort,
              filter: query.filter,
              pagination: query.page,
            }
          : { defaultPagination: query.page })}
        onColumnSortChange={(event) => {
          send({ ...query, sort: event.sort, page: firstPage() });
        }}
        onFilterChange={(event) => {
          send({ ...query, filter: event.filter, page: firstPage() });
        }}
        onPaginationChange={(event) => {
          send({ ...query, page: event.pagination });
        }}
      />
      <button
        type="button"
        onClick={() => {
          answer("oldest");
        }}
      >
        Answer oldest
      </button>
      <button
        type="button"
        onClick={() => {
          answer("newest");
        }}
      >
        Answer newest
      </button>
      <button
        type="button"
        onClick={() => {
          gridRef.current?.goToPage(9);
        }}
      >
        Go to page 10
      </button>
      <button
        type="button"
        onClick={() => {
          gridRef.current?.scrollToRow(scrollRowId);
        }}
      >
        Scroll to row
      </button>
      <button
        type="button"
        onClick={() => {
          const api = gridRef.current;
          if (api === null) return;
          setSelection(
            JSON.stringify({
              ids: api.getRowSelection(),
              rows: api.getSelectedRows().map((row) => row.rowId),
            }),
          );
        }}
      >
        Read selection
      </button>
      <output data-testid="selection">{selection}</output>
      <output data-testid="requests">{JSON.stringify(requests)}</output>
      <output data-testid="hook-pagination">
        {JSON.stringify({
          pageIndex: hookPagination.pagination.pageIndex,
          pageCount: hookPagination.pageCount,
        })}
      </output>
    </div>
  );
}
