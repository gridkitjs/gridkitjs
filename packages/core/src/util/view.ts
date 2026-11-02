import type {
  AggregateResults,
  AggregateState,
  ColumnSizeDefaults,
  ColumnSizingState,
  DataColumn,
  DisplayRow,
  GridView,
  GridViewInput,
  PaginationState,
  ResizeMode,
  ResolvedColumn,
  ResolvedRow,
} from "../types";
import { computeAggregates, withGroupAggregates } from "./aggregation";
import { resolveRowId } from "./grid";
import { groupRows } from "./grouping";
import { resolveDataColumns } from "./ordering";
import { paginateRows, type PaginatedRows } from "./paging";
import { resolveShownRows } from "./rows";
import { fitColumnsToWidth, resolveColumnWidths } from "./sizing";

/**
 * A stable empty fallback for omitted `aggregates` — a fresh `[]` per call
 * would change identity each time and defeat every stage memoised on it.
 */
const NO_AGGREGATES: AggregateState<never> = [];

/**
 * `compute`, remembering its last arguments and result: called again with
 * every argument identical (`Object.is`), it hands back that same result
 * rather than recomputing. One slot is all a stage needs — the grid asks for
 * the current view, never an older one — and returning the same reference is
 * what lets each later stage, and a renderer, skip work of its own.
 */
function memoizeLast<Args extends readonly unknown[], Result>(
  compute: (...args: Args) => Result,
): (...args: Args) => Result {
  let last: { readonly args: Args; readonly result: Result } | undefined;
  return (...args) => {
    const previous = last;
    if (
      previous !== undefined &&
      args.every((arg, index) => Object.is(arg, previous.args[index]))
    ) {
      return previous.result;
    }
    const result = compute(...args);
    last = { args, result };
    return result;
  };
}

/**
 * The rows, each carrying the id everything downstream keys it by. Resolved
 * once here rather than per consumer so a row's id cannot come out
 * differently in two places — the same reason widths are resolved once ahead
 * of the header and the body.
 *
 * An array rather than a map keyed by id: two rows given the same id is a
 * caller's mistake, and one that should render twice and look wrong rather
 * than silently lose a row.
 */
function identifyRows<Row>(
  rows: readonly Row[],
  getRowId: ((row: Row, index: number) => string) | undefined,
): readonly ResolvedRow<Row>[] {
  return rows.map((row, rowIndex) => ({
    rowId: resolveRowId(row, rowIndex, getRowId),
    row,
    rowIndex,
    datasetIndex: rowIndex,
  }));
}

/**
 * The columns as rendered. Auto-fit is a derivation rather than a write back
 * into `sizing`, so that a `width` set in a column definition is never
 * overwritten and nothing chases its own output; `"fixed"` is then simply
 * the absence of it.
 *
 * The only stage that reads `sizing` or `viewportWidth`, and nothing reads
 * its output but the renderer: a resize re-runs this and leaves every data
 * stage alone.
 */
function sizeColumns<Row, Node>(
  dataColumns: readonly DataColumn<Row, Node>[],
  sizing: ColumnSizingState,
  sizes: Partial<ColumnSizeDefaults> | undefined,
  resizable: boolean | undefined,
  reorderable: boolean | undefined,
  groupByDraggable: boolean | undefined,
  resizeMode: ResizeMode,
  viewportWidth: number | null,
): readonly ResolvedColumn<Row, Node>[] {
  const widths = resolveColumnWidths(
    dataColumns.map((entry) => entry.column),
    sizing,
    { sizes, resizable, reorderable, groupByDraggable },
  );
  return resizeMode === "fit" && viewportWidth !== null
    ? fitColumnsToWidth(widths, viewportWidth, sizes)
    : widths;
}

/**
 * The grand total: every aggregate over the whole filtered/sorted dataset,
 * ungrouped. Computed from `rows` directly rather than combined from any
 * group's result, for the same reason a nested group's own subtotal is: a
 * non-associative custom aggregate would be wrong if combined from parts.
 */
function totalAggregates<Row>(
  rows: readonly ResolvedRow<Row>[],
  aggregates: AggregateState<Row>,
  dataColumns: readonly DataColumn<Row, unknown>[],
): AggregateResults {
  return computeAggregates(
    rows.map((entry) => entry.row),
    aggregates,
    dataColumns,
  );
}

/**
 * Always last, after grouping and aggregation, so a page never splits a
 * group and a subtotal never changes value depending on which page is
 * showing. Unpaginated, the grid is a single page over every row, and
 * `pageCount`/`pageIndex` report that (`1`/`0`) rather than whatever a
 * stored `pagination` might still carry.
 */
function paginate<Row>(
  displayRows: readonly DisplayRow<Row>[],
  paginated: boolean,
  pagination: PaginationState,
): PaginatedRows<Row> {
  return paginated
    ? paginateRows(displayRows, pagination)
    : { rows: displayRows, pageCount: 1, pageIndex: 0 };
}

