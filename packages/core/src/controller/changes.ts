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

/**
 * The first id whose position differs between two orders — the column a
 * whole-order change names, for the reason `changedEntryColumnId` gives.
 */
export function changedId(
  previous: readonly string[],
  next: readonly string[],
): string | undefined {
  const length = Math.max(previous.length, next.length);
  for (let index = 0; index < length; index++) {
    if (previous[index] !== next[index]) {
      return next[index] ?? previous[index];
    }
  }
  return undefined;
}

/**
 * Every key whose value differs between two keyed states — those `next`
 * sets first, in its order, then those only `previous` had.
 */
export function changedKeys(
  previous: Readonly<Record<string, unknown>>,
  next: Readonly<Record<string, unknown>>,
): readonly string[] {
  const keys = new Set([...Object.keys(next), ...Object.keys(previous)]);
  return [...keys].filter((key) => previous[key] !== next[key]);
}

/** Whether two lists hold the same items in the same order. */
export function sameItems<Item>(
  previous: readonly Item[],
  next: readonly Item[],
): boolean {
  return (
    previous.length === next.length &&
    previous.every((item, index) => item === next[index])
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
