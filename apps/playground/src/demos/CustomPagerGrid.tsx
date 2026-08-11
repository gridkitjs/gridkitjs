import { DataGridComponent } from "@gridkitjs/react";

interface Row {
  Id: number;
  Name: string;
  Amount: number;
}

const rows: Row[] = Array.from({ length: 24 }, (_unused, index) => ({
  Id: index + 1,
  Name: `Invoice ${String(index + 1)}`,
  Amount: 50 + ((index * 23) % 400),
}));

/**
 * `pager.template` replaces the built-in pager's markup entirely — this one
 * is deliberately styled nothing like `PaginatedGrid`'s numbered pager, to
 * make the point that the built-in UI is optional.
 */
export function CustomPagerGrid() {
  return (
    <DataGridComponent
      columns={[
        { field: "Id", width: 80 },
        { field: "Name", width: 160 },
        { field: "Amount", width: 120, type: "currency" },
      ]}
      dataSource={rows}
      getRowId={(row) => String(row.Id)}
      label="Invoices, with a fully custom pager"
      borders="all"
      paginated
      defaultPagination={{ pageIndex: 0, pageSize: 5 }}
      pager={{
        template: ({ currentPage, pageCount, previousPage, nextPage }) => (
          <div className="mt-2 flex items-center justify-center gap-3 text-sm">
            <button
              type="button"
              className="rounded-full border border-gray-300 px-3 py-1 disabled:opacity-40"
              disabled={currentPage <= 1}
              onClick={previousPage}
            >
              ← Back
            </button>
            <span className="text-gray-600">
              {currentPage} of {pageCount}
            </span>
            <button
              type="button"
              className="rounded-full border border-gray-300 px-3 py-1 disabled:opacity-40"
              disabled={currentPage >= pageCount}
              onClick={nextPage}
            >
              Forward →
            </button>
          </div>
        ),
      }}
    />
  );
}
