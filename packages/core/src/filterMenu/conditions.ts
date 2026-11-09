import type { ColumnType, FilterOperator, OperatorFilterEntry } from "../types";
import type { ColumnFilterShape } from "../util/filterEditor";
import { isScalarList } from "../util/filterOperators";
import {
  filterOperandArity,
  formatFilterOperand,
  parseFilterOperand,
} from "./operators";

/**
 * One condition row of a simple filter editor as the user types it: text,
 * not yet a value, so a half-typed number or date stays in its input until
 * the editor is applied and `conditionsFromRows` reads it.
 */
export interface ConditionRowDraft {
  readonly operator: FilterOperator;
  /** The operand as typed — `between`'s lower end. */
  readonly text: string;
  /**
   * `between`'s upper end, as typed. Kept under any other operator, unread,
   * so switching back to `between` finds it still there.
   */
  readonly textTo: string;
}

/** What `conditionsFromRows` reads off an editor's rows. */
export interface ParsedConditionRows<Row> {
  /** A condition for each row that reads as one, in row order. */
  readonly conditions: readonly OperatorFilterEntry<Row>[];
  /**
   * The indexes of the rows that don't, for the editor to mark. Apply the
   * conditions only once this is empty.
   */
  readonly invalid: readonly number[];
}

/** A simple editor's rows: one condition, and an optional second joined to it. */
const ROW_COUNT = 2;

function rowOf<Row>(
  condition: OperatorFilterEntry<Row>,
  type: ColumnType | undefined,
): ConditionRowDraft {
  const { operator, value } = condition;
  if (isScalarList(value)) {
    const [low, high] = value;
    return {
      operator,
      text: formatFilterOperand(low, type),
      textTo: formatFilterOperand(high, type),
    };
  }
  return { operator, text: formatFilterOperand(value, type), textTo: "" };
}

/**
 * The rows a simple editor opens with over a column's filter `shape`, its
 * operands written as the column's `type` reads them: two, holding the
 * column's conditions when its filter is conditions, and each row they
 * don't fill starting at the first of `operators`, empty. With no operator
 * to start one at, only the rows the filter fills.
 */
export function conditionRowsFrom<Row>(
  shape: ColumnFilterShape<Row>,
  operators: readonly FilterOperator[],
  type: ColumnType | undefined,
): readonly ConditionRowDraft[] {
  const filled =
    shape.kind === "conditions"
      ? shape.conditions.map((condition) => rowOf(condition, type))
      : [];
  const [first] = operators;
  if (first === undefined) {
    return filled;
  }
  const blank: ConditionRowDraft = { operator: first, text: "", textTo: "" };
  return Array.from(
    { length: ROW_COUNT },
    (_, index) => filled[index] ?? blank,
  );
}

/** Whether a row was left empty: none of the operands its operator takes is typed. */
function isEmptyRow(row: ConditionRowDraft): boolean {
  switch (filterOperandArity(row.operator)) {
    case 0:
      return false;
    case 1:
      return row.text === "";
    case 2:
      return row.text === "" && row.textTo === "";
  }
}

/** `row` as a condition on `columnId`, or `undefined` when an operand it needs doesn't read. */
function conditionOf<Row>(
  row: ConditionRowDraft,
  columnId: string,
  type: ColumnType | undefined,
): OperatorFilterEntry<Row> | undefined {
  const { operator } = row;
  switch (filterOperandArity(operator)) {
    case 0:
      return { kind: "operator", columnId, operator };
    case 1: {
      const value = parseFilterOperand(row.text, type);
      return value === undefined
        ? undefined
        : { kind: "operator", columnId, operator, value };
    }
    case 2: {
      const low = parseFilterOperand(row.text, type);
      const high = parseFilterOperand(row.textTo, type);
      return low === undefined || high === undefined
        ? undefined
        : { kind: "operator", columnId, operator, value: [low, high] };
    }
  }
}

/**
 * The conditions a simple editor's rows stand for on `columnId`, each
 * operand read as the column's `type` filters (`parseFilterOperand`) — for
 * `filterEditorReducer`'s `setConditions`, with the combinator the editor
 * shows.
 *
 * A row needs every operand its operator takes, or it is `invalid`; the
 * blanks operators take none. A row after the first left empty is dropped
 * rather than invalid, since the second condition is optional; an empty
 * first row is invalid — clearing the filter is the editor's clear action,
 * not an apply with nothing typed.
 */
export function conditionsFromRows<Row>(
  rows: readonly ConditionRowDraft[],
  columnId: string,
  type: ColumnType | undefined,
): ParsedConditionRows<Row> {
  const conditions: OperatorFilterEntry<Row>[] = [];
  const invalid: number[] = [];
  for (const [index, row] of rows.entries()) {
    if (index > 0 && isEmptyRow(row)) {
      continue;
    }
    const condition = conditionOf<Row>(row, columnId, type);
    if (condition === undefined) {
      invalid.push(index);
    } else {
      conditions.push(condition);
    }
  }
  return { conditions, invalid };
}
