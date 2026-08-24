import { useCallback, type RefObject } from "react";
import type { AggregateResults } from "@gridkitjs/core";
import type { DataGridApi } from "../DataGrid";
import useGridSnapshot from "./useGridSnapshot";

const FALLBACK_AGGREGATES: AggregateResults = new Map();

/**
 * Reactive grand-total aggregate results read off a mounted
 * `DataGridComponent`'s `ref`, for a summary footer or bar living outside
 * the grid's own DOM — mirroring the built-in one the grid renders itself.
 *
 * Read-only: `getAggregates` is already read-only on `DataGridApi`, computed
 * over the whole filtered/sorted dataset rather than driven by any action.
 * A specific group's own subtotal is read off `getDisplayRows()`'s
 * per-header `aggregates` field instead — see `useGroupByState`.
 *
 * Before the grid mounts, reads as an empty map.
 */
export default function useAggregateState<Row>(
  gridRef: RefObject<DataGridApi<Row> | null>,
): AggregateResults {
  return useGridSnapshot(
    gridRef,
    useCallback((api: DataGridApi<Row>) => api.getAggregates(), []),
    FALLBACK_AGGREGATES,
  );
}
