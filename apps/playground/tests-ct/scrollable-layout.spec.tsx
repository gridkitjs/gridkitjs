// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import type { AggregateState, ColumnDefinition } from "@gridkitjs/core";
import { DataGridComponent } from "@gridkitjs/react";
import { expect, test } from "./support/coverage";
import { mountGrid } from "./support/mountGrid";
import ImperativeApiGrid from "./support/ImperativeApiGrid";

interface Row {
  id: string;
  name: string;
  value: number;
}

function buildRows(count: number): Row[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `row-${String(index)}`,
    name: `Row ${String(index)}`,
    value: index,
  }));
}

const columns: readonly ColumnDefinition<Row>[] = [
  { field: "id", width: 80 },
  { field: "name", width: 160 },
  { field: "value", width: 100, type: "number" },
];

const aggregates: AggregateState<Row> = [{ columnId: "value", fn: "sum" }];

test.describe("scrollable layout", () => {
  test("height bounds the body's own scroll area; the header and footer stay in place while it scrolls", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <DataGridComponent
        columns={columns}
        dataSource={buildRows(50)}
        label="Scrollable"
        height={150}
        aggregates={aggregates}
      />,
    );

    const body = root.locator(".gridkit-data-grid-body");
    const header = root.locator(".gridkit-data-grid-header");
    const footer = root.locator(".gridkit-data-grid-footer");
    await expect(footer).toHaveCount(1);

    // The body has more content than its bounded height allows — there's
    // something to scroll through.
    const overflows = await body.evaluate(
      (element) => element.scrollHeight > element.clientHeight,
    );
    expect(overflows).toBe(true);

    const headerYBefore = (await header.boundingBox())?.y;
    const footerYBefore = (await footer.boundingBox())?.y;

    await body.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });

    // Scrolling the body moved it, but the header and footer — siblings of
    // the scrolling div, not descendants of it — never moved at all.
    await expect
      .poll(() => body.evaluate((element) => element.scrollTop))
      .toBeGreaterThan(0);
    expect((await header.boundingBox())?.y).toBe(headerYBefore);
    expect((await footer.boundingBox())?.y).toBe(footerYBefore);
  });

  test("horizontal scroll on the viewport moves the header, body, and footer tables together, staying column-aligned", async ({
    mount,
  }) => {
    const wideColumns: readonly ColumnDefinition<Row>[] = [
      { field: "id", width: 300 },
      { field: "name", width: 300 },
      { field: "value", width: 300, type: "number" },
    ];
    const root = await mountGrid(
      mount,
      <DataGridComponent
        columns={wideColumns}
        dataSource={buildRows(3)}
        label="Wide"
        resizeMode="fixed"
        aggregates={aggregates}
      />,
      { width: 200 },
    );

    const viewport = root.locator(".gridkit-data-grid-viewport");
    const headerCell = root.locator(".gridkit-data-grid-header th").nth(2);
    const bodyCell = root.locator("tbody tr").first().locator("td").nth(2);
    const footerCell = root.locator(".gridkit-data-grid-footer td").nth(2);

    const beforeX = (await headerCell.boundingBox())?.x;

    await viewport.evaluate((element) => {
      element.scrollLeft = element.scrollWidth;
    });
    await expect
      .poll(() => viewport.evaluate((element) => element.scrollLeft))
      .toBeGreaterThan(0);

    const afterHeaderX = (await headerCell.boundingBox())?.x;
    const afterBodyX = (await bodyCell.boundingBox())?.x;
    const afterFooterX = (await footerCell.boundingBox())?.x;

    expect(afterHeaderX).toBeLessThan(beforeX ?? 0);
    expect(afterBodyX).toBe(afterHeaderX);
    expect(afterFooterX).toBe(afterHeaderX);
  });

  test("scrollToRow scrolls within the grid's own height-bound body, not only a consumer-supplied ancestor", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <ImperativeApiGrid
        columns={columns}
        dataSource={buildRows(40)}
        label="Api"
        height={150}
        scrollRowId="row-39"
      />,
    );
    const body = root.locator(".gridkit-data-grid-body");
    await expect(body).toHaveJSProperty("scrollTop", 0);

    await root.getByRole("button", { name: "scroll-to-row" }).click();
    await expect
      .poll(() => body.evaluate((element) => element.scrollTop))
      .toBeGreaterThan(0);
  });

  test("a grid with no height set has no internal scroll on its body — same layout as before this feature existed", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <DataGridComponent
        columns={columns}
        dataSource={buildRows(50)}
        label="No height"
      />,
    );
    const body = root.locator(".gridkit-data-grid-body");
    const overflows = await body.evaluate(
      (element) => element.scrollHeight > element.clientHeight,
    );
    expect(overflows).toBe(false);
  });
});
