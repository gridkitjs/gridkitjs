import type { GridMessages } from "../messages";
import type {
  AggregateResults,
  AggregateSpec,
  AggregateState,
  ColumnDefinition,
  ColumnSizeDefaults,
  DataColumn,
  DisplayRow,
  GridState,
  GridView,
  GroupAggregateDisplay,
  ResolvedGroupRow,
  ResolvedRow,
} from "../types";
import { computeAggregates, withGroupAggregates } from "../util/aggregation";
import {
  formatAggregateValue,
  formatCellValue,
  formatGroupValue,
  type FormatLocale,
} from "../util/format";
import { accessDotted, resolveColumnHeaderText } from "../util/grid";
import { ALL_EXPANDED, groupRows } from "../util/grouping";
import { resolveColumnWidths } from "../util/sizing";
import type {
  ExportCell,
  ExportColumn,
  ExportOptions,
  ExportRow,
  ExportScalar,
  ExportTable,
  ExportTotalRow,
} from "./types";

/**
 * What an export is built from: the grid's view and state as a controller
 * holds them, never the page — so rows virtualised, paged or scrolled out of
 * sight still export. Typed as the few fields it reads, so a
 * `GridCommandContext` is one as it stands.
 */
export interface ExportSource<Row> {
  readonly view: GridView<Row, unknown>;
  readonly state: Pick<
    GridState<Row>,
    "groupBy" | "rowSelection" | "columnSizing"
  >;
  readonly options: {
    readonly locale?: FormatLocale;
    readonly aggregates?: AggregateState<Row> | undefined;
    readonly groupAggregateDisplay?: GroupAggregateDisplay | undefined;
    readonly columnSizeDefaults?: Partial<ColumnSizeDefaults> | undefined;
  };
  readonly messages: Pick<
    GridMessages,
    "booleanTrue" | "booleanFalse" | "blankGroupValue"
  >;
}

/** Everything turning one row into cells reads, settled once per export. */
interface CellContext<Row> {
  readonly columns: readonly DataColumn<Row, unknown>[];
  /** Each column's aggregate specs, in `AggregateState` order. */
  readonly specsByColumn: ReadonlyMap<string, readonly AggregateSpec<Row>[]>;
  readonly display: GroupAggregateDisplay;
  readonly locale: FormatLocale;
  readonly messages: ExportSource<Row>["messages"];
}

const EMPTY_CELL: ExportCell = { value: null, text: "" };

function isDataRow<Row>(entry: DisplayRow<Row>): entry is ResolvedRow<Row> {
  return !("kind" in entry);
}

/**
 * The columns an export holds, in order. An id list is read against every
 * column, hidden ones included, and an id the grid does not have is skipped
 * rather than failing the export. `exportable: false` wins over every
 * selection, even one naming the column.
 */
function pickColumns<Row>(
  view: GridView<Row, unknown>,
  selection: NonNullable<ExportOptions["columns"]>,
): readonly DataColumn<Row, unknown>[] {
  let picked: readonly DataColumn<Row, unknown>[];
  if (selection === "visible") {
    picked = view.columns;
  } else if (selection === "all") {
    picked = view.dataColumns;
  } else {
    const byId = new Map(view.dataColumns.map((entry) => [entry.id, entry]));
    picked = [...new Set(selection)].flatMap((id) => byId.get(id) ?? []);
  }
  return picked.filter((entry) => entry.column.exportable !== false);
}

/**
 * The picked columns as an export describes them. A visible column takes
 * the width and alignment it renders with; a hidden one renders with none,
 * so it is resolved the way it would start out if shown.
 */
function describeColumns<Row>(
  picked: readonly DataColumn<Row, unknown>[],
  source: ExportSource<Row>,
): readonly ExportColumn[] {
  const shown = new Map(source.view.columns.map((entry) => [entry.id, entry]));
  const resolved = resolveColumnWidths(
    picked.map((entry) => entry.column),
    source.state.columnSizing,
    { sizes: source.options.columnSizeDefaults },
  );
  return resolved.map((entry) => {
    const rendered = shown.get(entry.id) ?? entry;
    return {
      id: rendered.id,
      header: resolveColumnHeaderText(rendered.column),
      type: rendered.column.type ?? "string",
      format: rendered.column.format,
      alignment: rendered.alignment,
      width: rendered.width,
    };
  });
}

/** The rows `scope` asks for, ungrouped, in the order the grid sorts them. */
function scopedRows<Row>(
  source: ExportSource<Row>,
  scope: NonNullable<ExportOptions["scope"]>,
): readonly ResolvedRow<Row>[] {
  const { view, state } = source;
  switch (scope) {
    case "all":
      return view.rows;
    case "page":
      return view.displayDataRows;
    case "selection": {
      const selected = new Set(state.rowSelection);
      return view.rows.filter((entry) => selected.has(entry.rowId));
    }
  }
}

/**
 * `value` itself when an export can store it as it is; otherwise the text
 * it reads as, so an object or a function never reaches a writer. A missing
 * value is `null`, the one empty every format has.
 */
function typedValue(value: unknown, text: string): ExportScalar {
  if (value === null || value === undefined) {
    return null;
  }
  return typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value instanceof Date
    ? value
    : text;
}

function dataCell<Row>(
  row: Row,
  column: ColumnDefinition<Row, unknown>,
  context: CellContext<Row>,
): ExportCell {
  const raw = accessDotted(row, column.field);
  const text = formatCellValue(
    raw,
    column,
    context.locale,
    row,
    context.messages,
  );
  return {
    value:
      column.exportValue === undefined
        ? typedValue(raw, text)
        : column.exportValue(raw, row),
    text,
  };
}

