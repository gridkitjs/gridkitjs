import { paginationWindow, type GridMessages } from "@gridkitjs/core";
import type { PagerConfig, PagerTemplateContext } from "../DataGrid";

interface GridPagerProps {
  /** The same context a `pager.template` is handed. */
  pager: PagerTemplateContext;
  /** Presentation options for the pager. `undefined` renders the `"compact"` default with no page-size control. */
  config: PagerConfig | undefined;
  messages: GridMessages;
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
export default function GridPager({ pager, config, messages }: GridPagerProps) {
  const { pagination, pageCount, currentPage } = pager;
  const variant = config?.variant ?? "compact";
  const sizeOptions = config?.sizeOptions;

  return (
    <div
      className="gridkit-grid-pager"
      role="group"
      aria-label={messages.pagerLabel}
    >
      <button
        type="button"
        className="grid-pager-button"
        disabled={pagination.pageIndex <= 0}
        onClick={() => {
          pager.previousPage();
        }}
      >
        {messages.previousPage}
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
              aria-label={messages.pageButtonLabel(entry)}
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
          {messages.pageStatus(pageCount === 0 ? 0 : currentPage, pageCount)}
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
        {messages.nextPage}
      </button>
      {sizeOptions !== undefined && sizeOptions.length > 0 && (
        <label className="grid-pager-page-size">
          {messages.pageSizeLabel}
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
