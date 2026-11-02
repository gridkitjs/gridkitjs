import { afterEach, describe, expect, test, vi } from "vitest";

import type {
  ColumnDefinition,
  ColumnSortEvent,
  GroupByEvent,
  GroupExpansionEvent,
  PaginationChangeEvent,
} from "../types";
import { createGridController } from "./createGridController";
import type { GridControllerOptions } from "./gridController";

/** The global core's `lib` leaves out — see `util/report.ts`. */
declare const console: { error: (message: string) => void };

interface SampleRow {
  Id: number;
  Region: string;
  Amount: number;
}

const data: readonly SampleRow[] = [
  { Id: 1, Region: "West", Amount: 10 },
  { Id: 2, Region: "East", Amount: 20 },
  { Id: 3, Region: "West", Amount: 30 },
  { Id: 4, Region: "North", Amount: 40 },
  { Id: 5, Region: "East", Amount: 50 },
];

const columns: readonly ColumnDefinition<SampleRow>[] = [
  { field: "Id", type: "number" },
  { field: "Region" },
  { field: "Amount", type: "number" },
];

function create(options: GridControllerOptions<SampleRow> = {}) {
  return createGridController<SampleRow>({
    dataSource: data,
    getRowId: (row) => String(row.Id),
    columns,
    ...options,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createGridController: state and view", () => {
  test("starts each slice from its default", () => {
    const controller = create({
      defaultColumnSort: [{ columnId: "Amount", direction: "desc" }],
      defaultGroupBy: [{ columnId: "Region" }],
      defaultPagination: { pageIndex: 1, pageSize: 2 },
    });

    expect(controller.getState()).toMatchObject({
      columnSort: [{ columnId: "Amount", direction: "desc" }],
      groupBy: [{ columnId: "Region" }],
      groupExpansion: [],
      pagination: { pageIndex: 1, pageSize: 2 },
    });
  });

  test("an omitted defaultPagination starts at page 0 of 25 rows", () => {
    expect(create().getState().pagination).toEqual({
      pageIndex: 0,
      pageSize: 25,
    });
  });

  test("derives the view from the options and the state", () => {
    const controller = create({
      defaultColumnSort: [{ columnId: "Amount", direction: "desc" }],
    });

    expect(controller.getView().rows.map((entry) => entry.rowId)).toEqual([
      "5",
      "4",
      "3",
      "2",
      "1",
    ]);
  });

  test("infers one column per field when given none", () => {
    const controller = create({ columns: undefined });

    expect(controller.getView().dataColumns.map((entry) => entry.id)).toEqual([
      "Id",
      "Region",
      "Amount",
    ]);
  });

  test("returns the same state and view objects until something changes", () => {
    const controller = create();
    const state = controller.getState();
    const view = controller.getView();

    controller.setOptions({ ...controller.getOptions() });

    expect(controller.getState()).toBe(state);
    expect(controller.getView()).toBe(view);
  });

  test("setOptions with new rows changes the view without notifying", () => {
    const controller = create();
    const listener = vi.fn();
    controller.subscribe(listener);

    controller.setOptions({ ...controller.getOptions(), dataSource: [] });

    expect(controller.getView().rows).toEqual([]);
    expect(listener).not.toHaveBeenCalled();
  });
});

describe("createGridController: sort", () => {
  test("toggleColumnSort reports the column and the whole sort", () => {
    const onColumnSortChange = vi.fn<(event: ColumnSortEvent) => void>();
    const controller = create({ onColumnSortChange });

    controller.toggleColumnSort("Amount");
    controller.toggleColumnSort("Region", { stack: true });

    expect(onColumnSortChange.mock.calls).toEqual([
      [
        {
          columnId: "Amount",
          sort: [{ columnId: "Amount", direction: "asc" }],
        },
      ],
      [
        {
          columnId: "Region",
          sort: [
            { columnId: "Amount", direction: "asc" },
            { columnId: "Region", direction: "asc" },
          ],
        },
      ],
    ]);
    expect(controller.getState().columnSort).toHaveLength(2);
  });

  test("setColumnSort names the first column that changed", () => {
    const onColumnSortChange = vi.fn<(event: ColumnSortEvent) => void>();
    const controller = create({
      defaultColumnSort: [{ columnId: "Region", direction: "asc" }],
      onColumnSortChange,
    });

    controller.setColumnSort([
      { columnId: "Region", direction: "asc" },
      { columnId: "Amount", direction: "desc" },
    ]);
    controller.setColumnSort([]);

    expect(onColumnSortChange.mock.calls.map(([event]) => event)).toEqual([
      {
        columnId: "Amount",
        sort: [
          { columnId: "Region", direction: "asc" },
          { columnId: "Amount", direction: "desc" },
        ],
      },
      { columnId: "Region", sort: [] },
    ]);
  });

  test("setColumnSort with an equal sort reports nothing", () => {
    const onColumnSortChange = vi.fn();
    const listener = vi.fn();
    const controller = create({
      defaultColumnSort: [{ columnId: "Region", direction: "asc" }],
      onColumnSortChange,
    });
    controller.subscribe(listener);
    const state = controller.getState();

    controller.setColumnSort([{ columnId: "Region", direction: "asc" }]);

    expect(onColumnSortChange).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
    expect(controller.getState()).toBe(state);
  });

  test("a controlled sort only asks, and applies once the option follows", () => {
    const onColumnSortChange = vi.fn<(event: ColumnSortEvent) => void>();
    const options: GridControllerOptions<SampleRow> = {
      dataSource: data,
      columns,
      columnSort: [],
      onColumnSortChange,
    };
    const controller = createGridController(options);

    controller.toggleColumnSort("Amount");

    expect(onColumnSortChange).toHaveBeenCalledTimes(1);
    expect(controller.getState().columnSort).toEqual([]);
    expect(controller.getView().rows[0]?.row.Id).toBe(1);

    const requested = onColumnSortChange.mock.calls[0]?.[0].sort ?? [];
    controller.setOptions({ ...options, columnSort: requested });

    expect(controller.getState().columnSort).toBe(requested);
  });

  test("going from controlled to uncontrolled picks up the controller's own sort", () => {
    const options: GridControllerOptions<SampleRow> = {
      dataSource: data,
      columns,
      columnSort: [{ columnId: "Amount", direction: "desc" }],
    };
    const controller = createGridController(options);

    controller.setOptions({ ...options, columnSort: undefined });

    expect(controller.getState().columnSort).toEqual([]);
  });
});

describe("createGridController: grouping", () => {
  test("toggleGroupBy adds then removes a level", () => {
    const onGroupByChange = vi.fn<(event: GroupByEvent) => void>();
    const controller = create({ onGroupByChange });

    controller.toggleGroupBy("Region");
    controller.toggleGroupBy("Region");

    expect(onGroupByChange.mock.calls.map(([event]) => event)).toEqual([
      { columnId: "Region", groupBy: [{ columnId: "Region" }] },
      { columnId: "Region", groupBy: [] },
    ]);
  });

  test("moveGroupBy repositions a level, and a move in place reports nothing", () => {
    const onGroupByChange = vi.fn<(event: GroupByEvent) => void>();
    const controller = create({
      defaultGroupBy: [{ columnId: "Region" }, { columnId: "Amount" }],
      onGroupByChange,
    });

    controller.moveGroupBy("Amount", "Region");
    controller.moveGroupBy("Amount", "Region");

    expect(onGroupByChange.mock.calls.map(([event]) => event)).toEqual([
      {
        columnId: "Amount",
        groupBy: [{ columnId: "Amount" }, { columnId: "Region" }],
      },
    ]);
  });

  test("setGroupBy names the first level that changed", () => {
    const onGroupByChange = vi.fn<(event: GroupByEvent) => void>();
    const controller = create({ onGroupByChange });

    controller.setGroupBy([{ columnId: "Region" }]);
    controller.setGroupBy([{ columnId: "Region" }]);

    expect(onGroupByChange.mock.calls.map(([event]) => event)).toEqual([
      { columnId: "Region", groupBy: [{ columnId: "Region" }] },
    ]);
  });

  test("expansion actions report the group, or null for all at once", () => {
    const onGroupExpansionChange =
      vi.fn<(event: GroupExpansionEvent) => void>();
    const controller = create({
      defaultGroupBy: [{ columnId: "Region" }],
      onGroupExpansionChange,
    });
    const groupIds = controller
      .getView()
      .displayRows.flatMap((entry) =>
        "kind" in entry && entry.kind === "group" ? [entry.groupId] : [],
      );
    const [first = ""] = groupIds;

    controller.toggleGroupExpansion(first);
    controller.expandAllGroups();
    controller.expandAllGroups();
    controller.collapseAllGroups();
    controller.setGroupExpansion([]);

    expect(onGroupExpansionChange.mock.calls.map(([event]) => event)).toEqual([
      { groupId: first, expansion: [first] },
      { groupId: null, expansion: [] },
      { groupId: null, expansion: groupIds },
      { groupId: null, expansion: [] },
    ]);
  });
});

describe("createGridController: pagination", () => {
  function paginated(options: GridControllerOptions<SampleRow> = {}) {
    return create({
      paginated: true,
      defaultPagination: { pageIndex: 0, pageSize: 2 },
      ...options,
    });
  }

  test("page actions clamp into range and report the page count", () => {
    const onPaginationChange = vi.fn<(event: PaginationChangeEvent) => void>();
    const controller = paginated({ onPaginationChange });

    controller.goToPage(9);
    controller.previousPage();
    controller.nextPage();
    controller.setPageSize(4);

    expect(onPaginationChange.mock.calls.map(([event]) => event)).toEqual([
      { pagination: { pageIndex: 2, pageSize: 2 }, pageCount: 3 },
      { pagination: { pageIndex: 1, pageSize: 2 }, pageCount: 3 },
      { pagination: { pageIndex: 2, pageSize: 2 }, pageCount: 3 },
      { pagination: { pageIndex: 0, pageSize: 4 }, pageCount: 2 },
    ]);
    expect(controller.getView().pageIndex).toBe(0);
  });

  test("setPagination keeps the value as given and reports an equal one not at all", () => {
    const onPaginationChange = vi.fn<(event: PaginationChangeEvent) => void>();
    const controller = paginated({ onPaginationChange });

    controller.setPagination({ pageIndex: 1, pageSize: 2 });
    controller.setPagination({ pageIndex: 1, pageSize: 2 });

    expect(onPaginationChange.mock.calls.map(([event]) => event)).toEqual([
      { pagination: { pageIndex: 1, pageSize: 2 }, pageCount: 3 },
    ]);
    expect(controller.getState().pagination).toEqual({
      pageIndex: 1,
      pageSize: 2,
    });
  });

  test("a sort, grouping or filter change sends the page back to 0 without reporting it", () => {
    const onPaginationChange = vi.fn();
    const controller = paginated({ onPaginationChange });

    controller.goToPage(2);
    onPaginationChange.mockClear();
    controller.toggleColumnSort("Amount");

    expect(controller.getState().pagination.pageIndex).toBe(0);

    controller.goToPage(1);
    onPaginationChange.mockClear();
    controller.toggleGroupBy("Region");

    expect(controller.getState().pagination.pageIndex).toBe(0);
    expect(onPaginationChange).not.toHaveBeenCalled();
  });

  test("a controlled sort arriving through setOptions resets the page too", () => {
    const options: GridControllerOptions<SampleRow> = {
      dataSource: data,
      columns,
      paginated: true,
      columnSort: [],
      defaultPagination: { pageIndex: 2, pageSize: 2 },
    };
    const controller = createGridController(options);

    controller.setOptions({
      ...options,
      columnSort: [{ columnId: "Amount", direction: "asc" }],
    });

    expect(controller.getState().pagination.pageIndex).toBe(0);
  });

  test("a controlled pagination is left for the caller to reset", () => {
    const onPaginationChange = vi.fn();
    const controller = create({
      paginated: true,
      pagination: { pageIndex: 2, pageSize: 2 },
      onPaginationChange,
    });

    controller.toggleColumnSort("Amount");

    expect(controller.getState().pagination.pageIndex).toBe(2);
    expect(onPaginationChange).not.toHaveBeenCalled();
  });

  test("a controlled pagination only asks", () => {
    const onPaginationChange = vi.fn<(event: PaginationChangeEvent) => void>();
    const controller = create({
      paginated: true,
      pagination: { pageIndex: 0, pageSize: 2 },
      onPaginationChange,
    });

    controller.nextPage();

    expect(onPaginationChange.mock.calls[0]?.[0].pagination).toEqual({
      pageIndex: 1,
      pageSize: 2,
    });
    expect(controller.getState().pagination.pageIndex).toBe(0);
  });
});

describe("createGridController: subscribers", () => {
  test("are called once per action that changed something", () => {
    const controller = create({ paginated: true });
    const listener = vi.fn();
    controller.subscribe(listener);

    controller.toggleColumnSort("Amount");
    controller.toggleGroupBy("Region");
    controller.moveGroupBy("Region", null);
    controller.expandAllGroups();

    expect(listener).toHaveBeenCalledTimes(2);
  });

  test("see the change when called", () => {
    const controller = create();
    const seen: unknown[] = [];
    controller.subscribe(() => {
      seen.push(controller.getState().columnSort);
    });

    controller.toggleColumnSort("Amount");

    expect(seen).toEqual([[{ columnId: "Amount", direction: "asc" }]]);
  });

  test("stop being called once unsubscribed", () => {
    const controller = create();
    const listener = vi.fn();
    const unsubscribe = controller.subscribe(listener);

    unsubscribe();
    controller.toggleColumnSort("Amount");

    expect(listener).not.toHaveBeenCalled();
  });
});

describe("createGridController: conflicting options", () => {
  test("a slice given both controlled and as a default is reported once", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {
      // Silenced: the call itself is what this test checks.
    });
    const options: GridControllerOptions<SampleRow> = {
      columnSort: [],
      defaultColumnSort: [{ columnId: "Amount", direction: "asc" }],
    };

    const controller = createGridController(options);
    controller.setOptions({ ...options });

    expect(error).toHaveBeenCalledTimes(1);
    expect(error.mock.calls[0]?.[0]).toContain("`defaultColumnSort`");
    expect(controller.getState().columnSort).toEqual([]);
  });
});
