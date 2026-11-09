import { afterEach, describe, expect, test, vi } from "vitest";

import type {
  ColumnDefinition,
  ColumnSortEvent,
  FilterChangeEvent,
  FilterState,
  GridState,
  PaginationChangeEvent,
  SerializedFilterState,
  SerializedGridState,
} from "../types";
import { serializeGridState } from "../util/serialize";
import { createGridController } from "./createGridController";
import type { GridControllerOptions } from "./gridController";

/** The global core's `lib` leaves out — see `util/report.ts`. */
declare const console: { error: (message: string) => void };

interface SampleRow {
  Id: number;
  Region: string;
  Amount: number;
  Opened: Date;
}

const data: readonly SampleRow[] = [
  { Id: 1, Region: "West", Amount: 10, Opened: new Date("2024-01-01") },
  { Id: 2, Region: "East", Amount: 20, Opened: new Date("2024-02-01") },
  { Id: 3, Region: "West", Amount: 30, Opened: new Date("2024-03-01") },
  { Id: 4, Region: "North", Amount: 40, Opened: new Date("2024-02-01") },
  { Id: 5, Region: "East", Amount: 50, Opened: new Date("2024-01-01") },
];

const columns: readonly ColumnDefinition<SampleRow>[] = [
  { field: "Id", type: "number" },
  { field: "Region" },
  { field: "Amount", type: "number" },
  { field: "Opened", type: "date" },
];

function create(options: GridControllerOptions<SampleRow> = {}) {
  return createGridController<SampleRow>({
    dataSource: data,
    getRowId: (row) => String(row.Id),
    columns,
    paginated: true,
    selectable: { rows: "multiple", columns: "multiple", cells: "single" },
    ...options,
  });
}

/** Through JSON and back, as a layout saved to storage is. */
function throughJson<Row>(state: GridState<Row>): SerializedGridState<Row> {
  return JSON.parse(
    JSON.stringify(serializeGridState(state)),
  ) as SerializedGridState<Row>;
}

const saved: GridState<SampleRow> = {
  columnSizing: { Amount: 140 },
  columnOrder: ["Amount", "Id"],
  columnVisibility: { Region: false },
  columnSort: [{ columnId: "Amount", direction: "desc" }],
  filter: [
    { kind: "text", columnId: "Region", query: "%st" },
    {
      kind: "group",
      combinator: "or",
      entries: [
        { kind: "value", columnId: "Opened", value: new Date("2024-01-01") },
        { kind: "value", columnId: "Opened", value: new Date("2024-03-01") },
      ],
    },
  ],
  groupBy: [{ columnId: "Region", direction: "desc" }],
  groupExpansion: ["West"],
  pagination: { pageIndex: 1, pageSize: 1 },
  rowSelection: ["3", "1"],
  columnSelection: ["Amount"],
  cellSelection: { rowId: "3", columnId: "Amount" },
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("serializeGridState", () => {
  test("survives JSON unchanged", () => {
    const serialized = serializeGridState(saved);

    expect(JSON.parse(JSON.stringify(serialized))).toEqual(serialized);
  });

  test("writes a Date value as its ISO string", () => {
    const [, group] = serializeGridState(saved).filter;

    expect(group).toEqual({
      kind: "group",
      combinator: "or",
      entries: [
        {
          kind: "value",
          columnId: "Opened",
          value: "2024-01-01T00:00:00.000Z",
        },
        {
          kind: "value",
          columnId: "Opened",
          value: "2024-03-01T00:00:00.000Z",
        },
      ],
    });
  });

  test("leaves out a predicate entry, and a group it empties, with one error each", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {
      // Silenced: the calls themselves are what this test checks.
    });
    const filter: FilterState<SampleRow> = [
      {
        kind: "predicate",
        columnId: "Amount",
        predicate: (value) => Number(value) > 15,
      },
      {
        kind: "group",
        combinator: "or",
        entries: [{ kind: "predicate", predicate: () => true }],
      },
      { kind: "text", columnId: "Region", query: "West" },
    ];

    const serialized = serializeGridState({ ...saved, filter });

    expect(serialized.filter).toEqual([
      { kind: "text", columnId: "Region", query: "West" },
    ]);
    expect(error).toHaveBeenCalledTimes(2);
    expect(error.mock.calls[0]?.[0]).toContain("`Amount`");
  });
});

