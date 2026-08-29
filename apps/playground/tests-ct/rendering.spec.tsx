// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import type { ColumnDefinition } from "@gridkitjs/core";
import { DataGridComponent } from "@gridkitjs/react";
import type { MountResult } from "@playwright/experimental-ct-react";
import { expect, test } from "./support/coverage";
import { mountGrid } from "./support/mountGrid";

/**
 * The header `<table>` — one of three (header/body/footer) that now share
 * the `role="grid"`/`"treegrid"` wrapper `mountGrid` waits on, each carrying
 * its own width, colgroup, and borders/hover/selectable classes. Any one of
 * them proves the same computation `getByRole("grid")` used to prove
 * directly, back when a single `<table>` carried the role itself.
 */
function gridTable(root: MountResult) {
  return root.locator(".gridkit-data-grid-header");
}

interface Row {
  id: string;
  name: string;
  status: string;
}

function buildRows(count: number): Row[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `row-${String(index)}`,
    name: `Row ${String(index)}`,
    status: index % 2 === 0 ? "ok" : "warn",
  }));
}

const columns: readonly ColumnDefinition<Row>[] = [
  { field: "name", width: 120 },
  { field: "status", width: 80 },
];

const BORDER_VALUES = ["horizontal", "vertical", "all", "none"] as const;

test.describe("structural rendering", () => {
  test("counts the header as row 1 in aria-rowcount, and every column in aria-colcount", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <DataGridComponent
        columns={columns}
        dataSource={buildRows(5)}
        label="Costs"
      />,
    );
    const table = root.getByRole("grid");
    await expect(table).toHaveAttribute("aria-rowcount", "6");
    await expect(table).toHaveAttribute("aria-colcount", "2");
  });

  test("an empty dataSource renders only the header row, not a crash", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <DataGridComponent columns={columns} dataSource={[]} label="Empty" />,
    );
    const table = root.getByRole("grid");
    await expect(table).toHaveAttribute("aria-rowcount", "1");
    await expect(table.locator("tbody tr")).toHaveCount(0);
  });

  test("a single-row grid gives its one row aria-rowindex 2", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <DataGridComponent
        columns={columns}
        dataSource={buildRows(1)}
        label="One row"
      />,
    );
    await expect(root.locator("tbody tr")).toHaveAttribute(
      "aria-rowindex",
      "2",
    );
  });

  test("omitting columns infers one per field from the data", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <DataGridComponent dataSource={buildRows(3)} label="Inferred" />,
    );
    // Row has three fields: id, name, status.
    await expect(root.getByRole("grid")).toHaveAttribute("aria-colcount", "3");
  });

  test("omitting both columns and dataSource renders an empty grid, not a crash", async ({
    mount,
  }) => {
    // Not routed through `mountGrid`: zero columns resolves to a table with no
    // width at all, which Playwright treats as not visible — the point of
    // this test is exactly that degenerate, zero-width case, so it only
    // checks the table is attached with the right attributes, not visible.
    const root = await mount(<DataGridComponent label="Nothing" />);
    const table = root.getByRole("grid");
    await expect(table).toBeAttached();
    await expect(table).toHaveAttribute("aria-colcount", "0");
    await expect(table).toHaveAttribute("aria-rowcount", "1");
  });

  test("the colgroup's widths and the table's own width both equal the resolved total", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <DataGridComponent
        columns={columns}
        dataSource={buildRows(3)}
        label="Widths"
        resizeMode="fixed"
      />,
    );
    const table = gridTable(root);
    const colWidths = await table
      .locator("colgroup col")
      .evaluateAll((elements) =>
        elements.map((element) =>
          parseFloat((element as HTMLElement).style.width),
        ),
      );
    const total = colWidths.reduce((sum, width) => sum + width, 0);
    const tableWidth = await table.evaluate((element) =>
      parseFloat((element as HTMLElement).style.width),
    );
    expect(total).toBeCloseTo(120 + 80, 0);
    expect(tableWidth).toBeCloseTo(total, 0);
  });

  for (const borders of BORDER_VALUES) {
    test(`borders="${borders}" applies exactly the matching class`, async ({
      mount,
    }) => {
      const root = await mountGrid(
        mount,
        <DataGridComponent
          columns={columns}
          dataSource={buildRows(2)}
          label="Borders"
          borders={borders}
        />,
      );
      const table = gridTable(root);
      for (const other of BORDER_VALUES) {
        if (other === borders) {
          await expect(table).toHaveClass(new RegExp(`borders-${other}`));
        } else {
          await expect(table).not.toHaveClass(new RegExp(`borders-${other}`));
        }
      }
    });
  }

  test("omitting borders applies none of the borders classes", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <DataGridComponent
        columns={columns}
        dataSource={buildRows(2)}
        label="No borders prop"
      />,
    );
    await expect(gridTable(root)).not.toHaveClass(/borders-/);
  });

  test("hoverable={{ rows: false }} adds no-hover-rows and leaves the other two hoverable", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <DataGridComponent
        columns={columns}
        dataSource={buildRows(2)}
        label="Hover"
        hoverable={{ rows: false }}
      />,
    );
    const table = gridTable(root);
    await expect(table).toHaveClass(/no-hover-rows/);
    await expect(table).not.toHaveClass(/no-hover-columns/);
    await expect(table).not.toHaveClass(/no-hover-cells/);
  });

  test('resizeMode="fixed" keeps a column\'s declared width regardless of container width', async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <DataGridComponent
        columns={columns}
        dataSource={buildRows(2)}
        label="Fixed"
        resizeMode="fixed"
      />,
      { width: 1000 },
    );
    const tableWidth = await gridTable(root).evaluate((element) =>
      parseFloat((element as HTMLElement).style.width),
    );
    expect(tableWidth).toBeCloseTo(200, 0);
  });

  test('resizeMode="fit" (the default) sums column widths to the container\'s measured width', async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <DataGridComponent
        columns={columns}
        dataSource={buildRows(2)}
        label="Fit"
      />,
      { width: 500 },
    );
    const tableWidth = await gridTable(root).evaluate((element) =>
      parseFloat((element as HTMLElement).style.width),
    );
    expect(tableWidth).toBeCloseTo(500, 0);
  });

  test('unmounting under resizeMode="fit" disconnects its ResizeObserver without throwing', async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <DataGridComponent
        columns={columns}
        dataSource={buildRows(2)}
        label="Unmount"
      />,
    );
    await root.unmount();
  });

  test("wrap: { header: true, cells: true } adds is-wrapped to the header and its cells", async ({
    mount,
  }) => {
    const wrappingColumns: readonly ColumnDefinition<Row>[] = [
      { field: "name", width: 120, wrap: { header: true, cells: true } },
      { field: "status", width: 80 },
    ];
    const root = await mountGrid(
      mount,
      <DataGridComponent
        columns={wrappingColumns}
        dataSource={buildRows(1)}
        label="Wrap"
      />,
    );
    const headerLocators = root.locator("thead th");
    await expect(headerLocators.nth(0)).toHaveClass(/is-wrapped/);
    await expect(headerLocators.nth(1)).not.toHaveClass(/is-wrapped/);

    const cells = root.locator("tbody tr").first().locator("td");
    await expect(cells.nth(0)).toHaveClass(/is-wrapped/);
    await expect(cells.nth(1)).not.toHaveClass(/is-wrapped/);
  });
});
