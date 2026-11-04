import type { ColumnType, FilterOperator } from "../types";
import type { ValueKind } from "../util/filterOperators";
import { kindOf } from "../util/filterOperators";

/**
 * The kind of value a column filters as — what decides which conditions a
 * filter menu offers on it, how their operators read, and what a typed
 * operand must be.
 */
export type FilterOperatorFamily = ValueKind;

/**
 * The family a column of `type` falls in: `"number"` for the numeric
 * types, `"date"` for date, date-time and time, `"boolean"`, and `"text"`
 * for everything else. It is the filter engine's own reading of `type`, so
 * a menu never offers a condition the column would compare differently.
 */
export function filterOperatorFamily(
  type: ColumnType | undefined,
): FilterOperatorFamily {
  return kindOf(type);
}

const familyOperators: Readonly<
  Record<FilterOperatorFamily, readonly FilterOperator[]>
> = {
  text: [
    "contains",
    "notContains",
    "eq",
    "ne",
    "startsWith",
    "endsWith",
    "isEmpty",
    "isNotEmpty",
  ],
  number: [
    "eq",
    "ne",
    "gt",
    "gte",
    "lt",
    "lte",
    "between",
    "isEmpty",
    "isNotEmpty",
  ],
  date: ["eq", "ne", "lt", "gt", "between", "isEmpty", "isNotEmpty"],
  boolean: ["eq", "isEmpty", "isNotEmpty"],
};

/**
 * A date-time or time column's cells are instants, which a typed day or
 * minute seldom equals to the millisecond — so its menu offers before, after
 * and between, not equals.
 */
const instantOperators: readonly FilterOperator[] = [
  "lt",
  "gt",
  "between",
  "isEmpty",
  "isNotEmpty",
];

/**
 * The conditions a filter menu offers on a column of `type`, in the order it
 * lists them, unless the column names its own. Never `in`: a list of values
 * is the checklist's to pick, not a condition's to type.
 */
export function defaultFilterOperators(
  type: ColumnType | undefined,
): readonly FilterOperator[] {
  return type === "dateTime" || type === "time"
    ? instantOperators
    : familyOperators[filterOperatorFamily(type)];
}
