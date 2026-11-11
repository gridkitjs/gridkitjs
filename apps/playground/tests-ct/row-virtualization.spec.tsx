// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import type { MountResult } from "@playwright/experimental-ct-react";
import type { Locator } from "@playwright/test";
import type { ColumnDefinition } from "@gridkitjs/core";
import RowIdentifiedGrid from "./support/RowIdentifiedGrid";
import { ariaRowCount, ariaRowIndexes, consecutive } from "./support/ariaRows";
import { expect, test } from "./support/coverage";
import { mountGrid, updateGrid } from "./support/mountGrid";
import ImperativeApiGrid from "./support/ImperativeApiGrid";
import VirtualizedToggleGrid from "./support/VirtualizedToggleGrid";

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

/**
 * Scrolls `body` by hand, in small steps from 80% of its height less a
 * little, until `row` (one around 80% of the way down) mounts in the
 * overscan below the viewport, then waits for the grid to settle.
 */
async function scrollByHandUntilMounted(
  body: Locator,
  row: Locator,
): Promise<void> {
  let top = await body.evaluate((element) => element.scrollHeight * 0.8 - 1000);
  for (let step = 0; step < 100 && (await row.count()) === 0; step++) {
    top += 40;
    await body.evaluate((element, scrollTop) => {
      element.scrollTop = scrollTop;
      return new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      });
    }, top);
  }
  await expect(row).toHaveCount(1);
  await body.evaluate(
    () =>
      new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      }),
  );
}

/** How far below the top of the grid body `row` sits. */
function offsetInBody(row: Locator): Promise<number> {
  return row.evaluate((element) => {
    const scroller = element.closest(".gridkit-data-grid-body");
    if (scroller === null) throw new Error("row outside the body");
    return (
      element.getBoundingClientRect().top - scroller.getBoundingClientRect().top
    );
  });
}

