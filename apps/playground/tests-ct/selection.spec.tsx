// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import type {
  ColumnDefinition,
  RowSelectEvent,
  RowSelectionChangeEvent,
  RowsSelectEvent,
} from "@gridkitjs/core";
import type { CellSelectEvent } from "@gridkitjs/react";
import { DataGrid } from "@gridkitjs/react";
import { expect, test } from "./support/coverage";
import { mountGrid, updateGrid } from "./support/mountGrid";
import ButtonCellGrid from "./support/ButtonCellGrid";
import RowIdentifiedGrid from "./support/RowIdentifiedGrid";

interface Row {
  id: string;
  name: string;
}

function buildRows(count: number): Row[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `row-${String(index)}`,
    name: `Row ${String(index)}`,
  }));
}

const columns: readonly ColumnDefinition<Row>[] = [
  { field: "id", width: 80 },
  { field: "name", width: 160 },
];

test.describe("mode matrix", () => {
  test('rows: "multiple" selects rows independently of cells', async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <DataGrid
        columns={columns}
        dataSource={buildRows(3)}
        label="Rows only"
        selectable={{ rows: "multiple" }}
      />,
    );
    const firstRow = root.locator("tbody tr").first();
    await firstRow.locator("td").first().click();
    await expect(firstRow).toHaveAttribute("aria-selected", "true");
    // Cells are not selectable in this mode, so the attribute is absent
    // entirely rather than "false".
    await expect(firstRow.locator("td").first()).not.toHaveAttribute(
      "aria-selected",
    );
  });

  test('columns: "single" replaces rather than accumulating', async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <DataGrid
        columns={columns}
        dataSource={buildRows(3)}
        label="Columns only"
        selectable={{ columns: "single" }}
      />,
    );
    const headers = root.locator("thead th");
    await headers.nth(0).click();
    await expect(headers.nth(0)).toHaveAttribute("aria-selected", "true");
    await headers.nth(1).click();
    await expect(headers.nth(0)).toHaveAttribute("aria-selected", "false");
    await expect(headers.nth(1)).toHaveAttribute("aria-selected", "true");
  });

  test('cells: "single" selects one cell at a time', async ({ mount }) => {
    const root = await mountGrid(
      mount,
      <DataGrid
        columns={columns}
        dataSource={buildRows(2)}
        label="Cells only"
        selectable={{ cells: "single" }}
      />,
    );
    const firstCell = root.locator("tbody tr").nth(0).locator("td").first();
    await firstCell.click();
    await expect(firstCell).toHaveAttribute("aria-selected", "true");
  });

  test("selecting a cell announces it, since a single cell selection never crosses the row/column live-region's multi-item threshold", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <DataGrid
        columns={columns}
        dataSource={buildRows(3)}
        label="Cell announce"
        selectable={{ cells: "single" }}
      />,
    );
    const status = root.locator('[role="status"]');
    await expect(status).toHaveText("");

    await root.locator("tbody tr").nth(1).locator("td").nth(1).click();
    await expect(status).toHaveText("name, row 2, selected");

    await root.locator("tbody tr").nth(0).locator("td").nth(0).click();
    await expect(status).toHaveText("id, row 1, selected");
  });

  test("rows and cells together report both from the same click", async ({
    mount,
  }) => {
    let rowChanges = 0;
    let cellChanges = 0;
    const root = await mountGrid(
      mount,
      <DataGrid
        columns={columns}
        dataSource={buildRows(2)}
        label="Both"
        selectable={{ rows: "multiple", cells: "single" }}
        onRowSelectionChange={() => {
          rowChanges += 1;
        }}
        onCellSelectionChange={() => {
          cellChanges += 1;
        }}
      />,
    );
    await root.locator("tbody tr").first().locator("td").first().click();
    expect(rowChanges).toBe(1);
    expect(cellChanges).toBe(1);
  });
});

