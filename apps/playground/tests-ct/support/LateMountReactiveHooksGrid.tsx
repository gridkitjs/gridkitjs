import { useRef, useState } from "react";
import {
  DataGrid,
  usePaginationState,
  type DataGridApi,
  type DataGridProps,
} from "@gridkitjs/react";

interface RowWithId {
  readonly id: string;
}

/**
 * Calls `usePaginationState` on a grid it renders only once "load-grid" is
 * pressed, as an app does once its data has arrived. Nothing else renders
 * this component again, so a page change the readout shows afterwards is the
 * hook's own subscription at work.
 */
export default function LateMountReactiveHooksGrid<Row extends RowWithId>(
  props: Omit<DataGridProps<Row>, "getRowId" | "ref">,
) {
  const gridRef = useRef<DataGridApi<Row>>(null);
  const [loaded, setLoaded] = useState(false);
  const { pagination } = usePaginationState(gridRef);

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          setLoaded(true);
        }}
      >
        load-grid
      </button>
      {loaded && (
        <DataGrid {...props} getRowId={(row) => row.id} ref={gridRef} />
      )}
      <pre data-testid="reactive-status">{JSON.stringify(pagination)}</pre>
    </div>
  );
}
