import { useRef } from "react";
import {
  DataGridComponent,
  usePaginationState,
  useSelectionState,
  type DataGridApi,
} from "@gridkitjs/react";

interface Row {
  Id: number;
  Region: string;
  Rep: string;
  Amount: number;
}

const regions = ["North", "South", "East", "West"];
const reps = ["Alex", "Bailey", "Casey", "Drew", "Elliot"];

const rows: Row[] = Array.from({ length: 43 }, (_unused, index) => ({
  Id: index + 1,
  Region: regions[index % regions.length] ?? "North",
  Rep: reps[index % reps.length] ?? "Alex",
  Amount: 100 + ((index * 37) % 900),
}));

/**
 * A toolbar living entirely outside `DataGridComponent`'s own tree, built
 * from `usePaginationState`/`useSelectionState` rather than a `ref` +
 * hand-rolled `on*Change` wiring — it never touches `onPaginationChange` or
 * `onRowSelectionChange`, and stays current anyway, including through the
 * silent page reset a sort change triggers.
 */
function Toolbar({
  gridRef,
}: {
  gridRef: React.RefObject<DataGridApi<Row> | null>;
}) {
  const { pagination, pageCount, previousPage, nextPage } =
    usePaginationState(gridRef);
  const { rowSelection, clearSelection } = useSelectionState(gridRef);

  return (
    <div className="mt-2 flex items-center justify-between rounded border border-gray-300 px-3 py-2 text-sm">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="rounded border border-gray-300 px-2 py-1 disabled:opacity-40"
          disabled={pagination.pageIndex <= 0}
          onClick={previousPage}
        >
          ← Back
        </button>
        <span className="text-gray-600">
          Page {pagination.pageIndex + 1} of {pageCount}
        </span>
        <button
          type="button"
          className="rounded border border-gray-300 px-2 py-1 disabled:opacity-40"
          disabled={pagination.pageIndex >= pageCount - 1}
          onClick={nextPage}
        >
          Forward →
        </button>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-gray-600">
          {rowSelection.length} row(s) selected
        </span>
        <button
          type="button"
          className="rounded border border-gray-300 px-2 py-1 disabled:opacity-40"
          disabled={rowSelection.length === 0}
          onClick={clearSelection}
        >
          Clear
        </button>
      </div>
    </div>
  );
}

/**
 * The toolbar above sits outside `DataGridComponent`'s own DOM entirely —
 * unlike `CustomPagerGrid`'s `pager.template`, which only replaces the
 * built-in pager's own slot, this could just as easily live in a sidebar or
 * a totally different part of the page.
 */
export function ReactiveToolbarGrid() {
  const gridRef = useRef<DataGridApi<Row>>(null);

  return (
    <div>
      <Toolbar gridRef={gridRef} />
      <div className="mt-2">
        <DataGridComponent
          ref={gridRef}
          columns={[
            { field: "Id", width: 80 },
            { field: "Region", width: 120 },
            { field: "Rep", width: 120 },
            { field: "Amount", width: 120, type: "currency" },
          ]}
          dataSource={rows}
          getRowId={(row) => String(row.Id)}
          label="Sales, driven by an external toolbar"
          borders="all"
          sortableColumns
          selectable={{ rows: "multiple" }}
          paginated
          defaultPagination={{ pageIndex: 0, pageSize: 10 }}
          pager={{ template: () => null }}
        />
      </div>
    </div>
  );
}
