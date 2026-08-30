// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import type { MountResult } from "@playwright/experimental-ct-react";
import type { ColumnDefinition } from "@gridkitjs/core";
import { DataGridComponent } from "@gridkitjs/react";
import { expect, test } from "./support/coverage";
import { mountGrid, updateGrid } from "./support/mountGrid";
import ImperativeApiGrid from "./support/ImperativeApiGrid";

interface Row {
  id: string;
  name: string;
  region: string;
  notes: string;
}

const regions = ["North", "South", "East", "West"];

/** Every fifth row's `notes` is long enough to wrap onto more than one line, once `notes` opts into wrapping — genuinely different row heights, the concrete case dynamic measurement exists for. */
function buildRows(count: number): Row[] {
  return Array.from({ length: count }, (_unused, index) => ({
    id: `row-${String(index)}`,
    name: `Row ${String(index)}`,
    region: regions[index % regions.length] ?? "North",
    notes:
      index % 5 === 0
        ? "A long note that wraps across more than one line once its column allows wrapping, so this row measures taller than its neighbours."
        : `Note ${String(index)}`,
  }));
}

const columns: readonly ColumnDefinition<Row>[] = [
  { field: "id", width: 100 },
  { field: "name", width: 120 },
  { field: "region", width: 100 },
  { field: "notes", width: 220, wrap: { cells: true } },
];

function mountedDataRows(root: MountResult) {
  return root.locator("tbody tr[data-gridkit-row-index]");
}

