import type { PaginationState, SortDirection } from "../types";

/** A sort or group-by level: a column, and which way it orders. */
interface ColumnEntry {
  readonly columnId: string;
  readonly direction?: SortDirection | undefined;
}

/**
 * The column a whole-stack change is about: the first level whose column or
 * direction differs between the two stacks. `undefined` when they are the
 * same, which is how a setter knows it has nothing to do.
 *
 * A change event names one column because the change it was made for — a
 * header toggle, a drop — touched one. A setter can touch several, and the
 * first is the most useful one to name; the whole stack is in the event.
 */
export function changedEntryColumnId(
  previous: readonly ColumnEntry[],
  next: readonly ColumnEntry[],
): string | undefined {
  const length = Math.max(previous.length, next.length);
  for (let index = 0; index < length; index++) {
    const before = previous[index];
    const after = next[index];
    if (
      before?.columnId !== after?.columnId ||
      before?.direction !== after?.direction
    ) {
      return (after ?? before)?.columnId;
    }
  }
  return undefined;
}

/** Whether two id lists hold the same ids in the same order. */
export function sameIds(
  previous: readonly string[],
  next: readonly string[],
): boolean {
  return (
    previous.length === next.length &&
    previous.every((id, index) => id === next[index])
  );
}

export function samePagination(
  previous: PaginationState,
  next: PaginationState,
): boolean {
  return (
    previous.pageIndex === next.pageIndex && previous.pageSize === next.pageSize
  );
}
