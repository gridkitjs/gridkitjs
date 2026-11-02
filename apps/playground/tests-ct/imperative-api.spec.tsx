// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import type { MountResult } from "@playwright/experimental-ct-react";
import type { ColumnDefinition, ColumnSortState } from "@gridkitjs/core";
import { expect, test } from "./support/coverage";
import { mountGrid } from "./support/mountGrid";
import ImperativeApiGrid from "./support/ImperativeApiGrid";

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

interface Status {
  hasElement: boolean;
  hasTable: boolean;
  rowCount: number;
  rowIds: string[];
  pageRowIds: string[];
  columnIds: string[];
  columnSizing: Record<string, number>;
  columnOrder: readonly string[];
  columnSort: ColumnSortState;
  rowSelection: readonly string[];
  columnSelection: readonly string[];
  cellSelection: { rowId: string; columnId: string } | null;
  focusedCell: { rowIndex: number; columnIndex: number };
}

async function readStatus(root: MountResult): Promise<Status> {
  const text = await root.getByTestId("imperative-status").textContent();
  return JSON.parse(text ?? "{}") as Status;
}

test("element and table are populated once mounted", async ({ mount }) => {
  const root = await mountGrid(
    mount,
    <ImperativeApiGrid
      columns={columns}
      dataSource={buildRows(3)}
      label="Api"
    />,
  );
  await root.getByRole("button", { name: "report" }).click();
  const status = await readStatus(root);
  expect(status.hasElement).toBe(true);
  expect(status.hasTable).toBe(true);
});

test("getRows/getColumns reflect the grid as currently sorted", async ({
  mount,
}) => {
  const rows = [
    { id: "row-b", name: "Bravo" },
    { id: "row-a", name: "Alpha" },
    { id: "row-c", name: "Charlie" },
  ];
  const root = await mountGrid(
    mount,
    <ImperativeApiGrid
      columns={columns}
      dataSource={rows}
      label="Api"
      defaultColumnSort={[{ columnId: "name", direction: "asc" }]}
    />,
  );
  await root.getByRole("button", { name: "report" }).click();
  const status = await readStatus(root);
  expect(status.rowCount).toBe(3);
  expect(status.rowIds).toEqual(["row-a", "row-b", "row-c"]);
  expect(status.columnIds).toEqual(["id", "name"]);
});

test("getPageRows returns only the current page's rows", async ({ mount }) => {
  const root = await mountGrid(
    mount,
    <ImperativeApiGrid
      columns={columns}
      dataSource={buildRows(7)}
      label="Api"
      paginated
      defaultPagination={{ pageIndex: 0, pageSize: 3 }}
    />,
  );
  await root.getByRole("button", { name: "next-page" }).click();
  await root.getByRole("button", { name: "report" }).click();
  const status = await readStatus(root);
  expect(status.pageRowIds).toEqual(["row-3", "row-4", "row-5"]);
  expect(status.rowCount).toBe(7);
});

test("focusCell moves the grid's DOM tab stop", async ({ mount }) => {
  const root = await mountGrid(
    mount,
    <ImperativeApiGrid
      columns={columns}
      dataSource={buildRows(3)}
      label="Api"
      focusRowIndex={1}
      focusColumnIndex={1}
    />,
  );
  await root.getByRole("button", { name: "focus-cell" }).click();
  await root.getByRole("button", { name: "report" }).click();
  const status = await readStatus(root);
  expect(status.focusedCell).toEqual({ rowIndex: 1, columnIndex: 1 });
  const secondRowSecondCell = root
    .locator("tbody tr")
    .nth(1)
    .locator("td")
    .nth(1);
  await expect(secondRowSecondCell).toHaveAttribute("tabindex", "0");
});

test("selectAllRows and clearSelection drive both state and rendered classes", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <ImperativeApiGrid
      columns={columns}
      dataSource={buildRows(3)}
      label="Api"
      selectable={{ rows: "multiple" }}
    />,
  );
  const rows = root.locator("tbody tr");

  await root.getByRole("button", { name: "select-all-rows" }).click();
  await root.getByRole("button", { name: "report" }).click();
  let status = await readStatus(root);
  expect(status.rowSelection).toHaveLength(3);
  for (let i = 0; i < 3; i += 1) {
    await expect(rows.nth(i)).toHaveAttribute("aria-selected", "true");
  }

  await root.getByRole("button", { name: "clear-selection" }).click();
  await root.getByRole("button", { name: "report" }).click();
  status = await readStatus(root);
  expect(status.rowSelection).toHaveLength(0);
  for (let i = 0; i < 3; i += 1) {
    await expect(rows.nth(i)).toHaveAttribute("aria-selected", "false");
  }
});

test("scrollToRow scrolls the row into view within its scrollable ancestor", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <ImperativeApiGrid
      columns={columns}
      dataSource={buildRows(40)}
      label="Api"
      scrollRowId="row-39"
    />,
  );
  const scrollContainer = root.getByTestId("scroll-container");
  await expect(scrollContainer).toHaveJSProperty("scrollTop", 0);

  await root.getByRole("button", { name: "scroll-to-row" }).click();
  await expect
    .poll(async () => scrollContainer.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(0);
});

test("scrollToColumn scrolls the column into view horizontally", async ({
  mount,
}) => {
  const wideColumns: readonly ColumnDefinition<Row>[] = [
    { field: "id", width: 300 },
    { field: "name", width: 300, id: "far-column" },
  ];
  const root = await mountGrid(
    mount,
    <ImperativeApiGrid
      columns={wideColumns}
      dataSource={buildRows(3)}
      label="Api"
      resizeMode="fixed"
      scrollColumnId="far-column"
    />,
    { width: 200 },
  );
  const viewport = root.locator(".gridkit-data-grid-viewport");
  await expect(viewport).toHaveJSProperty("scrollLeft", 0);

  await root.getByRole("button", { name: "scroll-to-column" }).click();
  await expect
    .poll(async () => viewport.evaluate((el) => el.scrollLeft))
    .toBeGreaterThan(0);
});
