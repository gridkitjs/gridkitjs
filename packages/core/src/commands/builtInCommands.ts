import type { DataColumn, SelectableConfig, SortDirection } from "../types";
import { resolveColumnHeaderText } from "../util/grid";
import { sortDirectionFor } from "../util/sorting";
import type {
  GridCommand,
  GridCommandContext,
  GridCommandTarget,
} from "./types";

/** The id of every command `builtInCommands` returns. */
export type BuiltInCommandId =
  | "sort.ascending"
  | "sort.descending"
  | "sort.clear"
  | "sort.clearAll"
  | "group.add"
  | "group.remove"
  | "group.clearAll"
  | "group.expandAll"
  | "group.collapseAll"
  | "column.hide"
  | "column.autoFit"
  | "column.autoFitAll"
  | "selection.selectAllRows"
  | "selection.clear"
  | "filter.clearAll";

type Area = GridCommandTarget["area"];
type Column<Row> = DataColumn<Row, unknown>;
type Context<Row> = GridCommandContext<Row>;

/**
 * Whether the command was asked for on one of `areas`. Each built-in acts on
 * a column, a row, a group or the whole grid, and is hidden on a target that
 * has none of what it needs — so any id can be listed in any menu unchecked.
 */
function isOn<Row>(context: Context<Row>, areas: readonly Area[]): boolean {
  return areas.includes(context.target.area);
}

/** The target's column, when the target is one of `areas`. */
function columnOn<Row>(
  context: Context<Row>,
  areas: readonly Area[],
): Column<Row> | null {
  return isOn(context, areas) ? context.column : null;
}

function isGroupedBy<Row>(context: Context<Row>, columnId: string): boolean {
  return context.state.groupBy.some((entry) => entry.columnId === columnId);
}

function sortableColumn<Row>(context: Context<Row>): Column<Row> | null {
  const column = columnOn(context, ["header"]);
  return column !== null &&
    (column.column.sortable ?? context.options.sortableColumns ?? false)
    ? column
    : null;
}

/** A header's column that may be grouped by, and is not yet. */
function groupableColumn<Row>(context: Context<Row>): Column<Row> | null {
  const column = columnOn(context, ["header"]);
  return column !== null &&
    (column.column.groupable ?? context.options.groupableColumns ?? false) &&
    !isGroupedBy(context, column.id)
    ? column
    : null;
}

function groupedColumn<Row>(context: Context<Row>): Column<Row> | null {
  const column = columnOn(context, ["header", "group"]);
  return column !== null && isGroupedBy(context, column.id) ? column : null;
}

function hideableColumn<Row>(context: Context<Row>): Column<Row> | null {
  const column = columnOn(context, ["header"]);
  return column !== null && column.column.hideable !== false ? column : null;
}

/**
 * Read off the columns as rendered, where resizability is settled against
 * the grid-level default — and where a hidden column, with no width to fit,
 * is not.
 */
function resizableColumn<Row>(context: Context<Row>): Column<Row> | null {
  const column = columnOn(context, ["header"]);
  if (column === null) {
    return null;
  }
  return (
    context.view.columns.find(
      (entry) => entry.id === column.id && entry.resizable,
    ) ?? null
  );
}

function resizableColumnIds<Row>(context: Context<Row>): readonly string[] {
  return context.view.columns
    .filter((entry) => entry.resizable)
    .map((entry) => entry.id);
}

function isAnythingSelectable(
  selectable: SelectableConfig | undefined,
): boolean {
  return [selectable?.rows, selectable?.columns, selectable?.cells].some(
    (mode) => mode !== undefined && mode !== false,
  );
}

/** The target's column by name, for a label that names it. */
function columnName<Row>(context: Context<Row>): string {
  return context.column === null
    ? ""
    : resolveColumnHeaderText(context.column.column);
}

/** What a built-in acting on one column says about it. */
interface ColumnCommandSpec<Row> {
  readonly id: BuiltInCommandId;
  readonly label: (context: Context<Row>) => string;
  /** The column the command acts on, or `null` where there is none — which hides it. */
  readonly find: (context: Context<Row>) => Column<Row> | null;
  readonly isEnabled?: (column: Column<Row>, context: Context<Row>) => boolean;
  readonly isChecked?: (column: Column<Row>, context: Context<Row>) => boolean;
  readonly execute: (column: Column<Row>, context: Context<Row>) => void;
}

/**
 * A built-in acting on the column `find` picks out. Every predicate and
 * `execute` look it up again rather than trusting an earlier answer, so each
 * holds up on its own when called with a context it was not resolved in.
 */
function columnCommand<Row>({
  id,
  label,
  find,
  isEnabled,
  isChecked,
  execute,
}: ColumnCommandSpec<Row>): GridCommand<Row> {
  function test(
    predicate: (column: Column<Row>, context: Context<Row>) => boolean,
  ) {
    return (context: Context<Row>) => {
      const column = find(context);
      return column !== null && predicate(column, context);
    };
  }
  return {
    id,
    label,
    isVisible: (context) => find(context) !== null,
    isEnabled: isEnabled === undefined ? undefined : test(isEnabled),
    isChecked: isChecked === undefined ? undefined : test(isChecked),
    execute: (context) => {
      const column = find(context);
      if (column !== null) {
        execute(column, context);
      }
    },
  };
}

