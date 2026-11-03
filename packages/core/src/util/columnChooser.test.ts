import { describe, expect, test } from "vitest";

import type { ColumnDefinition, ColumnVisibilityState } from "../types";
import { resolveColumnChooser } from "./columnChooser";
import { resolveDataColumns } from "./ordering";

interface Order {
  Id: number;
  Region: string;
  Amount: number;
  Notes: string;
  OrderDate: string;
}

/**
 * `Id` cannot be hidden by the user, `Region` is named by its `header`,
 * `OrderDate` by its field, and `Notes` starts hidden.
 */
const definitions: readonly ColumnDefinition<Order>[] = [
  { field: "Id", hideable: false },
  { field: "Region", header: "Sales region" },
  { field: "Amount" },
  { field: "Notes", hidden: true },
  { field: "OrderDate" },
];

const columns = resolveDataColumns(definitions, []);

function chooser(visibility: ColumnVisibilityState = {}, search?: string) {
  return resolveColumnChooser({ columns, visibility, search });
}

describe("resolveColumnChooser", () => {
  test("lists every column in order by its header text, hidden ones unchecked", () => {
    expect(chooser().entries).toEqual([
      { columnId: "Id", label: "Id", visible: true, disabled: true },
      {
        columnId: "Region",
        label: "Sales region",
        visible: true,
        disabled: false,
      },
      { columnId: "Amount", label: "Amount", visible: true, disabled: false },
      { columnId: "Notes", label: "Notes", visible: false, disabled: false },
      {
        columnId: "OrderDate",
        label: "OrderDate",
        visible: true,
        disabled: false,
      },
    ]);
  });

  test("follows the visibility state over the definitions", () => {
    const { entries } = chooser({ Notes: true, Amount: false });

    expect(entries.map(({ columnId, visible }) => [columnId, visible])).toEqual(
      [
        ["Id", true],
        ["Region", true],
        ["Amount", false],
        ["Notes", true],
        ["OrderDate", true],
      ],
    );
  });

  test("narrows the list to the header texts the search contains, ignoring case", () => {
    expect(chooser({}, "RE").entries.map(({ columnId }) => columnId)).toEqual([
      "Region",
    ]);
    expect(chooser({}, "o").entries.map(({ columnId }) => columnId)).toEqual([
      "Region",
      "Amount",
      "Notes",
      "OrderDate",
    ]);
    // By the header text, not the field.
    expect(
      chooser({}, "SALES").entries.map(({ columnId }) => columnId),
    ).toEqual(["Region"]);
    expect(chooser({}, "zzz").entries).toEqual([]);
  });

  test("disables a column that is not hideable while it shows, and lets it be shown when hidden", () => {
    expect(chooser().entries[0]?.disabled).toBe(true);
    expect(chooser({ Id: false }).entries[0]).toEqual({
      columnId: "Id",
      label: "Id",
      visible: false,
      disabled: false,
    });
  });

  test("disables the last column shown", () => {
    const { entries } = chooser({ Id: false, Region: false, Amount: false });

    expect(
      entries
        .filter(({ disabled }) => disabled)
        .map(({ columnId }) => columnId),
    ).toEqual(["OrderDate"]);
  });

  describe("Show all", () => {
    test("is mixed while some hideable column is hidden, and shows the hidden ones", () => {
      const model = chooser();

      expect(model.selectAll).toBe("mixed");
      expect(model.toggleAll).toEqual({ visible: true, columnIds: ["Notes"] });
    });

    test("is checked while every hideable column shows, and hides them, leaving what cannot be hidden", () => {
      const model = chooser({ Notes: true });

      expect(model.selectAll).toBe("checked");
      expect(model.toggleAll).toEqual({
        visible: false,
        columnIds: ["Region", "Amount", "Notes", "OrderDate"],
      });
    });

    test("is unchecked while no hideable column shows, and shows them all", () => {
      const model = chooser({ Region: false, Amount: false, OrderDate: false });

      expect(model.selectAll).toBe("unchecked");
      expect(model.toggleAll).toEqual({
        visible: true,
        columnIds: ["Region", "Amount", "Notes", "OrderDate"],
      });
    });

    test("counts and acts on only what the search shows", () => {
      const model = chooser({}, "o");

      expect(model.selectAll).toBe("mixed");
      expect(model.toggleAll).toEqual({ visible: true, columnIds: ["Notes"] });

      const hiding = chooser({ Notes: true }, "o");
      expect(hiding.selectAll).toBe("checked");
      expect(hiding.toggleAll).toEqual({
        visible: false,
        columnIds: ["Region", "Amount", "Notes", "OrderDate"],
      });
    });

    test("keeps the first column shown rather than hide the last", () => {
      const model = chooser({ Id: false, Notes: true });

      expect(model.selectAll).toBe("checked");
      expect(model.toggleAll).toEqual({
        visible: false,
        columnIds: ["Amount", "Notes", "OrderDate"],
      });
    });

    test("does nothing when it could only hide the last column shown", () => {
      const model = chooser(
        {
          Id: false,
          Region: false,
          Amount: false,
          OrderDate: false,
          Notes: true,
        },
        "notes",
      );

      expect(model.selectAll).toBe("checked");
      expect(model.toggleAll).toBeNull();
    });

    test("does nothing over a search showing only columns that cannot be hidden", () => {
      const model = chooser({}, "id");

      expect(model.entries.map(({ columnId }) => columnId)).toEqual(["Id"]);
      expect(model.selectAll).toBe("unchecked");
      expect(model.toggleAll).toBeNull();
    });
  });
});
