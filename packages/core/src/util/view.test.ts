import { describe, expect, test } from "vitest";

import type {
  AggregateState,
  ColumnDefinition,
  GridViewState,
  GridViewInput,
  ResolvedRow,
} from "../types";
import { computeAggregates, withGroupAggregates } from "./aggregation";
import { ALL_EXPANDED, groupRows } from "./grouping";
import { resolveDataColumns } from "./ordering";
import { paginateRows } from "./paging";
import { resolveShownRows } from "./rows";
import { createGridViewResolver, resolveGridView } from "./view";

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

const emptyState: GridViewState<SampleRow> = {
  columnSizing: {},
  columnOrder: [],
  columnVisibility: {},
  columnPinning: {},
  columnSort: [],
  filter: [],
  groupBy: [],
  groupExpansion: ALL_EXPANDED,
  pagination: { pageIndex: 0, pageSize: 25 },
};

const amountTotal: AggregateState<SampleRow> = [
  { columnId: "Amount", fn: "sum" },
];

function input(
  state: Partial<GridViewState<SampleRow>> = {},
  options: GridViewInput<SampleRow>["options"] = {},
): GridViewInput<SampleRow> {
  return {
    rows: data,
    getRowId: (row) => String(row.Id),
    columns,
    state: { ...emptyState, ...state },
    options,
  };
}

function idsOf(rows: readonly ResolvedRow<SampleRow>[]): readonly number[] {
  return rows.map((entry) => entry.row.Id);
}

