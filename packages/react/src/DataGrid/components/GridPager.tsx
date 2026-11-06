import type { CSSProperties, ReactNode } from "react";
import { paginationWindow, type GridMessages } from "@gridkitjs/core";
import type { PagerConfig, PagerTemplateContext } from "../DataGrid";
import { ariaAttr } from "../ariaAttr";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from "../icons";

interface GridPagerProps {
  /** The same context a `pager.template` is handed. */
  pager: PagerTemplateContext;
  /** Presentation options for the pager. `undefined` renders the `"compact"` default with no page-size control. */
  config: PagerConfig | undefined;
  messages: GridMessages;
}

interface PagerNavButtonProps {
  /** The modifier class beside `grid-pager-button grid-pager-nav`. */
  className: string;
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}

/**
 * One of the bar's four arrow segments: an icon, named by its message.
 *
 * Disabled with `aria-disabled` rather than the `disabled` attribute, the
 * way the toolbar's buttons are: the button that reaches an end is the one
 * that has focus, and a natively disabled button drops it to `<body>`. This
 * one keeps it, announced as unavailable, and pressing it again does nothing
 * rather than paging back the other way, as moving focus onto the opposite
 * arrow would.
 */
function PagerNavButton({
  className,
  label,
  disabled,
  onClick,
  children,
}: PagerNavButtonProps) {
  return (
    <button
      type="button"
      className={`grid-pager-button grid-pager-nav ${className}`}
      aria-label={label}
      title={label}
      {...ariaAttr(disabled, "aria-disabled", true)}
      onClick={() => {
        if (!disabled) onClick();
      }}
    >
      {children}
    </button>
  );
}

/**
 * The built-in pager: one connected bar of first/previous, the page
 * numbers (or, under the default `"compact"` variant, a "Page X of Y"
 * status), and next/last, followed — when `config.sizeOptions` is given —
 * by a page-size `<select>`. Rendered as a sibling below the table, not a
 * row inside it, the same reasoning `GroupByBar` gives for its own
 * placement: a control surface, not grid content.
 *
 * The bar holds still as the user pages through it: `paginationWindow`
 * yields a constant number of slots, and `--gridkit-pager-digits` (the page
 * count's digit count) lets the theme give every number slot the same
 * width; the compact status reserves the width of its widest text.
 *
 * Whether this mounts at all is `DataGrid.tsx`'s call (`paginated`), not
 * this component's own.
 */
export default function GridPager({ pager, config, messages }: GridPagerProps) {
  const { pagination, pageCount, currentPage } = pager;
  const variant = config?.variant ?? "compact";
  const sizeOptions = config?.sizeOptions;
  const atFirst = pagination.pageIndex <= 0;
  const atLast = pagination.pageIndex >= pageCount - 1;
  const barStyle = {
    "--gridkit-pager-digits": String(String(Math.max(1, pageCount)).length),
  } as CSSProperties;

  return (
    <div
      className="gridkit-grid-pager"
      role="group"
      aria-label={messages.pagerLabel}
    >
      <div className="grid-pager-bar" style={barStyle}>
        <PagerNavButton
          className="grid-pager-first"
          label={messages.firstPage}
          disabled={atFirst}
          onClick={() => {
            pager.goToPage(0);
          }}
        >
          <ChevronsLeftIcon />
        </PagerNavButton>
        <PagerNavButton
          className="grid-pager-previous"
          label={messages.previousPage}
          disabled={atFirst}
          onClick={() => {
            pager.previousPage();
          }}
        >
          <ChevronLeftIcon />
        </PagerNavButton>
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
                className="grid-pager-button grid-pager-page"
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
          <span className="grid-pager-status-slot">
            <span className="grid-pager-status">
              {messages.pageStatus(
                pageCount === 0 ? 0 : currentPage,
                pageCount,
              )}
            </span>
            {/* The widest the status gets, invisible, so the slot never resizes as the page changes. */}
            <span className="grid-pager-status-sizer" aria-hidden="true">
              {messages.pageStatus(pageCount, pageCount)}
            </span>
          </span>
        )}
        <PagerNavButton
          className="grid-pager-next"
          label={messages.nextPage}
          disabled={atLast}
          onClick={() => {
            pager.nextPage();
          }}
        >
          <ChevronRightIcon />
        </PagerNavButton>
        <PagerNavButton
          className="grid-pager-last"
          label={messages.lastPage}
          disabled={atLast}
          onClick={() => {
            pager.goToPage(pageCount - 1);
          }}
        >
          <ChevronsRightIcon />
        </PagerNavButton>
      </div>
      {sizeOptions !== undefined && sizeOptions.length > 0 && (
        <label className="grid-pager-page-size">
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
          <span className="grid-pager-page-size-label">
            {messages.pageSizeLabel}
          </span>
        </label>
      )}
    </div>
  );
}