describe("operator entries", () => {
  const filter: FilterState<SampleRow> = [
    {
      kind: "operator",
      columnId: "Amount",
      operator: "between",
      value: [15, 45],
    },
    {
      kind: "operator",
      columnId: "Opened",
      operator: "gte",
      value: new Date("2024-02-01"),
    },
    {
      kind: "group",
      combinator: "or",
      entries: [
        {
          kind: "operator",
          columnId: "Opened",
          operator: "in",
          value: [new Date("2024-01-01"), new Date("2024-02-01")],
        },
        { kind: "operator", columnId: "Opened", operator: "isEmpty" },
      ],
    },
    {
      kind: "operator",
      columnId: "Region",
      operator: "in",
      value: ["2024-02-01", "East"],
    },
  ];

  test("serialise their Dates as ISO strings and keep everything else", () => {
    expect(serializeGridState({ ...saved, filter }).filter).toEqual([
      {
        kind: "operator",
        columnId: "Amount",
        operator: "between",
        value: [15, 45],
      },
      {
        kind: "operator",
        columnId: "Opened",
        operator: "gte",
        value: "2024-02-01T00:00:00.000Z",
      },
      {
        kind: "group",
        combinator: "or",
        entries: [
          {
            kind: "operator",
            columnId: "Opened",
            operator: "in",
            value: ["2024-01-01T00:00:00.000Z", "2024-02-01T00:00:00.000Z"],
          },
          { kind: "operator", columnId: "Opened", operator: "isEmpty" },
        ],
      },
      {
        kind: "operator",
        columnId: "Region",
        operator: "in",
        value: ["2024-02-01", "East"],
      },
    ]);
  });

  test("round-trip through JSON, strings revived as Dates on date columns only", () => {
    const source = create({ defaultFilter: filter });
    const onFilterChange = vi.fn();
    const target = create({ defaultFilter: filter, onFilterChange });

    const restored = throughJson(source.getState());
    target.restoreState(restored);

    expect(target.getState().filter).toEqual(filter);
    expect(onFilterChange).not.toHaveBeenCalled();
    expect(target.getView().rows.map((entry) => entry.rowId)).toEqual(["2"]);
  });
});

describe("filter entries saved without a kind", () => {
  /** Saved JSON, typed as `restoreState` takes it, whatever shape it holds. */
  function parseSaved(json: string): Partial<SerializedGridState<SampleRow>> {
    return JSON.parse(json) as Partial<SerializedGridState<SampleRow>>;
  }

  /** As `serializeGridState` wrote a layout before entries carried a `kind`. */
  const untagged = `{
    "columnSort": [{ "columnId": "Amount", "direction": "desc" }],
    "filter": [
      { "columnId": "Region", "query": "%st" },
      {
        "combinator": "or",
        "entries": [
          { "columnId": "Opened", "value": "2024-01-01T00:00:00.000Z" },
          { "columnId": "Opened", "operator": "isEmpty" }
        ]
      },
      { "columnId": "Amount", "operator": "between", "value": [5, 55] },
      {
        "columnId": "Opened",
        "operator": "in",
        "value": ["2024-01-01T00:00:00.000Z", "2024-03-01T00:00:00.000Z"]
      }
    ]
  }`;

  test("restore with the kind their keys name", () => {
    const controller = create();

    controller.restoreState(parseSaved(untagged));

    expect(controller.getState().filter).toEqual([
      { kind: "text", columnId: "Region", query: "%st" },
      {
        kind: "group",
        combinator: "or",
        entries: [
          { kind: "value", columnId: "Opened", value: new Date("2024-01-01") },
          { kind: "operator", columnId: "Opened", operator: "isEmpty" },
        ],
      },
      {
        kind: "operator",
        columnId: "Amount",
        operator: "between",
        value: [5, 55],
      },
      {
        kind: "operator",
        columnId: "Opened",
        operator: "in",
        value: [new Date("2024-01-01"), new Date("2024-03-01")],
      },
    ] satisfies FilterState<SampleRow>);
    expect(controller.getView().rows.map((entry) => entry.rowId)).toEqual([
      "5",
      "1",
    ]);
  });

  test("throw when an entry has none of the keys a kind is read from", () => {
    const controller = create();

    expect(() => {
      controller.restoreState(
        parseSaved(`{ "filter": [{ "columnId": "Region" }] }`),
      );
    }).toThrow(TypeError);
    expect(controller.getState().filter).toEqual([]);
  });

  test("throw when an entry's kind is none GridKit knows", () => {
    const controller = create();

    expect(() => {
      controller.restoreState(
        parseSaved(`{ "filter": [{ "kind": "regex", "columnId": "Region" }] }`),
      );
    }).toThrow("`regex` is not a filter entry kind");
  });
});