/**
 * `pageRows` narrowed back to its data rows, in the same (possibly
 * regrouped, possibly paginated) order — what a range selection anchors
 * against, so that a Shift-click spans the rows adjacent on screen rather
 * than their pre-grouping, pre-pagination order. A collapsed group, or a row
 * on another page, contributes nothing here, so a range spanning its
 * position includes only what was visible when it was drawn.
 *
 * `rows` itself when nothing could have reshaped it, sparing the filter pass
 * on the common ungrouped, unpaginated grid.
 */
function narrowToDataRows<Row>(
  pageRows: readonly DisplayRow<Row>[],
  rows: readonly ResolvedRow<Row>[],
  reshaped: boolean,
): readonly ResolvedRow<Row>[] {
  return reshaped
    ? pageRows.filter((entry): entry is ResolvedRow<Row> => !("kind" in entry))
    : rows;
}

/**
 * `resolveGridView`, memoised per stage: each stage remembers its last
 * inputs and returns its last output when none of them changed identity, so
 * a call that changes one slice of state recomputes only what depends on
 * it. The data stages (filter → sort → group → aggregate → paginate) read
 * `dataColumns`, which carry no width, so a resize or a viewport change
 * leaves `rows`, `displayRows`, `pageRows`, `displayDataRows` and
 * `grandTotal` reference-equal to the previous call's — only `columns` is
 * new. The view object itself is reused when every field is unchanged, so a
 * snapshot-based renderer sees nothing to re-render.
 *
 * Hold one resolver per grid and call it with the current input every time
 * the view is needed; the memo only pays off across calls to the same one.
 */
export function createGridViewResolver<Row, Node = string>(): (
  input: GridViewInput<Row, Node>,
) => GridView<Row, Node> {
  const identify = memoizeLast(identifyRows<Row>);
  const orderColumns = memoizeLast(resolveDataColumns<Row, Node>);
  const size = memoizeLast(sizeColumns<Row, Node>);
  const filterAndSort = memoizeLast(resolveShownRows<Row>);
  const group = memoizeLast(groupRows<Row>);
  const aggregate = memoizeLast(withGroupAggregates<Row>);
  const total = memoizeLast(totalAggregates<Row>);
  const page = memoizeLast(paginate<Row>);
  const narrow = memoizeLast(narrowToDataRows<Row>);
  const assemble = memoizeLast(
    (
      dataColumns: readonly DataColumn<Row, Node>[],
      columns: readonly ResolvedColumn<Row, Node>[],
      rows: readonly ResolvedRow<Row>[],
      displayRows: readonly DisplayRow<Row>[],
      pageRows: readonly DisplayRow<Row>[],
      displayDataRows: readonly ResolvedRow<Row>[],
      pageCount: number,
      pageIndex: number,
      grandTotal: AggregateResults,
    ): GridView<Row, Node> => ({
      dataColumns,
      columns,
      rows,
      displayRows,
      pageRows,
      displayDataRows,
      pageCount,
      pageIndex,
      grandTotal,
    }),
  );

  return ({ rows: data, getRowId, columns: definitions, state, options }) => {
    const paginated = options.paginated ?? false;
    const aggregates =
      options.aggregates ?? (NO_AGGREGATES as AggregateState<Row>);

    const dataColumns = orderColumns(definitions, state.columnOrder);
    const columns = size(
      dataColumns,
      state.columnSizing,
      options.columnSizeDefaults,
      options.resizableColumns,
      options.reorderableColumns,
      options.groupByDraggableColumns,
      options.resizeMode ?? "fit",
      options.viewportWidth ?? null,
    );

    const rows = filterAndSort(
      identify(data, getRowId),
      state.filter,
      state.columnSort,
      dataColumns,
    );
    // `groupRows` and `withGroupAggregates` each hand back their input
    // untouched when there is nothing to do, so an ungrouped grid without
    // aggregates pays only those checks.
    const displayRows = aggregate(
      group(rows, state.groupBy, state.groupExpansion, dataColumns),
      rows,
      state.groupBy,
      aggregates,
      dataColumns,
      options.groupAggregateDisplay ?? "inline",
    );
    const {
      rows: pageRows,
      pageCount,
      pageIndex,
    } = page(displayRows, paginated, state.pagination);

    return assemble(
      dataColumns,
      columns,
      rows,
      displayRows,
      pageRows,
      narrow(pageRows, rows, state.groupBy.length > 0 || paginated),
      pageCount,
      pageIndex,
      total(rows, aggregates, dataColumns),
    );
  };
}

/**
 * What the user is looking at, derived from the rows, the columns, the
 * grid's state and its options in one call: rows filtered → sorted →
 * grouped → aggregated → paginated, and columns ordered → sized. The one
 * function a renderer, an export or a toolbar calls instead of composing the
 * stages itself, so none of them can disagree about what is shown.
 *
 * Unmemoised — a one-off resolver. A renderer that derives the view on every
 * change holds a `createGridViewResolver()` instead.
 */
export function resolveGridView<Row, Node = string>(
  input: GridViewInput<Row, Node>,
): GridView<Row, Node> {
  return createGridViewResolver<Row, Node>()(input);
}
