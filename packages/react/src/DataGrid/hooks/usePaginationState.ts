import { useCallback, type RefObject } from "react";
import type { PaginationState } from "@gridkitjs/core";
import type { DataGridApi } from "../DataGrid";
import useGridSnapshot from "./useGridSnapshot";

const FALLBACK_PAGINATION: PaginationState = { pageIndex: 0, pageSize: 0 };

export interface PaginationStateApi {
  pagination: PaginationState;
  pageCount: number;
  goToPage: (pageIndex: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  setPageSize: (pageSize: number) => void;
}

/**
 * Reactive pagination state read off a mounted `DataGridComponent`'s `ref`,
 * for building a pager entirely outside the grid's own DOM — a toolbar or
 * sidebar `pager.template` can't reach. Updates on every pagination change,
 * including the silent page-0 reset a filter/sort/group change triggers,
 * which carries no `onPaginationChange` of its own.
 *
 * Before the grid mounts, `pagination` reads `{ pageIndex: 0, pageSize: 0 }`
 * and `pageCount` reads `0`; the actions are no-ops until then.
 */
export default function usePaginationState<Row>(
  gridRef: RefObject<DataGridApi<Row> | null>,
): PaginationStateApi {
  const pagination = useGridSnapshot(
    gridRef,
    useCallback((api: DataGridApi<Row>) => api.getPagination(), []),
    FALLBACK_PAGINATION,
  );
  const pageCount = useGridSnapshot(
    gridRef,
    useCallback((api: DataGridApi<Row>) => api.getPageCount(), []),
    0,
  );

  return {
    pagination,
    pageCount,
    goToPage: (pageIndex) => {
      gridRef.current?.goToPage(pageIndex);
    },
    nextPage: () => {
      gridRef.current?.nextPage();
    },
    previousPage: () => {
      gridRef.current?.previousPage();
    },
    setPageSize: (pageSize) => {
      gridRef.current?.setPageSize(pageSize);
    },
  };
}
