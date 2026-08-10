import type { DisplayRow, PaginationState } from "../types";

export interface PaginatedRows<Row> {
  readonly rows: readonly DisplayRow<Row>[];
  readonly pageCount: number;
  /**
   * `pagination.pageIndex` clamped into `[0, pageCount - 1]` (or `0` when
   * `pageCount` is `0`) — read this back rather than trusting the input
   * verbatim, the same way `sortRows`/`filterRows` tolerate a stale stored
   * state.
   */
  readonly pageIndex: number;
}

/** A contiguous run of `rows` that pagination treats as one unit — a top-level group's header plus every entry beneath it, or a single bare data row. */
interface Unit {
  readonly start: number;
  readonly end: number; // exclusive
}

/**
 * `rows` split into pagination units: a top-level (`level === 0`) group
 * header together with every entry up to (not including) the next unit
 * boundary, or a single bare data row of its own. A nested group (`level >
 * 0`) and the data rows beneath it contribute no boundary — they're carried
 * along inside their top-level ancestor's span, which is what keeps a page
 * from ever splitting a group. A bare data row *outside* any top-level
 * group's span starts (and immediately ends) its own unit, which is what
 * makes an entirely ungrouped `rows` produce one unit per row rather than
 * collapsing into a single unit for the whole array.
 *
 * `openedByGroup` tracks whether the unit currently being built started at a
 * top-level header (in which case everything until the next one, headers and
 * bare rows alike, belongs to it) or at a bare row (in which case it holds
 * exactly that one row).
 */
function unitsOf<Row>(rows: readonly DisplayRow<Row>[]): readonly Unit[] {
  const units: Unit[] = [];
  let start = 0;
  let openedByGroup = false;
  for (let index = 0; index < rows.length; index++) {
    const entry = rows[index];
    if (entry === undefined) {
      continue;
    }
    const isTopLevelHeader = "kind" in entry && entry.level === 0;
    const isBoundary = index !== start && (isTopLevelHeader || !openedByGroup);
    if (isBoundary) {
      units.push({ start, end: index });
      start = index;
      openedByGroup = isTopLevelHeader;
    } else if (index === start) {
      openedByGroup = isTopLevelHeader;
    }
  }
  if (start < rows.length) {
    units.push({ start, end: rows.length });
  }
  return units;
}

/**
 * `rows` sliced into pages of `pagination.pageSize` units — see `unitsOf`
 * for what a unit is. `pageIndex` is clamped into range, `pageSize <= 0` is
 * clamped to `1` (this codebase's general tolerance for stale/odd stored
 * state, matching `sortRows`/`filterRows`), and the returned page's
 * `rowIndex` is renumbered to be page-relative — 0-based from the top of the
 * page, header rows included, mirroring `groupRows`'s own renumbering
 * invariant. `datasetIndex` is left untouched: it is assigned once, ahead of
 * filter/sort/group/paginate, and reports each row's position in the whole
 * dataset regardless of which page is showing.
 */
export function paginateRows<Row>(
  rows: readonly DisplayRow<Row>[],
  pagination: PaginationState,
): PaginatedRows<Row> {
  const pageSize = Math.max(1, pagination.pageSize);
  const units = unitsOf(rows);
  const pageCount = Math.ceil(units.length / pageSize);

  if (pageCount === 0) {
    return { rows: [], pageCount: 0, pageIndex: 0 };
  }

  const pageIndex = Math.min(Math.max(pagination.pageIndex, 0), pageCount - 1);
  const firstUnit = units[pageIndex * pageSize];
  const lastUnit =
    units[Math.min(pageIndex * pageSize + pageSize, units.length) - 1];
  if (firstUnit === undefined || lastUnit === undefined) {
    return { rows: [], pageCount, pageIndex };
  }

  const page = rows.slice(firstUnit.start, lastUnit.end);
  const renumbered = page.map((entry, index) =>
    entry.rowIndex === index ? entry : { ...entry, rowIndex: index },
  );

  return { rows: renumbered, pageCount, pageIndex };
}
