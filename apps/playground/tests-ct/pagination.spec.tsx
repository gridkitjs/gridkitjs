// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import type { MountResult } from "@playwright/experimental-ct-react";
import type { ColumnDefinition, PaginationState } from "@gridkitjs/core";
import { expect, test } from "./support/coverage";
import { mountGrid } from "./support/mountGrid";
import ImperativeApiGrid from "./support/ImperativeApiGrid";
import RowIdentifiedGrid from "./support/RowIdentifiedGrid";

interface Row {
  id: string;
  region: string;
  amount: number;
}

/** East: r2, r4. West: r1, r3, r5, r6, r7. */
function buildRows(): Row[] {
  return [
    { id: "r1", region: "West", amount: 10 },
    { id: "r2", region: "East", amount: 20 },
    { id: "r3", region: "West", amount: 30 },
    { id: "r4", region: "East", amount: 40 },
    { id: "r5", region: "West", amount: 50 },
    { id: "r6", region: "West", amount: 60 },
    { id: "r7", region: "West", amount: 70 },
  ];
}

const columns: readonly ColumnDefinition<Row>[] = [
  { field: "id", width: 80 },
  { field: "region", width: 100 },
  { field: "amount", width: 100, type: "number" },
];

function groupHeaders(root: MountResult) {
  return root.locator("tr[data-gridkit-group]");
}

function dataRows(root: MountResult) {
  return root.locator("tbody tr:not([data-gridkit-group])");
}

async function rowIds(root: MountResult): Promise<string[]> {
  return dataRows(root)
    .locator('td[data-gridkit-column="id"]')
    .allTextContents();
}

function pagerStatus(root: MountResult) {
  return root.locator(".grid-pager-status");
}

interface Status {
  pagination: PaginationState;
  pageCount: number;
  displayRowCount: number;
}

async function readStatus(root: MountResult): Promise<Status> {
  const text = await root.getByTestId("imperative-status").textContent();
  return JSON.parse(text ?? "{}") as Status;
}

test("shows a page's worth of rows and reports the page count", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <RowIdentifiedGrid
      columns={columns}
      dataSource={buildRows()}
      label="Plain pagination"
      paginated
      defaultPagination={{ pageIndex: 0, pageSize: 3 }}
    />,
  );

  await expect(dataRows(root)).toHaveCount(3);
  expect(await rowIds(root)).toEqual(["r1", "r2", "r3"]);
});

test("Next/Previous move between pages, disabling at the ends", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <RowIdentifiedGrid
      columns={columns}
      dataSource={buildRows()}
      label="Page navigation"
      paginated
      defaultPagination={{ pageIndex: 0, pageSize: 3 }}
    />,
  );

  const previous = root.getByRole("button", { name: "Previous" });
  const next = root.getByRole("button", { name: "Next" });

  await expect(previous).toBeDisabled();
  await expect(pagerStatus(root)).toHaveText("Page 1 of 3");

  await next.click();
  expect(await rowIds(root)).toEqual(["r4", "r5", "r6"]);
  await expect(pagerStatus(root)).toHaveText("Page 2 of 3");
  await expect(previous).toBeEnabled();
  await expect(next).toBeEnabled();

  await next.click();
  expect(await rowIds(root)).toEqual(["r7"]);
  await expect(next).toBeDisabled();

  await previous.click();
  await previous.click();
  expect(await rowIds(root)).toEqual(["r1", "r2", "r3"]);
  await expect(previous).toBeDisabled();
});

test("a page never contains a partial group, even when that shifts the row count per page", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <RowIdentifiedGrid
      columns={columns}
      dataSource={buildRows()}
      label="Grouped pagination"
      defaultGroupBy={[{ columnId: "region" }]}
      paginated
      defaultPagination={{ pageIndex: 0, pageSize: 1 }}
    />,
  );

  // East (2 rows) is one page-1 unit; West (5 rows) is the whole of page 2 —
  // never split even though the two groups differ in size.
  await expect(groupHeaders(root)).toHaveCount(1);
  await expect(groupHeaders(root).first()).toContainText("East");
  expect(await rowIds(root)).toEqual(["r2", "r4"]);

  await root.getByRole("button", { name: "Next" }).click();
  await expect(groupHeaders(root)).toHaveCount(1);
  await expect(groupHeaders(root).first()).toContainText("West");
  expect(await rowIds(root)).toEqual(["r1", "r3", "r5", "r6", "r7"]);
});

