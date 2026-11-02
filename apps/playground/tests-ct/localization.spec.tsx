// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import type { ColumnDefinition } from "@gridkitjs/core";
import { DataGrid } from "@gridkitjs/react";
import { expect, test } from "./support/coverage";
import { mountGrid } from "./support/mountGrid";
import LocalizedGrid, { type LocalizedRow } from "./support/LocalizedGrid";

function buildRows(count: number): LocalizedRow[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `row-${String(index)}`,
    name: `Row ${String(index)}`,
    active: index % 2 === 0,
  }));
}

const columns: readonly ColumnDefinition<LocalizedRow>[] = [
  { field: "id", width: 80 },
  { field: "name", width: 160 },
];

test("a custom messages.previousPage replaces the pager's text", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows(6)}
      label="Custom pager"
      paginated
      defaultPagination={{ pageIndex: 0, pageSize: 2 }}
      messages={{ previousPage: "Back" }}
    />,
  );
  const pager = root.locator(".gridkit-grid-pager");
  await expect(pager.getByRole("button", { name: "Back" })).toBeVisible();
  // Keys left out keep their English.
  await expect(pager.getByRole("button", { name: "Next" })).toBeVisible();
  await expect(pager.locator(".grid-pager-status")).toHaveText("Page 1 of 3");
});

test("interpolated messages render and announce in their own words", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <LocalizedGrid
      dataSource={buildRows(6)}
      label="Lokalisiert"
      paginated
      defaultPagination={{ pageIndex: 0, pageSize: 2 }}
    />,
  );
  const pager = root.locator(".gridkit-grid-pager");
  await expect(pager.locator(".grid-pager-status")).toHaveText("Seite 1 von 3");
  await pager.getByRole("button", { name: "Weiter" }).click();
  await expect(pager.locator(".grid-pager-status")).toHaveText("Seite 2 von 3");
  await expect(root.locator('[role="status"]')).toHaveText("Seite 2 von 3");
});

test("boolean cells and blank groups read in the messages' words", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <LocalizedGrid
      dataSource={[...buildRows(2), { id: "row-x", name: null, active: true }]}
      label="Lokalisiert"
      defaultGroupBy={[{ columnId: "name" }]}
    />,
  );
  const dataRows = root.locator("tbody tr[data-gridkit-row-id]");
  await expect(
    dataRows.first().locator('td[data-gridkit-column="active"]'),
  ).toHaveText("ja");
  await expect(
    dataRows.nth(1).locator('td[data-gridkit-column="active"]'),
  ).toHaveText("nein");
  await expect(
    root.locator("tbody tr[data-gridkit-group]").last(),
  ).toContainText("(leer)");
});