describe("resolveGridView", () => {
  test("identifies rows with getRowId", () => {
    const view = resolveGridView(input());

    expect(view.rows.map((entry) => entry.rowId)).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
    ]);
  });

  test("reads a slice left out as its starting default", () => {
    const given = {
      rows: data,
      getRowId: (row: SampleRow) => String(row.Id),
      columns,
      options: { paginated: true, aggregates: amountTotal },
    };
    const sorted = {
      columnSort: [{ columnId: "Amount", direction: "desc" }],
    } satisfies Partial<GridViewState<SampleRow>>;

    expect(resolveGridView({ ...given, state: {} })).toEqual(
      resolveGridView({ ...given, state: emptyState }),
    );
    expect(resolveGridView({ ...given, state: sorted })).toEqual(
      resolveGridView({ ...given, state: { ...emptyState, ...sorted } }),
    );
    expect(
      resolveGridView({ ...given, state: { ...sorted, filter: undefined } }),
    ).toEqual(
      resolveGridView({ ...given, state: { ...emptyState, ...sorted } }),
    );
  });

  test("starts on the first page of 25 when pagination is left out", () => {
    const rows = Array.from({ length: 30 }, (_, index) => ({
      Id: index + 1,
      Region: "West",
      Amount: index,
    }));

    const view = resolveGridView({
      rows,
      columns,
      state: {},
      options: { paginated: true },
    });

    expect(view.pageIndex).toBe(0);
    expect(view.pageCount).toBe(2);
    expect(view.pageRows).toHaveLength(25);
  });

  test("tags every resolved row as a data row", () => {
    const view = resolveGridView(input());

    expect(view.rows.map((entry) => entry.kind)).toEqual(
      data.map(() => "data"),
    );
  });

  test("filters then sorts the rows", () => {
    const view = resolveGridView(
      input({
        filter: [{ kind: "text", columnId: "Region", query: "%e%" }],
        columnSort: [{ columnId: "Amount", direction: "desc" }],
      }),
    );

    expect(idsOf(view.rows)).toEqual([5, 3, 2, 1]);
  });

  test("grouped and paginated, matches composing the stages by hand", () => {
    const state: Partial<GridViewState<SampleRow>> = {
      columnSort: [{ columnId: "Id", direction: "desc" }],
      groupBy: [{ columnId: "Region" }],
      pagination: { pageIndex: 1, pageSize: 2 },
    };
    const view = resolveGridView(
      input(state, {
        paginated: true,
        aggregates: amountTotal,
        groupAggregateDisplay: "row",
      }),
    );

    const dataColumns = resolveDataColumns(columns, []);
    const identified = data.map((row, index) => ({
      kind: "data" as const,
      rowId: String(row.Id),
      row,
      rowIndex: index,
      datasetIndex: index,
    }));
    const shown = resolveShownRows(
      identified,
      [],
      [{ columnId: "Id", direction: "desc" }],
      dataColumns,
    );
    const groupBy = [{ columnId: "Region" }];
    const aggregated = withGroupAggregates(
      groupRows(shown, groupBy, ALL_EXPANDED, dataColumns),
      shown,
      groupBy,
      amountTotal,
      dataColumns,
      "row",
    );
    const page = paginateRows(aggregated, { pageIndex: 1, pageSize: 2 });

    expect(view.displayRows).toEqual(aggregated);
    expect(view.pageRows).toEqual(page.rows);
    expect(view.pageCount).toBe(2);
    expect(view.pageIndex).toBe(1);
  });

  test("never splits a group across pages", () => {
    const view = resolveGridView(
      input(
        {
          groupBy: [{ columnId: "Region" }],
          pagination: { pageIndex: 0, pageSize: 1 },
        },
        { paginated: true },
      ),
    );

    // One unit per page: East's header and both its rows.
    expect(view.pageRows).toHaveLength(3);
    expect(idsOf(view.displayDataRows)).toEqual([2, 5]);
  });

  test('pages by data rows under paginationUnit "row"', () => {
    const view = resolveGridView(
      input(
        {
          groupBy: [{ columnId: "Region" }],
          pagination: { pageIndex: 1, pageSize: 1 },
        },
        { paginated: true, paginationUnit: "row" },
      ),
    );

    // East's second row, under East's header repeated from page 0.
    expect(view.pageCount).toBe(5);
    expect(view.pageRows).toHaveLength(2);
    expect(idsOf(view.displayDataRows)).toEqual([5]);
  });

  describe("datasetIndex", () => {
    const sequence = (length: number) =>
      Array.from({ length }, (_unused, index) => index);

    test("numbers a filtered, sorted grid's rows in the order shown", () => {
      const view = resolveGridView(
        input({
          filter: [{ kind: "text", columnId: "Region", query: "%e%" }],
          columnSort: [{ columnId: "Amount", direction: "desc" }],
        }),
      );

      expect(idsOf(view.rows)).toEqual([5, 3, 2, 1]);
      expect(view.displayRows.map((entry) => entry.datasetIndex)).toEqual(
        sequence(4),
      );
    });

    test("numbers group headers, data rows and summary rows as one sequence", () => {
      const view = resolveGridView(
        input(
          { groupBy: [{ columnId: "Region" }] },
          { aggregates: amountTotal, groupAggregateDisplay: "row" },
        ),
      );

      // East: header, 2, 5, summary; North: header, 4, summary; West:
      // header, 1, 3, summary.
      expect(view.displayRows).toHaveLength(11);
      expect(view.displayRows.map((entry) => entry.datasetIndex)).toEqual(
        sequence(11),
      );
      // A group's first data row comes after its header, not alongside it.
      const [header, firstRow] = view.displayRows;
      expect(header?.datasetIndex).toBe(0);
      expect(firstRow?.datasetIndex).toBe(1);
    });

    test("keeps each row's place in the whole result on every page", () => {
      const state = {
        columnSort: [{ columnId: "Id", direction: "desc" as const }],
        groupBy: [{ columnId: "Region" }],
      };
      const pages = [0, 1, 2].map(
        (pageIndex) =>
          resolveGridView(
            input(
              { ...state, pagination: { pageIndex, pageSize: 1 } },
              { paginated: true },
            ),
          ).pageRows,
      );

      expect(pages.flat().map((entry) => entry.datasetIndex)).toEqual(
        sequence(8),
      );
      expect(pages.map((rows) => rows.map((entry) => entry.rowIndex))).toEqual([
        [0, 1, 2],
        [0, 1],
        [0, 1, 2],
      ]);
    });
  });

  test("reports one page at index 0 when not paginated, whatever pagination holds", () => {
    const view = resolveGridView(
      input({ pagination: { pageIndex: 3, pageSize: 2 } }),
    );

    expect(view.pageCount).toBe(1);
    expect(view.pageIndex).toBe(0);
    expect(view.pageRows).toBe(view.displayRows);
  });

  test("computes the grand total over every row, ignoring paging", () => {
    const view = resolveGridView(
      input(
        { pagination: { pageIndex: 0, pageSize: 2 } },
        { paginated: true, aggregates: amountTotal },
      ),
    );

    expect(view.pageRows).toHaveLength(2);
    expect(view.grandTotal.get("Amount")).toBe(150);
    expect(view.grandTotal).toEqual(
      computeAggregates(data, amountTotal, view.dataColumns),
    );
  });

  test("uses the filtered rows themselves as displayDataRows when ungrouped and unpaginated", () => {
    const view = resolveGridView(input());

    expect(view.displayDataRows).toBe(view.rows);
  });

  test("orders dataColumns and columns alike", () => {
    const view = resolveGridView(
      input({ columnOrder: ["Amount"], columnSizing: { Region: 222 } }),
    );

    expect(view.dataColumns.map((entry) => entry.id)).toEqual([
      "Amount",
      "Id",
      "Region",
    ]);
    expect(view.columns.map((entry) => entry.id)).toEqual([
      "Amount",
      "Id",
      "Region",
    ]);
    expect(view.columns[2]?.width).toBe(222);
  });

  test("fits columns to viewportWidth under resizeMode fit, and not under fixed", () => {
    const sizes = { width: 100 };
    const fit = resolveGridView(
      input({}, { columnSizeDefaults: sizes, viewportWidth: 600 }),
    );
    const fixed = resolveGridView(
      input(
        {},
        { columnSizeDefaults: sizes, viewportWidth: 600, resizeMode: "fixed" },
      ),
    );

    expect(fit.columns.reduce((sum, entry) => sum + entry.width, 0)).toBe(600);
    expect(fixed.columns.map((entry) => entry.width)).toEqual([100, 100, 100]);
  });

  test("drops a hidden column from columns but keeps it in dataColumns", () => {
    const view = resolveGridView(
      input({ columnVisibility: { Region: false } }),
    );

    expect(view.dataColumns.map((entry) => entry.id)).toEqual([
      "Id",
      "Region",
      "Amount",
    ]);
    expect(view.columns.map((entry) => entry.id)).toEqual(["Id", "Amount"]);
  });

  test("still sorts and filters by a hidden column", () => {
    const view = resolveGridView(
      input({
        columnVisibility: { Region: false },
        filter: [{ kind: "text", columnId: "Region", query: "%st" }],
        columnSort: [{ columnId: "Region", direction: "asc" }],
      }),
    );

    expect(idsOf(view.rows)).toEqual([2, 5, 1, 3]);
  });

  test("keeps a hidden column's slot in the order, so it returns there when shown", () => {
    const state = { columnOrder: ["Amount", "Region", "Id"] };
    const hidden = resolveGridView(
      input({ ...state, columnVisibility: { Region: false } }),
    );
    const shown = resolveGridView(
      input({ ...state, columnVisibility: { Region: true } }),
    );

    expect(hidden.columns.map((entry) => entry.id)).toEqual(["Amount", "Id"]);
    expect(shown.columns.map((entry) => entry.id)).toEqual([
      "Amount",
      "Region",
      "Id",
    ]);
  });

  test("gives a hidden column no share of a fitted width", () => {
    const view = resolveGridView(
      input(
        { columnVisibility: { Region: false } },
        { columnSizeDefaults: { width: 100 }, viewportWidth: 600 },
      ),
    );

    expect(view.columns.map((entry) => entry.width)).toEqual([300, 300]);
  });

  test("applies the grid-level column defaults", () => {
    const view = resolveGridView(
      input({}, { resizableColumns: true, reorderableColumns: true }),
    );

    expect(view.columns.every((entry) => entry.resizable)).toBe(true);
    expect(view.columns.every((entry) => entry.reorderable)).toBe(true);
  });
});

