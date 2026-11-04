import { describe, expect, test } from "vitest";

import { createGridController } from "../controller/createGridController";
import type { GridMessages } from "../messages";
import type {
  ColumnDefinition,
  DataColumn,
  FilterState,
  OperatorFilterEntry,
} from "../types";
import type { FilterEditorDraft } from "./filterEditor";
import { serializeGridState } from "./serialize";
import {
  columnValueOptions,
  describeColumnFilter,
  draftToFilter,
  filterEditorReducer,
  initialFilterEditorDraft,
  isColumnFiltered,
  selectAllState,
  visibleFilterOptions,
} from "./filterEditor";

interface SampleRow {
  Id: number;
  Region: string | null;
  Amount: number;
  Opened: Date;
  Tags: readonly string[];
}

const rows: readonly SampleRow[] = [
  {
    Id: 1,
    Region: "West",
    Amount: 10,
    Opened: new Date("2024-03-01"),
    Tags: ["a"],
  },
  {
    Id: 2,
    Region: "East",
    Amount: 2,
    Opened: new Date("2024-01-01"),
    Tags: [],
  },
  {
    Id: 3,
    Region: "West",
    Amount: 30,
    Opened: new Date("2024-02-01"),
    Tags: [],
  },
  {
    Id: 4,
    Region: null,
    Amount: 10,
    Opened: new Date("2024-01-01"),
    Tags: [],
  },
  { Id: 5, Region: "", Amount: 2, Opened: new Date("2024-03-01"), Tags: [] },
  {
    Id: 6,
    Region: "north",
    Amount: 30,
    Opened: new Date("2024-02-01"),
    Tags: [],
  },
];

function dataColumn(
  column: ColumnDefinition<SampleRow, unknown>,
): DataColumn<SampleRow, unknown> {
  return { id: column.field, column };
}

const dataColumns: readonly DataColumn<SampleRow, unknown>[] = [
  dataColumn({ field: "Id", type: "number" }),
  dataColumn({ field: "Region" }),
  dataColumn({
    field: "Amount",
    type: "number",
    valueFormatter: (value) => `$${String(value)}`,
  }),
  dataColumn({ field: "Opened", type: "date" }),
  dataColumn({ field: "Tags" }),
];

const regionIn = (
  values: readonly string[],
): OperatorFilterEntry<SampleRow> => ({
  columnId: "Region",
  operator: "in",
  value: values,
});
const regionBlank: OperatorFilterEntry<SampleRow> = {
  columnId: "Region",
  operator: "isEmpty",
};
const amountAbove: OperatorFilterEntry<SampleRow> = {
  columnId: "Amount",
  operator: "gt",
  value: 5,
};
const amountBelow: OperatorFilterEntry<SampleRow> = {
  columnId: "Amount",
  operator: "lt",
  value: 25,
};

