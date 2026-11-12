// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import type { ColumnDefinition, RowPointerEvent } from "@gridkitjs/core";
import { DataGrid } from "@gridkitjs/react";
import type { Locator } from "@playwright/test";
import { expect, test } from "./support/coverage";
import { mountGrid } from "./support/mountGrid";
import RowPropsGrid, { type RowPropsRow } from "./support/RowPropsGrid";

const rows: RowPropsRow[] = [
  { id: "a", name: "Alpha", status: "open" },
  { id: "b", name: "Bravo", status: "overdue" },
  { id: "c", name: "Charlie", status: "open" },
];

const columns: readonly ColumnDefinition<RowPropsRow>[] = [
  { field: "id", width: 80 },
  { field: "name", width: 160 },
];

/** How many times the row's cells have been drawn — see `RowPropsGrid`. */
async function rendersOf(row: Locator): Promise<number> {
  return Number(
    await row.locator("[data-renders]").getAttribute("data-renders"),
  );
}

test.describe("row pointer events", () => {
  test("a double-click reports once, with the row and column", async ({
    mount,
  }) => {
    const doubleClicks: RowPointerEvent<RowPropsRow>[] = [];
    const root = await mountGrid(
      mount,
      <DataGrid
        columns={columns}
        dataSource={rows}
        label="Row events"
        onRowDoubleClick={(event) => {
          doubleClicks.push(event);
        }}
      />,
    );

    await root.locator("tbody tr").nth(1).locator("td").nth(1).dblclick();

    await expect.poll(() => doubleClicks.length).toBe(1);
    expect(doubleClicks[0]?.row.row.id).toBe("b");
    expect(doubleClicks[0]?.columnId).toBe("name");
    expect(doubleClicks[0]?.native.button).toBe(0);
  });

  test("a click reports after selecting, with its modifiers", async ({
    mount,
  }) => {
    const clicks: RowPointerEvent<RowPropsRow>[] = [];
    const root = await mountGrid(
      mount,
      <DataGrid
        columns={columns}
        dataSource={rows}
        label="Row events"
        selectable={{ rows: "multiple" }}
        onRowClick={(event) => {
          clicks.push(event);
        }}
      />,
    );

    const cell = root.locator("tbody tr").nth(2).locator("td").first();
    await cell.click({ modifiers: ["Alt"] });

    await expect.poll(() => clicks.length).toBe(1);
    expect(clicks[0]?.row.rowId).toBe("2");
    expect(clicks[0]?.columnId).toBe("id");
    expect(clicks[0]?.native.altKey).toBe(true);
    expect(clicks[0]?.native.shiftKey).toBe(false);
    await expect(root.locator("tbody tr").nth(2)).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("a group header reports neither", async ({ mount }) => {
    const reported: string[] = [];
    const root = await mountGrid(
      mount,
      <DataGrid
        columns={columns}
        dataSource={rows}
        label="Row events"
        defaultGroupBy={[{ columnId: "id" }]}
        onRowClick={() => {
          reported.push("click");
        }}
        onRowDoubleClick={() => {
          reported.push("double-click");
        }}
      />,
    );

    const header = root.locator("tbody tr[data-gridkit-group]").first();
    await header.dblclick();
    // The header's own clicks still toggle it, so the grid did see them.
    await expect(header).toHaveAttribute("aria-expanded", "true");
    await root.locator("tbody tr").last().locator("td").first().click();
    await expect.poll(() => reported).toEqual(["click"]);
  });
});

test.describe("row props", () => {
  test("every row carries its id", async ({ mount }) => {
    const root = await mountGrid(
      mount,
      <RowPropsGrid dataSource={rows} label="Row props" />,
    );
    const bodyRows = root.locator("tbody tr");
    await expect(bodyRows.nth(0)).toHaveAttribute("data-gridkit-row-id", "a");
    await expect(bodyRows.nth(2)).toHaveAttribute("data-gridkit-row-id", "c");
  });

  test("getRowProps's class and data attributes land on the row", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <RowPropsGrid dataSource={rows} label="Row props" />,
    );
    const overdue = root.locator('tbody tr[data-gridkit-row-id="b"]');
    await expect(overdue).toHaveClass(/\bgridkit-grid-row\b/);
    await expect(overdue).toHaveClass(/\bis-overdue\b/);
    await expect(overdue).toHaveAttribute("data-status", "overdue");
    const open = root.locator('tbody tr[data-gridkit-row-id="a"]');
    await expect(open).not.toHaveClass(/\bis-overdue\b/);
    await expect(open).toHaveAttribute("data-status", "open");
  });

  test("rows whose props read the same are not redrawn", async ({ mount }) => {
    const root = await mountGrid(
      mount,
      <RowPropsGrid
        dataSource={rows}
        label="Row props"
        selectable={{ rows: "multiple" }}
      />,
    );
    const [first, second, third] = ["a", "b", "c"].map((id) =>
      root.locator(`tbody tr[data-gridkit-row-id="${id}"]`),
    ) as [Locator, Locator, Locator];
    const before = await Promise.all([first, second, third].map(rendersOf));

    // A new `getRowProps` returning equal props redraws no row.
    await root.getByTestId("rerender").click();
    await expect(root.getByTestId("parent-renders")).toHaveText("2");
    expect(await Promise.all([first, second, third].map(rendersOf))).toEqual(
      before,
    );

    // Selecting one row redraws that row alone.
    await second.locator("td").nth(1).click();
    await expect(second).toHaveAttribute("aria-selected", "true");
    expect(await rendersOf(first)).toBe(before[0]);
    expect(await rendersOf(second)).toBeGreaterThan(before[1] ?? 0);
    expect(await rendersOf(third)).toBe(before[2]);
  });
});
