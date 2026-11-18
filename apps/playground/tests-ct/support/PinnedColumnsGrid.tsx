import type { ReactNode } from "react";
import type { AggregateState, ColumnDefinition } from "@gridkitjs/core";
import { DataGrid, type DataGridProps } from "@gridkitjs/react";

export type PinnedRow = { id: string; team: string } & Record<
  `c${number}`,
  number
>;

/** Eight 120px columns: the first two pinned to the start, the last to the end. */
const COLUMN_COUNT = 8;
const PINNED_START = new Set(["c0", "c1"]);
const PINNED_END = new Set(["c7"]);

/**
 * What every unpinned column draws in its header, cells, footer and summary
 * cells: a solid red block, so a screenshot of the pinned columns, scrolled
 * over them, shows any of it that bleeds through as red pixels.
 */
function RedBlock() {
  return (
    <div
      data-red-block=""
      style={{ height: 20, backgroundColor: "rgb(255, 0, 0)" }}
    />
  );
}

const columns: readonly ColumnDefinition<PinnedRow, ReactNode>[] = [
  { field: "team", width: 120, pinned: "start" },
  ...Array.from({ length: COLUMN_COUNT - 1 }, (_, index) => {
    const id = `c${String(index + 1)}`;
    const pinned = PINNED_START.has(id)
      ? ("start" as const)
      : PINNED_END.has(id)
        ? ("end" as const)
        : undefined;
    return pinned === undefined
      ? {
          field: id,
          width: 120,
          headerTemplate: () => <RedBlock />,
          cellTemplate: () => <RedBlock />,
          footerTemplate: () => <RedBlock />,
        }
      : { field: id, width: 120, pinned };
  }),
];

const aggregates: AggregateState<PinnedRow> = Array.from(
  { length: COLUMN_COUNT - 1 },
  (_, index) => ({ columnId: `c${String(index + 1)}`, fn: "sum" as const }),
);

function rowsOf(count: number): PinnedRow[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `r${String(index)}`,
    team: index % 2 === 0 ? "North" : "South",
    ...(Object.fromEntries(
      Array.from({ length: COLUMN_COUNT - 1 }, (_, column) => [
        `c${String(column + 1)}`,
        index + column + 1,
      ]),
    ) as Record<`c${number}`, number>),
  }));
}

/**
 * A grid wider than its container, with columns pinned to both edges, a
 * grand-total footer and red blocks in every unpinned cell. Templates are
 * functions, which a spec cannot pass across Playwright CT's bridge, so they
 * live here; the spec passes everything else.
 */
export default function PinnedColumnsGrid({
  rowCount = 40,
  ...props
}: Omit<
  DataGridProps<PinnedRow>,
  "columns" | "dataSource" | "getRowId" | "aggregates"
> & { readonly rowCount?: number }) {
  return (
    <DataGrid<PinnedRow>
      resizeMode="fixed"
      {...props}
      columns={columns}
      dataSource={rowsOf(rowCount)}
      getRowId={(row) => row.id}
      aggregates={aggregates}
    />
  );
}
