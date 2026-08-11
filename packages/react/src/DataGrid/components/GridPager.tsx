import { paginationWindow } from "@gridkitjs/core";
import type { PagerConfig } from "../DataGrid";
import type { PaginationApi } from "../usePagination";

interface GridPagerProps {
  pager: PaginationApi;
  /** Presentation options for the pager. `undefined` renders the `"compact"` default with no page-size control. */
  config: PagerConfig | undefined;
}

/**
 * A minimal, semantically-classed pager: previous/next, a page-index
 * display (or, under `config.variant === "numbered"`, a row of page
 * buttons), and — when `config.sizeOptions` is given — a page-size
 * `<select>`. Rendered as a sibling below the table, not a row inside it,
 * the same reasoning `GroupByBar` gives for its own placement: a control
 * surface, not grid content.
 *
 * Whether this mounts at all is `DataGrid.tsx`'s call (`paginated`), not
 * this component's own.
 */
export default function GridPager({ pager, config }: GridPagerProps) {
  const { pagination, pageCount } = pager;
  const currentPage = Math.min(pagination.pageIndex + 1, pageCount);
  const variant = config?.variant ?? "compact";
  const sizeOptions = config?.sizeOptions;

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
      {variant === "numbered" ? (
        paginationWindow(currentPage, pageCount, {
          boundaryCount: config?.boundaryCount,
          siblingCount: config?.siblingCount,
        }).map((entry, index) =>
          entry === "ellipsis" ? (
            <span
              key={`ellipsis-${String(index)}`}
              className="grid-pager-ellipsis"
              aria-hidden="true"
            >
              …
            </span>
          ) : (
            <button
              key={entry}
              type="button"
              className="grid-pager-button"
              aria-label={`Page ${String(entry)}`}
              aria-current={entry === currentPage ? "page" : undefined}
              onClick={() => {
                pager.goToPage(entry - 1);
              }}
            >
              {entry}
            </button>
          ),
        )
      ) : (
        <span className="grid-pager-status">
          Page {pageCount === 0 ? 0 : currentPage} of {pageCount}
        </span>
      )}
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
      {sizeOptions !== undefined && sizeOptions.length > 0 && (
        <label className="grid-pager-page-size">
          Rows per page
          <select
            value={pagination.pageSize}
            onChange={(event) => {
              pager.setPageSize(Number(event.target.value));
            }}
          >
            {sizeOptions.map((size) => (
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
