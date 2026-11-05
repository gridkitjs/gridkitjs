export type PaginationWindowEntry = number | "ellipsis";

/**
 * Which page numbers a numbered pager should show for `currentPage` of
 * `pageCount` — the boundary + sibling windowing MUI's `usePagination` uses.
 * Always includes the first/last `boundaryCount` pages and a run of
 * `2 * siblingCount + 1` pages around `currentPage`, slid inwards rather than
 * cut short near either end, with one slot between each boundary and that
 * run holding either the single page it skips or an `"ellipsis"`.
 *
 * So once `pageCount` exceeds `2 * boundaryCount + 2 * siblingCount + 3`,
 * every window is exactly that many entries long, wherever `currentPage`
 * sits: a pager drawing one fixed-width slot per entry keeps its trailing
 * controls in place as the user pages through. Below that, every page shows.
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

  const boundaryCount = Math.max(0, Math.floor(options?.boundaryCount ?? 1));
  const siblingCount = Math.max(0, Math.floor(options?.siblingCount ?? 1));
  const slotCount = 2 * boundaryCount + 2 * siblingCount + 3;

  if (pageCount <= slotCount) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const current = Math.min(Math.max(currentPage, 1), pageCount);
  // The sibling run, slid to stay clear of the slot beside each boundary.
  const runStart = Math.min(
    Math.max(current - siblingCount, boundaryCount + 2),
    pageCount - boundaryCount - 1 - 2 * siblingCount,
  );
  const runEnd = runStart + 2 * siblingCount;

  const entries: PaginationWindowEntry[] = [];
  for (let page = 1; page <= boundaryCount; page++) {
    entries.push(page);
  }
  entries.push(runStart === boundaryCount + 2 ? boundaryCount + 1 : "ellipsis");
  for (let page = runStart; page <= runEnd; page++) {
    entries.push(page);
  }
  entries.push(
    runEnd === pageCount - boundaryCount - 1
      ? pageCount - boundaryCount
      : "ellipsis",
  );
  for (let page = pageCount - boundaryCount + 1; page <= pageCount; page++) {
    entries.push(page);
  }

  return entries;
}
