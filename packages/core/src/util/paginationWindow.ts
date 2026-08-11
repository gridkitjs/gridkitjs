export type PaginationWindowEntry = number | "ellipsis";

/**
 * Which page numbers a numbered pager should show for `currentPage` of
 * `pageCount`, collapsing any gap wider than one page into a single
 * `"ellipsis"` entry — the boundary + sibling windowing MUI's
 * `usePagination` and antd's `Pagination` both use. Always includes the
 * first/last `boundaryCount` pages and `currentPage`'s `siblingCount`
 * neighbors on each side; a gap of exactly one page is filled in rather than
 * collapsed, since an ellipsis standing in for a single page saves no space.
 */
export function paginationWindow(
  currentPage: number,
  pageCount: number,
  options?: {
    boundaryCount?: number | undefined;
    siblingCount?: number | undefined;
  },
): readonly PaginationWindowEntry[] {
  if (pageCount <= 0) {
    return [];
  }

  const boundaryCount = Math.max(0, options?.boundaryCount ?? 1);
  const siblingCount = Math.max(0, options?.siblingCount ?? 1);
  const current = Math.min(Math.max(currentPage, 1), pageCount);

  const pages = new Set<number>();
  for (let page = 1; page <= Math.min(boundaryCount, pageCount); page++) {
    pages.add(page);
  }
  for (
    let page = Math.max(pageCount - boundaryCount + 1, 1);
    page <= pageCount;
    page++
  ) {
    pages.add(page);
  }
  for (
    let page = Math.max(current - siblingCount, 1);
    page <= Math.min(current + siblingCount, pageCount);
    page++
  ) {
    pages.add(page);
  }

  const sorted = Array.from(pages).sort((a, b) => a - b);
  const entries: PaginationWindowEntry[] = [];
  let previous: number | undefined;
  for (const page of sorted) {
    if (previous !== undefined) {
      if (page - previous === 2) {
        entries.push(previous + 1);
      } else if (page - previous > 2) {
        entries.push("ellipsis");
      }
    }
    entries.push(page);
    previous = page;
  }

  return entries;
}