describe("createGridController: restoreState", () => {
  test("a layout round-tripped through JSON restores every slice", () => {
    const source = create();
    source.restoreState(saved);

    const target = create();
    target.restoreState(throughJson(source.getState()));

    expect(target.getState()).toEqual(saved);
    expect(target.getView().rows.map((entry) => entry.rowId)).toEqual([
      "5",
      "3",
      "1",
    ]);
  });

  test("calls subscribers once, and each changed slice's callback once", () => {
    const onColumnSortChange = vi.fn<(event: ColumnSortEvent) => void>();
    const onFilterChange =
      vi.fn<(event: FilterChangeEvent<SampleRow>) => void>();
    const onPaginationChange = vi.fn();
    const listener = vi.fn();
    const controller = create({
      defaultColumnSort: [{ columnId: "Id", direction: "asc" }],
      onColumnSortChange,
      onFilterChange,
      onPaginationChange,
    });
    controller.subscribe(listener);

    controller.restoreState({
      columnSort: [{ columnId: "Amount", direction: "desc" }],
      filter: [],
    });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(onColumnSortChange.mock.calls).toEqual([
      [
        {
          columnId: "Amount",
          sort: [{ columnId: "Amount", direction: "desc" }],
        },
      ],
    ]);
    expect(onFilterChange).not.toHaveBeenCalled();
    expect(onPaginationChange).not.toHaveBeenCalled();
  });

  test("restoring what is already there reports nothing", () => {
    const listener = vi.fn();
    const onFilterChange = vi.fn();
    const controller = create({ onFilterChange });
    controller.restoreState(saved);
    controller.subscribe(listener);

    controller.restoreState(throughJson(controller.getState()));

    expect(listener).not.toHaveBeenCalled();
    expect(onFilterChange).toHaveBeenCalledTimes(1);
  });

  test("keeps a restored page even when the same call changes the sort", () => {
    const onPaginationChange = vi.fn<(event: PaginationChangeEvent) => void>();
    const controller = create({
      defaultPagination: { pageIndex: 2, pageSize: 1 },
      onPaginationChange,
    });

    controller.restoreState({
      columnSort: [{ columnId: "Amount", direction: "asc" }],
      pagination: { pageIndex: 2, pageSize: 1 },
    });

    expect(controller.getState().pagination.pageIndex).toBe(2);
    expect(onPaginationChange).not.toHaveBeenCalled();
  });

  test("a sort restored without a page still sends the page back to the first", () => {
    const controller = create({
      defaultPagination: { pageIndex: 2, pageSize: 1 },
    });

    controller.restoreState({
      columnSort: [{ columnId: "Amount", direction: "asc" }],
    });

    expect(controller.getState().pagination.pageIndex).toBe(0);
  });

  test("callbacks fire once every slice is in place", () => {
    const seen: GridState<SampleRow>[] = [];
    const controller = create({
      onColumnSortChange: () => {
        seen.push(controller.getState());
      },
    });

    controller.restoreState({
      columnSort: [{ columnId: "Amount", direction: "asc" }],
      groupBy: [{ columnId: "Region" }],
    });

    expect(seen[0]?.groupBy).toEqual([{ columnId: "Region" }]);
  });

  test("a restore that throws part-way keeps, reports and shows the slices it stored", () => {
    const onColumnSortChange = vi.fn();
    const listener = vi.fn();
    const controller = create({ onColumnSortChange });
    controller.subscribe(listener);
    const corrupt = [null] as unknown as SerializedFilterState<SampleRow>;

    expect(() => {
      controller.restoreState({
        columnSort: [{ columnId: "Amount", direction: "desc" }],
        filter: corrupt,
      });
    }).toThrow(TypeError);

    expect(controller.getState().columnSort).toEqual([
      { columnId: "Amount", direction: "desc" },
    ]);
    expect(controller.getView().rows[0]?.rowId).toBe("5");
    expect(onColumnSortChange).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  test("a controlled slice is only asked", () => {
    const onColumnSortChange = vi.fn();
    const controller = create({ columnSort: [], onColumnSortChange });

    controller.restoreState({
      columnSort: [{ columnId: "Amount", direction: "asc" }],
    });

    expect(onColumnSortChange).toHaveBeenCalledTimes(1);
    expect(controller.getState().columnSort).toEqual([]);
  });
});
