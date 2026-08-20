import { useCallback, useRef } from "react";
import {
  DataGridComponent,
  usePaginationState,
  type DataGridApi,
  type DataGridProps,
} from "@gridkitjs/react";

interface RowWithId {
  readonly id: string;
}

/**
 * Mounts `DataGridComponent` alongside a status readout AND action buttons
 * built entirely from the reactive `use*State` hooks, reading and driving
 * through the grid's `ref` from a sibling component outside the grid's own
 * tree — the shape a real toolbar or sidebar built on these hooks would
 * take. Deliberately passes no `on*Change` props at all: the point of these
 * tests is proving the ref-only subscription is sufficient by itself, not
 * secretly relying on a callback prop also being wired up.
 *
 * `getRowId` is wired internally for the same cross-bridge reason
 * `RowIdentifiedGrid` gives.
 */
export default function ReactiveHooksGrid<Row extends RowWithId>(
  props: Omit<DataGridProps<Row>, "getRowId" | "ref">,
) {
  const gridRef = useRef<DataGridApi<Row>>(null);
  const getRowId = useCallback((row: Row) => row.id, []);
  const { pagination, pageCount, goToPage, previousPage, setPageSize } =
    usePaginationState(gridRef);

  return (
    <div>
      <DataGridComponent {...props} getRowId={getRowId} ref={gridRef} />
      <pre data-testid="reactive-status">
        {JSON.stringify({
          pagination,
          pageCount,
        })}
      </pre>
      <button
        type="button"
        onClick={() => {
          goToPage(2);
        }}
      >
        reactive-goto-page-3
      </button>
      <button type="button" onClick={previousPage}>
        reactive-previous-page
      </button>
      <button
        type="button"
        onClick={() => {
          setPageSize(2);
        }}
      >
        reactive-set-page-size-2
      </button>
    </div>
  );
}
