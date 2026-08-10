import type { Dispatch, SetStateAction } from "react";
import {
  paginateRows,
  type DisplayRow,
  type PaginationChangeEvent,
  type PaginationState,
} from "@gridkitjs/core";
import { commitIfChanged } from "./commitIfChanged";

interface UsePaginationOptions<Row> {
  pagination: PaginationState;
  setPagination: Dispatch<SetStateAction<PaginationState>>;
  /** The rows pagination slices — needed to clamp `goToPage`/`setPageSize` against the current `pageCount`. */
  rows: readonly DisplayRow<Row>[];
  onPaginationChange?: ((event: PaginationChangeEvent) => void) | undefined;
}

export interface PaginationApi {
  pagination: PaginationState;
  pageCount: number;
  goToPage: (pageIndex: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  setPageSize: (pageSize: number) => void;
}

/**
 * Turns a page-index or page-size change into the next `PaginationState`,
 * committing through `commitIfChanged` exactly as `useColumnSort` does, so a
 * no-op neither re-renders nor fires `onPaginationChange`.
 *
 * `goToPage`/`setPageSize` route every candidate value back through
 * `paginateRows` itself rather than clamping by hand, so this hook can never
 * drift out of step with the clamping `paginateRows` already does for
 * `DataGrid.tsx`'s own render pass.
 */
export default function usePagination<Row>({
  pagination,
  setPagination,
  rows,
  onPaginationChange,
}: UsePaginationOptions<Row>): PaginationApi {
  const { pageCount, pageIndex } = paginateRows(rows, pagination);

  function commit(next: PaginationState): void {
    commitIfChanged(pagination, next, setPagination, (committed) => {
      const { pageCount: committedPageCount } = paginateRows(rows, committed);
      onPaginationChange?.({
        pagination: committed,
        pageCount: committedPageCount,
      });
    });
  }

  function goToPage(nextPageIndex: number): void {
    const { pageIndex: clamped } = paginateRows(rows, {
      ...pagination,
      pageIndex: nextPageIndex,
    });
    commit({ ...pagination, pageIndex: clamped });
  }

  return {
    pagination,
    pageCount,
    goToPage,
    nextPage: () => {
      goToPage(pageIndex + 1);
    },
    previousPage: () => {
      goToPage(pageIndex - 1);
    },
    setPageSize: (pageSize) => {
      // A page-size change resets to the first page: the current pageIndex
      // was measured against the old size and has no meaningful equivalent
      // under the new one.
      const next = { pageIndex: 0, pageSize };
      const { pageIndex: clamped } = paginateRows(rows, next);
      commit({ ...next, pageIndex: clamped });
    },
  };
}
