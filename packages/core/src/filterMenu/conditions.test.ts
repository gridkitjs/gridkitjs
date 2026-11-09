import { describe, expect, test } from "vitest";

import type { ColumnType, FilterState, OperatorFilterEntry } from "../types";
import {
  describeColumnFilter,
  draftToFilter,
  filterEditorReducer,
  initialFilterEditorDraft,
} from "../util/filterEditor";
import type { ConditionRowDraft } from "./conditions";
import { conditionRowsFrom, conditionsFromRows } from "./conditions";
import { defaultFilterOperators } from "./operators";

interface Order {
  Amount: number;
  Region: string;
  Placed: Date;
}

const numberOperators = defaultFilterOperators("number");

function row(
  operator: ConditionRowDraft["operator"],
  text = "",
  textTo = "",
): ConditionRowDraft {
  return { operator, text, textTo };
}

/**
 * `rows` applied the way a simple editor applies them — through a draft's
 * `setConditions` and `draftToFilter` — onto `current`.
 */
function apply(
  rows: readonly ConditionRowDraft[],
  columnId: string,
  type: ColumnType | undefined,
  combinator: "and" | "or",
  current: FilterState<Order> = [],
): FilterState<Order> {
  const { conditions, invalid } = conditionsFromRows<Order>(
    rows,
    columnId,
    type,
  );
  expect(invalid).toEqual([]);
  const draft = filterEditorReducer(
    initialFilterEditorDraft<Order>(describeColumnFilter(current, columnId), {
      options: [],
      total: 0,
      truncated: false,
      blanks: 0,
    }),
    { type: "setConditions", conditions, combinator },
  );
  return draftToFilter(draft, columnId, current);
}

describe("conditionRowsFrom", () => {
  test("no filter: two empty rows at the first operator", () => {
    expect(
      conditionRowsFrom({ kind: "none" }, numberOperators, "number"),
    ).toEqual([row("eq"), row("eq")]);
  });

  test("a checklist or a custom filter opens empty too", () => {
    const empty = [row("contains"), row("contains")];
    const operators = defaultFilterOperators("string");
    expect(
      conditionRowsFrom(
        { kind: "values", values: ["West"], includeBlanks: false },
        operators,
        "string",
      ),
    ).toEqual(empty);
    expect(conditionRowsFrom({ kind: "custom" }, operators, "string")).toEqual(
      empty,
    );
  });

  test("one condition fills the first row, the second stays empty", () => {
    expect(
      conditionRowsFrom(
        {
          kind: "conditions",
          conditions: [
            { kind: "operator", columnId: "Amount", operator: "gt", value: 10 },
          ],
          combinator: "and",
        },
        numberOperators,
        "number",
      ),
    ).toEqual([row("gt", "10"), row("eq")]);
  });

  test("two conditions fill both, between's ends and the blanks included", () => {
    expect(
      conditionRowsFrom(
        {
          kind: "conditions",
          conditions: [
            {
              kind: "operator",
              columnId: "Placed",
              operator: "between",
              value: [new Date(2024, 0, 1), new Date(2024, 0, 31, 18, 0)],
            },
            { kind: "operator", columnId: "Placed", operator: "isEmpty" },
          ],
          combinator: "or",
        },
        defaultFilterOperators("dateTime"),
        "dateTime",
      ),
    ).toEqual([
      row("between", "2024-01-01T00:00", "2024-01-31T18:00"),
      row("isEmpty"),
    ]);
  });

  test("keeps a condition's operator even when the menu doesn't offer it", () => {
    const [first] = conditionRowsFrom(
      {
        kind: "conditions",
        conditions: [
          { kind: "operator", columnId: "Amount", operator: "gte", value: 5 },
        ],
        combinator: "and",
      },
      ["eq"],
      "number",
    );
    expect(first).toEqual(row("gte", "5"));
  });

  test("with no operator offered, only the rows the filter fills", () => {
    expect(conditionRowsFrom({ kind: "none" }, [], "number")).toEqual([]);
    expect(
      conditionRowsFrom(
        {
          kind: "conditions",
          conditions: [
            { kind: "operator", columnId: "Amount", operator: "lt", value: 3 },
          ],
          combinator: "and",
        },
        [],
        "number",
      ),
    ).toEqual([row("lt", "3")]);
  });
});

