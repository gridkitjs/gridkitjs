import type { ColumnVisibilityState, DataColumn } from "../types";
import type { SelectAllState } from "./filterEditor";
import { resolveColumnHeaderText } from "./grid";
import { isColumnVisible } from "./visibility";

/** What a column chooser is drawn from: every column, the visibility, and the search typed. */
export interface ColumnChooserInput<Row> {
  /** Every column in its current order, hidden ones included — a view's `dataColumns`. */
  readonly columns: readonly DataColumn<Row, unknown>[];
  readonly visibility: ColumnVisibilityState;
  /** Narrows the list to the columns whose header text contains it, ignoring case. */
  readonly search?: string | undefined;
}

/** One column's checkbox in a column chooser. */
export interface ColumnChooserEntry {
  readonly columnId: string;
  /** The column's header text — what the search matches, and the checkbox's label. */
  readonly label: string;
  /** Whether the column is shown — whether its checkbox is checked. */
  readonly visible: boolean;
  /**
   * Whether the checkbox cannot be unchecked: the column is shown and is
   * either not `hideable` or the last column shown. A hidden column can
   * always be shown, `hideable` or not.
   */
  readonly disabled: boolean;
}

/** What toggling a chooser's "Show all" checkbox does: shows these columns, or hides them. */
export interface ColumnChooserToggle {
  readonly visible: boolean;
  readonly columnIds: readonly string[];
}

export interface ColumnChooserModel {
  /** The columns the search matches, in column order. */
  readonly entries: readonly ColumnChooserEntry[];
  /**
   * The "Show all" checkbox's state over the entries whose columns are
   * `hideable` — the ones it acts on. A column the user cannot hide is
   * always on, so counting it would leave "Show all" stuck at mixed.
   */
  readonly selectAll: SelectAllState;
  /** What toggling "Show all" does, or `null` when it can do nothing — a disabled checkbox. */
  readonly toggleAll: ColumnChooserToggle | null;
}

/** A column as the chooser reads it. */
interface ChooserColumn<Row> {
  readonly column: DataColumn<Row, unknown>;
  readonly label: string;
  readonly visible: boolean;
}

function isHideable<Row>(column: DataColumn<Row, unknown>): boolean {
  return column.column.hideable !== false;
}

function matchesSearch(label: string, search: string): boolean {
  return label.toLowerCase().includes(search.toLowerCase());
}

function selectAllStateOf(states: readonly boolean[]): SelectAllState {
  if (states.length > 0 && states.every(Boolean)) {
    return "checked";
  }
  return states.some(Boolean) ? "mixed" : "unchecked";
}

/**
 * A column chooser's list for a search, and what its "Show all" checkbox
 * says and does — the same tri-state over what the search shows that a
 * filter editor's select-all is (`selectAllState`).
 *
 * "Show all" shows every hidden column the search shows once any is hidden,
 * and hides those it shows once none is. It never touches a column that is
 * not `hideable`, and never hides the last column shown: when that is all
 * that would be left, the first of them in column order stays, since a grid
 * with no column shown has no header to bring one back from.
 */
export function resolveColumnChooser<Row>({
  columns,
  visibility,
  search = "",
}: ColumnChooserInput<Row>): ColumnChooserModel {
  const all = columns.map((column): ChooserColumn<Row> => ({
    column,
    label: resolveColumnHeaderText(column.column),
    visible: isColumnVisible(column.column, visibility),
  }));
  const shownCount = all.filter(({ visible }) => visible).length;
  const matched = all.filter(({ label }) => matchesSearch(label, search));

  const entries = matched.map(
    ({ column, label, visible }): ColumnChooserEntry => ({
      columnId: column.id,
      label,
      visible,
      disabled: visible && (!isHideable(column) || shownCount === 1),
    }),
  );

  const covered = matched.filter(({ column }) => isHideable(column));
  const selectAll = selectAllStateOf(covered.map(({ visible }) => visible));
  return {
    entries,
    selectAll,
    toggleAll: toggleAllOf(covered, selectAll, shownCount),
  };
}

function toggleAllOf<Row>(
  covered: readonly ChooserColumn<Row>[],
  selectAll: SelectAllState,
  shownCount: number,
): ColumnChooserToggle | null {
  const show = selectAll !== "checked";
  const changing = covered
    .filter(({ visible }) => visible !== show)
    .map(({ column }) => column.id);
  // Hiding every column shown would leave none: the first of them stays.
  const columnIds =
    !show && changing.length === shownCount ? changing.slice(1) : changing;
  return columnIds.length === 0 ? null : { visible: show, columnIds };
}