/**
 * One column's aggregates as a cell. An empty result is empty text, not the
 * dash the grid shows: a file is read by a program as often as by a person,
 * and to a program a dash is a value. Two specs on one column share the
 * cell comma-separated, as the grid's footer shows them, and the cell's
 * value is then that text, since no one typed value stands for both.
 */
function aggregateCell<Row>(
  results: AggregateResults,
  specs: readonly AggregateSpec<Row>[],
  column: ColumnDefinition<Row, unknown>,
  locale: FormatLocale,
): ExportCell {
  const parts = specs.flatMap((spec) => {
    const value = results.get(spec.id ?? spec.columnId);
    return value === null || value === undefined
      ? []
      : [{ value, text: formatAggregateValue(value, spec, column, locale) }];
  });
  const [only] = parts;
  if (only === undefined) {
    return EMPTY_CELL;
  }
  if (parts.length === 1) {
    return { value: typedValue(only.value, only.text), text: only.text };
  }
  const text = parts.map((part) => part.text).join(", ");
  return { value: text, text };
}

function aggregateCells<Row>(
  results: AggregateResults,
  context: CellContext<Row>,
): readonly ExportCell[] {
  return context.columns.map((entry) => {
    const specs = context.specsByColumn.get(entry.id);
    return specs === undefined
      ? EMPTY_CELL
      : aggregateCell(results, specs, entry.column, context.locale);
  });
}

/**
 * `"Region: West"` — the group header's text, naming the column by its text
 * rather than its header markup.
 */
function groupLabel<Row>(
  entry: ResolvedGroupRow,
  source: ExportSource<Row>,
): string {
  const column = source.view.dataColumns.find(
    (candidate) => candidate.id === entry.columnId,
  )?.column ?? { field: entry.columnId };
  const value = formatGroupValue(
    entry.value,
    column,
    source.options.locale,
    source.messages,
  );
  return `${resolveColumnHeaderText(column)}: ${value}`;
}

function toExportRow<Row>(
  entry: DisplayRow<Row>,
  source: ExportSource<Row>,
  context: CellContext<Row>,
): ExportRow {
  if (isDataRow(entry)) {
    return {
      kind: "data",
      rowId: entry.rowId,
      cells: context.columns.map((column) =>
        dataCell(entry.row, column.column, context),
      ),
    };
  }
  if (entry.kind === "group") {
    return {
      kind: "group",
      level: entry.level,
      groupId: entry.groupId,
      label: groupLabel(entry, source),
      count: entry.count,
      cells:
        context.display === "inline"
          ? aggregateCells(entry.aggregates, context)
          : context.columns.map(() => EMPTY_CELL),
    };
  }
  return {
    kind: "groupSummary",
    level: entry.level,
    cells: aggregateCells(entry.aggregates, context),
  };
}

function specsByColumnOf<Row>(
  specs: AggregateState<Row>,
): ReadonlyMap<string, readonly AggregateSpec<Row>[]> {
  const byColumn = new Map<string, AggregateSpec<Row>[]>();
  for (const spec of specs) {
    const owned = byColumn.get(spec.columnId);
    if (owned === undefined) {
      byColumn.set(spec.columnId, [spec]);
    } else {
      owned.push(spec);
    }
  }
  return byColumn;
}

/**
 * The grid's view as an `ExportTable` — the one model every export format,
 * the clipboard and print are written from, so none of them reads the page
 * and none can disagree with another.
 *
 * By default it holds what the user sees, minus what only hides it: every
 * row the filter, search and sort leave, across every page; the visible
 * columns in their current order, less any with `exportable: false`; and,
 * in a grouped grid, every group expanded whatever its state on screen,
 * with its aggregates where the grid shows them. `options` narrows it.
 *
 * Each cell carries the text `formatCellValue` makes of it, so the export
 * reads as the screen does, and a typed value — the column's `exportValue`,
 * else the raw value when it is a string, number, boolean or `Date`.
 *
 * The groups are rebuilt from the exported rows rather than read off
 * `displayRows`, which omits a collapsed group's rows; so group counts,
 * subtotals and the grand total describe exactly the rows exported — the
 * selection, under `scope: "selection"`, not the whole grid.
 */
export function buildExportTable<Row>(
  source: ExportSource<Row>,
  options: ExportOptions = {},
): ExportTable {
  const { view, state } = source;
  const specs: AggregateState<Row> =
    (options.includeAggregates ?? true)
      ? (source.options.aggregates ?? [])
      : [];
  const columns = pickColumns(view, options.columns ?? "visible");
  const context: CellContext<Row> = {
    columns,
    specsByColumn: specsByColumnOf(specs),
    display: source.options.groupAggregateDisplay ?? "inline",
    locale: source.options.locale,
    messages: source.messages,
  };

  const rows = scopedRows(source, options.scope ?? "all");
  // A collapsed group hides its rows from the screen, not from an export.
  const grouped = groupRows(
    rows,
    state.groupBy,
    ALL_EXPANDED,
    view.dataColumns,
  );
  const displayRows =
    (options.includeGroups ?? true)
      ? withGroupAggregates(
          grouped,
          rows,
          state.groupBy,
          specs,
          view.dataColumns,
          context.display,
        )
      : grouped.filter(isDataRow);

  let footer: ExportTotalRow | null = null;
  if (specs.length > 0) {
    const totals =
      rows === view.rows
        ? view.grandTotal
        : computeAggregates(
            rows.map((entry) => entry.row),
            specs,
            view.dataColumns,
          );
    footer = { kind: "total", cells: aggregateCells(totals, context) };
  }

  return {
    columns: describeColumns(columns, source),
    header: options.includeHeader ?? true,
    rows: displayRows.map((entry) => toExportRow(entry, source, context)),
    footer,
  };
}
