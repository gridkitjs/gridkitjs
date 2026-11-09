import { afterEach, describe, expect, test, vi } from "vitest";

import type {
  ColumnDefinition,
  ColumnOrderEvent,
  ColumnResizeEvent,
  ColumnSortEvent,
  ColumnVisibilityEvent,
  FilterChangeEvent,
  FilterState,
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
      groupExpansion: { mode: "allExpanded", except: [] },
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

  test("clearColumnSort takes one column out and names it, the first key too", () => {
    const onColumnSortChange = vi.fn<(event: ColumnSortEvent) => void>();
    const controller = create({
      defaultColumnSort: [
        { columnId: "Region", direction: "asc" },
        { columnId: "Amount", direction: "desc" },
      ],
      onColumnSortChange,
    });

    controller.clearColumnSort("Region");

    expect(onColumnSortChange.mock.calls.map(([event]) => event)).toEqual([
      {
        columnId: "Region",
        sort: [{ columnId: "Amount", direction: "desc" }],
      },
    ]);
  });

  test("clearColumnSort on a column the sort leaves out reports nothing", () => {
    const onColumnSortChange = vi.fn();
    const listener = vi.fn();
    const controller = create({
      defaultColumnSort: [{ columnId: "Region", direction: "asc" }],
      onColumnSortChange,
    });
    controller.subscribe(listener);
    const state = controller.getState();

    controller.clearColumnSort("Amount");

    expect(onColumnSortChange).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
    expect(controller.getState()).toBe(state);
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

  test("a slice released from control returns to its last uncontrolled value", () => {
    const options: GridControllerOptions<SampleRow> = {
      dataSource: data,
      columns,
    };
    const controller = createGridController(options);
    controller.toggleColumnSort("Amount");
    const own = controller.getState().columnSort;

    controller.setOptions({
      ...options,
      columnSort: [{ columnId: "Id", direction: "desc" }],
    });
    controller.toggleColumnSort("Region");
    controller.setOptions(options);

    expect(controller.getState().columnSort).toBe(own);
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
    controller.setGroupExpansion({ mode: "allCollapsed", except: [] });
    controller.setGroupExpansion({ mode: "allExpanded", except: [] });

    expect(onGroupExpansionChange.mock.calls.map(([event]) => event)).toEqual([
      { groupId: first, expansion: { mode: "allExpanded", except: [first] } },
      { groupId: null, expansion: { mode: "allExpanded", except: [] } },
      { groupId: null, expansion: { mode: "allCollapsed", except: [] } },
      { groupId: null, expansion: { mode: "allExpanded", except: [] } },
    ]);
  });

  test("collapseAllGroups also collapses groups that appear after it", () => {
    const options: GridControllerOptions<SampleRow> = {
      dataSource: data.slice(0, 2),
      getRowId: (row) => String(row.Id),
      columns,
      defaultGroupBy: [{ columnId: "Region" }],
    };
    const controller = createGridController(options);

    controller.collapseAllGroups();
    controller.setOptions({ ...options, dataSource: data });

    const view = controller.getView();
    expect(
      view.displayRows.flatMap((entry) =>
        "kind" in entry && entry.kind === "group"
          ? [`${String(entry.value)}:${String(entry.expanded)}`]
          : [],
      ),
    ).toEqual(["East:false", "North:false", "West:false"]);
    expect(view.displayDataRows).toEqual([]);
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

  test("a page action that leaves the page where it is reports nothing and notifies no one", () => {
    const onPaginationChange = vi.fn();
    const listener = vi.fn();
    const controller = paginated({ onPaginationChange });
    controller.subscribe(listener);

    controller.previousPage();
    controller.goToPage(0);
    controller.goToPage(-3);
    controller.setPageSize(2);
    controller.goToPage(2);
    onPaginationChange.mockClear();
    listener.mockClear();
    controller.nextPage();
    controller.goToPage(2);
    controller.goToPage(9);

    expect(onPaginationChange).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
    expect(controller.getState().pagination).toEqual({
      pageIndex: 2,
      pageSize: 2,
    });
  });

  test("a page action from a controlled page past the last asks for the clamped page", () => {
    const onPaginationChange = vi.fn<(event: PaginationChangeEvent) => void>();
    const controller = create({
      paginated: true,
      pagination: { pageIndex: 9, pageSize: 2 },
      onPaginationChange,
    });

    controller.nextPage();

    expect(onPaginationChange.mock.calls.map(([event]) => event)).toEqual([
      { pagination: { pageIndex: 2, pageSize: 2 }, pageCount: 3 },
    ]);
  });

  test("setPagination past the last page stores and reports the last page", () => {
    const onPaginationChange = vi.fn<(event: PaginationChangeEvent) => void>();
    const controller = paginated({ onPaginationChange });

    controller.setPagination({ pageIndex: 9, pageSize: 2 });
    controller.setPagination({ pageIndex: 7, pageSize: 2 });

    expect(onPaginationChange.mock.calls.map(([event]) => event)).toEqual([
      { pagination: { pageIndex: 2, pageSize: 2 }, pageCount: 3 },
    ]);
    expect(controller.getState().pagination.pageIndex).toBe(2);
  });

  test("restoreState clamps a restored page against the slices it restored", () => {
    const onPaginationChange = vi.fn<(event: PaginationChangeEvent) => void>();
    const controller = paginated({ onPaginationChange });

    // Grouped by Region, the five rows make two pages of two groups.
    controller.restoreState({
      groupBy: [{ columnId: "Region" }],
      pagination: { pageIndex: 9, pageSize: 2 },
    });

    expect(onPaginationChange.mock.calls.map(([event]) => event)).toEqual([
      { pagination: { pageIndex: 1, pageSize: 2 }, pageCount: 2 },
    ]);
    expect(controller.getState().pagination.pageIndex).toBe(1);
  });

  test("a controlled pagination asking for the page it already has asks nothing", () => {
    const onPaginationChange = vi.fn();
    const controller = create({
      paginated: true,
      pagination: { pageIndex: 0, pageSize: 2 },
      onPaginationChange,
    });

    controller.previousPage();
    controller.goToPage(0);

    expect(onPaginationChange).not.toHaveBeenCalled();
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

  test('page actions count and clamp in data rows under paginationUnit "row"', () => {
    const onPaginationChange = vi.fn<(event: PaginationChangeEvent) => void>();
    const controller = paginated({
      defaultGroupBy: [{ columnId: "Region" }],
      paginationUnit: "row",
      onPaginationChange,
    });

    controller.goToPage(9);
    controller.setPageSize(4);

    // Five rows: three pages of two, then two pages of four.
    expect(onPaginationChange.mock.calls.map(([event]) => event)).toEqual([
      { pagination: { pageIndex: 2, pageSize: 2 }, pageCount: 3 },
      { pagination: { pageIndex: 0, pageSize: 4 }, pageCount: 2 },
    ]);
    expect(controller.getView().pageCount).toBe(2);
  });

  test("a paginationUnit change sends the page back to 0 without reporting it", () => {
    const onPaginationChange = vi.fn();
    const options: GridControllerOptions<SampleRow> = {
      dataSource: data,
      columns,
      paginated: true,
      defaultGroupBy: [{ columnId: "Region" }],
      defaultPagination: { pageIndex: 1, pageSize: 2 },
      onPaginationChange,
    };
    const controller = createGridController(options);

    controller.setOptions({ ...options, paginationUnit: "group" });

    expect(controller.getState().pagination.pageIndex).toBe(1);

    controller.setOptions({ ...options, paginationUnit: "row" });

    expect(controller.getState().pagination.pageIndex).toBe(0);
    expect(onPaginationChange).not.toHaveBeenCalled();
  });

  test("collapsing groups under a later page stores the page shown, without reporting it", () => {
    const onPaginationChange = vi.fn();
    const controller = paginated({
      defaultGroupBy: [{ columnId: "Region" }],
      paginationUnit: "row",
      onPaginationChange,
    });

    // Five rows make three pages of two; three collapsed groups make two.
    controller.goToPage(2);
    onPaginationChange.mockClear();
    controller.collapseAllGroups();

    expect(controller.getView().pageIndex).toBe(1);
    expect(controller.getState().pagination.pageIndex).toBe(1);

    controller.expandAllGroups();

    expect(controller.getView().pageIndex).toBe(1);
    expect(controller.getState().pagination.pageIndex).toBe(1);
    expect(onPaginationChange).not.toHaveBeenCalled();
  });

  test("a dataSource shrinking under a later page stores the page shown", () => {
    const options: GridControllerOptions<SampleRow> = {
      dataSource: data,
      columns,
      paginated: true,
      defaultGroupBy: [{ columnId: "Region" }],
      defaultPagination: { pageIndex: 2, pageSize: 1 },
    };
    const controller = createGridController(options);

    controller.setOptions({ ...options, dataSource: data.slice(0, 2) });

    expect(controller.getState().pagination.pageIndex).toBe(1);

    controller.setOptions(options);

    expect(controller.getState().pagination.pageIndex).toBe(1);
  });

  test("a page waiting for its rows to load is kept", () => {
    const options: GridControllerOptions<SampleRow> = {
      dataSource: [],
      columns,
      paginated: true,
      defaultPagination: { pageIndex: 2, pageSize: 2 },
    };
    const controller = createGridController(options);

    controller.setOptions({ ...options, dataSource: data });

    expect(controller.getState().pagination.pageIndex).toBe(2);
  });

  test("a controlled pagination past the last page is shown clamped and left as given", () => {
    const onPaginationChange = vi.fn();
    const controller = create({
      paginated: true,
      defaultGroupBy: [{ columnId: "Region" }],
      paginationUnit: "row",
      pagination: { pageIndex: 2, pageSize: 2 },
      onPaginationChange,
    });

    controller.collapseAllGroups();

    expect(controller.getView().pageIndex).toBe(1);
    expect(controller.getState().pagination.pageIndex).toBe(2);
    expect(onPaginationChange).not.toHaveBeenCalled();
  });
});

describe("createGridController: filter", () => {
  test("setFilter applies the filter and reports it once", () => {
    const onFilterChange =
      vi.fn<(event: FilterChangeEvent<SampleRow>) => void>();
    const controller = create({ onFilterChange });
    const filter: FilterState<SampleRow> = [
      { kind: "text", columnId: "Region", query: "West" },
    ];

    controller.setFilter(filter);
    controller.setFilter([...filter]);

    expect(controller.getView().rows.map((entry) => entry.rowId)).toEqual([
      "1",
      "3",
    ]);
    expect(onFilterChange.mock.calls).toEqual([[{ filter }]]);
  });

  test("a filter change sends the page back to 0 without reporting it", () => {
    const onPaginationChange = vi.fn();
    const controller = create({
      paginated: true,
      defaultPagination: { pageIndex: 2, pageSize: 1 },
      onPaginationChange,
    });

    controller.setFilter([{ kind: "text", columnId: "Region", query: "East" }]);

    expect(controller.getState().pagination.pageIndex).toBe(0);
    expect(onPaginationChange).not.toHaveBeenCalled();
  });

  test("a controlled filter only asks", () => {
    const onFilterChange = vi.fn();
    const controller = create({ filter: [], onFilterChange });

    controller.setFilter([{ kind: "text", columnId: "Region", query: "West" }]);

    expect(onFilterChange).toHaveBeenCalledTimes(1);
    expect(controller.getView().rows).toHaveLength(5);
  });
});

describe("createGridController: sizing", () => {
  test("resizeColumn reports every move, even at an unchanged width", () => {
    const onColumnResize = vi.fn<(event: ColumnResizeEvent) => void>();
    const controller = create({ onColumnResize });

    controller.resizeColumn("Amount", 180, "move");
    controller.resizeColumn("Amount", 180, "move");
    controller.resizeColumn("Amount", 200, "end");

    expect(onColumnResize.mock.calls.map(([event]) => event)).toEqual([
      {
        columnId: "Amount",
        width: 180,
        sizing: { Amount: 180 },
        phase: "move",
      },
      {
        columnId: "Amount",
        width: 180,
        sizing: { Amount: 180 },
        phase: "move",
      },
      { columnId: "Amount", width: 200, sizing: { Amount: 200 }, phase: "end" },
    ]);
  });

  test("cancelColumnResize puts back the column's starting entry and keeps the others", () => {
    const onColumnResize = vi.fn<(event: ColumnResizeEvent) => void>();
    const controller = create({ onColumnResize });
    const startSizing = controller.getState().columnSizing;

    controller.resizeColumn("Amount", 180, "move");
    controller.resizeColumn("Region", 90, "end");
    controller.cancelColumnResize("Amount", startSizing, 150);

    expect(controller.getState().columnSizing).toEqual({ Region: 90 });
    expect(onColumnResize.mock.calls.at(-1)?.[0]).toEqual({
      columnId: "Amount",
      width: 150,
      sizing: { Region: 90 },
      phase: "end",
    });
  });

  test("setColumnSizing names the first changed column, at its definition's width once removed", () => {
    const onColumnResize = vi.fn<(event: ColumnResizeEvent) => void>();
    const controller = create({
      columns: [{ field: "Id", width: 70 }, { field: "Region" }],
      defaultColumnSizing: { Id: 120 },
      onColumnResize,
    });

    controller.setColumnSizing({ Id: 120, Region: 90 });
    controller.setColumnSizing({ Region: 90 });
    controller.setColumnSizing({ Region: 90 });

    expect(onColumnResize.mock.calls.map(([event]) => event)).toEqual([
      {
        columnId: "Region",
        width: 90,
        sizing: { Id: 120, Region: 90 },
        phase: "end",
      },
      { columnId: "Id", width: 70, sizing: { Region: 90 }, phase: "end" },
    ]);
  });

  test("a sizing change leaves the row lists untouched", () => {
    const controller = create();
    const before = controller.getView();

    controller.resizeColumn("Amount", 180, "end");

    expect(controller.getView().rows).toBe(before.rows);
    expect(controller.getView().columns).not.toBe(before.columns);
  });
});

describe("createGridController: order", () => {
  test("moveColumn moves among every column and reports the whole order", () => {
    const onColumnOrderChange = vi.fn<(event: ColumnOrderEvent) => void>();
    const controller = create({ onColumnOrderChange });

    controller.moveColumn("Amount", "Id");
    controller.moveColumn("Amount", "Id");

    expect(onColumnOrderChange.mock.calls).toEqual([
      [{ columnId: "Amount", order: ["Amount", "Id", "Region"] }],
    ]);
    expect(controller.getView().columns.map((entry) => entry.id)).toEqual([
      "Amount",
      "Id",
      "Region",
    ]);
  });

  test("setColumnOrder names the first column whose position changed", () => {
    const onColumnOrderChange = vi.fn<(event: ColumnOrderEvent) => void>();
    const controller = create({ onColumnOrderChange });

    controller.setColumnOrder(["Region"]);
    controller.setColumnOrder(["Region"]);

    expect(onColumnOrderChange.mock.calls).toEqual([
      [{ columnId: "Region", order: ["Region"] }],
    ]);
  });

  test("a controlled order only asks", () => {
    const onColumnOrderChange = vi.fn();
    const controller = create({ columnOrder: [], onColumnOrderChange });

    controller.moveColumn("Amount", "Id");

    expect(onColumnOrderChange).toHaveBeenCalledTimes(1);
    expect(controller.getState().columnOrder).toEqual([]);
  });
});

describe("createGridController: visibility", () => {
  test("hideColumns and showColumns report once per call, in display order", () => {
    const onColumnVisibilityChange =
      vi.fn<(event: ColumnVisibilityEvent) => void>();
    const controller = create({ onColumnVisibilityChange });

    controller.hideColumns(["Amount", "Id"]);
    controller.hideColumns(["Amount"]);
    controller.showColumns(["Id"]);

    expect(onColumnVisibilityChange.mock.calls.map(([event]) => event)).toEqual(
      [
        {
          columnIds: ["Id", "Amount"],
          visibility: { Amount: false, Id: false },
        },
        { columnIds: ["Id"], visibility: { Amount: false, Id: true } },
      ],
    );
    expect(controller.getView().columns.map((entry) => entry.id)).toEqual([
      "Id",
      "Region",
    ]);
  });

  test("setColumnVisibility reports every entry that changed", () => {
    const onColumnVisibilityChange =
      vi.fn<(event: ColumnVisibilityEvent) => void>();
    const controller = create({
      defaultColumnVisibility: { Region: false },
      onColumnVisibilityChange,
    });

    controller.setColumnVisibility({ Amount: false });
    controller.setColumnVisibility({ Amount: false });

    expect(onColumnVisibilityChange.mock.calls).toEqual([
      [{ columnIds: ["Region", "Amount"], visibility: { Amount: false } }],
    ]);
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

  test("are called once by clearSelection, after each changed slice's callback", () => {
    const onRowSelectionChange = vi.fn();
    const onColumnSelectionChange = vi.fn();
    const onCellSelectionChange = vi.fn();
    const controller = create({
      defaultRowSelection: ["1"],
      defaultColumnSelection: ["Id"],
      defaultCellSelection: { rowId: "2", columnId: "Region" },
      onRowSelectionChange,
      onColumnSelectionChange,
      onCellSelectionChange,
    });
    const seen: unknown[] = [];
    controller.subscribe(() => {
      seen.push(controller.getState());
    });

    controller.clearSelection();

    expect(seen).toEqual([
      expect.objectContaining({
        rowSelection: [],
        columnSelection: [],
        cellSelection: null,
      }),
    ]);
    expect(onRowSelectionChange).toHaveBeenCalledTimes(1);
    expect(onColumnSelectionChange).toHaveBeenCalledTimes(1);
    expect(onCellSelectionChange).toHaveBeenCalledTimes(1);
  });

  test("are not called when a controlled slice only asks for a change", () => {
    const onColumnSortChange = vi.fn();
    const controller = create({ columnSort: [], onColumnSortChange });
    const listener = vi.fn();
    controller.subscribe(listener);
    const state = controller.getState();

    controller.toggleColumnSort("Amount");

    expect(onColumnSortChange).toHaveBeenCalledTimes(1);
    expect(listener).not.toHaveBeenCalled();
    expect(controller.getState()).toBe(state);
  });

  test("are not called by clearSelection when every selection is controlled", () => {
    const onRowSelectionChange = vi.fn();
    const onColumnSelectionChange = vi.fn();
    const onCellSelectionChange = vi.fn();
    const controller = create({
      rowSelection: ["1"],
      columnSelection: ["Id"],
      cellSelection: { rowId: "2", columnId: "Region" },
      onRowSelectionChange,
      onColumnSelectionChange,
      onCellSelectionChange,
    });
    const listener = vi.fn();
    controller.subscribe(listener);

    controller.clearSelection();

    expect(onRowSelectionChange).toHaveBeenCalledTimes(1);
    expect(onColumnSelectionChange).toHaveBeenCalledTimes(1);
    expect(onCellSelectionChange).toHaveBeenCalledTimes(1);
    expect(listener).not.toHaveBeenCalled();
  });

  test("are called once by clearSelection when only an uncontrolled slice changed", () => {
    const controller = create({
      rowSelection: ["1"],
      defaultColumnSelection: ["Id"],
    });
    const listener = vi.fn();
    controller.subscribe(listener);

    controller.clearSelection();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(controller.getState().columnSelection).toEqual([]);
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
