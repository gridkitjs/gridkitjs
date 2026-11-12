import { describe, expect, test } from "vitest";

import { createGridController } from "../controller/createGridController";
import type { GridControllerOptions } from "../controller/gridController";
import { defaultMessages } from "../messages";
import type { ColumnDefinition, FilterState } from "../types";
import { canCopySelection, copyContent, type CopySource } from "./copy";

interface Order {
  Id: number;
  Region: string;
  Amount: number;
  Notes: string;
  Secret: string;
}

const orders: readonly Order[] = [
  { Id: 1, Region: "West", Amount: 1000, Notes: "a", Secret: "s1" },
  { Id: 2, Region: "East", Amount: 250, Notes: "b", Secret: "s2" },
  { Id: 3, Region: "West", Amount: 50, Notes: "c", Secret: "s3" },
];

/** `Notes` starts hidden and `Secret` never leaves the grid. */
const columns: readonly ColumnDefinition<Order>[] = [
  { field: "Id", type: "number", header: "No." },
  { field: "Region" },
  { field: "Amount", type: "number" },
  { field: "Notes", hidden: true },
  { field: "Secret", exportable: false },
];

function sourceFor(
  options: GridControllerOptions<Order> = {},
): CopySource<Order> {
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

const WEST: FilterState<Order> = [
  { kind: "text", columnId: "Region", query: "West" },
];

describe("copyContent", () => {
  describe("a cell", () => {
    test("copies its formatted text, and a one-cell table as HTML", () => {
      expect(
        copyContent(sourceFor(), {
          kind: "cell",
          rowId: "1",
          columnId: "Amount",
        }),
      ).toEqual({
        text: "1000",
        html: '<table class="gridkit-export-table"><tbody><tr><td style="text-align:right">1000</td></tr></tbody></table>',
        count: 1,
        unit: "cells",
      });
    });

    test("copies nothing from a hidden or non-exportable column", () => {
      for (const columnId of ["Notes", "Secret", "Missing"]) {
        expect(
          copyContent(sourceFor(), { kind: "cell", rowId: "1", columnId }),
        ).toBeNull();
      }
    });

    test("copies nothing from a row the filter hides", () => {
      expect(
        copyContent(sourceFor({ defaultFilter: WEST }), {
          kind: "cell",
          rowId: "2",
          columnId: "Id",
        }),
      ).toBeNull();
    });
  });

  describe("a row", () => {
    test("copies its shown, exportable cells without a header", () => {
      const content = copyContent(sourceFor(), { kind: "row", rowId: "2" });

      expect(content).toMatchObject({
        text: "2\tEast\t250",
        count: 1,
        unit: "rows",
      });
      expect(content?.html).not.toContain("<thead>");
      expect(content?.html).toContain("<td>East</td>");
    });

    test("copies a row on another page", () => {
      expect(
        copyContent(
          sourceFor({
            paginated: true,
            defaultPagination: { pageIndex: 0, pageSize: 1 },
          }),
          { kind: "row", rowId: "3" },
        )?.text,
      ).toBe("3\tWest\t50");
    });

    test("copies nothing for a row the filter hides, or with no column to copy", () => {
      expect(
        copyContent(sourceFor({ defaultFilter: WEST }), {
          kind: "row",
          rowId: "2",
        }),
      ).toBeNull();
      expect(
        copyContent(
          sourceFor({ columns: [{ field: "Secret", exportable: false }] }),
          { kind: "row", rowId: "1" },
        ),
      ).toBeNull();
    });
  });

  describe("the selection", () => {
    test("copies two or more selected rows in grid order, under a header", () => {
      const content = copyContent(
        sourceFor({
          defaultRowSelection: ["3", "1"],
          defaultColumnSort: [{ columnId: "Amount", direction: "asc" }],
        }),
        { kind: "selection" },
      );

      expect(content).toMatchObject({
        text: "No.\tRegion\tAmount\n3\tWest\t50\n1\tWest\t1000",
        count: 2,
        unit: "rows",
      });
      expect(content?.html).toContain("<thead>");
    });

    test("copies one selected row without a header", () => {
      expect(
        copyContent(sourceFor({ defaultRowSelection: ["2"] }), {
          kind: "selection",
        }),
      ).toMatchObject({ text: "2\tEast\t250", count: 1, unit: "rows" });
    });

    test("copies selected rows as data, without group rows or aggregates", () => {
      expect(
        copyContent(
          sourceFor({
            defaultRowSelection: ["1", "2"],
            defaultGroupBy: [{ columnId: "Region" }],
            aggregates: [{ columnId: "Amount", fn: "sum" }],
          }),
          { kind: "selection" },
        )?.text,
      ).toBe("No.\tRegion\tAmount\n2\tEast\t250\n1\tWest\t1000");
    });

    test("copies the selected columns over every filtered row, under their header", () => {
      expect(
        copyContent(
          sourceFor({
            defaultColumnSelection: ["Amount", "Secret", "Notes", "Id"],
            defaultFilter: WEST,
          }),
          { kind: "selection" },
        ),
      ).toMatchObject({
        text: "No.\tAmount\n1\t1000\n3\t50",
        count: 2,
        unit: "columns",
      });
    });

    test("copies the selected cell when no row or column is selected", () => {
      expect(
        copyContent(
          sourceFor({
            defaultCellSelection: {
              kind: "cell",
              rowId: "3",
              columnId: "Region",
            },
          }),
          { kind: "selection" },
        ),
      ).toMatchObject({ text: "West", count: 1, unit: "cells" });
    });

    test("prefers rows to columns, and columns to the cell", () => {
      const cell = { kind: "cell", rowId: "3", columnId: "Region" } as const;

      expect(
        copyContent(
          sourceFor({
            defaultRowSelection: ["2"],
            defaultColumnSelection: ["Id"],
            defaultCellSelection: cell,
          }),
          { kind: "selection" },
        )?.unit,
      ).toBe("rows");
      expect(
        copyContent(
          sourceFor({
            defaultColumnSelection: ["Id"],
            defaultCellSelection: cell,
          }),
          { kind: "selection" },
        )?.unit,
      ).toBe("columns");
    });

    test("passes over selected rows the filter hides", () => {
      expect(
        copyContent(
          sourceFor({
            defaultRowSelection: ["2"],
            defaultFilter: WEST,
            defaultCellSelection: { kind: "cell", rowId: "1", columnId: "Id" },
          }),
          { kind: "selection" },
        ),
      ).toMatchObject({ text: "1", unit: "cells" });
    });

    test("copies nothing when nothing selected can be copied", () => {
      for (const options of [
        {},
        { defaultColumnSelection: ["Secret", "Notes"] },
        {
          defaultColumnSelection: ["Id"],
          defaultFilter: [{ kind: "text", query: "%x%" }],
        },
        {
          defaultCellSelection: {
            kind: "cell",
            rowId: "1",
            columnId: "Secret",
          },
        },
        {
          defaultCellSelection: { kind: "cell", rowId: "2", columnId: "Id" },
          defaultFilter: WEST,
        },
      ] satisfies GridControllerOptions<Order>[]) {
        const source = sourceFor(options);

        expect(canCopySelection(source)).toBe(false);
        expect(copyContent(source, { kind: "selection" })).toBeNull();
      }
    });
  });
});

describe("canCopySelection", () => {
  test("says whether a selection copy has anything to copy", () => {
    for (const options of [
      { defaultRowSelection: ["1"] },
      { defaultColumnSelection: ["Region"] },
      { defaultCellSelection: { kind: "cell", rowId: "1", columnId: "Id" } },
    ] satisfies GridControllerOptions<Order>[]) {
      expect(canCopySelection(sourceFor(options))).toBe(true);
    }
  });
});
