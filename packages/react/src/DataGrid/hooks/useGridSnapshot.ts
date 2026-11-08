import {
  useCallback,
  useEffect,
  useRef,
  useSyncExternalStore,
  type RefObject,
} from "react";
import type { DataGridApi } from "../DataGrid";

/**
 * `useSyncExternalStore`'s listener and the grid it is attached to: none
 * while the ref holds no grid, which can be long after the hook first
 * subscribes, a grid mounted once its data arrives.
 */
type Subscription<Row> =
  | { readonly kind: "waiting"; readonly listener: () => void }
  | {
      readonly kind: "subscribed";
      readonly listener: () => void;
      readonly api: DataGridApi<Row>;
      readonly unsubscribe: () => void;
    };

function subscribeTo<Row>(
  api: DataGridApi<Row> | null,
  listener: () => void,
): Subscription<Row> {
  return api === null
    ? { kind: "waiting", listener }
    : {
        kind: "subscribed",
        listener,
        api,
        unsubscribe: api.subscribe(listener),
      };
}

function unsubscribe<Row>(subscription: Subscription<Row> | null): void {
  if (subscription?.kind === "subscribed") {
    subscription.unsubscribe();
  }
}

/**
 * Shared `useSyncExternalStore` wiring behind every public `use*State` hook
 * in this folder. Not exported. `gridRef.current` is `null` until the grid
 * mounts, and a ref says nothing when it changes, so the grid it holds is
 * read again after every render of the hook's component: the listener moves
 * to a grid the ref has gained, lost or swapped since, and is called, as
 * that grid's state may differ from the last snapshot. Until there is one,
 * the hook returns `fallback`. The ref is `null` on the server and while
 * hydrating too, so `fallback` is the server snapshot.
 */
export default function useGridSnapshot<Row, T>(
  gridRef: RefObject<DataGridApi<Row> | null>,
  getSnapshot: (api: DataGridApi<Row>) => T,
  fallback: T,
): T {
  /** `null` while `useSyncExternalStore` has nothing subscribed. */
  const subscription = useRef<Subscription<Row> | null>(null);

  const subscribe = useCallback(
    (listener: () => void) => {
      subscription.current = subscribeTo(gridRef.current, listener);
      return () => {
        unsubscribe(subscription.current);
        subscription.current = null;
      };
    },
    [gridRef],
  );

  const snapshot = useSyncExternalStore(
    subscribe,
    () => {
      const api = gridRef.current;
      return api === null ? fallback : getSnapshot(api);
    },
    () => fallback,
  );

  // After `useSyncExternalStore`'s own effect, so its listener is held.
  useEffect(() => {
    const current = subscription.current;
    if (current === null) {
      return;
    }
    const api = gridRef.current;
    if (api === (current.kind === "subscribed" ? current.api : null)) {
      return;
    }
    unsubscribe(current);
    subscription.current = subscribeTo(api, current.listener);
    current.listener();
  });

  return snapshot;
}