describe("resolveGridView: rowCount", () => {
  test("counts the rows left after filtering", () => {
    const view = resolveGridView(
      input({ filter: [{ kind: "text", columnId: "Region", query: "West" }] }),
    );

    expect(view.rowCount).toBe(2);
  });

  test("counts every display row once grouped, as aria-rowcount does, across every page", () => {
    const view = resolveGridView(
      input(
        {
          groupBy: [{ columnId: "Region" }],
          pagination: { pageIndex: 0, pageSize: 1 },
        },
        { paginated: true },
      ),
    );

    expect(view.rowCount).toBe(8); // 3 group headers and 5 rows
    expect(view.rowCount).toBe(view.displayRows.length);
  });
});

describe('resolveGridView: dataMode "server"', () => {
  const server = { dataMode: "server" } as const;
  const serverPaged = { ...server, paginated: true, rowCount: 23 } as const;

  function pagedAt(pageIndex: number, rowCount = 23) {
    return resolveGridView(
      input(
        { pagination: { pageIndex, pageSize: 5 } },
        { ...serverPaged, rowCount },
      ),
    );
  }

  test("keeps the rows in the order given, whatever the sort and filter say", () => {
    const view = resolveGridView(
      input(
        {
          columnSort: [{ columnId: "Amount", direction: "desc" }],
          filter: [{ kind: "text", columnId: "Region", query: "West" }],
        },
        server,
      ),
    );

    expect(idsOf(view.rows)).toEqual([1, 2, 3, 4, 5]);
    expect(idsOf(view.displayDataRows)).toEqual([1, 2, 3, 4, 5]);
  });

  test("shows every row given as the page state names, counting pages from rowCount", () => {
    const view = pagedAt(3);

    expect(view.pageCount).toBe(5); // 23 rows at 5 a page
    expect(view.pageIndex).toBe(3);
    expect(view.pageRows).toHaveLength(5);
  });

  test("counts one page when rowCount fills exactly one", () => {
    expect(pagedAt(0, 5).pageCount).toBe(1);
  });

  test("counts a last partial page and shows the rows given there", () => {
    const lastPage = resolveGridView({
      ...input({ pagination: { pageIndex: 4, pageSize: 5 } }, serverPaged),
      rows: data.slice(0, 3),
    });

    expect(lastPage.pageCount).toBe(5);
    expect(lastPage.pageIndex).toBe(4);
    expect(idsOf(lastPage.displayDataRows)).toEqual([1, 2, 3]);
  });

  test("reports no pages for a rowCount of 0", () => {
    const view = resolveGridView({
      ...input({ pagination: { pageIndex: 2, pageSize: 5 } }, serverPaged),
      rows: [],
      options: { ...serverPaged, rowCount: 0 },
    });

    expect(view.pageCount).toBe(0);
    expect(view.pageIndex).toBe(0);
    expect(view.pageRows).toEqual([]);
  });

  test("clamps a page index beyond the count to the last page", () => {
    const view = pagedAt(9);

    expect(view.pageIndex).toBe(4);
  });

  test("follows a rowCount that shrinks while on the last page", () => {
    expect(pagedAt(4).pageIndex).toBe(4);

    const shrunk = pagedAt(4, 12);

    expect(shrunk.pageCount).toBe(3);
    expect(shrunk.pageIndex).toBe(2);
  });

  test("falls back to the rows given without a rowCount", () => {
    const view = resolveGridView(
      input(
        { pagination: { pageIndex: 3, pageSize: 5 } },
        { ...serverPaged, rowCount: undefined },
      ),
    );

    expect(view.pageCount).toBe(1);
    expect(view.pageIndex).toBe(0);
    expect(view.rowCount).toBe(5);
  });

  test("numbers each row by its place in the whole result on page 0 and page 3", () => {
    const first = pagedAt(0);
    const fourth = pagedAt(3);

    expect(first.pageRows.map((entry) => entry.datasetIndex)).toEqual([
      0, 1, 2, 3, 4,
    ]);
    expect(fourth.pageRows.map((entry) => entry.datasetIndex)).toEqual([
      15, 16, 17, 18, 19,
    ]);
    expect(fourth.pageRows.map((entry) => entry.rowIndex)).toEqual([
      0, 1, 2, 3, 4,
    ]);
    expect(fourth.displayDataRows.map((entry) => entry.datasetIndex)).toEqual([
      15, 16, 17, 18, 19,
    ]);
  });

  test("not paginated, shows every row given as one page, numbered from 0", () => {
    const view = resolveGridView(
      input(
        { pagination: { pageIndex: 3, pageSize: 5 } },
        { ...server, rowCount: 23 },
      ),
    );

    expect(view.pageCount).toBe(1);
    expect(view.pageIndex).toBe(0);
    expect(view.pageRows).toBe(view.displayRows);
    expect(view.rowCount).toBe(23);
  });

  test("reports rowCount as the option's value", () => {
    expect(pagedAt(0).rowCount).toBe(23);
  });

  test("groups the rows given, and group headers add nothing to the page count", () => {
    const view = resolveGridView(
      input(
        {
          groupBy: [{ columnId: "Region" }],
          pagination: { pageIndex: 1, pageSize: 5 },
        },
        serverPaged,
      ),
    );

    expect(view.pageCount).toBe(5);
    expect(view.pageRows).toHaveLength(8); // 3 group headers and 5 rows
    expect(view.pageRows.map((entry) => entry.datasetIndex)).toEqual([
      5, 6, 7, 8, 9, 10, 11, 12,
    ]);
    // The server's 23 rows, with the 3 headers on this page added.
    expect(view.rowCount).toBe(26);
  });

  test("leaves out the rows a collapsed group hides from rowCount", () => {
    const view = resolveGridView(
      input(
        {
          groupBy: [{ columnId: "Region" }],
          groupExpansion: { mode: "allCollapsed", except: [] },
        },
        serverPaged,
      ),
    );

    expect(view.displayRows).toHaveLength(3);
    expect(view.rowCount).toBe(21); // 23 - 5 rows given + 3 headers
  });

  test("ignores paginationUnit", () => {
    const state = {
      groupBy: [{ columnId: "Region" }],
      pagination: { pageIndex: 1, pageSize: 2 },
    } satisfies Partial<GridViewState<SampleRow>>;
    const byGroup = resolveGridView(
      input(state, { ...serverPaged, paginationUnit: "group" }),
    );
    const byRow = resolveGridView(
      input(state, { ...serverPaged, paginationUnit: "row" }),
    );

    expect(byRow).toEqual(byGroup);
    expect(byRow.pageCount).toBe(12); // 23 rows at 2 a page
  });

  test("computes the grand total over the rows given", () => {
    const view = resolveGridView(
      input({}, { ...serverPaged, aggregates: amountTotal }),
    );

    expect(view.grandTotal).toEqual(
      computeAggregates(data, amountTotal, view.dataColumns),
    );
  });

  test("a rowCount change re-pages without regrouping", () => {
    const resolve = createGridViewResolver<SampleRow>();
    const base = input({ groupBy: [{ columnId: "Region" }] }, serverPaged);
    const before = resolve(base);
    const after = resolve({
      ...base,
      options: { ...serverPaged, rowCount: 40 },
    });

    expect(after.displayRows).toBe(before.displayRows);
    expect(after.pageCount).toBe(2);
    expect(before.pageCount).toBe(1);
  });
});

