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

function groupSummaryRows(root: MountResult) {
  return root.locator("tr[data-gridkit-group-summary]");
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

test.describe('groupAggregateDisplay: "row"', () => {
  test("renders no inline aggregates in the header, and a separate summary row with each value in its own column's cell", async ({
    mount,
  }) => {
    const aggregates: AggregateState<Row> = [{ columnId: "amount", fn: "sum" }];
    const root = await mountGrid(
      mount,
      <RowIdentifiedGrid
        columns={columns}
        dataSource={buildRows()}
        label="Row display"
        defaultGroupBy={[{ columnId: "region" }]}
        aggregates={aggregates}
        groupAggregateDisplay="row"
      />,
    );

    const east = groupHeaders(root).filter({ hasText: "East" });
    await expect(east.locator(".group-aggregate")).toHaveCount(0);

    await expect(groupSummaryRows(root)).toHaveCount(2);
    const eastSummary = groupSummaryRows(root).first();
    await expect(
      eastSummary.locator('td[data-gridkit-column="amount"]'),
    ).toHaveText("60");
    // A column with no aggregate spec renders a blank summary cell, the
    // same way GridFooter's own grand-total row does.
    await expect(
      eastSummary.locator('td[data-gridkit-column="id"]'),
    ).toHaveText("");
  });

  test("a collapsed group's summary row still sits directly after its own header, with no descendants between them", async ({
    mount,
  }) => {
    const aggregates: AggregateState<Row> = [{ columnId: "amount", fn: "sum" }];
    const root = await mountGrid(
      mount,
      <RowIdentifiedGrid
        columns={columns}
        dataSource={buildRows()}
        label="Collapsed row display"
        defaultGroupBy={[{ columnId: "region" }]}
        defaultGroupExpansion={['["East"]']}
        aggregates={aggregates}
        groupAggregateDisplay="row"
      />,
    );

    const rowKinds = await root
      .locator("tbody tr")
      .evaluateAll((rows) =>
        rows.map((row) =>
          row.hasAttribute("data-gridkit-group")
            ? "header"
            : row.hasAttribute("data-gridkit-group-summary")
              ? "summary"
              : "data",
        ),
      );
    // East (collapsed): header immediately followed by its own summary row,
    // no data rows in between. West (expanded): header, its 3 rows, then
    // its own summary row.
    expect(rowKinds).toEqual([
      "header",
      "summary",
      "header",
      "data",
      "data",
      "data",
      "summary",
    ]);
  });

  test("a group's summary row never splits from its group across a page boundary", async ({
    mount,
  }) => {
    const aggregates: AggregateState<Row> = [{ columnId: "amount", fn: "sum" }];
    const root = await mountGrid(
      mount,
      <RowIdentifiedGrid
        columns={columns}
        dataSource={buildRows()}
        label="Row display paginated"
        defaultGroupBy={[{ columnId: "region" }]}
        aggregates={aggregates}
        groupAggregateDisplay="row"
        paginated
        defaultPagination={{ pageIndex: 0, pageSize: 1 }}
      />,
    );

    // Page 1: East's header, its 2 rows, and its own summary row — all one
    // unit, nothing from West.
    await expect(groupHeaders(root)).toHaveCount(1);
    await expect(groupSummaryRows(root)).toHaveCount(1);
    await expect(groupHeaders(root).first()).toContainText("East");

    await root.getByRole("button", { name: "Next" }).click();

    // Page 2: West's own header, rows, and summary row.
    await expect(groupHeaders(root)).toHaveCount(1);
    await expect(groupSummaryRows(root)).toHaveCount(1);
    await expect(groupHeaders(root).first()).toContainText("West");
  });

  test("ArrowDown/ArrowUp step over a group's summary row rather than landing a tab stop on it", async ({
    mount,
  }) => {
    const aggregates: AggregateState<Row> = [{ columnId: "amount", fn: "sum" }];
    const root = await mountGrid(
      mount,
      <RowIdentifiedGrid
        columns={columns}
        dataSource={buildRows()}
        label="Keyboard skip"
        defaultGroupBy={[{ columnId: "region" }]}
        aggregates={aggregates}
        groupAggregateDisplay="row"
      />,
    );

    // Row order: East header, r2, r4, East summary, West header, r1, r3, r5,
    // West summary. Start on the last East data row (r4) and arrow down —
    // it should land on West's header, skipping the East summary row
    // entirely.
    const r4Cell = root
      .locator("tbody tr")
      .filter({ hasText: "r4" })
      .locator("td")
      .first();
    await r4Cell.click();
    await expect(r4Cell).toHaveAttribute("tabindex", "0");

    await r4Cell.press("ArrowDown");
    const westHeaderCell = groupHeaders(root)
      .filter({ hasText: "West" })
      .locator("td");
    await expect(westHeaderCell).toHaveAttribute("tabindex", "0");

    // ArrowUp from there returns to r4, stepping back over the same
    // summary row in the opposite direction.
    await westHeaderCell.press("ArrowUp");
    await expect(r4Cell).toHaveAttribute("tabindex", "0");
  });

  test("groupAggregateDisplay defaults to inline when omitted", async ({
    mount,
  }) => {
    const aggregates: AggregateState<Row> = [{ columnId: "amount", fn: "sum" }];
    const root = await mountGrid(
      mount,
      <RowIdentifiedGrid
        columns={columns}
        dataSource={buildRows()}
        label="Default display"
        defaultGroupBy={[{ columnId: "region" }]}
        aggregates={aggregates}
      />,
    );

    await expect(groupSummaryRows(root)).toHaveCount(0);
    const east = groupHeaders(root).filter({ hasText: "East" });
    await expect(east.locator(".group-aggregate")).toHaveText("amount: 60");
  });
});

test.describe("cell alignment", () => {
  test("a footer cell without an alignment override inherits its column's own alignment", async ({
    mount,
  }) => {
    const alignedColumns: readonly ColumnDefinition<Row>[] = [
      { field: "id", width: 80 },
      { field: "region", width: 100 },
      { field: "amount", width: 100, type: "number", alignment: "right" },
    ];
    const aggregates: AggregateState<Row> = [{ columnId: "amount", fn: "sum" }];
    const root = await mountGrid(
      mount,
      <RowIdentifiedGrid
        columns={alignedColumns}
        dataSource={buildRows()}
        label="Footer inherits column alignment"
        aggregates={aggregates}
      />,
    );

    const amountCell = footer(root).locator('td[data-gridkit-column="amount"]');
    await expect(amountCell).toHaveCSS("text-align", "right");
  });

  test("AggregateSpec.alignment overrides the column's own alignment, in both the footer and a group's summary row", async ({
    mount,
  }) => {
    const aggregates: AggregateState<Row> = [
      { columnId: "amount", fn: "sum", alignment: "center" },
    ];
    const root = await mountGrid(
      mount,
      <RowIdentifiedGrid
        columns={columns}
        dataSource={buildRows()}
        label="Spec overrides alignment"
        defaultGroupBy={[{ columnId: "region" }]}
        aggregates={aggregates}
        groupAggregateDisplay="row"
      />,
    );

    const footerCell = footer(root).locator('td[data-gridkit-column="amount"]');
    await expect(footerCell).toHaveCSS("text-align", "center");

    const summaryCell = groupSummaryRows(root)
      .first()
      .locator('td[data-gridkit-column="amount"]');
    await expect(summaryCell).toHaveCSS("text-align", "center");
  });

  test("when two specs share a column and disagree on alignment, the first one in AggregateState wins for the whole cell", async ({
    mount,
  }) => {
    const aggregates: AggregateState<Row> = [
      { columnId: "amount", fn: "sum", alignment: "left" },
      { columnId: "amount", fn: "avg", id: "avg", alignment: "right" },
    ];
    const root = await mountGrid(
      mount,
      <RowIdentifiedGrid
        columns={columns}
        dataSource={buildRows()}
        label="First spec wins"
        aggregates={aggregates}
      />,
    );

    const amountCell = footer(root).locator('td[data-gridkit-column="amount"]');
    await expect(amountCell).toHaveCSS("text-align", "left");
    // Both values still render — the alignment conflict resolves without
    // dropping either result.
    await expect(amountCell).toHaveText("150, 30");
  });
});
