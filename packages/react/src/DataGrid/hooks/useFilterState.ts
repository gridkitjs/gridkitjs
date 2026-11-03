import { useCallback, useState, type RefObject } from "react";
import type { FilterState } from "@gridkitjs/core";
import type { DataGridApi } from "../DataGrid";
import useGridSnapshot from "./useGridSnapshot";

export interface FilterStateApi<Row> {
  filter: FilterState<Row>;
  setFilter: (filter: FilterState<Row>) => void;
}

/**
 * Reactive filter state read off a mounted `DataGrid`'s `ref`, for a filter
 * bar or search box living outside the grid's own DOM, which sees every change
 * however it was made — the toolbar's search box included. `setFilter`
 * replaces the whole filter and sends the grid back to its first page.
 *
 * Before the grid mounts, `filter` reads as an empty array and `setFilter`
 * is a no-op.
 */
export default function useFilterState<Row>(
  gridRef: RefObject<DataGridApi<Row> | null>,
): FilterStateApi<Row> {
  // Held per hook rather than as one module constant: a filter is typed by
  // its row, through a predicate's parameter, so one empty array cannot
  // stand in for every `Row`. Either way it must keep its identity.
  const [fallback] = useState<FilterState<Row>>(() => []);
  const filter = useGridSnapshot(
    gridRef,
    useCallback((api: DataGridApi<Row>) => api.getFilter(), []),
    fallback,
  );

  return {
    filter,
    setFilter: (next) => {
      gridRef.current?.setFilter(next);
    },
  };
}
