// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import type { MountResult } from "@playwright/experimental-ct-react";
import type { AggregateState, ColumnDefinition } from "@gridkitjs/core";
import { DataGrid } from "@gridkitjs/react";
import { expect, test } from "./support/coverage";
import { mountGrid } from "./support/mountGrid";
import ImperativeApiGrid from "./support/ImperativeApiGrid";
import RightToLeft from "./support/RightToLeft";

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

/** Twice as wide together as the 300px container `wideGrid` mounts in. */
const overflowingColumns: readonly ColumnDefinition<Row>[] = [
  { field: "id", width: 200 },
  { field: "name", width: 200 },
  { field: "value", width: 200, type: "number" },
];

interface WideLayout {
  readonly name: string;
  readonly rightToLeft: boolean;
  readonly height: number | undefined;
}

const wideLayouts: readonly WideLayout[] = [
  { name: "left to right, no height", rightToLeft: false, height: undefined },
  { name: "left to right, with height", rightToLeft: false, height: 150 },
  { name: "right to left, no height", rightToLeft: true, height: undefined },
  { name: "right to left, with height", rightToLeft: true, height: 150 },
];

function wideGrid(
  mount: Parameters<typeof mountGrid>[0],
  layout: WideLayout,
): Promise<MountResult> {
  const grid = (
    <DataGrid
      columns={overflowingColumns}
      dataSource={buildRows(20)}
      label="Wide"
      resizeMode="fixed"
      aggregates={aggregates}
      {...(layout.height === undefined ? {} : { height: layout.height })}
    />
  );
  return mountGrid(
    mount,
    layout.rightToLeft ? <RightToLeft>{grid}</RightToLeft> : grid,
    { width: 300 },
  );
}

/** The first body row's cells. */
function firstRowCells(root: MountResult) {
  return root
    .locator(".gridkit-data-grid-body tr[data-gridkit-row-index]")
    .first()
    .locator("td");
}

/**
 * Every column whose header and first body and footer cells do not share
 * left and right edges, rounded to 1/100 px, plus every column whose header
 * centre, inside the viewport, does not land on its body cell: one the row
 * area cuts off under its header is out of line too.
 */
function misalignedColumns(root: MountResult): Promise<string[]> {
  return root.evaluate((element) => {
    const round = (value: number) => Math.round(value * 100) / 100;
    const edges = (cell: Element | undefined) => {
      if (cell === undefined) return "missing";
      const box = cell.getBoundingClientRect();
      return `${String(round(box.left))}-${String(round(box.right))}`;
    };
    const viewport = element
      .querySelector(".gridkit-data-grid-viewport")
      ?.getBoundingClientRect();
    const headers = Array.from(
      element.querySelectorAll(".gridkit-data-grid-header th"),
    );
    const bodyCells = Array.from(
      element.querySelectorAll(
        ".gridkit-data-grid-body tr[data-gridkit-row-index]:first-child td",
      ),
    );
    const footerCells = Array.from(
      element.querySelectorAll(".gridkit-data-grid-footer td"),
    );
    return headers.flatMap((header, index) => {
      const body = bodyCells[index];
      const problems: string[] = [];
      if (
        edges(header) !== edges(body) ||
        edges(header) !== edges(footerCells[index])
      ) {
        problems.push(
          `column ${String(index)}: header ${edges(header)}, body ${edges(body)}, footer ${edges(footerCells[index])}`,
        );
      }
      const headerBox = header.getBoundingClientRect();
      const x = headerBox.left + headerBox.width / 2;
      if (
        body !== undefined &&
        viewport !== undefined &&
        x > viewport.left &&
        x < viewport.right
      ) {
        const bodyBox = body.getBoundingClientRect();
        const hit = document.elementFromPoint(
          x,
          bodyBox.top + bodyBox.height / 2,
        );
        if (hit === null || !body.contains(hit)) {
          problems.push(`column ${String(index)}: no body cell under header`);
        }
      }
      return problems;
    });
  });
}

