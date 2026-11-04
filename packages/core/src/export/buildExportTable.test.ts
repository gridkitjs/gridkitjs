import { describe, expect, test } from "vitest";

import { createCommandContext } from "../commands/context";
import { createGridController } from "../controller/createGridController";
import type { GridControllerOptions } from "../controller/gridController";
import { defaultMessages } from "../messages";
import type { ColumnDefinition } from "../types";
import { groupRowId } from "../util/grouping";
import { buildExportTable, type ExportSource } from "./buildExportTable";
import type { ExportRow, ExportTable } from "./types";

interface Order {
  Id: number;
  Region: string;
  Amount: number;
  Paid: boolean;
  Shipped: Date;
  Notes: string;
  Meta: { tag: string } | null;
}

const shipped = new Date(2024, 2, 15);

const orders: readonly Order[] = [
  {
    Id: 1,
    Region: "West",
    Amount: 100,
    Paid: true,
    Shipped: shipped,
    Notes: "a",
    Meta: { tag: "x" },
  },
  {
    Id: 2,
    Region: "East",
    Amount: 250,
    Paid: false,
    Shipped: shipped,
    Notes: "b",
    Meta: null,
  },
  {
    Id: 3,
    Region: "West",
    Amount: 50,
    Paid: true,
    Shipped: shipped,
    Notes: "c",
    Meta: null,
  },
];

const columns: readonly ColumnDefinition<Order>[] = [
  { field: "Id", type: "number", header: "No." },
  { field: "Region", width: 120 },
  { field: "Amount", type: "number" },
  { field: "Notes", hidden: true, width: 90 },
];

function sourceFor(
  options: GridControllerOptions<Order> = {},
): ExportSource<Order> {
  const controller = createGridController<Order>({
    dataSource: orders,
    getRowId: (row) => String(row.Id),
    columns,
    ...options,
  });
  return {
    view: controller.getView(),
    state: controller.getState(),
    options: controller.getOptions(),
    messages: defaultMessages,
  };
}

/** Each row as its kind and its cells' text — the shape most assertions read. */
function textOf(table: ExportTable): string[][] {
  return table.rows.map((row) => [
    row.kind === "group" ? `${row.kind}:${row.label}` : row.kind,
    ...row.cells.map((cell) => cell.text),
  ]);
}

/** A group as its label and count, a data row as its id. */
function outlineOf(row: ExportRow): string {
  switch (row.kind) {
    case "group":
      return `${row.label} (${String(row.count)})`;
    case "data":
      return row.rowId;
    case "groupSummary":
      return "summary";
  }
}

function dataRowIds(rows: readonly ExportRow[]): string[] {
  return rows.flatMap((row) => (row.kind === "data" ? [row.rowId] : []));
}