describe("resolveGridView: pinned columns", () => {
  const wide: readonly ColumnDefinition<SampleRow>[] = [
    { field: "Id", width: 60 },
    { field: "Region", width: 120, pinned: "end" },
    { field: "Amount", width: 90 },
    { field: "Owner", width: 80, pinned: "start" },
    { field: "Notes", width: 200 },
  ];
  const fixed = { resizeMode: "fixed" } as const;

  function pinnedView(
    state: Partial<GridViewState<SampleRow>> = {},
    options: GridViewInput<SampleRow>["options"] = fixed,
  ) {
    return resolveGridView({ ...input(state, options), columns: wide });
  }

  function placesOf(view: ReturnType<typeof pinnedView>) {
    return view.columns.map(({ id, pinned, pinOffset, pinEdge }) => ({
      id,
      pinned,
      pinOffset,
      pinEdge,
    }));
  }

  test("lists start-pinned columns first and end-pinned ones last", () => {
    const view = pinnedView({ columnPinning: { Amount: "start" } });

    expect(view.columns.map((entry) => entry.id)).toEqual([
      "Amount",
      "Owner",
      "Id",
      "Notes",
      "Region",
    ]);
  });

  test("leaves dataColumns in column order", () => {
    const view = pinnedView({ columnPinning: { Amount: "start" } });

    expect(view.dataColumns.map((entry) => entry.id)).toEqual([
      "Id",
      "Region",
      "Amount",
      "Owner",
      "Notes",
    ]);
  });

  test("puts an unpinned column back in its place in the order", () => {
    const view = pinnedView({
      columnOrder: ["Notes"],
      columnPinning: { Owner: "none" },
    });

    expect(view.columns.map((entry) => entry.id)).toEqual([
      "Notes",
      "Id",
      "Amount",
      "Owner",
      "Region",
    ]);
  });

  test("measures each pinned column from its edge and marks the edge columns", () => {
    const view = pinnedView({
      columnPinning: { Id: "start", Notes: "end" },
    });

    expect(placesOf(view)).toEqual([
      { id: "Id", pinned: "start", pinOffset: 0, pinEdge: false },
      { id: "Owner", pinned: "start", pinOffset: 60, pinEdge: true },
      { id: "Amount", pinned: "none", pinOffset: 0, pinEdge: false },
      { id: "Region", pinned: "end", pinOffset: 200, pinEdge: true },
      { id: "Notes", pinned: "end", pinOffset: 0, pinEdge: false },
    ]);
  });

  test("gives a hidden pinned column no width in any offset", () => {
    const view = pinnedView({
      columnPinning: { Id: "start", Amount: "start", Notes: "end" },
      columnVisibility: { Id: false, Notes: false },
    });

    expect(placesOf(view)).toEqual([
      { id: "Amount", pinned: "start", pinOffset: 0, pinEdge: false },
      { id: "Owner", pinned: "start", pinOffset: 90, pinEdge: true },
      { id: "Region", pinned: "end", pinOffset: 0, pinEdge: true },
    ]);
  });

  test("measures offsets from the fitted widths under resizeMode fit", () => {
    const view = resolveGridView({
      ...input(
        { columnPinning: { Amount: "start" } },
        { columnSizeDefaults: { width: 100 }, viewportWidth: 1000 },
      ),
      columns: wide.map((column) => ({ ...column, width: undefined })),
    });

    expect(view.columns.map((entry) => entry.width)).toEqual([
      200, 200, 200, 200, 200,
    ]);
    expect(view.columns.map((entry) => entry.pinOffset)).toEqual([
      0, 200, 0, 0, 0,
    ]);
  });
});

