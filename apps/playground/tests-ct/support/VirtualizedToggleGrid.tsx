import { useLayoutEffect, useRef } from "react";
import {
  DataGrid,
  type DataGridApi,
  type DataGridProps,
} from "@gridkitjs/react";

interface RowWithId {
  readonly id: string;
}

export interface VirtualizedToggleGridProps<Row extends RowWithId> extends Omit<
  DataGridProps<Row>,
  "ref" | "getRowId"
> {
  /** The row this component scrolls to, through the grid's `ref`, in the commit that turns `virtualized` on. */
  scrollRowIdOnEnable?: string;
}

/**
 * A grid whose `virtualized` a spec turns on and off with `updateGrid`,
 * which leaves the browser's focus where it was, unlike a toggle button.
 * Its parent layout effect calls `scrollToRow` in the very commit that turns
 * `virtualized` on, as a page that switches it on to reveal a far row would:
 * it runs after the grid's own layout effects in that commit, but before the
 * grid has rendered again.
 *
 * `getRowId` is wired here, for the reason `RowIdentifiedGrid` gives.
 */
export default function VirtualizedToggleGrid<Row extends RowWithId>({
  scrollRowIdOnEnable,
  virtualized = false,
  ...props
}: VirtualizedToggleGridProps<Row>) {
  const gridRef = useRef<DataGridApi<Row>>(null);

  useLayoutEffect(() => {
    if (virtualized && scrollRowIdOnEnable !== undefined) {
      gridRef.current?.scrollToRow(scrollRowIdOnEnable);
    }
  }, [virtualized, scrollRowIdOnEnable]);

  return (
    <DataGrid
      {...props}
      ref={gridRef}
      getRowId={(row) => row.id}
      virtualized={virtualized}
    />
  );
}
