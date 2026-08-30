import { useState } from "react";
import { DataGridComponent } from "@gridkitjs/react";
import { largeRows, type LargeRow } from "../largeDataset";

const CHUNK_SIZE = 100;

/** Mocks a paged remote fetch: the next chunk of `largeRows`, "delivered" through a promise to stand in for a real request's latency — the same `setTimeout`-wrapped-promise style `LiveMetricsGrid` uses for its own mock feed. */
function fetchNextChunk(loaded: number): Promise<readonly LargeRow[]> {
  const next = largeRows.slice(
    0,
    Math.min(loaded + CHUNK_SIZE, largeRows.length),
  );
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(next);
    }, 500);
  });
}

/**
 * `infiniteScroll` over `largeRows`, paired with `virtualized` — the
 * combination `infinite-scroll.mdx` recommends for a dataset that grows
 * without bound, so the mounted row count stays flat as more of it loads in.
 * Starts with one chunk loaded; scrolling near the bottom fetches the next.
 */
export function InfiniteScrollGrid() {
  const [rows, setRows] = useState<readonly LargeRow[]>(
    largeRows.slice(0, CHUNK_SIZE),
  );
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  function loadMore(): void {
    setIsLoadingMore(true);
    void fetchNextChunk(rows.length).then((next) => {
      setRows(next);
      setIsLoadingMore(false);
    });
  }

  return (
    <DataGridComponent<LargeRow>
      columns={[
        { field: "Id", width: 70 },
        { field: "Name", width: 140 },
        { field: "Region", width: 110 },
        { field: "Status", width: 110 },
        { field: "Amount", width: 120, type: "currency" },
        { field: "Notes", width: 320, wrap: { cells: true } },
      ]}
      dataSource={rows}
      getRowId={(row) => String(row.Id)}
      label={`Infinite scroll, ${String(rows.length)} of ${String(largeRows.length)} loaded`}
      borders="all"
      sortableColumns
      height={420}
      virtualized
      infiniteScroll={{
        hasMore: rows.length < largeRows.length,
        isLoadingMore,
        onLoadMore: loadMore,
      }}
    />
  );
}
