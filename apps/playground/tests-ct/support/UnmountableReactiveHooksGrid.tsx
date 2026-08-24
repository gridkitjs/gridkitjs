import { useRef, useState } from "react";
import {
  DataGridComponent,
  usePaginationState,
  type DataGridApi,
  type DataGridProps,
} from "@gridkitjs/react";

interface RowWithId {
  readonly id: string;
}

function PaginationReadout({
  gridRef,
}: {
  gridRef: React.RefObject<DataGridApi<RowWithId> | null>;
}) {
  const { pagination } = usePaginationState(gridRef);
  return <pre data-testid="reactive-status">{JSON.stringify(pagination)}</pre>;
}

/**
 * The grid stays mounted throughout; only the hook's own consuming component
 * unmounts, toggled by a plain button. Proves the returned unsubscribe from
 * `DataGridApi.subscribe` actually runs — a grid state change after unmount
 * should not throw trying to call a stale listener, since `useEffect`'s
 * cleanup removes it from `DataGrid`'s own subscriber set first.
 */
export default function UnmountableReactiveHooksGrid<Row extends RowWithId>(
  props: Omit<DataGridProps<Row>, "getRowId" | "ref">,
) {
  const gridRef = useRef<DataGridApi<Row>>(null);
  const [mounted, setMounted] = useState(true);

  return (
    <div>
      <DataGridComponent {...props} getRowId={(row) => row.id} ref={gridRef} />
      {mounted && (
        <PaginationReadout
          gridRef={gridRef as React.RefObject<DataGridApi<RowWithId> | null>}
        />
      )}
      <button
        type="button"
        onClick={() => {
          setMounted(false);
        }}
      >
        unmount-reader
      </button>
    </div>
  );
}