describe("createGridViewResolver", () => {
  const groupedPaginated = {
    groupBy: [{ columnId: "Region" }],
    pagination: { pageIndex: 0, pageSize: 2 },
  } satisfies Partial<GridViewState<SampleRow>>;
  const options = { paginated: true, aggregates: amountTotal } as const;

  test("a sizing or viewport change leaves every data-stage output reference-equal", () => {
    const resolve = createGridViewResolver<SampleRow>();
    const base = input(groupedPaginated, { ...options, viewportWidth: 600 });
    const before = resolve(base);
    const after = resolve({
      ...base,
      state: { ...base.state, columnSizing: { Region: 250 } },
      options: { ...base.options, viewportWidth: 900 },
    });

    expect(after.dataColumns).toBe(before.dataColumns);
    expect(after.rows).toBe(before.rows);
    expect(after.displayRows).toBe(before.displayRows);
    expect(after.pageRows).toBe(before.pageRows);
    expect(after.displayDataRows).toBe(before.displayDataRows);
    expect(after.grandTotal).toBe(before.grandTotal);
    expect(after.columns).not.toBe(before.columns);
  });

  test("a filter change recomputes the rows but not dataColumns", () => {
    const resolve = createGridViewResolver<SampleRow>();
    const base = input();
    const before = resolve(base);
    const after = resolve({
      ...base,
      state: {
        ...base.state,
        filter: [{ kind: "text", columnId: "Region", query: "West" }],
      },
    });

    expect(after.dataColumns).toBe(before.dataColumns);
    expect(after.columns).toBe(before.columns);
    expect(after.rows).not.toBe(before.rows);
    expect(idsOf(after.rows)).toEqual([1, 3]);
  });

  test("a page change re-pages without regrouping", () => {
    const resolve = createGridViewResolver<SampleRow>();
    const base = input(groupedPaginated, options);
    const before = resolve(base);
    const after = resolve({
      ...base,
      state: { ...base.state, pagination: { pageIndex: 1, pageSize: 2 } },
    });

    expect(after.displayRows).toBe(before.displayRows);
    expect(after.grandTotal).toBe(before.grandTotal);
    expect(after.pageRows).not.toBe(before.pageRows);
    expect(after.pageIndex).toBe(1);
  });

  test("a visibility change re-sizes the columns and leaves every data stage alone", () => {
    const resolve = createGridViewResolver<SampleRow>();
    const base = input(groupedPaginated, options);
    const before = resolve(base);
    const after = resolve({
      ...base,
      state: { ...base.state, columnVisibility: { Amount: false } },
    });

    expect(after.dataColumns).toBe(before.dataColumns);
    expect(after.rows).toBe(before.rows);
    expect(after.displayRows).toBe(before.displayRows);
    expect(after.grandTotal).toBe(before.grandTotal);
    expect(after.columns.map((entry) => entry.id)).toEqual(["Id", "Region"]);
  });

  test("a pinning change re-sizes the columns and leaves every data stage alone", () => {
    const resolve = createGridViewResolver<SampleRow>();
    const base = input(groupedPaginated, options);
    const before = resolve(base);
    const after = resolve({
      ...base,
      state: { ...base.state, columnPinning: { Amount: "start" } },
    });

    expect(after.dataColumns).toBe(before.dataColumns);
    expect(after.rows).toBe(before.rows);
    expect(after.displayRows).toBe(before.displayRows);
    expect(after.grandTotal).toBe(before.grandTotal);
    expect(after.columns.map((entry) => entry.id)).toEqual([
      "Amount",
      "Id",
      "Region",
    ]);
  });

  test("returns the same view from call to call when slices are left out", () => {
    const resolve = createGridViewResolver<SampleRow>();
    const base = { rows: data, columns, options };

    expect(resolve({ ...base, state: {} })).toBe(
      resolve({ ...base, state: {} }),
    );
  });

  test("returns the same view for an unchanged input", () => {
    const resolve = createGridViewResolver<SampleRow>();
    const base = input(groupedPaginated, options);

    expect(resolve({ ...base })).toBe(resolve({ ...base }));
  });

  test("keeps the view stable across a pagination change while not paginated", () => {
    const resolve = createGridViewResolver<SampleRow>();
    const base = input();
    const before = resolve(base);
    const after = resolve({
      ...base,
      state: { ...base.state, pagination: { pageIndex: 2, pageSize: 10 } },
    });

    expect(after).toBe(before);
  });
});
