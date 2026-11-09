import { describe, expect, test } from "vitest";

import type {
  ColumnType,
  FilterState,
  ResolvedColumn,
  ResolvedRow,
} from "../types";
import {
  clearAllFilters,
  filterQueryFor,
  filterRows,
  matchesQuery,
  setColumnFilter,
} from "./filtering";

describe("matchesQuery", () => {
  test("a bare query exact-matches only — a substring does not match", () => {
    expect(matchesQuery("Alice", "Alice")).toBe(true);
    expect(matchesQuery("Alicexyz", "Alice")).toBe(false);
  });

  test("%text% matches a value containing it anywhere, case-insensitively", () => {
    expect(matchesQuery("Alice", "%lic%")).toBe(true);
    expect(matchesQuery("ALICE", "%lic%")).toBe(true);
    expect(matchesQuery("Bob", "%lic%")).toBe(false);
  });

  test("text% matches only a value starting with it", () => {
    expect(matchesQuery("Alice", "Ali%")).toBe(true);
    expect(matchesQuery("xAlice", "Ali%")).toBe(false);
  });

  test("%text matches only a value ending with it", () => {
    expect(matchesQuery("Alice", "%ice")).toBe(true);
    expect(matchesQuery("Alicex", "%ice")).toBe(false);
  });

  test("a bare % or %% matches everything, including an empty value", () => {
    expect(matchesQuery("", "%")).toBe(true);
    expect(matchesQuery("anything", "%")).toBe(true);
    expect(matchesQuery("anything", "%%")).toBe(true);
  });

  test("a % embedded mid-query is a literal character, not a wildcard", () => {
    expect(matchesQuery("a%b", "a%b")).toBe(true);
    expect(matchesQuery("axyzb", "a%b")).toBe(false);
  });

  test("stringifies non-string values before matching", () => {
    expect(matchesQuery(123, "123")).toBe(true);
    expect(matchesQuery(true, "true")).toBe(true);
    expect(matchesQuery(new Date(2020, 0, 1), "%2020%")).toBe(true);
  });

  test("null and undefined stringify to an empty string", () => {
    expect(matchesQuery(null, "")).toBe(true);
    expect(matchesQuery(undefined, "%")).toBe(true);
  });
});

describe("filterQueryFor", () => {
  test("returns a column's current query", () => {
    const filter: FilterState<SampleRow> = [
      { kind: "text", columnId: "Name", query: "Ali%" },
    ];

    expect(filterQueryFor(filter, "Name")).toBe("Ali%");
  });

  test("returns the global entry's query when columnId is omitted", () => {
    const filter: FilterState<SampleRow> = [{ kind: "text", query: "prod" }];

    expect(filterQueryFor(filter)).toBe("prod");
  });

  test("is null when no entry names the column", () => {
    expect(filterQueryFor([], "Name")).toBeNull();
  });

  test("is null when the entry for that key is not a TextFilterEntry", () => {
    const filter: FilterState<SampleRow> = [
      { kind: "value", columnId: "Score", value: 42 },
    ];

    expect(filterQueryFor(filter, "Score")).toBeNull();
  });
});

describe("setColumnFilter", () => {
  test("appends a new TextFilterEntry", () => {
    expect(setColumnFilter<SampleRow>([], "Name", "Ali%")).toEqual([
      { kind: "text", columnId: "Name", query: "Ali%" },
    ]);
  });

  test("appends a global entry when columnId is omitted", () => {
    expect(setColumnFilter<SampleRow>([], undefined, "prod")).toEqual([
      { kind: "text", query: "prod" },
    ]);
  });

  test("replaces an existing entry's query in place, without moving it", () => {
    const filter: FilterState<SampleRow> = [
      { kind: "text", columnId: "Id", query: "1" },
      { kind: "text", columnId: "Name", query: "Ali%" },
    ];

    expect(setColumnFilter(filter, "Name", "Bob%")).toEqual([
      { kind: "text", columnId: "Id", query: "1" },
      { kind: "text", columnId: "Name", query: "Bob%" },
    ]);
  });

  test("replaces a ValueFilterEntry for the same key with a TextFilterEntry", () => {
    const filter: FilterState<SampleRow> = [
      { kind: "value", columnId: "Score", value: 42 },
    ];

    expect(setColumnFilter(filter, "Score", "42")).toEqual([
      { kind: "text", columnId: "Score", query: "42" },
    ]);
  });

  test("an empty query removes an existing entry", () => {
    const filter: FilterState<SampleRow> = [
      { kind: "text", columnId: "Name", query: "Ali%" },
    ];

    expect(setColumnFilter(filter, "Name", "")).toEqual([]);
  });

  test("an empty query for an absent entry is a no-op", () => {
    const filter: FilterState<SampleRow> = [];

    expect(setColumnFilter(filter, "Name", "")).toBe(filter);
  });

  test("setting an identical query is a no-op", () => {
    const filter: FilterState<SampleRow> = [
      { kind: "text", columnId: "Name", query: "Ali%" },
    ];

    expect(setColumnFilter(filter, "Name", "Ali%")).toBe(filter);
  });
});