test.describe("click intent", () => {
  test("a plain click replaces the selection", async ({ mount }) => {
    const root = await mountGrid(
      mount,
      <DataGrid
        columns={columns}
        dataSource={buildRows(3)}
        label="Replace"
        selectable={{ rows: "multiple" }}
      />,
    );
    const rows = root.locator("tbody tr");
    await rows.nth(0).locator("td").first().click();
    await rows.nth(1).locator("td").first().click();
    await expect(rows.nth(0)).toHaveAttribute("aria-selected", "false");
    await expect(rows.nth(1)).toHaveAttribute("aria-selected", "true");
  });

  test("Ctrl-click toggles one row without disturbing the rest", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <DataGrid
        columns={columns}
        dataSource={buildRows(3)}
        label="Toggle"
        selectable={{ rows: "multiple" }}
      />,
    );
    const rows = root.locator("tbody tr");
    await rows.nth(0).locator("td").first().click();
    await rows
      .nth(1)
      .locator("td")
      .first()
      .click({ modifiers: ["Control"] });
    await expect(rows.nth(0)).toHaveAttribute("aria-selected", "true");
    await expect(rows.nth(1)).toHaveAttribute("aria-selected", "true");

    await rows
      .nth(1)
      .locator("td")
      .first()
      .click({ modifiers: ["Control"] });
    await expect(rows.nth(0)).toHaveAttribute("aria-selected", "true");
    await expect(rows.nth(1)).toHaveAttribute("aria-selected", "false");
  });

  test("Shift-click takes a range from the last plain or toggle click", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <DataGrid
        columns={columns}
        dataSource={buildRows(5)}
        label="Range"
        selectable={{ rows: "multiple" }}
      />,
    );
    const rows = root.locator("tbody tr");
    await rows.nth(1).locator("td").first().click();
    await rows
      .nth(3)
      .locator("td")
      .first()
      .click({ modifiers: ["Shift"] });
    for (const i of [1, 2, 3]) {
      await expect(rows.nth(i)).toHaveAttribute("aria-selected", "true");
    }
    for (const i of [0, 4]) {
      await expect(rows.nth(i)).toHaveAttribute("aria-selected", "false");
    }
  });
});

test("a Shift-click range is re-measured from the last non-range anchor, not the previous range's end", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows(6)}
      label="Anchor"
      selectable={{ rows: "multiple" }}
    />,
  );
  const rows = root.locator("tbody tr");

  // Click row 0: anchor becomes row 0, selection = {0}.
  await rows.nth(0).locator("td").first().click();
  // Ctrl-click row 2: a toggle also moves the anchor, to row 2.
  await rows
    .nth(2)
    .locator("td")
    .first()
    .click({ modifiers: ["Control"] });
  // Shift-click row 4: range is anchor(2)..4, replacing the selection
  // outright — row 0 falls out of it even though it was selected before.
  await rows
    .nth(4)
    .locator("td")
    .first()
    .click({ modifiers: ["Shift"] });
  for (const i of [2, 3, 4]) {
    await expect(rows.nth(i)).toHaveAttribute("aria-selected", "true");
  }
  for (const i of [0, 1, 5]) {
    await expect(rows.nth(i)).toHaveAttribute("aria-selected", "false");
  }

  /**
   * Shift-click row 1 again. If the anchor tracked the *previous* range's
   * end (row 4) this would span 1..4; because a range never moves the
   * anchor, it is still row 2, so this spans 1..2 instead.
   */
  await rows
    .nth(1)
    .locator("td")
    .first()
    .click({ modifiers: ["Shift"] });
  for (const i of [1, 2]) {
    await expect(rows.nth(i)).toHaveAttribute("aria-selected", "true");
  }
  for (const i of [0, 3, 4, 5]) {
    await expect(rows.nth(i)).toHaveAttribute("aria-selected", "false");
  }
});

test("re-clicking an already-sole-selected row fires no callback at all", async ({
  mount,
}) => {
  let changes = 0;
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows(3)}
      label="No-op"
      selectable={{ rows: "multiple" }}
      onRowSelectionChange={() => {
        changes += 1;
      }}
    />,
  );
  const firstCell = root.locator("tbody tr").first().locator("td").first();
  await firstCell.click();
  expect(changes).toBe(1);
  await firstCell.click();
  expect(changes).toBe(1);
});