describe("buildExportTable", () => {
  test("holds every filtered, sorted row and the visible columns by default", () => {
    const table = buildExportTable(
      sourceFor({
        defaultColumnSort: [{ columnId: "Amount", direction: "desc" }],
        defaultFilter: [{ columnId: "Region", query: "%e%" }],
      }),
    );

    expect(table.header).toBe(true);
    expect(table.footer).toBeNull();
    expect(table.columns.map((column) => column.id)).toEqual([
      "Id",
      "Region",
      "Amount",
    ]);
    expect(textOf(table)).toEqual([
      ["data", "2", "East", "250"],
      ["data", "1", "West", "100"],
      ["data", "3", "West", "50"],
    ]);
  });

  test("describes each column by its text header, type, alignment and width", () => {
    const table = buildExportTable(
      sourceFor({ defaultColumnSizing: { Amount: 200 } }),
      { columns: "all" },
    );

    expect(table.columns).toEqual([
      {
        id: "Id",
        header: "No.",
        type: "number",
        format: undefined,
        alignment: "right",
        width: 150,
      },
      {
        id: "Region",
        header: "Region",
        type: "string",
        format: undefined,
        alignment: "left",
        width: 120,
      },
      {
        id: "Amount",
        header: "Amount",
        type: "number",
        format: undefined,
        alignment: "right",
        width: 200,
      },
      {
        id: "Notes",
        header: "Notes",
        type: "string",
        format: undefined,
        alignment: "left",
        width: 90,
      },
    ]);
  });

  test("takes a visible column's width as rendered, fitted to the viewport", () => {
    const source = sourceFor({ viewportWidth: 840 });
    const table = buildExportTable(source);

    expect(table.columns.map((column) => column.width)).toEqual(
      source.view.columns.map((column) => column.width),
    );
    expect(table.columns.reduce((sum, column) => sum + column.width, 0)).toBe(
      840,
    );
  });

  test("leaves a header row out under includeHeader: false", () => {
    expect(buildExportTable(sourceFor(), { includeHeader: false }).header).toBe(
      false,
    );
  });

  describe("scope", () => {
    test('"page" holds only the current page\'s rows', () => {
      const table = buildExportTable(
        sourceFor({
          paginated: true,
          defaultPagination: { pageIndex: 1, pageSize: 2 },
        }),
        { scope: "page" },
      );

      expect(dataRowIds(table.rows)).toEqual(["3"]);
    });

    test('"all" holds every page', () => {
      const table = buildExportTable(
        sourceFor({
          paginated: true,
          defaultPagination: { pageIndex: 1, pageSize: 2 },
        }),
      );

      expect(dataRowIds(table.rows)).toEqual(["1", "2", "3"]);
    });

    test('"selection" holds the selected rows the filter leaves, in grid order', () => {
      const table = buildExportTable(
        sourceFor({
          defaultRowSelection: ["3", "1", "2"],
          defaultFilter: [{ columnId: "Region", query: "West" }],
        }),
        { scope: "selection" },
      );

      expect(dataRowIds(table.rows)).toEqual(["1", "3"]);
    });

    test('"selection" with nothing selected holds no rows', () => {
      const table = buildExportTable(sourceFor(), { scope: "selection" });

      expect(table.rows).toEqual([]);
    });
  });

  describe("columns", () => {
    test('"all" includes hidden columns in their order', () => {
      const table = buildExportTable(
        sourceFor({ defaultColumnOrder: ["Notes", "Id"] }),
        { columns: "all" },
      );

      expect(table.columns.map((column) => column.id)).toEqual([
        "Notes",
        "Id",
        "Region",
        "Amount",
      ]);
      expect(textOf(table)[0]).toEqual(["data", "a", "1", "West", "100"]);
    });

    test('"visible" follows the user\'s visibility and order', () => {
      const table = buildExportTable(
        sourceFor({
          defaultColumnOrder: ["Amount"],
          defaultColumnVisibility: { Region: false, Notes: true },
        }),
      );

      expect(table.columns.map((column) => column.id)).toEqual([
        "Amount",
        "Id",
        "Notes",
      ]);
    });

    test("an id list sets the order, reaches hidden columns, and skips unknown or repeated ids", () => {
      const table = buildExportTable(sourceFor(), {
        columns: ["Notes", "Missing", "Id", "Notes"],
      });

      expect(table.columns.map((column) => column.id)).toEqual(["Notes", "Id"]);
      expect(textOf(table)[0]).toEqual(["data", "a", "1"]);
    });

    test("exportable: false keeps a column out of every selection", () => {
      const withActions: readonly ColumnDefinition<Order>[] = [
        ...columns,
        {
          field: "Id",
          id: "Actions",
          exportable: false,
          cellTemplate: () => "Edit",
        },
      ];

      for (const selection of ["visible", "all", ["Actions", "Id"]] as const) {
        const table = buildExportTable(sourceFor({ columns: withActions }), {
          columns: selection,
        });
        expect(table.columns.map((column) => column.id)).not.toContain(
          "Actions",
        );
      }
    });
  });

  describe("cells", () => {
    test("carry the formatted text and the raw typed value", () => {
      const table = buildExportTable(
        sourceFor({
          columns: [
            {
              field: "Amount",
              type: "currency",
              format: { currency: "EUR" },
            },
            { field: "Paid", type: "boolean" },
            { field: "Shipped", type: "date" },
          ],
          locale: "en-GB",
        }),
      );
      const [first] = table.rows;

      expect(first?.cells).toEqual([
        { value: 100, text: "€100.00" },
        { value: true, text: "true" },
        { value: shipped, text: "15/03/2024" },
      ]);
    });

    test("read a boolean in the grid's messages", () => {
      const source = sourceFor({ columns: [{ field: "Paid" }] });
      const table = buildExportTable({
        ...source,
        messages: { ...defaultMessages, booleanTrue: "Да", booleanFalse: "Не" },
      });

      expect(table.rows.map((row) => row.cells[0])).toEqual([
        { value: true, text: "Да" },
        { value: false, text: "Не" },
        { value: true, text: "Да" },
      ]);
    });

    test("never leak an object as a value — it is stored as its text", () => {
      const table = buildExportTable(
        sourceFor({ columns: [{ field: "Meta" }] }),
      );

      expect(table.rows.map((row) => row.cells[0])).toEqual([
        { value: '{"tag":"x"}', text: '{"tag":"x"}' },
        { value: null, text: "" },
        { value: null, text: "" },
      ]);
    });

    test("store a missing value as null", () => {
      const table = buildExportTable(
        sourceFor({ columns: [{ field: "Missing.Path" }] }),
      );

      expect(table.rows[0]?.cells).toEqual([{ value: null, text: "" }]);
    });

    test("take exportValue for the value and keep the formatted text", () => {
      const table = buildExportTable(
        sourceFor({
          columns: [
            {
              field: "Region",
              valueFormatter: (value) => `Region ${String(value)}`,
              exportValue: (value, row) => `${String(value)}-${String(row.Id)}`,
            },
          ],
        }),
      );

      expect(table.rows[0]?.cells).toEqual([
        { value: "West-1", text: "Region West" },
      ]);
    });

    test("read the field of a column that only has a cellTemplate", () => {
      const table = buildExportTable(
        sourceFor({
          columns: [{ field: "Region", cellTemplate: () => "<b>badge</b>" }],
        }),
      );

      expect(table.rows[0]?.cells).toEqual([{ value: "West", text: "West" }]);
    });
  });

  describe("groups", () => {
    test("export every group expanded, whatever its state on screen", () => {
      const source = sourceFor({
        defaultGroupBy: [{ columnId: "Region" }],
        defaultGroupExpansion: [groupRowId(["West"])],
      });
      // Check the precondition: the screen hides the collapsed group's rows.
      expect(source.view.displayDataRows.map((entry) => entry.rowId)).toEqual([
        "2",
      ]);

      const table = buildExportTable(source);

      expect(textOf(table)).toEqual([
        ["group:Region: East", "", "", ""],
        ["data", "2", "East", "250"],
        ["group:Region: West", "", "", ""],
        ["data", "1", "West", "100"],
        ["data", "3", "West", "50"],
      ]);
      expect(
        table.rows.flatMap((row) =>
          row.kind === "group" ? [[row.level, row.count]] : [],
        ),
      ).toEqual([
        [0, 1],
        [0, 2],
      ]);
    });

    test("nest, one level per group-by entry", () => {
      const table = buildExportTable(
        sourceFor({
          columns: [...columns, { field: "Paid" }],
          defaultGroupBy: [{ columnId: "Region" }, { columnId: "Paid" }],
        }),
        { columns: ["Id"] },
      );

      expect(
        table.rows.map((row) =>
          row.kind === "group"
            ? `${String(row.level)} ${outlineOf(row)}`
            : outlineOf(row),
        ),
      ).toEqual([
        "0 Region: East (1)",
        "1 Paid: false (1)",
        "2",
        "0 Region: West (2)",
        "1 Paid: true (2)",
        "1",
        "3",
      ]);
    });

    test("name a group by the column's text header, and missing values blankGroupValue", () => {
      const table = buildExportTable(
        sourceFor({
          columns: [
            {
              field: "Meta.tag",
              header: "Tag",
              headerTemplate: () => "<i>Tag</i>",
            },
          ],
          defaultGroupBy: [{ columnId: "Meta.tag" }],
        }),
      );
      const labels = table.rows.flatMap((row) =>
        row.kind === "group" ? [row.label] : [],
      );

      expect(labels).toEqual(["Tag: x", "Tag: (blank)"]);
    });

    test("keep the grouped order without headers under includeGroups: false", () => {
      const table = buildExportTable(
        sourceFor({ defaultGroupBy: [{ columnId: "Region" }] }),
        { includeGroups: false },
      );

      expect(table.rows.every((row) => row.kind === "data")).toBe(true);
      expect(dataRowIds(table.rows)).toEqual(["2", "1", "3"]);
    });

    test("group only the exported rows under a narrower scope", () => {
      const table = buildExportTable(
        sourceFor({
          defaultGroupBy: [{ columnId: "Region" }],
          defaultRowSelection: ["3"],
        }),
        { scope: "selection" },
      );

      expect(table.rows.map(outlineOf)).toEqual(["Region: West (1)", "3"]);
    });
  });

  describe("aggregates", () => {
    const aggregates = [
      { columnId: "Amount", fn: "sum" },
      { columnId: "Id", fn: "count" },
    ] as const;

    test("put a group's aggregates under their columns in its header when shown inline", () => {
      const table = buildExportTable(
        sourceFor({
          defaultGroupBy: [{ columnId: "Region" }],
          defaultGroupExpansion: [groupRowId(["West"])],
          aggregates,
        }),
      );

      expect(textOf(table)).toEqual([
        ["group:Region: East", "1", "", "250"],
        ["data", "2", "East", "250"],
        ["group:Region: West", "2", "", "150"],
        ["data", "1", "West", "100"],
        ["data", "3", "West", "50"],
      ]);
      expect(table.rows[0]?.cells[2]).toEqual({ value: 250, text: "250" });
    });

    test("write a summary row after each group when shown as rows", () => {
      const table = buildExportTable(
        sourceFor({
          defaultGroupBy: [{ columnId: "Region" }],
          aggregates,
          groupAggregateDisplay: "row",
        }),
      );

      expect(textOf(table)).toEqual([
        ["group:Region: East", "", "", ""],
        ["data", "2", "East", "250"],
        ["groupSummary", "1", "", "250"],
        ["group:Region: West", "", "", ""],
        ["data", "1", "West", "100"],
        ["data", "3", "West", "50"],
        ["groupSummary", "2", "", "150"],
      ]);
    });

    test("total every exported row in the footer", () => {
      const all = buildExportTable(sourceFor({ aggregates }));
      const selected = buildExportTable(
        sourceFor({ aggregates, defaultRowSelection: ["1", "2"] }),
        { scope: "selection" },
      );

      expect(all.footer).toEqual({
        kind: "total",
        cells: [
          { value: 3, text: "3" },
          { value: null, text: "" },
          { value: 400, text: "400" },
        ],
      });
      expect(selected.footer?.cells[2]).toEqual({ value: 350, text: "350" });
    });

    test("share a cell between two specs on one column, comma-separated", () => {
      const table = buildExportTable(
        sourceFor({
          aggregates: [
            { columnId: "Amount", fn: "min", id: "low" },
            { columnId: "Amount", fn: "max", id: "high" },
          ],
        }),
      );

      expect(table.footer?.cells[2]).toEqual({
        value: "50, 250",
        text: "50, 250",
      });
    });

    test("write an empty result as empty text, not a dash", () => {
      const table = buildExportTable(
        sourceFor({
          aggregates: [{ columnId: "Amount", fn: "avg" }],
          defaultFilter: [{ columnId: "Region", query: "North" }],
        }),
      );

      expect(table.footer?.cells[2]).toEqual({ value: null, text: "" });
    });

    test("leave every aggregate out under includeAggregates: false", () => {
      const table = buildExportTable(
        sourceFor({
          defaultGroupBy: [{ columnId: "Region" }],
          aggregates,
          groupAggregateDisplay: "row",
        }),
        { includeAggregates: false },
      );

      expect(table.footer).toBeNull();
      expect(table.rows.some((row) => row.kind === "groupSummary")).toBe(false);
      expect(textOf(table)[0]).toEqual(["group:Region: East", "", "", ""]);
    });
  });

  test("exports an empty grid as its columns and no rows", () => {
    const table = buildExportTable(
      sourceFor({
        dataSource: [],
        aggregates: [{ columnId: "Amount", fn: "sum" }],
      }),
    );

    expect(table.columns).toHaveLength(3);
    expect(table.rows).toEqual([]);
    expect(table.footer?.cells[2]).toEqual({ value: 0, text: "0" });
  });

  test("takes a command context as its source", () => {
    const controller = createGridController<Order>({
      dataSource: orders,
      getRowId: (row) => String(row.Id),
      columns,
    });
    const context = createCommandContext({
      controller,
      target: { area: "grid" },
      messages: defaultMessages,
      host: {
        autoFitColumns: () => {},
        openPanel: () => {},
        announce: () => {},
        saveFile: () => {},
      },
    });

    expect(dataRowIds(buildExportTable(context).rows)).toEqual(["1", "2", "3"]);
  });
});