test.describe("row virtualization", () => {
  test("mounts only a small, bounded number of rows regardless of total row count", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <RowIdentifiedGrid
        columns={columns}
        dataSource={buildRows(3000)}
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
      <RowIdentifiedGrid
        columns={columns}
        dataSource={buildRows(1000)}
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

  test("a scrollToRow a later one replaced leaves the body alone once its row mounts", async ({
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
        scrollRowIds={["row-800", "row-0"]}
      />,
    );

    // Both calls in one task, so row 800 cannot mount between them.
    await root.getByRole("button", { name: "scroll-to-each-row" }).click();
    await expect(root.getByText("Row 0", { exact: true })).toBeVisible();

    // Scrolled by hand towards row 800 until it mounts in the overscan below
    // the viewport. Scrolled to as the first call asked, it would sit at the
    // top instead.
    const body = root.locator(".gridkit-data-grid-body");
    const row800 = root.locator('tbody tr[data-gridkit-row-index="800"]');
    await scrollByHandUntilMounted(body, row800);
    expect(await offsetInBody(row800)).toBeGreaterThan(100);
  });

  test("a scrollToRow made just before the rows are sorted leaves the body alone once its row's place mounts", async ({
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
        sortToSet={[{ columnId: "name", direction: "desc" }]}
      />,
    );

    // Scrolled back to the top in the same task, before row 800's place can
    // mount, as the user scrolling away before the far rows draw would.
    const body = root.locator(".gridkit-data-grid-body");
    await root
      .getByRole("button", { name: "scroll-then-sort" })
      .evaluate((button: HTMLElement) => {
        button.click();
        const scroller = document.querySelector(".gridkit-data-grid-body");
        if (scroller === null) throw new Error("no grid body");
        scroller.scrollTop = 0;
      });
    await expect(
      root.locator('tbody tr[data-gridkit-row-index="0"]'),
    ).toBeVisible();

    // Scrolled by hand towards row 800's place until it mounts in the
    // overscan below the viewport. Scrolled to as the call before the sort
    // asked, its new row would sit at the top instead.
    const row800 = root.locator('tbody tr[data-gridkit-row-index="800"]');
    await scrollByHandUntilMounted(body, row800);
    expect(await offsetInBody(row800)).toBeGreaterThan(100);
  });

  test("keyboard navigation moves focus correctly across the mounted window's boundary", async ({
    mount,
  }) => {
    const rows = buildRows(200);
    const root = await mountGrid(
      mount,
      <RowIdentifiedGrid
        columns={columns}
        dataSource={rows}
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

  test("the browser's focus follows the tab stop past the mounted window, not just the tabindex", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <RowIdentifiedGrid
        columns={columns}
        dataSource={buildRows(200)}
        label="Virtualized focus"
        height={150}
        virtualized
      />,
    );

    // `page.keyboard` rather than `locator.press`, which focuses its target
    // before every press and so would mask a cell the grid itself failed to
    // focus. Here each key goes wherever the grid last put the focus.
    const activeCell = root.locator('[tabindex="0"]');
    await activeCell.focus();
    await page.keyboard.press("ArrowDown"); // header -> row 0
    for (let index = 0; index < 30; index++) {
      await page.keyboard.press("ArrowDown");
      await expect(activeCell).toBeFocused();
    }
    await expect(
      root.locator('tbody tr[data-gridkit-row-index="30"] td').first(),
    ).toBeFocused();

    await page.keyboard.press("Control+End");
    await expect(
      root.locator('tbody tr[data-gridkit-row-index="199"] td').last(),
    ).toBeFocused();
  });

  test("rows of different measured heights lay out without overlap or gap", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <RowIdentifiedGrid
        columns={columns}
        dataSource={buildRows(50)}
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
        <RowIdentifiedGrid
          columns={columns}
          dataSource={rows}
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
      <RowIdentifiedGrid
        columns={columns}
        dataSource={buildRows(200)}
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
      <RowIdentifiedGrid
        columns={columns}
        dataSource={buildRows(300)}
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

  test("a grouped, virtualized grid's mounted rows keep their aria-rowindex in the whole result, scrolled anywhere", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <RowIdentifiedGrid
        columns={columns}
        dataSource={buildRows(300)}
        label="Virtualized grouped indexes"
        height={300}
        virtualized
        defaultGroupBy={[{ columnId: "region" }]}
      />,
    );

    // The header, 4 group rows and 300 data rows.
    expect(await ariaRowCount(root)).toBe(305);

    const indexes = await ariaRowIndexes(root);
    expect(indexes).toEqual(consecutive(1, indexes.length));

    const body = root.locator(".gridkit-data-grid-body");
    await body.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await expect(root.getByText("Row 299", { exact: true })).toBeVisible();

    // The header stays row 1; the mounted window ends on the last row.
    const [header, ...mounted] = await ariaRowIndexes(root);
    expect(header).toBe(1);
    expect(mounted.length).toBeLessThan(60);
    expect(mounted).toEqual(
      consecutive(305 - mounted.length + 1, mounted.length),
    );
  });

  test("a row stripe stays on every second row, wherever the mounted window starts", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <RowIdentifiedGrid
        columns={columns}
        dataSource={buildRows(1000)}
        label="Striped"
        height={200}
        virtualized
      />,
    );
    const stripe = "rgb(255, 0, 0)";
    await page.addStyleTag({
      content: `:root { --gridkit-row-stripe-bg-light: ${stripe}; --gridkit-row-stripe-bg-dark: ${stripe}; }`,
    });
    const body = root.locator(".gridkit-data-grid-body");
    const firstIndexes = new Set<number>();

    // Row by row, so the mounted window starts on an even index as well as
    // an odd one, after the leading spacer row: the case a stripe counted by
    // `:nth-child` gets wrong.
    for (let step = 0; step < 8; step++) {
      await body.evaluate(
        (element, top) => {
          element.scrollTop = top;
          return new Promise((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(resolve));
          });
        },
        1000 + step * 30,
      );

      const rows = await mountedDataRows(root).evaluateAll(
        (elements, color) =>
          elements.map((row) => ({
            index: Number(row.getAttribute("data-gridkit-row-index")),
            striped: getComputedStyle(row).backgroundColor === color,
          })),
        stripe,
      );
      expect(
        rows.filter(({ index, striped }) => striped !== (index % 2 === 1)),
      ).toEqual([]);
      firstIndexes.add(rows[0]?.index ?? 0);
    }

    expect(new Set([...firstIndexes].map((index) => index % 2))).toEqual(
      new Set([0, 1]),
    );
  });

  test("turning virtualized off and on again keeps the rows, the scroll and the focus right", async ({
    mount,
    page,
  }) => {
    const rows = buildRows(300);
    function grid(virtualized: boolean) {
      return (
        <RowIdentifiedGrid
          columns={columns}
          dataSource={rows}
          label="Toggled"
          height={150}
          virtualized={virtualized}
        />
      );
    }
    const root = await mountGrid(mount, grid(true));
    const body = root.locator(".gridkit-data-grid-body");
    const tabStop = root.locator('[tabindex="0"]');
    const tabStopRow = () =>
      tabStop.evaluate((cell) =>
        cell.closest("tr")?.getAttribute("data-gridkit-row-index"),
      );

    await tabStop.focus();
    for (let index = 0; index < 11; index++) {
      await page.keyboard.press("ArrowDown");
    }
    await expect.poll(tabStopRow).toBe("10");

    // Toggled from outside the grid, as an app's own control would.
    await updateGrid(root, grid(false));
    await expect(mountedDataRows(root)).toHaveCount(300);
    await expect.poll(tabStopRow).toBe("10");

    await updateGrid(root, grid(true));
    await expect.poll(() => mountedDataRows(root).count()).toBeLessThan(60);
    await expect.poll(tabStopRow).toBe("10");
    await tabStop.focus();
    await page.keyboard.press("ArrowDown");
    await expect.poll(tabStopRow).toBe("11");
    await expect(tabStop).toBeFocused();

    await updateGrid(root, grid(false));
    await expect(mountedDataRows(root)).toHaveCount(300);
    await body.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await expect(root.getByText("Row 299", { exact: true })).toBeInViewport();

    await updateGrid(root, grid(true));
    await expect.poll(() => mountedDataRows(root).count()).toBeLessThan(60);
    await expect(root.getByText("Row 299", { exact: true })).toBeInViewport();
    const mounted = await mountedDataRows(root).evaluateAll((elements) =>
      elements.map((row) => Number(row.getAttribute("data-gridkit-row-index"))),
    );
    expect(mounted).toEqual(consecutive(mounted[0] ?? 0, mounted.length));

    await body.evaluate((element) => {
      element.scrollTop = 0;
    });
    await expect(root.getByText("Row 0", { exact: true })).toBeInViewport();
  });

  test("turning virtualized on leaves the browser's focus on the focused cell", async ({
    mount,
    page,
  }) => {
    const rows = buildRows(300);
    function grid(virtualized: boolean) {
      return (
        <VirtualizedToggleGrid
          columns={columns}
          dataSource={rows}
          label="Toggled focus"
          height={150}
          virtualized={virtualized}
        />
      );
    }
    const root = await mountGrid(mount, grid(false));
    const cell = (rowIndex: number) =>
      root
        .locator(`tbody tr[data-gridkit-row-index="${String(rowIndex)}"] td`)
        .first();

    // `page.keyboard` throughout, and never refocused: each key goes
    // wherever the grid left the focus.
    await root.locator('[tabindex="0"]').focus();
    for (let index = 0; index < 3; index++) {
      await page.keyboard.press("ArrowDown");
    }
    await expect(cell(2)).toBeFocused();

    await updateGrid(root, grid(true));
    await expect.poll(() => mountedDataRows(root).count()).toBeLessThan(60);
    await expect(cell(2)).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(cell(3)).toBeFocused();

    // The rows drawn last while virtualized are the bottom ones, far from the
    // focused cell once virtualization is off and it is back in view.
    const body = root.locator(".gridkit-data-grid-body");
    await body.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await expect(root.getByText("Row 299", { exact: true })).toBeVisible();
    await updateGrid(root, grid(false));
    await expect(mountedDataRows(root)).toHaveCount(300);
    await cell(3).focus();
    await page.keyboard.press("ArrowDown");
    await expect(cell(4)).toBeFocused();

    await updateGrid(root, grid(true));
    await expect.poll(() => mountedDataRows(root).count()).toBeLessThan(60);
    await expect(cell(4)).toBeFocused();
  });

  test("turning virtualized on keeps the focus and the scroll of a body of mixed row heights scrolled far down", async ({
    mount,
  }) => {
    const rows = buildRows(300);
    // A notes column this narrow wraps every fifth row onto many lines, so
    // offsets worked out from `estimatedRowHeight` fall far short of the
    // real ones.
    const mixedColumns: readonly ColumnDefinition<Row>[] = columns.map(
      (column) =>
        column.field === "notes" ? { ...column, width: 60 } : column,
    );
    function grid(virtualized: boolean) {
      return (
        <VirtualizedToggleGrid
          columns={mixedColumns}
          dataSource={rows}
          label="Toggled mixed heights"
          height={300}
          estimatedRowHeight={40}
          virtualized={virtualized}
        />
      );
    }
    const root = await mountGrid(mount, grid(false));
    const body = root.locator(".gridkit-data-grid-body");
    await body.evaluate((element) => {
      element.scrollTop = element.scrollHeight * 0.7;
    });

    // The first cell of the row in the middle of the body, wherever that is.
    const rowIndex = await body.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const hit = document.elementFromPoint(
        rect.left + 20,
        rect.top + rect.height / 2,
      );
      return hit?.closest("tr")?.getAttribute("data-gridkit-row-index");
    });
    expect(Number(rowIndex)).toBeGreaterThan(150);
    const cell = root
      .locator(`tbody tr[data-gridkit-row-index="${String(rowIndex)}"] td`)
      .first();
    await cell.focus();
    await expect(cell).toBeFocused();
    const scrollTop = await body.evaluate((element) => element.scrollTop);

    await updateGrid(root, grid(true));
    await expect.poll(() => mountedDataRows(root).count()).toBeLessThan(60);
    await expect(cell).toBeFocused();
    expect(
      Math.abs(
        (await body.evaluate((element) => element.scrollTop)) - scrollTop,
      ),
    ).toBeLessThanOrEqual(1);
  });

  test("a scrollToRow in the commit that turns virtualized on lands on its row", async ({
    mount,
  }) => {
    const rows = buildRows(1000);
    function grid(virtualized: boolean) {
      return (
        <VirtualizedToggleGrid
          columns={columns}
          dataSource={rows}
          label="Toggled scroll"
          height={200}
          virtualized={virtualized}
          scrollRowIdOnEnable="row-800"
        />
      );
    }
    const root = await mountGrid(mount, grid(false));
    await expect(root.getByText("Row 0", { exact: true })).toBeInViewport();

    await updateGrid(root, grid(true));
    await expect(root.getByText("Row 800", { exact: true })).toBeInViewport();
    await expect.poll(() => mountedDataRows(root).count()).toBeLessThan(60);
  });

  test("virtualized without height set does not crash and renders every row (dev warning aside)", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <RowIdentifiedGrid
        columns={columns}
        dataSource={buildRows(10)}
        label="No height"
        virtualized
      />,
    );

    await expect(mountedDataRows(root)).toHaveCount(10);
  });
});