test("Ctrl-clicking a new row reports only that row, not the full selection", async ({
  mount,
}) => {
  const selectEvents: RowSelectEvent<Row>[] = [];
  const rowsSelectEvents: RowsSelectEvent<Row>[] = [];
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows(3)}
      label="Fan-out"
      selectable={{ rows: "multiple" }}
      onRowSelect={(event) => {
        selectEvents.push(event);
      }}
      onRowsSelect={(event) => {
        rowsSelectEvents.push(event);
      }}
    />,
  );
  const rows = root.locator("tbody tr");
  await rows.nth(0).locator("td").first().click();
  selectEvents.length = 0;
  rowsSelectEvents.length = 0;

  // No `getRowId` is given, so rows fall back to their position as an id —
  // row 1 is id "1".
  await rows
    .nth(1)
    .locator("td")
    .first()
    .click({ modifiers: ["Control"] });
  expect(selectEvents).toHaveLength(1);
  expect(selectEvents[0]?.row.rowId).toBe("1");
  expect(rowsSelectEvents).toHaveLength(1);
  expect(rowsSelectEvents[0]?.rows.map((row) => row.rowId)).toEqual(["1"]);
});

test("Escape clears row, column and cell selection all at once", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows(3)}
      label="Clear"
      selectable={{ rows: "multiple", columns: "multiple", cells: "single" }}
    />,
  );
  const rows = root.locator("tbody tr");
  const headers = root.locator("thead th");
  const firstCell = rows.nth(0).locator("td").first();

  await firstCell.click();
  await headers.nth(1).click();
  await expect(rows.nth(0)).toHaveAttribute("aria-selected", "true");
  await expect(headers.nth(1)).toHaveAttribute("aria-selected", "true");
  await expect(firstCell).toHaveAttribute("aria-selected", "true");

  // Escape is dispatched from whichever cell last held focus, since that is
  // where the key would actually land for a real keyboard user.
  await firstCell.press("Escape");

  await expect(rows.nth(0)).toHaveAttribute("aria-selected", "false");
  await expect(headers.nth(1)).toHaveAttribute("aria-selected", "false");
  await expect(firstCell).toHaveAttribute("aria-selected", "false");
});

test('Ctrl+A selects every row when rows is "multiple"', async ({ mount }) => {
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows(4)}
      label="Select all"
      selectable={{ rows: "multiple" }}
    />,
  );
  const rows = root.locator("tbody tr");
  const firstCell = rows.first().locator("td").first();
  await firstCell.click();
  await firstCell.press("Control+a");
  for (let i = 0; i < 4; i += 1) {
    await expect(rows.nth(i)).toHaveAttribute("aria-selected", "true");
  }
});

test('Ctrl+A does nothing when rows is "single"', async ({ mount }) => {
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows(4)}
      label="No select all"
      selectable={{ rows: "single" }}
    />,
  );
  const rows = root.locator("tbody tr");
  const firstCell = rows.first().locator("td").first();
  await firstCell.click();
  await firstCell.press("Control+a");
  await expect(rows.first()).toHaveAttribute("aria-selected", "true");
  for (let i = 1; i < 4; i += 1) {
    await expect(rows.nth(i)).toHaveAttribute("aria-selected", "false");
  }
});

test("a selected row survives removal from dataSource and reselects when re-added", async ({
  mount,
}) => {
  const rows = buildRows(3);
  const changes: RowSelectionChangeEvent<Row>[] = [];
  function grid(dataSource: readonly Row[]) {
    return (
      <RowIdentifiedGrid
        columns={columns}
        dataSource={dataSource}
        label="Persist"
        selectable={{ rows: "multiple" }}
        onRowSelectionChange={(event) => {
          changes.push(event);
        }}
      />
    );
  }

  const root = await mountGrid(mount, grid(rows));
  const middleRow = rows[1];
  if (middleRow === undefined) throw new Error("fixture too small");

  // Select the middle row specifically — proving identity survives a
  // *removal from the middle*, not merely a data change that happens to
  // leave every remaining row's position untouched.
  await root.locator("tbody tr").nth(1).locator("td").first().click();
  expect(changes).toHaveLength(1);

  // Removing the selected row from dataSource alone touches no selection
  // state and so fires nothing — there is nothing for the user to have
  // deselected.
  const withoutMiddle = rows.filter((row) => row.id !== middleRow.id);
  await updateGrid(root, grid(withoutMiddle));
  expect(changes).toHaveLength(1);
  await expect(root.locator("tbody tr")).toHaveCount(2);

  // Re-adding it restores its selected appearance without another click,
  // and at its original position — a real `getRowId`, not the row's
  // position, is what selection is keyed by.
  await updateGrid(root, grid(rows));
  await expect(root.locator("tbody tr").nth(1)).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

test("clicking a nested interactive element inside a cellTemplate still resolves selection to its cell", async ({
  mount,
}) => {
  const events: CellSelectEvent<Row>[] = [];
  const root = await mountGrid(
    mount,
    <ButtonCellGrid
      dataSource={buildRows(2)}
      label="Nested"
      selectable={{ cells: "single" }}
      onCellSelect={(event) => {
        events.push(event);
      }}
    />,
  );
  await root.getByRole("button", { name: "Row 0" }).click();
  expect(events).toHaveLength(1);
  // No `getRowId` here either, so the first row's id is its position, "0".
  expect(events[0]?.cell.rowId).toBe("0");
  expect(events[0]?.cell.columnId).toBe("name");
});

test("Enter selects a focused body cell the same way a plain click does, and Space the same way a Ctrl-click does", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows(3)}
      label="Keyboard select body"
      selectable={{ rows: "multiple" }}
    />,
  );
  const rows = root.locator("tbody tr");
  await rows.nth(0).locator("td").first().press("Enter");
  await expect(rows.nth(0)).toHaveAttribute("aria-selected", "true");

  // Space toggles (like Ctrl-click) rather than replacing, so both rows end
  // up selected instead of row 0 being dropped.
  await rows.nth(1).locator("td").first().press("Space");
  await expect(rows.nth(0)).toHaveAttribute("aria-selected", "true");
  await expect(rows.nth(1)).toHaveAttribute("aria-selected", "true");
});

