import {
  filterOperatorFamily,
  formatFilterOperand,
  parseFilterOperand,
} from "../filterMenu/operators";
import type { ColumnType } from "../types";
import { isEmptyCell, toDate } from "./filterOperators";

/**
 * What an editor's text reads as on a column: a value to commit, or text
 * the column cannot read, such as `"12abc"` on a number column.
 */
export type CellTextParse =
  | {
      readonly kind: "value";
      readonly value: string | number | boolean | Date | null;
    }
  | { readonly kind: "unreadable" };

const UNREADABLE: CellTextParse = { kind: "unreadable" };

/**
 * The value an editor's `text` stands for on a column of `type`, read the
 * way the filter menu reads a typed operand (`parseFilterOperand`), which is
 * what the built-in editors write:
 *
 * - Text, and a column with no `type`, keeps the text as typed; `""` stays
 *   `""`.
 * - A number reads with a point for decimals; a percent is the fraction
 *   (`"0.25"` for 25%).
 * - A date reads `yyyy-mm-dd` as that local day, and a date-time or time
 *   reads `yyyy-mm-ddThh:mm`, seconds optional, as that local moment.
 * - A boolean reads `"true"` or `"false"`.
 *
 * On every column but text, empty text (spaces included) is `null`, a blank
 * cell, and text that does not read as the column's kind is `unreadable`.
 */
export function parseCellText(
  text: string,
  type: ColumnType | undefined,
): CellTextParse {
  if (filterOperatorFamily(type) === "text") {
    return { kind: "value", value: text };
  }
  if (text.trim() === "") {
    return { kind: "value", value: null };
  }
  const value = parseFilterOperand(text, type);
  return value === undefined ? UNREADABLE : { kind: "value", value };
}

/**
 * `value` as a `Date`, when it is one or a string naming one. A `yyyy-mm-dd`
 * string is that local day, as `parseCellText` reads it, where
 * `new Date("2024-03-01")` reads midnight in UTC, which is the day before
 * west of it.
 */
export function cellDate(value: unknown): Date | undefined {
  if (typeof value === "string") {
    const local = parseFilterOperand(value.trim(), "date");
    if (local instanceof Date) {
      return local;
    }
  }
  return toDate(value);
}

/**
 * The text an editor starts with for `value` on a column of `type`:
 * `parseCellText`'s inverse. A blank value is `""`; a date is `yyyy-mm-dd`
 * on a `"date"` column and `yyyy-mm-ddThh:mm` (seconds when set) on a
 * `"dateTime"` or `"time"` one; anything else is `String(value)`.
 */
export function formatCellEditText(
  value: unknown,
  type: ColumnType | undefined,
): string {
  if (isEmptyCell(value)) {
    return "";
  }
  const date =
    filterOperatorFamily(type) === "date" ? cellDate(value) : undefined;
  return date === undefined ? String(value) : formatFilterOperand(date, type);
}

/**
 * Whether committing `next` over `current` on a column of `type` would
 * change nothing: both blank (`null`, `undefined`, `""`), the same instant
 * on a date column, or the same value by `Object.is`.
 */
export function sameCellValue(
  current: unknown,
  next: unknown,
  type: ColumnType | undefined,
): boolean {
  if (isEmptyCell(current) && isEmptyCell(next)) {
    return true;
  }
  if (filterOperatorFamily(type) === "date") {
    const a = cellDate(current);
    const b = cellDate(next);
    if (a !== undefined && b !== undefined) {
      return a.getTime() === b.getTime();
    }
  }
  return Object.is(current, next);
}
