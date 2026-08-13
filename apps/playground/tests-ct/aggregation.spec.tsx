// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import type { MountResult } from "@playwright/experimental-ct-react";
import type { AggregateState, ColumnDefinition } from "@gridkitjs/core";
import { expect, test } from "./support/coverage";
import { mountGrid } from "./support/mountGrid";
import CustomAggregateGrid from "./support/CustomAggregateGrid";
import RowIdentifiedGrid from "./support/RowIdentifiedGrid";

interface Row {
  id: string;
  region: string;
  amount: number;
}

/** East: r2, r4 (amount 20 + 40 = 60). West: r1, r3, r5 (amount 10 + 30 + 50 = 90). Grand total: 150. */
function buildRows(): Row[] {
  return [
    { id: "r1", region: "West", amount: 10 },
    { id: "r2", region: "East", amount: 20 },
    { id: "r3", region: "West", amount: 30 },
    { id: "r4", region: "East", amount: 40 },
    { id: "r5", region: "West", amount: 50 },
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

function footer(root: MountResult) {
  return root.locator(".grid-footer");
}

test("a grand-total footer renders each active aggregate's value over the whole dataset", async ({
  mount,
}) => {
  const aggregates: AggregateState<Row> = [{ columnId: "amount", fn: "sum" }];
  const root = await mountGrid(
    mount,
    <RowIdentifiedGrid
      columns={columns}
      dataSource={buildRows()}
      label="Grand total"
      aggregates={aggregates}
    />,
  );

  await expect(footer(root)).toHaveCount(1);
  const amountCell = footer(root).locator('td[data-gridkit-column="amount"]');
  await expect(amountCell).toHaveText("150");
  // A column with no aggregate spec renders a blank footer cell.
  const idCell = footer(root).locator('td[data-gridkit-column="id"]');
  await expect(idCell).toHaveText("");
});

test("no footer renders when aggregates is empty or omitted", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <RowIdentifiedGrid
      columns={columns}
      dataSource={buildRows()}
      label="No aggregates"
    />,
  );
  await expect(footer(root)).toHaveCount(0);
});

test("a group header shows its own subtotal, computed over its own leaf rows only", async ({
  mount,
}) => {
  const aggregates: AggregateState<Row> = [{ columnId: "amount", fn: "sum" }];
  const root = await mountGrid(
    mount,
    <RowIdentifiedGrid
      columns={columns}
      dataSource={buildRows()}
      label="Group subtotal"
      defaultGroupBy={[{ columnId: "region" }]}
      aggregates={aggregates}
    />,
  );

  const east = groupHeaders(root).filter({ hasText: "East" });
  const west = groupHeaders(root).filter({ hasText: "West" });
  await expect(east.locator(".group-aggregate")).toHaveText("amount: 60");
  await expect(west.locator(".group-aggregate")).toHaveText("amount: 90");
});

test("a collapsed group still shows its correct subtotal", async ({
  mount,
}) => {
  const aggregates: AggregateState<Row> = [{ columnId: "amount", fn: "sum" }];
  const root = await mountGrid(
    mount,
    <RowIdentifiedGrid
      columns={columns}
      dataSource={buildRows()}
      label="Collapsed group subtotal"
      defaultGroupBy={[{ columnId: "region" }]}
      defaultGroupExpansion={['["East"]']}
      aggregates={aggregates}
    />,
  );

  const east = groupHeaders(root).filter({ hasText: "East" });
  await expect(east).toHaveAttribute("aria-expanded", "false");
  await expect(east.locator(".group-aggregate")).toHaveText("amount: 60");
});

test("a custom aggregate function computes the right value from the full leaf-row set of its own group", async ({
  mount,
}) => {
  const root = await mountGrid(
    mount,
    <CustomAggregateGrid
      dataSource={buildRows()}
      label="Custom aggregate"
      defaultGroupBy={[{ columnId: "region" }]}
    />,
  );

  const east = groupHeaders(root).filter({ hasText: "East" });
  const west = groupHeaders(root).filter({ hasText: "West" });
  await expect(east.locator(".group-aggregate")).toHaveText("amount: 2");
  await expect(west.locator(".group-aggregate")).toHaveText("amount: 3");
});

test("min over a column with no values in scope renders the blank fallback, not a crash", async ({
  mount,
}) => {
  const aggregates: AggregateState<Row> = [{ columnId: "amount", fn: "min" }];
  const root = await mountGrid(
    mount,
    <RowIdentifiedGrid
      columns={columns}
      dataSource={[]}
      label="Empty min"
      aggregates={aggregates}
    />,
  );

  const amountCell = footer(root).locator('td[data-gridkit-column="amount"]');
  await expect(amountCell).toHaveText("—");
});

test("a subtotal's value stays identical across pages once a group spans multiple pages", async ({
  mount,
}) => {
  // pageSize: 1 top-level unit per page, and West alone spans a page on
  // its own — its subtotal must read the same whether page 1 or the West
  // page itself is showing, since aggregates are computed over the whole
  // dataset, never scoped to the current page.
  const aggregates: AggregateState<Row> = [{ columnId: "amount", fn: "sum" }];
  const root = await mountGrid(
    mount,
    <RowIdentifiedGrid
      columns={columns}
      dataSource={buildRows()}
      label="Subtotal across pages"
      defaultGroupBy={[{ columnId: "region" }]}
      aggregates={aggregates}
      paginated
      defaultPagination={{ pageIndex: 0, pageSize: 1 }}
    />,
  );

  // Page 1: East (region sorts East before West).
  const eastHeader = groupHeaders(root).filter({ hasText: "East" });
  await expect(eastHeader.locator(".group-aggregate")).toHaveText("amount: 60");

  await root.getByRole("button", { name: "Next" }).click();

  // Page 2: West — its own subtotal is unaffected by which page shows it.
  const westHeader = groupHeaders(root).filter({ hasText: "West" });
  await expect(westHeader.locator(".group-aggregate")).toHaveText("amount: 90");
});
