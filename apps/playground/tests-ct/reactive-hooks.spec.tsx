// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import type { MountResult } from "@playwright/experimental-ct-react";
import type {
  GroupByState,
  GroupExpansionState,
  PaginationState,
} from "@gridkitjs/core";
import { expect, test } from "./support/coverage";
import { mountGrid } from "./support/mountGrid";
import ReactiveHooksGrid from "./support/ReactiveHooksGrid";

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

const columns = [
  { field: "id" as const, width: 80 },
  { field: "region" as const, width: 100 },
  { field: "amount" as const, width: 100, type: "number" as const },
];

interface ReactiveStatus {
  pagination: PaginationState;
  pageCount: number;
  groupBy: GroupByState;
  groupExpansion: GroupExpansionState;
}

async function readReactiveStatus(root: MountResult): Promise<ReactiveStatus> {
  const text = await root.getByTestId("reactive-status").textContent();
  return JSON.parse(text ?? "{}") as ReactiveStatus;
}

test("usePaginationState updates from Next/Previous clicks with no onPaginationChange passed", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <ReactiveHooksGrid
      columns={columns}
      dataSource={buildRows()}
      paginated
      defaultPagination={{ pageIndex: 0, pageSize: 3 }}
    />,
  );

  let status = await readReactiveStatus(root);
  expect(status.pagination.pageIndex).toBe(0);
  expect(status.pageCount).toBe(3);

  await root.locator(".grid-pager-button", { hasText: "Next" }).click();
  status = await readReactiveStatus(root);
  expect(status.pagination.pageIndex).toBe(1);

  await root.locator(".grid-pager-button", { hasText: "Previous" }).click();
  status = await readReactiveStatus(root);
  expect(status.pagination.pageIndex).toBe(0);
});

test("usePaginationState's own goToPage/setPageSize actions drive the grid", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <ReactiveHooksGrid
      columns={columns}
      dataSource={buildRows()}
      paginated
      defaultPagination={{ pageIndex: 0, pageSize: 1 }}
    />,
  );

  await root.getByRole("button", { name: "reactive-goto-page-3" }).click();
  let status = await readReactiveStatus(root);
  expect(status.pagination.pageIndex).toBe(2);

  await root.getByRole("button", { name: "reactive-previous-page" }).click();
  status = await readReactiveStatus(root);
  expect(status.pagination.pageIndex).toBe(1);

  await root.getByRole("button", { name: "reactive-set-page-size-2" }).click();
  status = await readReactiveStatus(root);
  expect(status.pagination.pageSize).toBe(2);
});

test("usePaginationState updates on the silent page reset from a sort change, with no onPaginationChange or onColumnSortChange passed", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <ReactiveHooksGrid
      columns={columns}
      dataSource={buildRows()}
      paginated
      sortableColumns
      defaultPagination={{ pageIndex: 0, pageSize: 3 }}
    />,
  );

  await root.locator(".grid-pager-button", { hasText: "Next" }).click();
  let status = await readReactiveStatus(root);
  expect(status.pagination.pageIndex).toBe(1);

  await root
    .locator("thead th")
    .filter({ hasText: "amount" })
    .locator(".header-sort-toggle")
    .click();

  status = await readReactiveStatus(root);
  expect(status.pagination.pageIndex).toBe(0);
});

test("useGroupByState updates from a header's group toggle with no onGroupByChange passed", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <ReactiveHooksGrid
      columns={columns}
      dataSource={buildRows()}
      groupableColumns
    />,
  );

  let status = await readReactiveStatus(root);
  expect(status.groupBy).toEqual([]);

  const regionHeader = root.locator("thead th").filter({ hasText: "region" });
  await regionHeader.focus();
  await regionHeader.press("Alt+ArrowDown");

  status = await readReactiveStatus(root);
  expect(status.groupBy).toEqual([{ columnId: "region" }]);
});

test("useGroupByState's expandAllGroups/collapseAllGroups drive the grid", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <ReactiveHooksGrid
      columns={columns}
      dataSource={buildRows()}
      groupableColumns
      defaultGroupBy={[{ columnId: "region" }]}
    />,
  );

  await root
    .getByRole("button", { name: "reactive-collapse-all-groups" })
    .click();
  let status = await readReactiveStatus(root);
  expect(status.groupExpansion.length).toBeGreaterThan(0);

  await root
    .getByRole("button", { name: "reactive-expand-all-groups" })
    .click();
  status = await readReactiveStatus(root);
  expect(status.groupExpansion).toEqual([]);
});
