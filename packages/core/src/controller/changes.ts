import type {
  FilterEntry,
  FilterState,
  GroupExpansionState,
  OperatorFilterEntry,
  PaginationState,
  SortDirection,
} from "../types";
import { isScalarList } from "../util/filterOperators";

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

/** Whether two expansions have the same mode and the same exceptions in the same order. */
export function sameGroupExpansion(
  previous: GroupExpansionState,
  next: GroupExpansionState,
): boolean {
  return previous.mode === next.mode && sameItems(previous.except, next.except);
}

export function samePagination(
  previous: PaginationState,
  next: PaginationState,
): boolean {
  return (
    previous.pageIndex === next.pageIndex && previous.pageSize === next.pageSize
  );
}

function sameValue(previous: unknown, next: unknown): boolean {
  return previous instanceof Date && next instanceof Date
    ? previous.getTime() === next.getTime()
    : previous === next;
}

/** Whether two operator operands hold the same scalars, a list item by item. */
function sameOperand(
  previous: OperatorFilterEntry<unknown>["value"],
  next: OperatorFilterEntry<unknown>["value"],
): boolean {
  if (isScalarList(previous) || isScalarList(next)) {
    return (
      isScalarList(previous) &&
      isScalarList(next) &&
      previous.length === next.length &&
      previous.every((scalar, index) => sameValue(scalar, next[index]))
    );
  }
  return sameValue(previous, next);
}

function sameEntry<Row>(
  previous: FilterEntry<Row>,
  next: FilterEntry<Row>,
): boolean {
  if ("combinator" in previous || "combinator" in next) {
    return (
      "combinator" in previous &&
      "combinator" in next &&
      previous.combinator === next.combinator &&
      sameFilter(previous.entries, next.entries)
    );
  }
  if (previous.columnId !== next.columnId) {
    return false;
  }
  if ("predicate" in previous || "predicate" in next) {
    return (
      "predicate" in previous &&
      "predicate" in next &&
      previous.predicate === next.predicate
    );
  }
  // Before the `value` check: an operator entry usually has a `value` too.
  if ("operator" in previous || "operator" in next) {
    return (
      "operator" in previous &&
      "operator" in next &&
      previous.operator === next.operator &&
      sameOperand(previous.value, next.value)
    );
  }
  if ("value" in previous || "value" in next) {
    return (
      "value" in previous &&
      "value" in next &&
      sameValue(previous.value, next.value)
    );
  }
  return previous.query === next.query;
}

/**
 * Whether two filters match the same rows by construction: the same entries,
 * in the same order, each asking the same thing — a `Date` value compared by
 * time, a predicate by identity. A filter read back from JSON is equal to the
 * one that was saved, though not one entry is the same object.
 */
export function sameFilter<Row>(
  previous: FilterState<Row>,
  next: FilterState<Row>,
): boolean {
  return (
    previous.length === next.length &&
    previous.every((entry, index) => {
      const other = next[index];
      return other !== undefined && sameEntry(entry, other);
    })
  );
}