describe("describeColumnFilter", () => {
  test("none: nothing about the column, entries on others and global ones aside", () => {
    expect(describeColumnFilter([], "Region")).toEqual({ kind: "none" });
    expect(
      describeColumnFilter<SampleRow>(
        [amountAbove, { query: "%west%" }],
        "Region",
      ),
    ).toEqual({ kind: "none" });
  });

  test("values: a lone in entry", () => {
    expect(
      describeColumnFilter([amountAbove, regionIn(["West"])], "Region"),
    ).toEqual({ kind: "values", values: ["West"], includeBlanks: false });
  });

  test("values: an in entry OR-grouped with isEmpty, either way round", () => {
    const expected = {
      kind: "values",
      values: ["West"],
      includeBlanks: true,
    };

    expect(
      describeColumnFilter<SampleRow>(
        [{ combinator: "or", entries: [regionIn(["West"]), regionBlank] }],
        "Region",
      ),
    ).toEqual(expected);
    expect(
      describeColumnFilter<SampleRow>(
        [{ combinator: "or", entries: [regionBlank, regionIn(["West"])] }],
        "Region",
      ),
    ).toEqual(expected);
  });

  test("conditions: one or two top-level operator entries, ANDed", () => {
    expect(describeColumnFilter([amountAbove], "Amount")).toEqual({
      kind: "conditions",
      conditions: [amountAbove],
      combinator: "and",
    });
    expect(
      describeColumnFilter([amountAbove, regionBlank, amountBelow], "Amount"),
    ).toEqual({
      kind: "conditions",
      conditions: [amountAbove, amountBelow],
      combinator: "and",
    });
  });

  test("conditions: one group with its combinator", () => {
    expect(
      describeColumnFilter<SampleRow>(
        [{ combinator: "or", entries: [amountAbove, amountBelow] }],
        "Amount",
      ),
    ).toEqual({
      kind: "conditions",
      conditions: [amountAbove, amountBelow],
      combinator: "or",
    });
  });

  test("conditions: isEmpty alone is a condition, not a checklist", () => {
    expect(describeColumnFilter([regionBlank], "Region")).toEqual({
      kind: "conditions",
      conditions: [regionBlank],
      combinator: "and",
    });
  });

  test.each<[string, string, FilterState<SampleRow>]>([
    ["a text query", "Region", [{ columnId: "Region", query: "West" }]],
    ["a predicate", "Region", [{ columnId: "Region", predicate: () => true }]],
    [
      "an in entry beside another entry",
      "Region",
      [regionIn(["West"]), regionBlank],
    ],
    [
      "an in entry AND-grouped with isEmpty",
      "Region",
      [{ combinator: "and", entries: [regionIn(["West"]), regionBlank] }],
    ],
    [
      "an in entry whose value isn't a list",
      "Region",
      [{ columnId: "Region", operator: "in", value: "West" }],
    ],
    ["three conditions", "Amount", [amountAbove, amountBelow, amountAbove]],
    [
      "a group spanning two columns",
      "Region",
      [{ combinator: "or", entries: [amountAbove, regionBlank] }],
    ],
    [
      "a group beside a top-level entry",
      "Amount",
      [amountAbove, { combinator: "or", entries: [amountBelow] }],
    ],
  ])("custom: %s", (_name, columnId, filter) => {
    expect(describeColumnFilter(filter, columnId)).toEqual({ kind: "custom" });
  });
});

