import { useCallback, useSyncExternalStore, type RefObject } from "react";
import type { DataGridApi } from "../DataGrid";

/**
 * Shared `useSyncExternalStore` wiring behind every public `use*State` hook
 * in this folder. Not exported — `gridRef.current` is `null` until the grid
 * mounts, so subscribing has to tolerate that, and falls back to `fallback`
 * for the same reason `getSnapshot` has to until then.
 */
export default function useGridSnapshot<Row, T>(
  gridRef: RefObject<DataGridApi<Row> | null>,
  getSnapshot: (api: DataGridApi<Row>) => T,
  fallback: T,
): T {
  const subscribe = useCallback(
    (listener: () => void) => {
      const api = gridRef.current;
      if (api === null) {
        return () => {
          // Nothing was subscribed — `subscribe` itself already handles
          // that below by re-running on every render until the ref mounts.
        };
      }
      return api.subscribe(listener);
    },
    [gridRef],
  );

  return useSyncExternalStore(subscribe, () => {
    const api = gridRef.current;
    return api === null ? fallback : getSnapshot(api);
  });
}
