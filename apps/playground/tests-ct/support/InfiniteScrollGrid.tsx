import { useState } from "react";
import { DataGridComponent, type DataGridProps } from "@gridkitjs/react";

interface RowWithId {
  readonly id: string;
}

export interface InfiniteScrollGridProps<Row extends RowWithId> extends Omit<
  DataGridProps<Row>,
  "getRowId" | "dataSource" | "infiniteScroll"
> {
  /** The full, "remote" dataset — `dataSource` starts at its first `chunkSize` rows and grows by one chunk per `onLoadMore` call. */
  allRows: readonly Row[];
  chunkSize: number;
  /** Simulated request latency for each `onLoadMore`, in ms. Kept short by default so tests don't wait on it. */
  delay?: number;
  rootMargin?: string;
}

/**
 * A minimal "remote" data source for exercising `infiniteScroll`: starts
 * with one chunk of `allRows` loaded and appends the next chunk after a
 * `setTimeout`-delayed promise on every `onLoadMore` call — `onLoadMore`
 * itself is defined here rather than passed in from a spec, the same
 * cross-process bridge limitation `ImperativeApiGrid` and `RowIdentifiedGrid`
 * already document for other function props. `data-testid="load-count"`
 * reports how many loads have completed, since a spec can't spy on the
 * callback directly either.
 */
export default function InfiniteScrollGrid<Row extends RowWithId>({
  allRows,
  chunkSize,
  delay = 20,
  rootMargin,
  ...props
}: InfiniteScrollGridProps<Row>) {
  const [loaded, setLoaded] = useState(chunkSize);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadCount, setLoadCount] = useState(0);

  function onLoadMore(): void {
    setIsLoadingMore(true);
    setTimeout(() => {
      setLoaded((current) => Math.min(current + chunkSize, allRows.length));
      setIsLoadingMore(false);
      setLoadCount((count) => count + 1);
    }, delay);
  }

  return (
    <div>
      <DataGridComponent
        {...props}
        dataSource={allRows.slice(0, loaded)}
        getRowId={(row) => row.id}
        infiniteScroll={{
          hasMore: loaded < allRows.length,
          isLoadingMore,
          onLoadMore,
          rootMargin,
        }}
      />
      <output data-testid="load-count">{loadCount}</output>
    </div>
  );
}