describe("clearAllFilters", () => {
  test("reduces a non-empty filter to []", () => {
    const filter: FilterState<SampleRow> = [{ kind: "text", query: "x" }];

    expect(clearAllFilters(filter)).toEqual([]);
  });

  test("is a no-op when already empty", () => {
    const filter: FilterState<SampleRow> = [];

    expect(clearAllFilters(filter)).toBe(filter);
  });
});

interface SampleRow {
  Id: number;
  Name: string;
  Active: boolean;
  Score: number;
  JoinedAt: Date;
  Application: { Name: string };
}

function resolvedColumn(
  field: string,
  type?: ColumnType,
): ResolvedColumn<SampleRow, unknown> {
  return {
    column: { field, ...(type !== undefined && { type }) },
    id: field,
    width: 100,
    sized: false,
    label: field,
    resizable: false,
    reorderable: false,
    groupByDraggable: false,
    alignment: "left",
  };
}

const columns: readonly ResolvedColumn<SampleRow, unknown>[] = [
  resolvedColumn("Id", "number"),
  resolvedColumn("Name"),
  resolvedColumn("Active", "boolean"),
  resolvedColumn("Score", "number"),
  resolvedColumn("JoinedAt", "date"),
  resolvedColumn("Application.Name"),
];

function resolvedRow(rowIndex: number, row: SampleRow): ResolvedRow<SampleRow> {
  return { rowId: String(row.Id), row, rowIndex, datasetIndex: rowIndex };
}

const rows: readonly ResolvedRow<SampleRow>[] = [
  resolvedRow(0, {
    Id: 1,
    Name: "Alice",
    Active: true,
    Score: 42,
    JoinedAt: new Date(2020, 0, 1),
    Application: { Name: "Portal" },
  }),
  resolvedRow(1, {
    Id: 2,
    Name: "Bob",
    Active: false,
    Score: 7,
    JoinedAt: new Date(2021, 0, 1),
    Application: { Name: "Admin" },
  }),
  resolvedRow(2, {
    Id: 3,
    Name: "Charlie",
    Active: true,
    Score: 42,
    JoinedAt: new Date(2019, 0, 1),
    Application: { Name: "Billing" },
  }),
];

function idsOf(filtered: readonly ResolvedRow<SampleRow>[]): number[] {
  return filtered.map((entry) => entry.row.Id);
}

