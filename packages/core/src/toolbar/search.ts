import type { FilterState } from "../types";
import { filterQueryFor, setColumnFilter } from "../util/filtering";

/**
 * What a search box shows for `filter`: the global text entry's query — the
 * one naming no column — without the `%` anchors that make it a "contains"
 * match, or `""` when there is none. A `%` the user typed inside the text
 * stays: only the first and last characters are anchors.
 */
export function searchTextOf<Row>(filter: FilterState<Row>): string {
  const query = filterQueryFor(filter) ?? "";
  const start = query.startsWith("%") ? 1 : 0;
  const end = query.endsWith("%") ? -1 : undefined;
  return query.slice(start, end);
}

/**
 * `filter` with its global text entry set to search for `text` anywhere in
 * any column — the query `%text%` — or removed for an empty `text`. Every
 * entry naming a column stays as it was. `filter` itself, unchanged, when
 * it already searches for `text`.
 *
 * `text` is written as typed, spaces and all: a search box reads its text
 * back from the filter, and trimming here would take a space away from
 * under the caret as the user types it.
 */
export function setSearchText<Row>(
  filter: FilterState<Row>,
  text: string,
): FilterState<Row> {
  return setColumnFilter(filter, undefined, text === "" ? "" : `%${text}%`);
}