test("changing the page size recomputes the page count and clamps the current page", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <RowIdentifiedGrid
      columns={columns}
      dataSource={buildRows()}
      label="Page size change"
      paginated
      defaultPagination={{ pageIndex: 2, pageSize: 3 }}
      pageSizeOptions={[3, 7]}
    />,
  );

  // Page 3 of 3 (7 rows / 3 per page) to start.
  await expect(pagerStatus(root)).toHaveText("Page 3 of 3");

  await root.locator(".grid-pager-page-size select").selectOption("7");

  // A page size covering every row leaves one page, and the stale
  // pageIndex (2) is clamped back to the only page there is (0).
  await expect(pagerStatus(root)).toHaveText("Page 1 of 1");
  expect(await rowIds(root)).toEqual([
    "r1",
    "r2",
    "r3",
    "r4",
    "r5",
    "r6",
    "r7",
  ]);
});

test("sorting resets to the first page", async ({ mount }) => {
  const root = await mountGrid(
    mount,
    <ImperativeApiGrid
      columns={columns}
      dataSource={buildRows()}
      label="Reset on sort"
      paginated
      sortableColumns
      defaultPagination={{ pageIndex: 0, pageSize: 3 }}
    />,
  );

  await root.getByRole("button", { name: "next-page" }).click();
  await root.getByRole("button", { name: "report" }).click();
  let status = await readStatus(root);
  expect(status.pagination.pageIndex).toBe(1);

  await root
    .locator("thead th")
    .filter({ hasText: "amount" })
    .locator(".header-sort-toggle")
    .click();
  await root.getByRole("button", { name: "report" }).click();
  status = await readStatus(root);
  expect(status.pagination.pageIndex).toBe(0);
});

test("adding a group-by level resets to the first page", async ({ mount }) => {
  const root = await mountGrid(
    mount,
    <ImperativeApiGrid
      columns={columns}
      dataSource={buildRows()}
      label="Reset on group"
      paginated
      groupableColumns
      defaultPagination={{ pageIndex: 0, pageSize: 3 }}
    />,
  );

  await root.getByRole("button", { name: "next-page" }).click();
  await root.getByRole("button", { name: "report" }).click();
  let status = await readStatus(root);
  expect(status.pagination.pageIndex).toBe(1);

  const regionHeader = root.locator("thead th").filter({ hasText: "region" });
  await regionHeader.focus();
  await regionHeader.press("Alt+ArrowDown");
  await root.getByRole("button", { name: "report" }).click();
  status = await readStatus(root);
  expect(status.pagination.pageIndex).toBe(0);
});

test("getPagination/getPageCount report the active page and total through the imperative API", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <ImperativeApiGrid
      columns={columns}
      dataSource={buildRows()}
      label="Imperative pagination"
      paginated
      defaultPagination={{ pageIndex: 0, pageSize: 3 }}
    />,
  );

  await root.getByRole("button", { name: "report" }).click();
  let status = await readStatus(root);
  expect(status.pagination).toEqual({ pageIndex: 0, pageSize: 3 });
  expect(status.pageCount).toBe(3);

  await root.getByRole("button", { name: "next-page" }).click();
  await root.getByRole("button", { name: "report" }).click();
  status = await readStatus(root);
  expect(status.pagination.pageIndex).toBe(1);
});

test("a grid with paginated off renders every row on one implicit page", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <RowIdentifiedGrid
      columns={columns}
      dataSource={buildRows()}
      label="Unpaginated"
    />,
  );

  await expect(dataRows(root)).toHaveCount(7);
  await expect(root.locator(".gridkit-grid-pager")).toHaveCount(0);
});

test("aria-rowindex reports each row's absolute dataset position, not its page-relative one", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <RowIdentifiedGrid
      columns={columns}
      dataSource={buildRows()}
      label="Absolute aria-rowindex"
      paginated
      defaultPagination={{ pageIndex: 1, pageSize: 3 }}
    />,
  );

  // Page 2 (0-based index 1) holds rows r4, r5, r6 — dataset positions 3, 4,
  // 5 (0-based) — so aria-rowindex (position + 2, header counted as row 1)
  // is 5, 6, 7, not the page-relative 2, 3, 4 a naive implementation would
  // report.
  const rows = dataRows(root);
  await expect(rows.nth(0)).toHaveAttribute("aria-rowindex", "5");
  await expect(rows.nth(1)).toHaveAttribute("aria-rowindex", "6");
  await expect(rows.nth(2)).toHaveAttribute("aria-rowindex", "7");

  // aria-rowcount stays the full dataset count regardless of the page shown.
  await expect(root.getByRole("grid")).toHaveAttribute("aria-rowcount", "8");
});
