import type {
  DisplayRow,
  PaginationState,
  PaginationUnit,
  ResolvedGroupRow,
} from "../types";

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

export interface PaginateRowsOptions {
  /** What `pageSize` counts — see `PaginationUnit`. Defaults to `"group"`. */
  readonly unit?: PaginationUnit | undefined;
}

/** A contiguous run of `rows` that pagination counts as one entry of `pageSize`. */
interface Unit {
  readonly start: number;
  readonly end: number; // exclusive
  /**
   * The expanded group headers enclosing this unit but lying before it,
   * outermost first — drawn ahead of it when it is the first unit on a page,
   * so a page continuing a group still shows which group it is in.
   */
  readonly headers: readonly ResolvedGroupRow[];
}

const NO_HEADERS: readonly ResolvedGroupRow[] = [];

/**
 * `rows` split into `"group"` pagination units: a top-level (`level === 0`)
 * group header together with every entry up to (not including) the next
 * unit boundary, or a single bare data row of its own. A nested group
 * (`level > 0`) and the data rows beneath it contribute no boundary —
 * they're carried along inside their top-level ancestor's span, which is
 * what keeps a page from ever splitting a group. A bare data row *outside*
 * any top-level group's span starts (and immediately ends) its own unit,
 * which is what makes an entirely ungrouped `rows` produce one unit per row
 * rather than collapsing into a single unit for the whole array.
 *
 * A `"group-summary"` row (`groupAggregateDisplay: "row"`) never opens a
 * boundary of its own, at any level — including a top-level one, despite
 * carrying that same `level: 0` a top-level header does. It always belongs
 * to the unit its own group already opened, the same way a nested header
 * and the data rows beneath it do.
 *
 * `openedByGroup` tracks whether the unit currently being built started at a
 * top-level header (in which case everything until the next one, headers and
 * bare rows alike, belongs to it) or at a bare row (in which case it holds
 * exactly that one row).
 *
 * No unit has enclosing headers: each starts at a top-level header or
 * outside every group.
 */
function groupUnitsOf<Row>(rows: readonly DisplayRow<Row>[]): readonly Unit[] {
  const units: Unit[] = [];
  let start = 0;
  let openedByGroup = false;
  for (let index = 0; index < rows.length; index++) {
    const entry = rows[index];
    if (entry === undefined) {
      continue;
    }
    const isTopLevelHeader =
      "kind" in entry && entry.kind === "group" && entry.level === 0;
    const isBoundary = index !== start && (isTopLevelHeader || !openedByGroup);
    if (isBoundary) {
      units.push({ start, end: index, headers: NO_HEADERS });
      start = index;
      openedByGroup = isTopLevelHeader;
    } else if (index === start) {
      openedByGroup = isTopLevelHeader;
    }
  }
  if (start < rows.length) {
    units.push({ start, end: rows.length, headers: NO_HEADERS });
  }
  return units;
}

/**
 * `rows` split into `"row"` pagination units: one per data row and one per
 * collapsed group header, which stands in for its hidden rows so a
 * collapsed group still takes a place on some page. An expanded header is
 * no unit of its own: it is recorded in the `headers` of every unit beneath
 * it, which puts it on the page holding its first unit and repeats it on
 * every later page its group continues onto.
 *
 * A `"group-summary"` row extends the unit before it. `withGroupAggregates`
 * emits it straight after its group's last visible descendant — a unit, or
 * a nested group's summary already folded into one — so it lands on the
 * page holding its group's last unit.
 *
 * `open` holds the expanded headers enclosing the current position, one per
 * level. Every header at `level` closes the groups at that level and below,
 * so the stack is cut back to its first `level` entries before it is
 * extended; units between two headers share one array.
 */
function rowUnitsOf<Row>(rows: readonly DisplayRow<Row>[]): readonly Unit[] {
  const units: Unit[] = [];
  let open = NO_HEADERS;
  for (let index = 0; index < rows.length; index++) {
    const entry = rows[index];
    if (entry === undefined) {
      continue;
    }
    if (!("kind" in entry)) {
      units.push({ start: index, end: index + 1, headers: open });
    } else if (entry.kind === "group") {
      const ancestors = open.slice(0, entry.level);
      open = entry.expanded ? [...ancestors, entry] : ancestors;
      if (!entry.expanded) {
        units.push({ start: index, end: index + 1, headers: ancestors });
      }
    } else {
      const last = units.at(-1);
      if (last !== undefined) {
        units[units.length - 1] = { ...last, end: index + 1 };
      }
    }
  }
  return units;
}

/**
 * `rows` sliced into pages of `pagination.pageSize` units — see
 * `groupUnitsOf` and `rowUnitsOf` for what a unit is under each
 * `options.unit`. A page opens with its first unit's enclosing headers, so
 * under `"row"` a header repeated from the page before is the same
 * `DisplayRow`, and toggling it toggles its group on every page.
 *
 * `pageIndex` is clamped into range, `pageSize <= 0` is clamped to `1`
 * (this codebase's general tolerance for stale/odd stored state, matching
 * `sortRows`/`filterRows`), and the returned page's `rowIndex` is renumbered
 * to be page-relative — 0-based from the top of the page, header rows
 * included, mirroring `groupRows`'s own renumbering invariant.
 * `datasetIndex` is left untouched: the stages ahead of this one set it to
 * each row's position in the whole displayed result, which stays the same
 * whichever page is showing.
 */
export function paginateRows<Row>(
  rows: readonly DisplayRow<Row>[],
  pagination: PaginationState,
  options: PaginateRowsOptions = {},
): PaginatedRows<Row> {
  const pageSize = Math.max(1, pagination.pageSize);
  const units = options.unit === "row" ? rowUnitsOf(rows) : groupUnitsOf(rows);
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

  const page: readonly DisplayRow<Row>[] = [
    ...firstUnit.headers,
    ...rows.slice(firstUnit.start, lastUnit.end),
  ];
  const renumbered = page.map((entry, index) =>
    entry.rowIndex === index ? entry : { ...entry, rowIndex: index },
  );

  return { rows: renumbered, pageCount, pageIndex };
}