describe("conditionsFromRows", () => {
  test("reads each row's operand as the column filters it", () => {
    expect(
      conditionsFromRows<Order>(
        [row("gte", "10"), row("lt", "100")],
        "Amount",
        "number",
      ),
    ).toEqual({
      conditions: [
        { kind: "operator", columnId: "Amount", operator: "gte", value: 10 },
        { kind: "operator", columnId: "Amount", operator: "lt", value: 100 },
      ],
      invalid: [],
    });
  });

  test("between takes both ends as a pair", () => {
    expect(
      conditionsFromRows<Order>(
        [row("between", "2024-01-01", "2024-01-31")],
        "Placed",
        "date",
      ).conditions,
    ).toEqual([
      {
        kind: "operator",
        columnId: "Placed",
        operator: "between",
        value: [new Date(2024, 0, 1), new Date(2024, 0, 31)],
      },
    ]);
  });

  test("between missing an end is invalid", () => {
    expect(
      conditionsFromRows<Order>([row("between", "10")], "Amount", "number"),
    ).toEqual({ conditions: [], invalid: [0] });
  });

  test("the blanks operators need no operand", () => {
    expect(
      conditionsFromRows<Order>(
        [row("isEmpty"), row("isNotEmpty")],
        "Region",
        "string",
      ).conditions,
    ).toEqual([
      { kind: "operator", columnId: "Region", operator: "isEmpty" },
      { kind: "operator", columnId: "Region", operator: "isNotEmpty" },
    ]);
  });

  test("a number that doesn't read is invalid, and listed by its row", () => {
    expect(
      conditionsFromRows<Order>(
        [row("gt", "10"), row("lt", "12abc")],
        "Amount",
        "number",
      ),
    ).toEqual({
      conditions: [
        { kind: "operator", columnId: "Amount", operator: "gt", value: 10 },
      ],
      invalid: [1],
    });
  });

  test("an empty second row is dropped, not invalid", () => {
    expect(
      conditionsFromRows<Order>(
        [row("contains", "we"), row("contains"), row("between")],
        "Region",
        "string",
      ),
    ).toEqual({
      conditions: [
        {
          kind: "operator",
          columnId: "Region",
          operator: "contains",
          value: "we",
        },
      ],
      invalid: [],
    });
  });

  test("an empty first row is invalid: clearing is the editor's clear action", () => {
    expect(
      conditionsFromRows<Order>(
        [row("eq"), row("gt", "3")],
        "Amount",
        "number",
      ),
    ).toEqual({
      conditions: [
        { kind: "operator", columnId: "Amount", operator: "gt", value: 3 },
      ],
      invalid: [0],
    });
  });

  test("an operator taking one operand ignores between's leftover upper end", () => {
    expect(
      conditionsFromRows<Order>(
        [row("eq", "", "100"), row("eq", "", "5")],
        "Amount",
        "number",
      ),
    ).toEqual({ conditions: [], invalid: [0] });
  });
});

describe("conditions through the editor and back", () => {
  test("rows applied read back as the same rows", () => {
    const cases: readonly {
      readonly columnId: string;
      readonly type: ColumnType;
      readonly rows: readonly ConditionRowDraft[];
      readonly combinator: "and" | "or";
    }[] = [
      {
        columnId: "Amount",
        type: "number",
        rows: [row("between", "10", "99.5"), row("ne", "50")],
        combinator: "and",
      },
      {
        columnId: "Region",
        type: "string",
        rows: [row("startsWith", "No"), row("isEmpty")],
        combinator: "or",
      },
      {
        columnId: "Placed",
        type: "dateTime",
        rows: [row("gt", "2024-03-01T09:30"), row("lt", "2024-04-01T00:00")],
        combinator: "and",
      },
    ];
    for (const { columnId, type, rows, combinator } of cases) {
      const filter = apply(rows, columnId, type, combinator);
      const shape = describeColumnFilter(filter, columnId);
      expect(shape).toMatchObject({ kind: "conditions", combinator });
      expect(
        conditionRowsFrom(shape, defaultFilterOperators(type), type),
      ).toEqual(rows);
    }
  });

  test("one condition is stored as itself, beside the other columns' entries", () => {
    const other: OperatorFilterEntry<Order> = {
      kind: "operator",
      columnId: "Region",
      operator: "eq",
      value: "West",
    };
    const filter = apply(
      [row("gt", "10"), row("eq")],
      "Amount",
      "number",
      "and",
      [other],
    );
    expect(filter).toEqual([
      other,
      { kind: "operator", columnId: "Amount", operator: "gt", value: 10 },
    ]);
    expect(filter[0]).toBe(other);
  });
});
