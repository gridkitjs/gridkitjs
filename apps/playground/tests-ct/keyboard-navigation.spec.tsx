// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import type { MountResult } from "@playwright/experimental-ct-react";
import type { ColumnDefinition } from "@gridkitjs/core";
import { DataGrid } from "@gridkitjs/react";
import { expect, test } from "./support/coverage";
import { mountGrid, updateGrid } from "./support/mountGrid";

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

/** The one cell currently reachable by Tab — re-resolved live on every action. */
function activeCell(root: MountResult) {
  return root.locator('[tabindex="0"]');
}

test("the initial tab stop is the header's first cell", async ({ mount }) => {
  const root = await mountGrid(
    mount,
    <DataGrid columns={columns} dataSource={buildRows(3)} label="Nav" />,
  );
  const headerCells = root.locator("thead th");
  await expect(headerCells.first()).toHaveAttribute("tabindex", "0");
  await expect(headerCells.nth(1)).toHaveAttribute("tabindex", "-1");
});

test("ArrowDown from the header moves into body row 0; ArrowUp moves back", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <DataGrid columns={columns} dataSource={buildRows(3)} label="Nav" />,
  );
  const active = activeCell(root);
  await active.press("ArrowDown");
  const firstBodyCell = root.locator("tbody tr").first().locator("td").first();
  await expect(firstBodyCell).toHaveAttribute("tabindex", "0");
  await expect(firstBodyCell).toBeFocused();

  await active.press("ArrowUp");
  await expect(root.locator("thead th").first()).toHaveAttribute(
    "tabindex",
    "0",
  );
});

test("Home and End move within the row; Ctrl+Home and Ctrl+End reach the grid's ends", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <DataGrid columns={columns} dataSource={buildRows(4)} label="Nav" />,
  );
  const active = activeCell(root);
  await active.press("ArrowDown"); // header -> row 0
  await active.press("ArrowDown"); // row 0 -> row 1
  await active.press("ArrowDown"); // row 1 -> row 2
  await active.press("ArrowRight"); // column 0 -> column 1
  await expect(
    root.locator("tbody tr").nth(2).locator("td").nth(1),
  ).toHaveAttribute("tabindex", "0");

  await active.press("Home");
  await expect(
    root.locator("tbody tr").nth(2).locator("td").nth(0),
  ).toHaveAttribute("tabindex", "0");

  await active.press("End");
  await expect(
    root.locator("tbody tr").nth(2).locator("td").nth(1),
  ).toHaveAttribute("tabindex", "0");

  await active.press("Control+Home");
  await expect(root.locator("thead th").first()).toHaveAttribute(
    "tabindex",
    "0",
  );

  await active.press("Control+End");
  await expect(
    root.locator("tbody tr").last().locator("td").last(),
  ).toHaveAttribute("tabindex", "0");
});

test("PageDown clamps to the last row when the grid has fewer rows than a page", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <DataGrid columns={columns} dataSource={buildRows(3)} label="Nav" />,
  );
  const active = activeCell(root);
  await active.press("ArrowDown"); // header -> row 0
  await active.press("PageDown");
  await expect(
    root.locator("tbody tr").last().locator("td").first(),
  ).toHaveAttribute("tabindex", "0");
});

test("PageUp and PageDown on a 0-row grid are a no-crash no-op", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <DataGrid columns={columns} dataSource={[]} label="Empty nav" />,
  );
  const headerCell = root.locator("thead th").first();
  await headerCell.press("PageDown");
  await expect(headerCell).toHaveAttribute("tabindex", "0");
  await headerCell.press("PageUp");
  await expect(headerCell).toHaveAttribute("tabindex", "0");
});

test("ArrowLeft at column 0 and ArrowRight at the last column are clamped, not wrapping", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <DataGrid columns={columns} dataSource={buildRows(2)} label="Nav" />,
  );
  const active = activeCell(root);
  await active.press("ArrowLeft");
  await expect(root.locator("thead th").first()).toHaveAttribute(
    "tabindex",
    "0",
  );

  await active.press("ArrowRight"); // column 0 -> column 1
  await active.press("ArrowRight"); // already the last column: clamped
  await expect(root.locator("thead th").nth(1)).toHaveAttribute(
    "tabindex",
    "0",
  );
});

test("Ctrl+Arrow and Alt+Arrow are ignored by navigation when nothing else claims them first", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <DataGrid columns={columns} dataSource={buildRows(2)} label="Nav" />,
  );
  const active = activeCell(root);
  // Neither resizable nor reorderable, so the header doesn't intercept
  // either combination first — this exercises navigation's own indifference
  // to both modifiers, not the header's claim on them.
  await active.press("Control+ArrowRight");
  await expect(root.locator("thead th").first()).toHaveAttribute(
    "tabindex",
    "0",
  );
  await active.press("Alt+ArrowRight");
  await expect(root.locator("thead th").first()).toHaveAttribute(
    "tabindex",
    "0",
  );
});

test("focus lost to a shrinking grid is restored, not left clamped, once the grid grows back", async ({
  mount,
}) => {
  const allRows = buildRows(6);
  function grid(dataSource: readonly Row[]) {
    return <DataGrid columns={columns} dataSource={dataSource} label="Clamp" />;
  }
  const root = await mountGrid(mount, grid(allRows));
  const active = activeCell(root);
  for (let i = 0; i < 6; i += 1) {
    // header -> row 0 -> row 1 -> row 2 -> row 3 -> row 4 -> row 5.
    await active.press("ArrowDown");
  }
  await expect(
    root.locator("tbody tr").nth(5).locator("td").first(),
  ).toHaveAttribute("tabindex", "0");

  // Shrink to 2 rows: focus clamps to the last valid row.
  await updateGrid(root, grid(allRows.slice(0, 2)));
  await expect(
    root.locator("tbody tr").nth(1).locator("td").first(),
  ).toHaveAttribute("tabindex", "0");

  // Grow back to all 6: focus returns to row 5, the coordinate it was
  // clamped from — not stuck at row 1, the coordinate it was clamped to.
  await updateGrid(root, grid(allRows));
  await expect(
    root.locator("tbody tr").nth(5).locator("td").first(),
  ).toHaveAttribute("tabindex", "0");
});

test("clicking a body cell moves the tab stop there, and a subsequent arrow continues from it", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <DataGrid columns={columns} dataSource={buildRows(3)} label="Click nav" />,
  );
  const targetCell = root.locator("tbody tr").nth(1).locator("td").nth(1);
  await targetCell.click();
  await expect(targetCell).toHaveAttribute("tabindex", "0");

  await targetCell.press("ArrowDown");
  await expect(
    root.locator("tbody tr").nth(2).locator("td").nth(1),
  ).toHaveAttribute("tabindex", "0");
});

test("exactly one cell across the whole grid holds the tab stop at any moment", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <DataGrid columns={columns} dataSource={buildRows(3)} label="One stop" />,
  );
  const active = activeCell(root);
  await expect(root.locator('[tabindex="0"]')).toHaveCount(1);
  await active.press("ArrowDown");
  await expect(root.locator('[tabindex="0"]')).toHaveCount(1);
  await active.press("ArrowRight");
  await expect(root.locator('[tabindex="0"]')).toHaveCount(1);
});