test.describe("scrollable layout", () => {
  test("height bounds the body's own scroll area; the header and footer stay in place while it scrolls", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <DataGrid
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
      <DataGrid
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
      <DataGrid
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

  test("Tab passes through a grid that scrolls both ways in one stop, its roving cell, and neither scroller", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <div>
        <button type="button">Before</button>
        <DataGrid
          columns={columns.map((column) => ({ ...column, width: 300 }))}
          dataSource={buildRows(50)}
          label="Tab stops"
          height={150}
          resizeMode="fixed"
        />
        <button type="button">After</button>
      </div>,
    );
    const body = root.locator(".gridkit-data-grid-body");
    const viewport = root.locator(".gridkit-data-grid-viewport");
    for (const scroller of [body, viewport]) {
      expect(
        await scroller.evaluate(
          (element) =>
            element.scrollHeight > element.clientHeight ||
            element.scrollWidth > element.clientWidth,
        ),
      ).toBe(true);
    }

    await root.getByRole("button", { name: "Before" }).focus();
    await page.keyboard.press("Tab");
    await expect(root.getByRole("columnheader").first()).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(root.getByRole("button", { name: "After" })).toBeFocused();

    await page.keyboard.press("Shift+Tab");
    await expect(root.getByRole("columnheader").first()).toBeFocused();
  });

  for (const layout of wideLayouts) {
    test(`a sideways wheel over the rows scrolls the header and footer with them (${layout.name})`, async ({
      mount,
      page,
    }) => {
      const root = await wideGrid(mount, layout);
      const cell = firstRowCells(root).first();
      const before = await cell.boundingBox();
      if (before === null) throw new Error("the first cell is not visible");
      await page.mouse.move(before.x + before.width / 2, before.y + 5);
      // Toward the columns past the visible ones: rightwards left to right,
      // leftwards right to left.
      await page.mouse.wheel(layout.rightToLeft ? -120 : 120, 0);
      await expect
        .poll(async () => (await cell.boundingBox())?.x)
        .not.toBe(before.x);
      expect(await misalignedColumns(root)).toEqual([]);
    });

    test(`focus moving to an off-screen column keeps the header over its cells (${layout.name})`, async ({
      mount,
      page,
    }) => {
      const root = await wideGrid(mount, layout);
      const cells = firstRowCells(root);
      await cells.first().click();
      await expect(cells.first()).toBeFocused();
      const before = await cells.last().boundingBox();
      await page.keyboard.press("End");
      await expect(cells.last()).toBeFocused();
      await expect
        .poll(async () => (await cells.last().boundingBox())?.x)
        .not.toBe(before?.x);
      expect(await misalignedColumns(root)).toEqual([]);
    });

    test(`the viewport scrolled to its far end shows the rows under every header (${layout.name})`, async ({
      mount,
    }) => {
      const root = await wideGrid(mount, layout);
      const viewport = root.locator(".gridkit-data-grid-viewport");
      await viewport.evaluate((element) => {
        element.scrollLeft =
          getComputedStyle(element).direction === "rtl"
            ? -element.scrollWidth
            : element.scrollWidth;
      });
      await expect
        .poll(() => viewport.evaluate((element) => element.scrollLeft))
        .not.toBe(0);
      expect(await misalignedColumns(root)).toEqual([]);
    });
  }

  test("scrollToColumn brings a column into view with its header over its cells", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <ImperativeApiGrid
        columns={overflowingColumns}
        dataSource={buildRows(20)}
        label="Api"
        resizeMode="fixed"
        height={150}
        aggregates={aggregates}
        scrollColumnId="value"
      />,
      { width: 300 },
    );
    const viewport = root.locator(".gridkit-data-grid-viewport");
    await root.getByRole("button", { name: "scroll-to-column" }).click();
    await expect
      .poll(() => viewport.evaluate((element) => element.scrollLeft))
      .toBeGreaterThan(0);
    expect(await misalignedColumns(root)).toEqual([]);
  });
});