describe("filterRows", () => {
  test("returns rows unchanged for an empty filter", () => {
    expect(filterRows(rows, [], columns)).toBe(rows);
  });

  test("returns rows unchanged when every entry names a column absent from columns", () => {
    const filter: FilterState<SampleRow> = [
      { kind: "text", columnId: "Missing", query: "x" },
    ];

    expect(filterRows(rows, filter, columns)).toBe(rows);
  });

  describe("TextFilterEntry", () => {
    test("column-scoped keeps only matching rows", () => {
      const filter: FilterState<SampleRow> = [
        { kind: "text", columnId: "Name", query: "Ali%" },
      ];

      expect(idsOf(filterRows(rows, filter, columns))).toEqual([1]);
    });

    test("global matches if any column matches", () => {
      const filter: FilterState<SampleRow> = [
        { kind: "text", query: "%Billing%" },
      ];

      expect(idsOf(filterRows(rows, filter, columns))).toEqual([3]);
    });

    test("matches through a dotted field path", () => {
      const filter: FilterState<SampleRow> = [
        { kind: "text", columnId: "Application.Name", query: "Admin" },
      ];

      expect(idsOf(filterRows(rows, filter, columns))).toEqual([2]);
    });
  });

  describe("ValueFilterEntry", () => {
    test("a number value matches only a number-typed column", () => {
      const filter: FilterState<SampleRow> = [
        { kind: "value", columnId: "Score", value: 42 },
      ];

      expect(idsOf(filterRows(rows, filter, columns))).toEqual([1, 3]);
    });

    test("a number value never matches a string column, even an equal-looking one", () => {
      const filter: FilterState<SampleRow> = [
        { kind: "value", columnId: "Name", value: 42 },
      ];

      expect(idsOf(filterRows(rows, filter, columns))).toEqual([]);
    });

    test("a boolean value matches only a boolean-typed column", () => {
      const filter: FilterState<SampleRow> = [
        { kind: "value", columnId: "Active", value: true },
      ];

      expect(idsOf(filterRows(rows, filter, columns))).toEqual([1, 3]);
    });

    test("a Date value matches only a date-typed column, compared by getTime()", () => {
      const filter: FilterState<SampleRow> = [
        { kind: "value", columnId: "JoinedAt", value: new Date(2021, 0, 1) },
      ];

      expect(idsOf(filterRows(rows, filter, columns))).toEqual([2]);
    });

    test("a correctly-typed value that doesn't equal the cell still excludes the row", () => {
      const filter: FilterState<SampleRow> = [
        { kind: "value", columnId: "Score", value: 999 },
      ];

      expect(idsOf(filterRows(rows, filter, columns))).toEqual([]);
    });
  });

  describe("PredicateFilterEntry", () => {
    test("is called with the resolved value and the whole row for a column-scoped entry", () => {
      const filter: FilterState<SampleRow> = [
        {
          kind: "predicate",
          columnId: "Score",
          predicate: (value) => typeof value === "number" && value > 10,
        },
      ];

      expect(idsOf(filterRows(rows, filter, columns))).toEqual([1, 3]);
    });

    test("is called with an undefined value and the whole row for a global entry", () => {
      const seen: unknown[] = [];
      const filter: FilterState<SampleRow> = [
        {
          kind: "predicate",
          predicate: (value, row) => {
            seen.push(value);
            return row.Active;
          },
        },
      ];

      expect(idsOf(filterRows(rows, filter, columns))).toEqual([1, 3]);
      expect(seen.every((value) => value === undefined)).toBe(true);
    });

    test("can read a different field off row than its own columnId", () => {
      const filter: FilterState<SampleRow> = [
        {
          kind: "predicate",
          columnId: "Score",
          predicate: (_value, row) => row.Name === "Bob",
        },
      ];

      expect(idsOf(filterRows(rows, filter, columns))).toEqual([2]);
    });
  });

  describe("GroupFilterEntry", () => {
    test('"or" keeps a row matching any nested entry', () => {
      const filter: FilterState<SampleRow> = [
        {
          kind: "group",
          combinator: "or",
          entries: [
            { kind: "text", columnId: "Name", query: "Alice" },
            { kind: "text", columnId: "Name", query: "Bob" },
          ],
        },
      ];

      expect(idsOf(filterRows(rows, filter, columns))).toEqual([1, 2]);
    });

    test('"and" behaves like the same entries would at the top level', () => {
      const filter: FilterState<SampleRow> = [
        {
          kind: "group",
          combinator: "and",
          entries: [
            { kind: "value", columnId: "Active", value: true },
            { kind: "value", columnId: "Score", value: 42 },
          ],
        },
      ];

      expect(idsOf(filterRows(rows, filter, columns))).toEqual([1, 3]);
    });

    test("a group nested inside a group proves recursion", () => {
      // (Active=true and Score=42) or Name=Bob
      const filter: FilterState<SampleRow> = [
        {
          kind: "group",
          combinator: "or",
          entries: [
            {
              kind: "group",
              combinator: "and",
              entries: [
                { kind: "value", columnId: "Active", value: true },
                { kind: "value", columnId: "Score", value: 42 },
              ],
            },
            { kind: "text", columnId: "Name", query: "Bob" },
          ],
        },
      ];

      expect(idsOf(filterRows(rows, filter, columns))).toEqual([1, 2, 3]);
    });

    test('an empty group matches everything under "and", nothing under "or"', () => {
      expect(
        idsOf(
          filterRows(
            rows,
            [{ kind: "group", combinator: "and", entries: [] }],
            columns,
          ),
        ),
      ).toEqual([1, 2, 3]);
      expect(
        idsOf(
          filterRows(
            rows,
            [{ kind: "group", combinator: "or", entries: [] }],
            columns,
          ),
        ),
      ).toEqual([]);
    });

    test("a group with one valid entry and one naming a removed column still filters by the valid one", () => {
      const filter: FilterState<SampleRow> = [
        {
          kind: "group",
          combinator: "or",
          entries: [
            { kind: "text", columnId: "Missing", query: "x" },
            { kind: "text", columnId: "Name", query: "Bob" },
          ],
        },
      ];

      expect(idsOf(filterRows(rows, filter, columns))).toEqual([2]);
    });

    test("a group at the top level still ANDs with sibling entries", () => {
      const filter: FilterState<SampleRow> = [
        {
          kind: "group",
          combinator: "or",
          entries: [
            { kind: "text", columnId: "Name", query: "Alice" },
            { kind: "text", columnId: "Name", query: "Charlie" },
          ],
        },
        { kind: "value", columnId: "Active", value: true },
      ];

      expect(idsOf(filterRows(rows, filter, columns))).toEqual([1, 3]);
    });
  });

  describe("OperatorFilterEntry", () => {
    test("compares under the column's type", () => {
      const filter: FilterState<SampleRow> = [
        {
          kind: "operator",
          columnId: "Score",
          operator: "between",
          value: [5, 10],
        },
      ];

      expect(idsOf(filterRows(rows, filter, columns))).toEqual([2]);
    });

    test("matches through a dotted field path", () => {
      const filter: FilterState<SampleRow> = [
        {
          kind: "operator",
          columnId: "Application.Name",
          operator: "in",
          value: ["Portal", "Billing"],
        },
      ];

      expect(idsOf(filterRows(rows, filter, columns))).toEqual([1, 3]);
    });

    test("nests in a group like any other entry", () => {
      const filter: FilterState<SampleRow> = [
        {
          kind: "group",
          combinator: "or",
          entries: [
            {
              kind: "operator",
              columnId: "JoinedAt",
              operator: "lt",
              value: "2019-06-01",
            },
            {
              kind: "operator",
              columnId: "Name",
              operator: "startsWith",
              value: "b",
            },
          ],
        },
      ];

      expect(idsOf(filterRows(rows, filter, columns))).toEqual([2, 3]);
    });

    test("is dropped when it names a column absent from columns", () => {
      const filter: FilterState<SampleRow> = [
        { kind: "operator", columnId: "Missing", operator: "isEmpty" },
      ];

      expect(filterRows(rows, filter, columns)).toBe(rows);
    });
  });

  test("two entries of different variants AND together", () => {
    const filter: FilterState<SampleRow> = [
      { kind: "text", columnId: "Name", query: "%a%" },
      { kind: "value", columnId: "Active", value: true },
    ];

    expect(idsOf(filterRows(rows, filter, columns))).toEqual([1, 3]);
  });

  test("is order-preserving", () => {
    const filter: FilterState<SampleRow> = [
      { kind: "text", columnId: "Name", query: "%a%" },
    ];

    // Alice and Charlie contain "a"; Bob, in between them, doesn't.
    expect(idsOf(filterRows(rows, filter, columns))).toEqual([1, 3]);
  });

  test("renumbers rowIndex and datasetIndex to match the retained positions", () => {
    const filter: FilterState<SampleRow> = [
      { kind: "value", columnId: "Active", value: true },
    ];

    expect(
      filterRows(rows, filter, columns).map((entry) => entry.rowIndex),
    ).toEqual([0, 1]);
    expect(
      filterRows(rows, filter, columns).map((entry) => entry.datasetIndex),
    ).toEqual([0, 1]);
  });

  test("a mix of one valid and one removed-column entry at the top level — only the valid one filters", () => {
    const filter: FilterState<SampleRow> = [
      { kind: "text", columnId: "Missing", query: "x" },
      { kind: "text", columnId: "Name", query: "Bob" },
    ];

    expect(idsOf(filterRows(rows, filter, columns))).toEqual([2]);
  });
});