describe("columnValueOptions", () => {
  test("lists each distinct value once, with its count and label, blanks apart", () => {
    expect(columnValueOptions(rows, dataColumns, [], "Amount")).toEqual({
      options: [
        { value: 2, label: "$2", count: 2 },
        { value: 10, label: "$10", count: 2 },
        { value: 30, label: "$30", count: 2 },
      ],
      total: 3,
      truncated: false,
      blanks: 0,
      columnType: "number",
    });
    expect(columnValueOptions(rows, dataColumns, [], "Region")).toMatchObject({
      options: [
        { value: "East", count: 1 },
        { value: "north", count: 1 },
        { value: "West", count: 2 },
      ],
      blanks: 2,
    });
  });

  test("sorts as the column sorts: numbers numerically, dates chronologically", () => {
    const values = (columnId: string) =>
      columnValueOptions(rows, dataColumns, [], columnId).options.map(
        (option) => option.value,
      );

    expect(values("Amount")).toEqual([2, 10, 30]);
    expect(values("Opened")).toEqual([
      new Date("2024-01-01"),
      new Date("2024-02-01"),
      new Date("2024-03-01"),
    ]);
  });

  test("cascades: counts only rows the other columns' filters keep", () => {
    const filter: FilterState<SampleRow> = [
      amountAbove,
      regionIn(["West"]),
      { predicate: (_value, row) => row.Id !== 3 },
    ];

    expect(columnValueOptions(rows, dataColumns, filter, "Region")).toEqual({
      options: [
        { value: "north", label: "north", count: 1 },
        { value: "West", label: "West", count: 1 },
      ],
      total: 2,
      truncated: false,
      blanks: 1,
    });
    expect(
      columnValueOptions(rows, dataColumns, filter, "Amount").options,
    ).toEqual([{ value: 10, label: "$10", count: 1 }]);
  });

  test("ignores a group touching the column, the other column's half included", () => {
    const filter: FilterState<SampleRow> = [
      { combinator: "and", entries: [amountAbove, regionIn(["West"])] },
    ];

    expect(
      columnValueOptions(rows, dataColumns, filter, "Region").options,
    ).toHaveLength(3);
  });

  test("searches labels, ignoring case, and reports how many matched", () => {
    const result = columnValueOptions(rows, dataColumns, [], "Region", {
      search: "ST",
    });

    expect(result.options.map((option) => option.value)).toEqual([
      "East",
      "West",
    ]);
    expect(result.total).toBe(2);
  });

  test("cuts at limit and says so", () => {
    expect(
      columnValueOptions(rows, dataColumns, [], "Amount", { limit: 2 }),
    ).toMatchObject({
      options: [{ value: 2 }, { value: 10 }],
      total: 3,
      truncated: true,
    });
  });

  test("labels follow the locale", () => {
    const [first] = columnValueOptions(rows, dataColumns, [], "Opened", {
      locale: "en-US",
    }).options;

    expect(first?.label).toBe(
      new Intl.DateTimeFormat("en-US").format(new Date("2024-01-01")),
    );
  });

  test("labels booleans in the grid's messages, true/false by default", () => {
    interface FlagRow {
      Active: boolean;
    }
    const flagRows: readonly FlagRow[] = [{ Active: true }, { Active: false }];
    const flagColumns: readonly DataColumn<FlagRow, unknown>[] = [
      { id: "Active", column: { field: "Active", type: "boolean" } },
    ];
    const labels = (messages?: Partial<GridMessages>) =>
      columnValueOptions(
        flagRows,
        flagColumns,
        [],
        "Active",
        messages === undefined ? {} : { messages },
      ).options.map((option) => option.label);

    expect(labels()).toEqual(["false", "true"]);
    expect(labels({ booleanTrue: "ja", booleanFalse: "nein" })).toEqual([
      "nein",
      "ja",
    ]);
    expect(
      columnValueOptions(flagRows, flagColumns, [], "Active", {
        search: "JA",
        messages: { booleanTrue: "ja", booleanFalse: "nein" },
      }).options,
    ).toEqual([{ value: true, label: "ja", count: 1 }]);
  });

  test("offers no object or array, which an in entry can't hold", () => {
    expect(columnValueOptions(rows, dataColumns, [], "Tags").options).toEqual(
      [],
    );
  });

  test("is empty for a column that isn't there", () => {
    expect(columnValueOptions(rows, dataColumns, [], "Missing")).toEqual({
      options: [],
      total: 0,
      truncated: false,
      blanks: 0,
    });
  });

  test("stays linear over 100k rows", () => {
    const many: SampleRow[] = Array.from({ length: 100_000 }, (_, index) => ({
      Id: index,
      Region: `Region ${String(index % 50_000)}`,
      Amount: index % 1_000,
      Opened: new Date(2024, 0, 1 + (index % 365)),
      Tags: [],
    }));
    const filter: FilterState<SampleRow> = [
      { columnId: "Amount", operator: "gte", value: 0 },
    ];

    const start = Date.now();
    const result = columnValueOptions(many, dataColumns, filter, "Region");
    const elapsed = Date.now() - start;

    expect(result.total).toBe(50_000);
    // Loose on purpose: catches a quadratic regression, not a slow machine.
    expect(elapsed).toBeLessThan(500);
  });
});

/** The region checklist as an editor opens it over `filter`. */
function openRegion(filter: FilterState<SampleRow> = []) {
  return initialFilterEditorDraft(
    describeColumnFilter(filter, "Region"),
    columnValueOptions(rows, dataColumns, filter, "Region"),
  );
}

function checkedValues(draft: FilterEditorDraft<SampleRow>): unknown[] {
  return [...draft.checked.values()];
}

