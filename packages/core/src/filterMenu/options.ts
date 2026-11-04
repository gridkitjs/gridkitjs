import type { GridOptions } from "../options";
import type { ColumnDefinition, FilterOperator } from "../types";
import type { FilterOperatorFamily } from "./operators";
import { defaultFilterOperators, filterOperatorFamily } from "./operators";

/**
 * Which editor a filter menu opens. Both edit the same `FilterState`, so
 * switching between them keeps every filter applied.
 *
 * - `"simple"`: one or two conditions — an operator and a value each —
 *   joined by and/or.
 * - `"excel"`: a search box over a checklist of the column's values, with
 *   the conditions a submenu away.
 */
export type FilterMenuUi = "simple" | "excel";

/** How a grid's filter menus look, unless a column says otherwise. */
export interface GridFilterMenuOptions {
  /** Which editor a filter menu opens. Defaults to `"simple"`. */
  readonly ui?: FilterMenuUi | undefined;
  /** Whether the excel editor's checklist shows how many rows hold each value. Off by default. */
  readonly showCounts?: boolean | undefined;
  /**
   * How many distinct values the excel editor's checklist lists before it
   * asks for a search first. Defaults to `DEFAULT_FILTER_VALUE_LIMIT`.
   */
  readonly valueLimit?: number | undefined;
}

/** A column's own filter menu settings, over the grid's `filterMenu`. */
export interface ColumnFilterMenuOptions {
  /** Which editor this column's filter menu opens, over the grid's `filterMenu.ui`. */
  readonly ui?: FilterMenuUi | undefined;
  /**
   * The operators this column's conditions offer, in order, in place of its
   * type's `defaultFilterOperators`. `in` is dropped — the checklist is its
   * editor — and `[]` offers no condition, leaving the excel editor its
   * checklist alone.
   */
  readonly operators?: readonly FilterOperator[] | undefined;
}

/** One column's filter menu with every setting settled — what a renderer draws. */
export interface ResolvedColumnFilterMenu {
  readonly ui: FilterMenuUi;
  /** The operators its conditions offer, in order. Never `in`. */
  readonly operators: readonly FilterOperator[];
  /** The family the column's `type` falls in, which its operators are labelled by. */
  readonly family: FilterOperatorFamily;
  readonly showCounts: boolean;
  readonly valueLimit: number;
}

/**
 * How many distinct values a checklist lists before asking for a search —
 * Excel's own cap. The list is virtualized, so what this bounds is counting
 * the values, not drawing them.
 */
export const DEFAULT_FILTER_VALUE_LIMIT = 10_000;

/** `operators` without `in`, and itself when it has none, so it keeps its identity. */
function conditionOperators(
  operators: readonly FilterOperator[],
): readonly FilterOperator[] {
  return operators.includes("in")
    ? operators.filter((operator) => operator !== "in")
    : operators;
}

/**
 * The filter menu `column` opens, or `null` when it has none: a column is
 * filterable when its own `filterable` says so, else when the grid's
 * `filterableColumns` does — off unless one of them turns it on, as
 * `sortable` is. The column's `filterMenu` settings win over the grid's
 * one by one; what neither sets takes its default.
 */
export function resolveColumnFilterMenu(
  options: Pick<GridOptions<unknown>, "filterableColumns" | "filterMenu">,
  column: Pick<
    ColumnDefinition<unknown, unknown>,
    "type" | "filterable" | "filterMenu"
  >,
): ResolvedColumnFilterMenu | null {
  if (!(column.filterable ?? options.filterableColumns ?? false)) {
    return null;
  }
  const grid = options.filterMenu;
  const own = column.filterMenu;
  return {
    ui: own?.ui ?? grid?.ui ?? "simple",
    operators: conditionOperators(
      own?.operators ?? defaultFilterOperators(column.type),
    ),
    family: filterOperatorFamily(column.type),
    showCounts: grid?.showCounts ?? false,
    valueLimit: grid?.valueLimit ?? DEFAULT_FILTER_VALUE_LIMIT,
  };
}