test("Enter and Space select a focused header the same way, mirroring the body", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows(2)}
      label="Keyboard select header"
      selectable={{ columns: "multiple" }}
    />,
  );
  const headerLocators = root.locator("thead th");
  await headerLocators.nth(0).press("Enter");
  await expect(headerLocators.nth(0)).toHaveAttribute("aria-selected", "true");

  await headerLocators.nth(1).press("Space");
  await expect(headerLocators.nth(0)).toHaveAttribute("aria-selected", "true");
  await expect(headerLocators.nth(1)).toHaveAttribute("aria-selected", "true");
});

test("re-clicking an already-selected column or cell fires no callback either", async ({
  mount,
}) => {
  let columnChanges = 0;
  let cellChanges = 0;
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows(2)}
      label="No-op column and cell"
      selectable={{ columns: "single", cells: "single" }}
      onColumnSelectionChange={() => {
        columnChanges += 1;
      }}
      onCellSelectionChange={() => {
        cellChanges += 1;
      }}
    />,
  );
  const header = root.locator("thead th").first();
  const cell = root.locator("tbody tr").first().locator("td").first();

  await header.click();
  await cell.click();
  expect(columnChanges).toBe(1);
  expect(cellChanges).toBe(1);

  await header.click();
  await cell.click();
  expect(columnChanges).toBe(1);
  expect(cellChanges).toBe(1);
});

test("clearing a multi-row selection announces a zero count, not silence", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows(4)}
      label="Clear to zero"
      selectable={{ rows: "multiple" }}
    />,
  );
  const rows = root.locator("tbody tr");
  const firstCell = rows.first().locator("td").first();
  await firstCell.click();
  await rows
    .nth(2)
    .locator("td")
    .first()
    .click({ modifiers: ["Shift"] });
  await expect(root.locator('[role="status"]')).toHaveText("3 rows selected");

  await firstCell.press("Escape");
  await expect(root.locator('[role="status"]')).toHaveText("No rows selected");
});

test("a selected cell survives its row being removed from dataSource, without crashing or reporting a deselect", async ({
  mount,
}) => {
  const rows = buildRows(3);
  let deselectCount = 0;
  function grid(dataSource: readonly Row[]) {
    return (
      <RowIdentifiedGrid
        columns={columns}
        dataSource={dataSource}
        label="Cell persists"
        selectable={{ cells: "single" }}
        onCellDeselect={() => {
          deselectCount += 1;
        }}
      />
    );
  }
  const root = await mountGrid(mount, grid(rows));
  const middleRow = rows[1];
  if (middleRow === undefined) throw new Error("fixture too small");

  await root.locator("tbody tr").nth(1).locator("td").first().click();
  const withoutMiddle = rows.filter((row) => row.id !== middleRow.id);
  await updateGrid(root, grid(withoutMiddle));

  await expect(root.getByRole("grid")).toBeVisible();
  expect(deselectCount).toBe(0);
});
