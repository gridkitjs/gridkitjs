import type { GridMessages } from "../messages";
import type { DataColumn, FilterEntry, FilterState } from "../types";
import type {
  ColumnValueOptions,
  ColumnValueQuery,
} from "../util/filterEditor";
import { columnValueOptions, touchesColumn } from "../util/filterEditor";
import type { FormatLocale } from "../util/format";

/**
 * What a cached list is labelled by: `columnValueOptions`' query without
 * `search` and `limit`, which a draft applies over the whole list.
 */
export type ColumnValueCacheQuery = Pick<
  ColumnValueQuery,
  "locale" | "messages"
>;

/** `columnValueOptions`, remembered per column. */
export interface ColumnValueOptionsCache<Row> {
  /**
   * `columnId`'s whole value list — `columnValueOptions` with no `search`
   * or `limit` — or the very list it returned last time, when nothing the
   * list is counted from or labelled by has changed since.
   */
  readonly get: (
    rows: readonly Row[],
    dataColumns: readonly DataColumn<Row, unknown>[],
    filter: FilterState<Row>,
    columnId: string,
    query?: ColumnValueCacheQuery,
  ) => ColumnValueOptions;
}

/** What every list in a cache is counted from and labelled by. */
interface CacheSource<Row> {
  readonly rows: readonly Row[];
  readonly dataColumns: readonly DataColumn<Row, unknown>[];
  readonly locale: FormatLocale;
  readonly messages: Partial<GridMessages> | undefined;
}

interface CachedList<Row> {
  /** The entries it was counted under: every one not about its column. */
  readonly others: FilterState<Row>;
  readonly values: ColumnValueOptions;
}

function sameSource<Row>(a: CacheSource<Row>, b: CacheSource<Row>): boolean {
  return (
    a.rows === b.rows &&
    a.dataColumns === b.dataColumns &&
    a.locale === b.locale &&
    a.messages === b.messages
  );
}

function sameEntries<Row>(
  a: readonly FilterEntry<Row>[],
  b: readonly FilterEntry<Row>[],
): boolean {
  return a.length === b.length && a.every((entry, index) => entry === b[index]);
}

/**
 * A memo of each column's checklist values, for a renderer to hold one of
 * per grid: reopening a column's checklist hands back the list it was given
 * last time — the same object — rather than counting `rows` again, until
 * something the list depends on changes.
 *
 * That is the `rows` and `dataColumns`, the `locale` and `messages` it is
 * labelled in, and the filter's entries not about the column — all compared
 * by identity, the entries one by one. Identity holds across an apply:
 * `draftToFilter` keeps every entry it doesn't replace as it was, so
 * filtering one column leaves the lists of the others to recount and its
 * own cached, since a column's list never depends on its own entries.
 *
 * Each column keeps its latest list. New rows, columns, locale or messages
 * drop every list, so the cache never holds on to rows the grid has let go
 * of — pass the grid's own, which keep their identity between renders.
 */
export function createColumnValueOptionsCache<
  Row,
>(): ColumnValueOptionsCache<Row> {
  let source: CacheSource<Row> | undefined;
  const lists = new Map<string, CachedList<Row>>();
  return {
    get: (rows, dataColumns, filter, columnId, query = {}) => {
      const { locale, messages } = query;
      const current: CacheSource<Row> = { rows, dataColumns, locale, messages };
      if (source === undefined || !sameSource(source, current)) {
        lists.clear();
        source = current;
      }
      const others = filter.filter((entry) => !touchesColumn(entry, columnId));
      const cached = lists.get(columnId);
      if (cached !== undefined && sameEntries(cached.others, others)) {
        return cached.values;
      }
      const values = columnValueOptions(
        rows,
        dataColumns,
        filter,
        columnId,
        messages === undefined ? { locale } : { locale, messages },
      );
      lists.set(columnId, { others, values });
      return values;
    },
  };
}
