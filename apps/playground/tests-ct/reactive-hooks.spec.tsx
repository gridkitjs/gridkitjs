// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import { StrictMode } from "react";
import type { MountResult } from "@playwright/experimental-ct-react";
import type {
  CellSelectionState,
  ColumnSortState,
  GroupByState,
  GroupExpansionState,
  PaginationState,
} from "@gridkitjs/core";
import { expect, test } from "./support/coverage";
import { mountGrid } from "./support/mountGrid";
import ReactiveHooksGrid from "./support/ReactiveHooksGrid";
import UnmountableReactiveHooksGrid from "./support/UnmountableReactiveHooksGrid";

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
  columnSort: ColumnSortState;
  rowSelection: readonly string[];
  columnSelection: readonly string[];
  cellSelection: CellSelectionState;
  aggregates: [string, unknown][];
  columnSizing: Record<string, number>;
  columnOrder: readonly string[];
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

test("useGroupByState's expandAllGroups/collapseAllGroups and useSelectionState's selectAllRows/clearSelection drive the grid", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <ReactiveHooksGrid
      columns={columns}
      dataSource={buildRows()}
      groupableColumns
      defaultGroupBy={[{ columnId: "region" }]}
      selectable={{ rows: "multiple" }}
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

  await root.getByRole("button", { name: "reactive-select-all-rows" }).click();
  status = await readReactiveStatus(root);
  expect(status.rowSelection.length).toBe(7);

  await root.getByRole("button", { name: "reactive-clear-selection" }).click();
  status = await readReactiveStatus(root);
  expect(status.rowSelection).toEqual([]);
});

test("useColumnSizingState reflects a live resize with no onColumnResize passed", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <ReactiveHooksGrid
      columns={columns}
      dataSource={buildRows()}
      resizableColumns
      resizeMode="fixed"
    />,
  );

  let status = await readReactiveStatus(root);
  expect(status.columnSizing["id"]).toBeUndefined();

  const idHeader = root.locator("thead th").filter({ hasText: "id" });
  const handle = idHeader.locator(".header-resize-handle");
  const box = await handle.boundingBox();
  if (box === null) throw new Error("resize handle not found");
  await root.page().mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await root.page().mouse.down();
  await root
    .page()
    .mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2);
  await root.page().mouse.up();

  status = await readReactiveStatus(root);
  expect(status.columnSizing["id"]).toBeGreaterThan(80);
});

test("useColumnOrderState reflects the grid's active column order", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <ReactiveHooksGrid
      columns={columns}
      dataSource={buildRows()}
      reorderableColumns
      defaultColumnOrder={["amount", "id", "region"]}
    />,
  );

  const status = await readReactiveStatus(root);
  expect(status.columnOrder).toEqual(["amount", "id", "region"]);
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

test("useColumnSortState updates from a header click with no onColumnSortChange passed", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <ReactiveHooksGrid
      columns={columns}
      dataSource={buildRows()}
      sortableColumns
    />,
  );

  let status = await readReactiveStatus(root);
  expect(status.columnSort).toEqual([]);

  await root
    .locator("thead th")
    .filter({ hasText: "amount" })
    .locator(".header-sort-toggle")
    .click();

  status = await readReactiveStatus(root);
  expect(status.columnSort).toEqual([{ columnId: "amount", direction: "asc" }]);
});

test("useSelectionState updates from Ctrl+click row selection with no onRowSelectionChange passed", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <ReactiveHooksGrid
      columns={columns}
      dataSource={buildRows()}
      selectable={{ rows: "multiple" }}
    />,
  );

  let status = await readReactiveStatus(root);
  expect(status.rowSelection).toHaveLength(0);

  await root.locator("tbody tr").first().locator("td").first().click();
  status = await readReactiveStatus(root);
  expect(status.rowSelection).toEqual(["r1"]);
});

test("useAggregateState updates when a sort/filter-adjacent change alters the grand total, with no dedicated on*Change prop for aggregates", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <ReactiveHooksGrid
      columns={columns}
      dataSource={buildRows()}
      aggregates={[{ columnId: "amount", fn: "sum" }]}
      selectable={{ rows: "multiple" }}
    />,
  );

  const status = await readReactiveStatus(root);
  const total = status.aggregates.find(([key]) => key === "amount")?.[1];
  expect(total).toBe(280);
});

test("unmounting the hook's owning component doesn't throw and stops receiving updates", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <UnmountableReactiveHooksGrid
      columns={columns}
      dataSource={buildRows()}
      paginated
      defaultPagination={{ pageIndex: 0, pageSize: 3 }}
    />,
  );

  await expect(root.getByTestId("reactive-status")).toBeVisible();

  await root.getByRole("button", { name: "unmount-reader" }).click();
  await expect(root.getByTestId("reactive-status")).toHaveCount(0);

  // A grid state change after the reader unmounted must not throw trying to
  // notify a stale listener — `useEffect`'s cleanup already removed it from
  // `DataGrid`'s own subscriber set.
  const consoleErrors: string[] = [];
  root.page().on("pageerror", (error) => {
    consoleErrors.push(error.message);
  });
  await root.locator(".grid-pager-button", { hasText: "Next" }).click();
  expect(consoleErrors).toEqual([]);
});

test("the reactive hooks don't warn under React Strict Mode's double-render/double-effect behavior", async ({
  mount,
  page,
}) => {
  const errors: string[] = [];
  const warnings: string[] = [];
  page.on("pageerror", (error) => {
    errors.push(String(error));
  });
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") {
      warnings.push(msg.text());
    }
  });

  const root = await mountGrid(
    mount,
    <StrictMode>
      <ReactiveHooksGrid
        columns={columns}
        dataSource={buildRows()}
        paginated
        defaultPagination={{ pageIndex: 0, pageSize: 3 }}
      />
    </StrictMode>,
  );

  await root.locator(".grid-pager-button", { hasText: "Next" }).click();
  const status = await readReactiveStatus(root);
  expect(status.pagination.pageIndex).toBe(1);

  expect(errors).toEqual([]);
  expect(warnings.filter((warning) => warning.includes("getSnapshot"))).toEqual(
    [],
  );
});
