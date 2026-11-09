import { describe, expect, test } from "vitest";

import type {
  ColumnDefinition,
  DataColumn,
  FilterState,
  OperatorFilterEntry,
} from "../types";
import type { ColumnValueOptions } from "../util/filterEditor";
import {
  columnValueOptions,
  describeColumnFilter,
  draftToFilter,
  filterEditorReducer,
  initialFilterEditorDraft,
} from "../util/filterEditor";
import { createColumnValueOptionsCache } from "./valueCache";

interface SampleRow {
  Name: string;
  Region: string;
  Amount: number;
  Active: boolean;
  Opened: Date;
}

const rows: readonly SampleRow[] = [
  {
    Name: "Ann",
    Region: "West",
    Amount: 10,
    Active: true,
    Opened: new Date(2024, 0, 1),
  },
  {
    Name: "Bob",
    Region: "East",
    Amount: 20,
    Active: false,
    Opened: new Date(2024, 0, 2),
  },
  {
    Name: "Cy",
    Region: "West",
    Amount: 30,
    Active: true,
    Opened: new Date(2024, 0, 3),
  },
];

function dataColumn(
  column: ColumnDefinition<SampleRow, unknown>,
): DataColumn<SampleRow, unknown> {
  return { id: column.field, column };
}

const dataColumns: readonly DataColumn<SampleRow, unknown>[] = [
  dataColumn({ field: "Name" }),
  dataColumn({ field: "Region" }),
  dataColumn({ field: "Amount", type: "number" }),
  dataColumn({ field: "Active", type: "boolean" }),
  dataColumn({ field: "Opened", type: "date" }),
];

const amountAbove = (value: number): OperatorFilterEntry<SampleRow> => ({
  kind: "operator",
  columnId: "Amount",
  operator: "gt",
  value,
});

function labels(values: ColumnValueOptions): string[] {
  return values.options.map((option) => option.label);
}