describe("initialFilterEditorDraft", () => {
  test("no filter: every value and the blanks checked", () => {
    const draft = openRegion();

    expect(draft.mode).toBe("values");
    expect(checkedValues(draft)).toEqual(["East", "north", "West"]);
    expect(draft.includeBlanks).toBe(true);
  });

  test("no filter on a column without blanks leaves the blanks off", () => {
    const draft = initialFilterEditorDraft(
      { kind: "none" },
      columnValueOptions(rows, dataColumns, [], "Amount"),
    );

    expect(draft.includeBlanks).toBe(false);
  });

  test("a checklist: its own values, kept even when the list doesn't offer them", () => {
    const draft = openRegion([regionIn(["West", "South"])]);

    expect(checkedValues(draft)).toEqual(["West", "South"]);
    expect(draft.includeBlanks).toBe(false);
  });

  test("conditions: as they are", () => {
    const draft = initialFilterEditorDraft(
      describeColumnFilter<SampleRow>(
        [{ combinator: "or", entries: [amountAbove, amountBelow] }],
        "Amount",
      ),
      columnValueOptions(rows, dataColumns, [], "Amount"),
    );

    expect(draft).toMatchObject({
      mode: "conditions",
      conditions: [amountAbove, amountBelow],
      combinator: "or",
    });
  });

  test("custom: opens as no filter", () => {
    const draft = openRegion([{ columnId: "Region", query: "West" }]);

    expect(checkedValues(draft)).toEqual(["East", "north", "West"]);
  });
});

describe("a checklist on a date column holding ISO strings", () => {
  interface DueRow {
    Id: number;
    Due: string;
  }
  const dueRows: readonly DueRow[] = [
    { Id: 1, Due: "2024-01-01T00:00:00.000Z" },
    { Id: 2, Due: "2024-02-01T00:00:00.000Z" },
    { Id: 3, Due: "2024-03-01T00:00:00.000Z" },
    { Id: 4, Due: "2024-02-01" },
  ];

  function dueGrid() {
    return createGridController<DueRow>({
      dataSource: dueRows,
      getRowId: (row) => String(row.Id),
      columns: [{ field: "Due", type: "date" }],
    });
  }

  function openDue(controller: ReturnType<typeof dueGrid>) {
    const { filter } = controller.getState();
    return initialFilterEditorDraft(
      describeColumnFilter(filter, "Due"),
      columnValueOptions(
        dueRows,
        controller.getView().dataColumns,
        filter,
        "Due",
      ),
    );
  }

  test("offers each date once, however its strings spell it", () => {
    const draft = openDue(dueGrid());

    expect(draft.options.map((option) => option.count)).toEqual([1, 2, 1]);
  });

  test("a saved in filter, restored as Dates, opens with its values checked", () => {
    const saving = dueGrid();
    const january = openDue(saving).options[0]?.value ?? null;
    const picked = filterEditorReducer(openDue(saving), {
      type: "toggleValue",
      value: january,
    });
    saving.setFilter(draftToFilter(picked, "Due", saving.getState().filter));
    const saved: unknown = JSON.parse(
      JSON.stringify(serializeGridState(saving.getState())),
    );

    const restoring = dueGrid();
    restoring.restoreState(
      saved as Parameters<typeof restoring.restoreState>[0],
    );
    const reopened = openDue(restoring);

    expect(restoring.getState().filter).toEqual([
      {
        columnId: "Due",
        operator: "in",
        value: [
          new Date("2024-02-01T00:00:00.000Z"),
          new Date("2024-03-01T00:00:00.000Z"),
        ],
      },
    ]);
    expect(selectAllState(reopened)).toBe("mixed");
    const all = filterEditorReducer(reopened, {
      type: "toggleValue",
      value: january,
    });
    expect(selectAllState(all)).toBe("checked");
    expect(draftToFilter(all, "Due", restoring.getState().filter)).toEqual([]);
  });
});