function sortCommand<Row>(direction: SortDirection): GridCommand<Row> {
  return columnCommand({
    id: direction === "asc" ? "sort.ascending" : "sort.descending",
    label: ({ messages }) =>
      direction === "asc" ? messages.sortAscending : messages.sortDescending,
    find: sortableColumn,
    isChecked: (column, { state }) =>
      sortDirectionFor(state.columnSort, column.id) === direction,
    execute: (column, { actions }) => {
      actions.setColumnSort([{ columnId: column.id, direction }]);
    },
  });
}

/**
 * The grid's own commands, one per action its menus and toolbar offer —
 * sorting, grouping, hiding and fitting columns, selecting and clearing.
 * Labels come from `messages`, so they follow the grid's language.
 *
 * A function rather than a constant so each comes typed for the caller's
 * `Row`; the commands hold no state, and two calls build equal ones.
 */
export function builtInCommands<Row>(): readonly GridCommand<Row>[] {
  return [
    sortCommand("asc"),
    sortCommand("desc"),
    columnCommand({
      id: "sort.clear",
      label: ({ messages }) => messages.clearSort,
      find: sortableColumn,
      isEnabled: (column, { state }) =>
        sortDirectionFor(state.columnSort, column.id) !== null,
      execute: (column, { state, actions }) => {
        actions.setColumnSort(
          state.columnSort.filter((entry) => entry.columnId !== column.id),
        );
      },
    }),
    {
      id: "sort.clearAll",
      label: ({ messages }) => messages.clearAllSorting,
      isVisible: (context) => isOn(context, ["grid", "toolbar", "header"]),
      isEnabled: ({ state }) => state.columnSort.length > 0,
      execute: ({ actions }) => {
        actions.setColumnSort([]);
      },
    },
    columnCommand({
      id: "group.add",
      label: (context) => context.messages.groupByColumn(columnName(context)),
      find: groupableColumn,
      execute: (column, { actions }) => {
        actions.toggleGroupBy(column.id);
      },
    }),
    // Toggled rather than set, so the change reports this column — the one
    // the announcement names — rather than the level that moved up.
    columnCommand({
      id: "group.remove",
      label: (context) => context.messages.removeGroupBy(columnName(context)),
      find: groupedColumn,
      execute: (column, { actions }) => {
        actions.toggleGroupBy(column.id);
      },
    }),
    {
      id: "group.clearAll",
      label: ({ messages }) => messages.ungroupAll,
      isVisible: (context) =>
        isOn(context, ["grid", "toolbar"]) && context.state.groupBy.length > 0,
      execute: ({ actions }) => {
        actions.setGroupBy([]);
      },
    },
    {
      id: "group.expandAll",
      label: ({ messages }) => messages.expandAllGroups,
      isVisible: (context) =>
        isOn(context, ["grid", "toolbar", "group", "cell"]) &&
        context.state.groupBy.length > 0,
      execute: ({ actions }) => {
        actions.expandAllGroups();
      },
    },
    {
      id: "group.collapseAll",
      label: ({ messages }) => messages.collapseAllGroups,
      isVisible: (context) =>
        isOn(context, ["grid", "toolbar", "group", "cell"]) &&
        context.state.groupBy.length > 0,
      execute: ({ actions }) => {
        actions.collapseAllGroups();
      },
    },
    columnCommand({
      id: "column.hide",
      label: ({ messages }) => messages.hideColumn,
      find: hideableColumn,
      // The last column shown stays: a grid with none has no header left to
      // bring one back from.
      isEnabled: (column, { view }) =>
        view.columns.some((entry) => entry.id !== column.id),
      execute: (column, { actions }) => {
        actions.hideColumns([column.id]);
      },
    }),
    columnCommand({
      id: "column.autoFit",
      label: ({ messages }) => messages.autoFitColumn,
      find: resizableColumn,
      execute: (column, { host }) => {
        host.autoFitColumns([column.id]);
      },
    }),
    {
      id: "column.autoFitAll",
      label: ({ messages }) => messages.autoFitAllColumns,
      isVisible: (context) =>
        isOn(context, ["grid", "toolbar", "header"]) &&
        resizableColumnIds(context).length > 0,
      execute: (context) => {
        context.host.autoFitColumns(resizableColumnIds(context));
      },
    },
    {
      id: "selection.selectAllRows",
      label: ({ messages }) => messages.selectAllRows,
      isVisible: (context) =>
        isOn(context, ["grid", "cell"]) &&
        context.options.selectable?.rows === "multiple",
      isEnabled: ({ view }) => view.displayDataRows.length > 0,
      execute: ({ actions }) => {
        actions.selectAllRows();
      },
    },
    {
      id: "selection.clear",
      label: ({ messages }) => messages.clearSelection,
      isVisible: (context) =>
        isOn(context, ["grid", "cell", "header"]) &&
        isAnythingSelectable(context.options.selectable),
      isEnabled: ({ state }) =>
        state.rowSelection.length > 0 ||
        state.columnSelection.length > 0 ||
        state.cellSelection !== null,
      execute: ({ actions }) => {
        actions.clearSelection();
      },
    },
    {
      id: "filter.clearAll",
      label: ({ messages }) => messages.clearFilters,
      isVisible: (context) => isOn(context, ["grid", "toolbar", "header"]),
      isEnabled: ({ state }) => state.filter.length > 0,
      execute: ({ actions }) => {
        actions.setFilter([]);
      },
    },
  ];
}