describe("createColumnValueOptionsCache", () => {
  test("counts a column's whole list, as columnValueOptions does", () => {
    const cache = createColumnValueOptionsCache<SampleRow>();
    const filter = [amountAbove(15)];
    expect(cache.get(rows, dataColumns, filter, "Region")).toEqual(
      columnValueOptions(rows, dataColumns, filter, "Region"),
    );
  });

  test("a hit hands back the same list", () => {
    const cache = createColumnValueOptionsCache<SampleRow>();
    const filter = [amountAbove(15)];
    const first = cache.get(rows, dataColumns, filter, "Region");
    expect(cache.get(rows, dataColumns, filter, "Region")).toBe(first);
    expect(cache.get(rows, dataColumns, [...filter], "Region")).toBe(first);
  });

  test("changing another column's entry misses", () => {
    const cache = createColumnValueOptionsCache<SampleRow>();
    const first = cache.get(rows, dataColumns, [amountAbove(15)], "Region");
    const next = cache.get(rows, dataColumns, [amountAbove(25)], "Region");
    expect(next).not.toBe(first);
    expect(labels(next)).toEqual(["West"]);
  });

  test("entries compare by identity: an equal one rebuilt misses", () => {
    const cache = createColumnValueOptionsCache<SampleRow>();
    const first = cache.get(rows, dataColumns, [amountAbove(15)], "Region");
    expect(cache.get(rows, dataColumns, [amountAbove(15)], "Region")).not.toBe(
      first,
    );
  });

  test("a global search counts as another column's entry", () => {
    const cache = createColumnValueOptionsCache<SampleRow>();
    const first = cache.get(rows, dataColumns, [], "Region");
    expect(
      cache.get(
        rows,
        dataColumns,
        [{ kind: "text", query: "%west%" }],
        "Region",
      ),
    ).not.toBe(first);
  });

  test("changing the column's own entry hits", () => {
    const cache = createColumnValueOptionsCache<SampleRow>();
    const other = amountAbove(15);
    const first = cache.get(rows, dataColumns, [other], "Region");
    const own: FilterState<SampleRow> = [
      { kind: "operator", columnId: "Region", operator: "in", value: ["West"] },
      other,
    ];
    expect(cache.get(rows, dataColumns, own, "Region")).toBe(first);
  });

  test("applying a column's checklist keeps its own list, not the others'", () => {
    const cache = createColumnValueOptionsCache<SampleRow>();
    const filter: FilterState<SampleRow> = [amountAbove(5)];
    const region = cache.get(rows, dataColumns, filter, "Region");
    const amount = cache.get(rows, dataColumns, filter, "Amount");
    const draft = filterEditorReducer(
      initialFilterEditorDraft(describeColumnFilter(filter, "Region"), region),
      { type: "toggleValue", value: "East" },
    );
    const applied = draftToFilter(draft, "Region", filter);

    expect(applied).not.toBe(filter);
    expect(cache.get(rows, dataColumns, applied, "Region")).toBe(region);
    expect(cache.get(rows, dataColumns, applied, "Amount")).not.toBe(amount);
  });

  test("keeps one list per column", () => {
    const cache = createColumnValueOptionsCache<SampleRow>();
    const region = cache.get(rows, dataColumns, [], "Region");
    const amount = cache.get(rows, dataColumns, [], "Amount");
    expect(cache.get(rows, dataColumns, [], "Region")).toBe(region);
    expect(cache.get(rows, dataColumns, [], "Amount")).toBe(amount);
  });

  test("new rows miss, and drop the lists over the old ones", () => {
    const cache = createColumnValueOptionsCache<SampleRow>();
    const region = cache.get(rows, dataColumns, [], "Region");
    const more: readonly SampleRow[] = [
      ...rows,
      {
        Name: "Di",
        Region: "North",
        Amount: 40,
        Active: false,
        Opened: new Date(2024, 0, 4),
      },
    ];
    const next = cache.get(more, dataColumns, [], "Region");
    expect(next).not.toBe(region);
    expect(labels(next)).toEqual(["East", "North", "West"]);
    expect(cache.get(rows, dataColumns, [], "Region")).not.toBe(region);
  });

  test("new columns, locale or messages miss", () => {
    const cache = createColumnValueOptionsCache<SampleRow>();
    const first = cache.get(rows, dataColumns, [], "Active");
    expect(cache.get(rows, [...dataColumns], [], "Active")).not.toBe(first);

    const messages = { booleanTrue: "ja", booleanFalse: "nein" };
    const german = cache.get(rows, dataColumns, [], "Active", { messages });
    expect(labels(german)).toEqual(["nein", "ja"]);
    expect(cache.get(rows, dataColumns, [], "Active", { messages })).toBe(
      german,
    );

    const day = cache.get(rows, dataColumns, [], "Opened", { locale: "de" });
    expect(cache.get(rows, dataColumns, [], "Opened", { locale: "de" })).toBe(
      day,
    );
    expect(
      cache.get(rows, dataColumns, [], "Opened", { locale: "en-US" }),
    ).not.toBe(day);
  });

  test("counts 100k rows once, well within a second, then hits", () => {
    const many: SampleRow[] = Array.from({ length: 100_000 }, (_, index) => ({
      Name: `Customer ${String(index)}`,
      Region: `Region ${String(index % 50)}`,
      Amount: index % 1_000,
      Active: index % 3 === 0,
      Opened: new Date(2024, 0, 1 + (index % 365)),
    }));
    const filter: FilterState<SampleRow> = [
      { kind: "operator", columnId: "Amount", operator: "gte", value: 0 },
    ];
    const cache = createColumnValueOptionsCache<SampleRow>();

    const start = Date.now();
    const first = cache.get(many, dataColumns, filter, "Name");
    const elapsed = Date.now() - start;

    expect(first.total).toBe(100_000);
    // Loose on purpose: catches a quadratic regression, not a slow machine.
    expect(elapsed).toBeLessThan(1_000);
    expect(cache.get(many, dataColumns, filter, "Name")).toBe(first);
  });
});