describe("filterEditorReducer", () => {
  test("search narrows the visible options without touching what is checked", () => {
    const draft = filterEditorReducer(openRegion(), {
      type: "search",
      search: "ST",
    });

    expect(visibleFilterOptions(draft).map((option) => option.value)).toEqual([
      "East",
      "West",
    ]);
    expect(draft.checked.size).toBe(3);
  });

  test("toggleValue unchecks, then checks again, and switches to the checklist", () => {
    const conditions = filterEditorReducer(openRegion(), {
      type: "setConditions",
      conditions: [regionBlank],
    });
    const unchecked = filterEditorReducer(conditions, {
      type: "toggleValue",
      value: "West",
    });

    expect(unchecked.mode).toBe("values");
    expect(checkedValues(unchecked)).toEqual(["East", "north"]);
    expect(
      checkedValues(
        filterEditorReducer(unchecked, { type: "toggleValue", value: "West" }),
      ),
    ).toEqual(["East", "north", "West"]);
  });

  test("toggleAll unchecks everything, blanks included, once all is checked", () => {
    const draft = filterEditorReducer(openRegion(), { type: "toggleAll" });

    expect(draft.checked.size).toBe(0);
    expect(draft.includeBlanks).toBe(false);
    expect(selectAllState(draft)).toBe("unchecked");
  });

  test("toggleAll checks every visible value from a mixed state", () => {
    let draft = filterEditorReducer(openRegion(), { type: "toggleAll" });
    draft = filterEditorReducer(draft, { type: "toggleValue", value: "East" });
    expect(selectAllState(draft)).toBe("mixed");

    draft = filterEditorReducer(draft, { type: "toggleAll" });

    expect(selectAllState(draft)).toBe("checked");
    expect(draft.includeBlanks).toBe(true);
  });

  test("toggleAll under a search acts on the visible values only, blanks left alone", () => {
    let draft = filterEditorReducer(openRegion(), {
      type: "search",
      search: "st",
    });
    expect(selectAllState(draft)).toBe("checked");

    draft = filterEditorReducer(draft, { type: "toggleAll" });

    expect(checkedValues(draft)).toEqual(["north"]);
    expect(draft.includeBlanks).toBe(true);
    expect(selectAllState(draft)).toBe("unchecked");
  });

  test("select-all over a search that shows nothing is unchecked", () => {
    const draft = filterEditorReducer(openRegion(), {
      type: "search",
      search: "zzz",
    });

    expect(selectAllState(draft)).toBe("unchecked");
  });

  test("setIncludeBlanks", () => {
    const draft = filterEditorReducer(openRegion(), {
      type: "setIncludeBlanks",
      includeBlanks: false,
    });

    expect(draft.includeBlanks).toBe(false);
    expect(selectAllState(draft)).toBe("mixed");
  });

  test("setConditions switches to conditions, keeping the combinator unless given", () => {
    const kept = filterEditorReducer(openRegion(), {
      type: "setConditions",
      conditions: [regionBlank],
    });
    const given = filterEditorReducer(kept, {
      type: "setConditions",
      conditions: [regionBlank, regionIn(["West"])],
      combinator: "or",
    });

    expect(kept).toMatchObject({ mode: "conditions", combinator: "and" });
    expect(given.combinator).toBe("or");
  });

  test("clear: every value checked, no conditions, no search", () => {
    let draft = filterEditorReducer(openRegion(), { type: "toggleAll" });
    draft = filterEditorReducer(draft, { type: "search", search: "w" });
    draft = filterEditorReducer(draft, {
      type: "setConditions",
      conditions: [regionBlank],
    });

    draft = filterEditorReducer(draft, { type: "clear" });

    expect(draft).toMatchObject({
      search: "",
      includeBlanks: true,
      conditions: [],
    });
    expect(selectAllState(draft)).toBe("checked");
  });
});

