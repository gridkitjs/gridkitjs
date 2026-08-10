import type { PaginationApi } from "../usePagination";

interface GridPagerProps {
  pager: PaginationApi;
  /** Page sizes offered by the page-size `<select>`. No control renders when omitted or empty. */
  pageSizeOptions: readonly number[] | undefined;
}

/**
 * A minimal, semantically-classed pager: previous/next, a page-index
 * display, and — when `pageSizeOptions` is given — a page-size `<select>`.
 * Rendered as a sibling below the table, not a row inside it, the same
 * reasoning `GroupByBar` gives for its own placement: a control surface, not
 * grid content.
 *
 * Whether this mounts at all is `DataGrid.tsx`'s call (`paginated`), not
 * this component's own.
 */
export default function GridPager({ pager, pageSizeOptions }: GridPagerProps) {
  const { pagination, pageCount } = pager;
  const currentPage = Math.min(pagination.pageIndex + 1, pageCount);

  return (
    <div className="gridkit-grid-pager" role="group" aria-label="Pagination">
      <button
        type="button"
        className="grid-pager-button"
        disabled={pagination.pageIndex <= 0}
        onClick={() => {
          pager.previousPage();
        }}
      >
        Previous
      </button>
      <span className="grid-pager-status">
        Page {pageCount === 0 ? 0 : currentPage} of {pageCount}
      </span>
      <button
        type="button"
        className="grid-pager-button"
        disabled={pagination.pageIndex >= pageCount - 1}
        onClick={() => {
          pager.nextPage();
        }}
      >
        Next
      </button>
      {pageSizeOptions !== undefined && pageSizeOptions.length > 0 && (
        <label className="grid-pager-page-size">
          Rows per page
          <select
            value={pagination.pageSize}
            onChange={(event) => {
              pager.setPageSize(Number(event.target.value));
            }}
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
