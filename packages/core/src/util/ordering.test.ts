import { describe, expect, test } from "vitest";

import type { ColumnDefinition } from "../types";
import {
  applyColumnOrder,
  moveColumnBefore,
  movesColumn,
  resolveDataColumns,
  resolveDropBefore,
  resolveKeyboardDropTarget,
} from "./ordering";

interface SampleRow {
  Id: number;
  Name: string;
  Status: string;
}

const columns: readonly ColumnDefinition<SampleRow>[] = [
  { field: "Id" },
  { field: "Name" },
  { field: "Status" },
];

function fieldsOf(
  resolved: readonly ColumnDefinition<SampleRow>[],
): readonly string[] {
  return resolved.map((column) => column.field);
}

describe("applyColumnOrder", () => {
  test("puts columns in the order given", () => {
    const ordered = applyColumnOrder(columns, ["Status", "Id", "Name"]);

    expect(fieldsOf(ordered)).toEqual(["Status", "Id", "Name"]);
  });

  test("returns the columns untouched for an empty order", () => {
    expect(applyColumnOrder(columns, [])).toBe(columns);
  });

  test("ignores an id naming no column", () => {
    const ordered = applyColumnOrder(columns, ["Status", "Removed"]);

    expect(fieldsOf(ordered)).toEqual(["Status", "Id", "Name"]);
  });

  test("keeps a column the order omits, after the ones it lists", () => {
    const ordered = applyColumnOrder(columns, ["Status"]);

    expect(fieldsOf(ordered)).toEqual(["Status", "Id", "Name"]);
  });

  test("orders by id rather than field when a column sets one", () => {
    const withId: readonly ColumnDefinition<SampleRow>[] = [
      { field: "Id" },
      { field: "Name", id: "Name.custom" },
    ];

    expect(fieldsOf(applyColumnOrder(withId, ["Name.custom"]))).toEqual([
      "Name",
      "Id",
    ]);
  });
});

describe("resolveDataColumns", () => {
  test("pairs each column with its id, in the order given", () => {
    const resolved = resolveDataColumns(columns, ["Status", "Id", "Name"]);

    expect(resolved.map((entry) => entry.id)).toEqual(["Status", "Id", "Name"]);
    expect(resolved[0]?.column).toBe(columns[2]);
  });

  test("keeps definition order for an empty order", () => {
    const resolved = resolveDataColumns(columns, []);

    expect(resolved.map((entry) => entry.id)).toEqual(["Id", "Name", "Status"]);
  });

  test("follows a partial order with the columns it omits", () => {
    const resolved = resolveDataColumns(columns, ["Status"]);

    expect(resolved.map((entry) => entry.id)).toEqual(["Status", "Id", "Name"]);
  });

  test("uses a column's own id over its field", () => {
    const withId: readonly ColumnDefinition<SampleRow>[] = [
      { field: "Id" },
      { field: "Name", id: "Name.custom" },
    ];

    expect(
      resolveDataColumns(withId, ["Name.custom"]).map((entry) => entry.id),
    ).toEqual(["Name.custom", "Id"]);
  });
});

describe("moveColumnBefore", () => {
  const order = ["Id", "Name", "Status"];

  test("moves a column leftwards", () => {
    expect(moveColumnBefore(order, "Status", "Name")).toEqual([
      "Id",
      "Status",
      "Name",
    ]);
  });

  /** The index has to be taken after the removal, or this lands one too far left. */
  test("moves a column rightwards", () => {
    expect(moveColumnBefore(order, "Id", "Status")).toEqual([
      "Name",
      "Id",
      "Status",
    ]);
  });

  test("appends for a null target", () => {
    expect(moveColumnBefore(order, "Id", null)).toEqual([
      "Name",
      "Status",
      "Id",
    ]);
  });

  test("returns the same order when dropped on itself", () => {
    expect(moveColumnBefore(order, "Name", "Name")).toBe(order);
  });

  test("returns the same order when dropped in the gap it already occupies", () => {
    expect(moveColumnBefore(order, "Id", "Name")).toBe(order);
  });

  test("returns the same order when the last column is appended again", () => {
    expect(moveColumnBefore(order, "Status", null)).toBe(order);
  });

  test("returns the same order for an id it does not hold", () => {
    expect(moveColumnBefore(order, "Missing", "Id")).toBe(order);
    expect(moveColumnBefore(order, "Id", "Missing")).toBe(order);
  });
});

describe("movesColumn", () => {
  const order = ["Id", "Name", "Status"];

  test("is false for a drop on the column itself", () => {
    expect(movesColumn(order, "Name", "Name")).toBe(false);
  });

  /**
   * The trailing gap names the column to its right, so it reads as a real
   * target unless asked about.
   */
  test("is false for either gap the column already sits in", () => {
    expect(movesColumn(order, "Id", "Id")).toBe(false);
    expect(movesColumn(order, "Id", "Name")).toBe(false);
  });

  test("is false for appending the column already at the end", () => {
    expect(movesColumn(order, "Status", null)).toBe(false);
  });

  test("is true for a gap the column does not sit in", () => {
    expect(movesColumn(order, "Id", "Status")).toBe(true);
    expect(movesColumn(order, "Id", null)).toBe(true);
    expect(movesColumn(order, "Status", "Name")).toBe(true);
  });

  test("agrees with moveColumnBefore on every gap", () => {
    for (const movedId of order) {
      for (const beforeId of [...order, null]) {
        expect(movesColumn(order, movedId, beforeId)).toBe(
          moveColumnBefore(order, movedId, beforeId) !== order,
        );
      }
    }
  });
});

describe("resolveDropBefore", () => {
  const order = ["Id", "Name", "Status"];

  test("takes the target itself for a drop on its leading half", () => {
    expect(resolveDropBefore(order, "Name", "before")).toBe("Name");
  });

  test("takes the following column for a drop on the trailing half", () => {
    expect(resolveDropBefore(order, "Name", "after")).toBe("Status");
  });

  test("takes null past the last column", () => {
    expect(resolveDropBefore(order, "Status", "after")).toBeNull();
  });

  test("takes null for a target the order does not hold", () => {
    expect(resolveDropBefore(order, "Missing", "after")).toBeNull();
  });
});

describe("resolveKeyboardDropTarget", () => {
  const order = ["Id", "Name", "Status"];

  test("moving left lands before the previous column", () => {
    expect(resolveKeyboardDropTarget(order, "Status", -1)).toBe("Name");
  });

  test("moving right lands before the column two along", () => {
    expect(resolveKeyboardDropTarget(order, "Id", 1)).toBe("Status");
  });

  test("moving right past the end appends, a real null rather than a no-op", () => {
    expect(resolveKeyboardDropTarget(order, "Name", 1)).toBeNull();
  });

  test("is undefined moving left from the first column", () => {
    expect(resolveKeyboardDropTarget(order, "Id", -1)).toBeUndefined();
  });

  test("is undefined for an id the order does not hold", () => {
    expect(resolveKeyboardDropTarget(order, "Missing", 1)).toBeUndefined();
  });

  test("agrees with moveByKeyboard's own move for every column and direction", () => {
    for (const columnId of order) {
      for (const direction of [-1, 1] as const) {
        const index = order.indexOf(columnId);
        const targetIndex = direction === -1 ? index - 1 : index + 2;
        const expected =
          targetIndex < 0 ? undefined : (order[targetIndex] ?? null);

        expect(resolveKeyboardDropTarget(order, columnId, direction)).toBe(
          expected,
        );
      }
    }
  });
});