describe("draftToFilter", () => {
  const others: FilterState<SampleRow> = [amountAbove, { query: "%a%" }];

  test("everything checked removes the column's entries and keeps the rest", () => {
    const current: FilterState<SampleRow> = [
      amountAbove,
      regionIn(["West"]),
      { query: "%a%" },
    ];
    const draft = filterEditorReducer(openRegion(current), {
      type: "toggleAll",
    });

    expect(draftToFilter(draft, "Region", current)).toEqual(others);
  });

  test("returns current itself when there was nothing to remove or add", () => {
    expect(draftToFilter(openRegion(others), "Region", others)).toBe(others);
  });

  test("a partial pick is one in entry", () => {
    let draft = filterEditorReducer(openRegion(), {
      type: "setIncludeBlanks",
      includeBlanks: false,
    });
    draft = filterEditorReducer(draft, { type: "toggleValue", value: "East" });

    expect(draftToFilter(draft, "Region", others)).toEqual([
      ...others,
      regionIn(["north", "West"]),
    ]);
  });

  test("a partial pick keeping blanks is OR-grouped with isEmpty", () => {
    const draft = filterEditorReducer(openRegion(), {
      type: "toggleValue",
      value: "East",
    });

    expect(draftToFilter(draft, "Region", [])).toEqual([
      {
        combinator: "or",
        entries: [regionIn(["north", "West"]), regionBlank],
      },
    ]);
  });

  test("takes the place of the column's first entry, custom ones replaced", () => {
    const current: FilterState<SampleRow> = [
      amountAbove,
      { columnId: "Region", query: "West" },
      { query: "%a%" },
      { columnId: "Region", predicate: () => true },
    ];
    const draft = filterEditorReducer(openRegion(current), {
      type: "setConditions",
      conditions: [regionBlank],
    });

    expect(draftToFilter(draft, "Region", current)).toEqual([
      amountAbove,
      regionBlank,
      { query: "%a%" },
    ]);
  });

  test("conditions: none is no filter, one itself, two a group", () => {
    const draft = openRegion();
    const withConditions = (conditions: OperatorFilterEntry<SampleRow>[]) =>
      draftToFilter(
        filterEditorReducer(draft, {
          type: "setConditions",
          conditions,
          combinator: "or",
        }),
        "Amount",
        [],
      );

    expect(withConditions([])).toEqual([]);
    expect(withConditions([amountAbove])).toEqual([amountAbove]);
    expect(withConditions([amountAbove, amountBelow])).toEqual([
      { combinator: "or", entries: [amountAbove, amountBelow] },
    ]);
  });

  test("writes conditions onto the column it is given", () => {
    const draft = filterEditorReducer(openRegion(), {
      type: "setConditions",
      conditions: [amountAbove],
    });

    expect(draftToFilter(draft, "Region", [])).toEqual([
      { ...amountAbove, columnId: "Region" },
    ]);
  });

  test.each<[string, FilterState<SampleRow>]>([
    ["a checklist", [regionIn(["West"])]],
    [
      "a checklist with blanks",
      [
        {
          combinator: "or",
          entries: [regionIn(["East", "West"]), regionBlank],
        },
      ],
    ],
    [
      "one condition",
      [{ columnId: "Region", operator: "startsWith", value: "w" }],
    ],
    [
      "two conditions",
      [
        {
          combinator: "or",
          entries: [
            regionBlank,
            { columnId: "Region", operator: "eq", value: "x" },
          ],
        },
      ],
    ],
  ])("round-trips %s through describeColumnFilter", (_name, filter) => {
    const shape = describeColumnFilter(filter, "Region");
    const draft = initialFilterEditorDraft(
      shape,
      columnValueOptions(rows, dataColumns, filter, "Region"),
    );

    const next = draftToFilter(draft, "Region", filter);

    expect(next).toEqual(filter);
    expect(describeColumnFilter(next, "Region")).toEqual(shape);
  });
});

describe("isColumnFiltered", () => {
  test("an entry about the column marks it, whatever its shape", () => {
    const filtered = (filter: FilterState<SampleRow>) =>
      isColumnFiltered(filter, "Region");

    expect(filtered([regionIn(["West"])])).toBe(true);
    expect(filtered([regionBlank, amountAbove])).toBe(true);
    expect(filtered([{ columnId: "Region", query: "%we%" }])).toBe(true);
    expect(
      filtered([{ combinator: "or", entries: [amountAbove, regionBlank] }]),
    ).toBe(true);
  });

  test("entries on other columns and a global search don't", () => {
    expect(isColumnFiltered<SampleRow>([], "Region")).toBe(false);
    expect(
      isColumnFiltered<SampleRow>(
        [amountAbove, amountBelow, { query: "%west%" }],
        "Region",
      ),
    ).toBe(false);
  });

  test("agrees with describeColumnFilter", () => {
    const filters: readonly FilterState<SampleRow>[] = [
      [],
      [{ query: "%west%" }],
      [amountAbove],
      [regionIn(["West"]), amountAbove],
      [{ combinator: "and", entries: [regionBlank, amountBelow] }],
    ];
    for (const filter of filters) {
      expect(isColumnFiltered(filter, "Region")).toBe(
        describeColumnFilter(filter, "Region").kind !== "none",
      );
    }
  });
});