test.describe("row virtualization", () => {
  test("mounts only a small, bounded number of rows regardless of total row count", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <DataGridComponent
        columns={columns}
        dataSource={buildRows(3000)}
        getRowId={(row) => row.id}
        label="Virtualized"
        height={200}
        virtualized
      />,
    );

    // A 200px viewport at a ~40px estimated row height, plus the default
    // overscan on each side, mounts on the order of ten rows — nowhere near
    // 3000. The exact count depends on measured heights and isn't asserted;
    // only that it stays small.
    const count = await mountedDataRows(root).count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(60);
  });

  test("scrolling changes which rows are mounted, and scrolling to the bottom mounts the last row", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <DataGridComponent
        columns={columns}
        dataSource={buildRows(1000)}
        getRowId={(row) => row.id}
        label="Virtualized"
        height={200}
        virtualized
      />,
    );

    await expect(root.getByText("Row 0", { exact: true })).toBeVisible();
    await expect(root.getByText("Row 999", { exact: true })).not.toBeAttached();

    const body = root.locator(".gridkit-data-grid-body");
    await body.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });

    await expect(root.getByText("Row 999", { exact: true })).toBeVisible();
    await expect(root.getByText("Row 0", { exact: true })).not.toBeAttached();
  });

  test("scrollToRow lands correctly on a far, currently-unmounted row", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <ImperativeApiGrid
        columns={columns}
        dataSource={buildRows(1000)}
        label="Virtualized api"
        height={200}
        virtualized
        scrollRowId="row-800"
      />,
    );

    await expect(root.getByText("Row 800", { exact: true })).not.toBeAttached();
    await root.getByRole("button", { name: "scroll-to-row" }).click();
    await expect(root.getByText("Row 800", { exact: true })).toBeVisible();
  });

  test("keyboard navigation moves focus correctly across the mounted window's boundary", async ({
    mount,
  }) => {
    const rows = buildRows(200);
    const root = await mountGrid(
      mount,
      <DataGridComponent
        columns={columns}
        dataSource={rows}
        getRowId={(row) => row.id}
        label="Virtualized nav"
        height={150}
        virtualized
      />,
    );

    const activeCell = () => root.locator('[tabindex="0"]');
    /** The `data-gridkit-row-index` of whichever row currently holds the tab stop, read off the focused cell's own row rather than assumed from a press count — the estimate-driven scroll a boundary-crossing press triggers doesn't land on a pixel-exact row, only a correct one. */
    async function focusedRowIndex(): Promise<number> {
      const attribute = await activeCell().evaluate((cell) =>
        cell.closest("tr")?.getAttribute("data-gridkit-row-index"),
      );
      expect(attribute).not.toBeNull();
      return Number(attribute);
    }

    await activeCell().press("ArrowDown"); // header -> row 0

    // Far more presses than the mounted window holds, so this crosses its
    // boundary repeatedly rather than staying inside it. Not stranded is the
    // property under test: exactly one cell keeps the tab stop throughout,
    // and it keeps advancing rather than getting stuck.
    for (let index = 0; index < 40; index++) {
      await expect(activeCell()).toHaveCount(1);
      await activeCell().press("ArrowDown");
    }
    await expect(activeCell()).toHaveCount(1);
    const afterFortyPresses = await focusedRowIndex();
    expect(afterFortyPresses).toBeGreaterThan(20);

    await activeCell().press("ArrowDown");
    await expect.poll(() => focusedRowIndex()).toBe(afterFortyPresses + 1);

    await activeCell().press("Control+End");
    await expect
      .poll(() => root.getByText("Row 199", { exact: true }).isVisible(), {
        timeout: 10000,
      })
      .toBe(true);
    await expect(
      root
        .locator("tbody tr[data-gridkit-row-index]")
        .last()
        .locator("td")
        .last(),
    ).toHaveAttribute("tabindex", "0", { timeout: 10000 });

    await activeCell().press("Control+Home");
    await expect(root.locator("thead th").first()).toHaveAttribute(
      "tabindex",
      "0",
    );
  });

  test("rows of different measured heights lay out without overlap or gap", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <DataGridComponent
        columns={columns}
        dataSource={buildRows(50)}
        getRowId={(row) => row.id}
        label="Mixed heights"
        height={400}
        virtualized
      />,
    );

    const rows = mountedDataRows(root);
    const count = await rows.count();
    expect(count).toBeGreaterThan(5);

    const boxes = await rows.evaluateAll((elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom };
      }),
    );

    for (let index = 1; index < boxes.length; index++) {
      const previous = boxes[index - 1];
      const current = boxes[index];
      if (previous === undefined || current === undefined) continue;
      // Contiguous, not overlapping and not gapped — within a pixel for
      // rounding.
      expect(Math.abs(current.top - previous.bottom)).toBeLessThan(1);
    }
  });

  test("resizing the height-bound body recomputes the visible range", async ({
    mount,
  }) => {
    const rows = buildRows(300);
    function grid(height: number) {
      return (
        <DataGridComponent
          columns={columns}
          dataSource={rows}
          getRowId={(row) => row.id}
          label="Resizable"
          height={height}
          virtualized
        />
      );
    }
    const root = await mountGrid(mount, grid(120));
    const smallCount = await mountedDataRows(root).count();

    await updateGrid(root, grid(600));
    await expect
      .poll(() => mountedDataRows(root).count())
      .toBeGreaterThan(smallCount);
  });

  test("virtualized combined with paginated still renders correctly", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <DataGridComponent
        columns={columns}
        dataSource={buildRows(200)}
        getRowId={(row) => row.id}
        label="Virtualized paginated"
        height={300}
        virtualized
        paginated
        defaultPagination={{ pageIndex: 0, pageSize: 20 }}
      />,
    );

    // Virtualization still windows the page's own 20 rows down to whatever
    // fits `height` plus overscan — "low-value but not actively broken" per
    // the docs, not a no-op. Bounded on both ends: something renders, and
    // never more than the page itself holds.
    const count = await mountedDataRows(root).count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(20);
    await expect(root.getByText("Row 0", { exact: true })).toBeVisible();
    await expect(root.getByText("Page 1 of 10")).toBeVisible();
  });

  test("virtualized combined with groupBy still renders correctly", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <DataGridComponent
        columns={columns}
        dataSource={buildRows(300)}
        getRowId={(row) => row.id}
        label="Virtualized grouped"
        height={300}
        virtualized
        groupableColumns
        defaultGroupBy={[{ columnId: "region" }]}
      />,
    );

    await expect(root.getByRole("treegrid")).toBeVisible();
    // `mountedDataRows` matches on `data-gridkit-row-index`, which group
    // headers carry too (see `GridGroupRow`), so this counts every rendered
    // row kind at once.
    const count = await mountedDataRows(root).count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(60);
  });

  test("virtualized without height set does not crash and renders every row (dev warning aside)", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <DataGridComponent
        columns={columns}
        dataSource={buildRows(10)}
        getRowId={(row) => row.id}
        label="No height"
        virtualized
      />,
    );

    await expect(mountedDataRows(root)).toHaveCount(10);
  });
});
