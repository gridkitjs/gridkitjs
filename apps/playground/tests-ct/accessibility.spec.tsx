// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import type { ColumnDefinition } from "@gridkitjs/core";
import { DataGrid } from "@gridkitjs/react";
import { expect, test } from "./support/coverage";
import { mountGrid } from "./support/mountGrid";
import HeaderTextGrid from "./support/HeaderTextGrid";

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

test('aria-selected is absent, not "false", when no selection mode is on — checked on header, row and cell', async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows(2)}
      label="No selection"
    />,
  );
  await expect(root.locator("thead th").first()).not.toHaveAttribute(
    "aria-selected",
  );
  await expect(root.locator("tbody tr").first()).not.toHaveAttribute(
    "aria-selected",
  );
  await expect(root.locator("tbody td").first()).not.toHaveAttribute(
    "aria-selected",
  );
});

test("aria-selected is present as true/false once every mode is on, and only the clicked cell/row flip to true", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows(2)}
      label="All selection"
      selectable={{ rows: "multiple", columns: "multiple", cells: "single" }}
    />,
  );
  const header = root.locator("thead th").first();
  const row = root.locator("tbody tr").first();
  const cell = row.locator("td").first();
  await expect(header).toHaveAttribute("aria-selected", "false");
  await expect(row).toHaveAttribute("aria-selected", "false");
  await expect(cell).toHaveAttribute("aria-selected", "false");

  await cell.click();
  await expect(header).toHaveAttribute("aria-selected", "false");
  await expect(row).toHaveAttribute("aria-selected", "true");
  await expect(cell).toHaveAttribute("aria-selected", "true");
});

test('aria-multiselectable is absent under "single"', async ({ mount }) => {
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows(2)}
      label="Single"
      selectable={{ rows: "single" }}
    />,
  );
  await expect(root.getByRole("grid")).not.toHaveAttribute(
    "aria-multiselectable",
  );
});

test('aria-multiselectable is "true" when rows is "multiple"', async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows(2)}
      label="Multi rows"
      selectable={{ rows: "multiple" }}
    />,
  );
  await expect(root.getByRole("grid")).toHaveAttribute(
    "aria-multiselectable",
    "true",
  );
});

test('aria-multiselectable is "true" when columns is "multiple", independent of rows', async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows(2)}
      label="Multi columns"
      selectable={{ columns: "multiple" }}
    />,
  );
  await expect(root.getByRole("grid")).toHaveAttribute(
    "aria-multiselectable",
    "true",
  );
});

test("aria-keyshortcuts reflects exactly the applicable reorder/resize combination, or is absent for neither", async ({
  mount,
}) => {
  const shortcutColumns: readonly ColumnDefinition<Row>[] = [
    { field: "id", width: 80, resizable: false, reorderable: false },
    { field: "name", width: 120 },
    { field: "id", id: "id2", width: 80, reorderable: true },
  ];
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={shortcutColumns}
      dataSource={buildRows(2)}
      label="Shortcuts"
      resizableColumns
    />,
  );
  const headerLocators = root.locator("thead th");
  await expect(headerLocators.nth(0)).not.toHaveAttribute("aria-keyshortcuts");
  await expect(headerLocators.nth(1)).toHaveAttribute(
    "aria-keyshortcuts",
    "Alt+ArrowLeft Alt+ArrowRight Alt+Enter",
  );
  await expect(headerLocators.nth(2)).toHaveAttribute(
    "aria-keyshortcuts",
    "Control+ArrowLeft Control+ArrowRight Alt+ArrowLeft Alt+ArrowRight Alt+Enter",
  );
});

test("labelledBy takes precedence over label", async ({ mount }) => {
  const root = await mountGrid(
    mount,
    <>
      <h2 id="heading">Heading</h2>
      <DataGrid
        columns={columns}
        dataSource={buildRows(1)}
        label="Ignored"
        labelledBy="heading"
      />
    </>,
  );
  const table = root.getByRole("grid");
  await expect(table).toHaveAttribute("aria-labelledby", "heading");
  await expect(table).not.toHaveAttribute("aria-label");
});

test("neither label nor labelledBy given means neither attribute appears", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <DataGrid columns={columns} dataSource={buildRows(1)} />,
  );
  const table = root.getByRole("grid");
  await expect(table).not.toHaveAttribute("aria-label");
  await expect(table).not.toHaveAttribute("aria-labelledby");
});

test('role="grid"/"row"/"columnheader"/"gridcell" are present throughout, the header role set explicitly like the body cell\'s', async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <DataGrid columns={columns} dataSource={buildRows(2)} label="Roles" />,
  );
  await expect(root.getByRole("grid")).toHaveCount(1);
  // The header row plus 2 body rows.
  await expect(root.getByRole("row")).toHaveCount(3);
  await expect(root.getByRole("columnheader")).toHaveCount(2);
  // 2 rows x 2 columns.
  await expect(root.getByRole("gridcell")).toHaveCount(4);
  // Explicit, not left to the `<th scope="col">` implicit mapping — the
  // same reasoning `GridRow.tsx` already applies to `role="gridcell"`.
  await expect(root.locator("thead th").first()).toHaveAttribute(
    "role",
    "columnheader",
  );
});

test("aria-keyshortcuts on body cells advertises Space/Enter when cell selection is enabled", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows(2)}
      label="Body shortcuts on"
      selectable={{ cells: "single" }}
    />,
  );
  await expect(root.locator("tbody td").first()).toHaveAttribute(
    "aria-keyshortcuts",
    "Space Enter",
  );
});

test("aria-keyshortcuts is absent from body cells when cell selection is off", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows(2)}
      label="Body shortcuts off"
    />,
  );
  await expect(root.locator("tbody td").first()).not.toHaveAttribute(
    "aria-keyshortcuts",
  );
});

test("a plain single-row selection leaves the live region unchanged; a multi-row Shift-click updates it with a count", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <DataGrid
      columns={columns}
      dataSource={buildRows(4)}
      label="Announce"
      selectable={{ rows: "multiple" }}
    />,
  );
  const status = root.locator('[role="status"]');
  await expect(status).toHaveText("");

  const rows = root.locator("tbody tr");
  await rows.nth(0).locator("td").first().click();
  await expect(status).toHaveText("");

  await rows
    .nth(2)
    .locator("td")
    .first()
    .click({ modifiers: ["Shift"] });
  await expect(status).toHaveText("3 rows selected");
});

test("an announcement names a column by its header text, not its headerTemplate markup", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <HeaderTextGrid
      dataSource={[
        { id: "a", cost: 2 },
        { id: "b", cost: 1 },
      ]}
      label="Header text"
      sortableColumns
    />,
  );

  const costHeader = root.locator('th[data-gridkit-column="cost"]');
  await expect(costHeader).toContainText("Cost (EUR)");
  await costHeader.locator(".header-sort-toggle").click();
  await expect(root.locator('[role="status"]')).toHaveText(
    "Cost sorted ascending",
  );
});
