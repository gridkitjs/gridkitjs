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
 * centre, inside the scroll area, does not land on its body cell: one cut
 * off under its header is out of line too.
 */
function misalignedColumns(root: MountResult): Promise<string[]> {
  return root.evaluate((element) => {
    const round = (value: number) => Math.round(value * 100) / 100;
    const edges = (cell: Element | undefined) => {
      if (cell === undefined) return "missing";
      const box = cell.getBoundingClientRect();
      return `${String(round(box.left))}-${String(round(box.right))}`;
    };
    const view = element
      .querySelector(".gridkit-data-grid-tables")
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
        view !== undefined &&
        x > view.left &&
        x < view.right
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
  test("height bounds the rows' scroll area; the header and footer stay in place while the rows scroll", async ({
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

    const tables = root.locator(".gridkit-data-grid-tables");
    const header = root.locator(".gridkit-data-grid-header");
    const footer = root.locator(".gridkit-data-grid-footer");
    await expect(footer).toHaveCount(1);

    // The rows have more content than their bounded height allows: there's
    // something to scroll through.
    const overflows = await tables.evaluate(
      (element) => element.scrollHeight > element.clientHeight,
    );
    expect(overflows).toBe(true);
    // `height` is the rows' alone: the area grows by the header and footer.
    const [headerBox, footerBox] = await Promise.all([
      header.boundingBox(),
      footer.boundingBox(),
    ]);
    expect(
      (await tables.evaluate((element) => element.clientHeight)) -
        (headerBox?.height ?? 0) -
        (footerBox?.height ?? 0),
    ).toBeCloseTo(150, 0);

    const headerYBefore = (await header.boundingBox())?.y;
    const footerYBefore = (await footer.boundingBox())?.y;

    await tables.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });

    // The rows scrolled, but the header and footer, sticking to the scroll
    // area's top and bottom, never moved at all.
    await expect
      .poll(() => tables.evaluate((element) => element.scrollTop))
      .toBeGreaterThan(0);
    expect((await header.boundingBox())?.y).toBe(headerYBefore);
    expect((await footer.boundingBox())?.y).toBe(footerYBefore);
  });

  test("horizontal scroll on the grid's scroll area moves the header, body, and footer tables together, staying column-aligned", async ({
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

    const tables = root.locator(".gridkit-data-grid-tables");
    const headerCell = root.locator(".gridkit-data-grid-header th").nth(2);
    const bodyCell = root.locator("tbody tr").first().locator("td").nth(2);
    const footerCell = root.locator(".gridkit-data-grid-footer td").nth(2);

    const beforeX = (await headerCell.boundingBox())?.x;

    await tables.evaluate((element) => {
      element.scrollLeft = element.scrollWidth;
    });
    await expect
      .poll(() => tables.evaluate((element) => element.scrollLeft))
      .toBeGreaterThan(0);

    const afterHeaderX = (await headerCell.boundingBox())?.x;
    const afterBodyX = (await bodyCell.boundingBox())?.x;
    const afterFooterX = (await footerCell.boundingBox())?.x;

    expect(afterHeaderX).toBeLessThan(beforeX ?? 0);
    expect(afterBodyX).toBe(afterHeaderX);
    expect(afterFooterX).toBe(afterHeaderX);
  });

  test("scrollToRow scrolls within the grid's own height-bound scroll area, not only a consumer-supplied ancestor", async ({
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
    const tables = root.locator(".gridkit-data-grid-tables");
    await expect(tables).toHaveJSProperty("scrollTop", 0);

    await root.getByRole("button", { name: "scroll-to-row" }).click();
    await expect
      .poll(() => tables.evaluate((element) => element.scrollTop))
      .toBeGreaterThan(0);
  });

  test("a grid with no height set does not scroll up and down inside itself", async ({
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
    const tables = root.locator(".gridkit-data-grid-tables");
    const overflows = await tables.evaluate(
      (element) => element.scrollHeight > element.clientHeight,
    );
    expect(overflows).toBe(false);
  });

  test("Tab passes through a grid that scrolls both ways in one stop, its roving cell, and not its scroll area", async ({
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
    const tables = root.locator(".gridkit-data-grid-tables");
    expect(
      await tables.evaluate(
        (element) =>
          element.scrollHeight > element.clientHeight &&
          element.scrollWidth > element.clientWidth,
      ),
    ).toBe(true);

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

    test(`the grid scrolled sideways to its far end shows the rows under every header (${layout.name})`, async ({
      mount,
    }) => {
      const root = await wideGrid(mount, layout);
      const tables = root.locator(".gridkit-data-grid-tables");
      await tables.evaluate((element) => {
        element.scrollLeft =
          getComputedStyle(element).direction === "rtl"
            ? -element.scrollWidth
            : element.scrollWidth;
      });
      await expect
        .poll(() => tables.evaluate((element) => element.scrollLeft))
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
    const tables = root.locator(".gridkit-data-grid-tables");
    await root.getByRole("button", { name: "scroll-to-column" }).click();
    await expect
      .poll(() => tables.evaluate((element) => element.scrollLeft))
      .toBeGreaterThan(0);
    expect(await misalignedColumns(root)).toEqual([]);
  });

  for (const layout of wideLayouts.filter(
    (entry) => entry.height !== undefined,
  )) {
    test(`the rows' vertical scrollbar stays at the grid's visible inline-end edge, scrolled sideways anywhere (${layout.name})`, async ({
      mount,
    }) => {
      const root = await wideGrid(mount, layout);
      const tables = root.locator(".gridkit-data-grid-tables");
      for (const fraction of [0, 0.5, 1]) {
        await tables.evaluate((element, share) => {
          const sign = getComputedStyle(element).direction === "rtl" ? -1 : 1;
          element.scrollLeft =
            sign * (element.scrollWidth - element.clientWidth) * share;
        }, fraction);
        const layoutNow = await root.evaluate((element) => {
          const round = (value: number) => Math.round(value * 100) / 100;
          const viewport = element.querySelector<HTMLElement>(
            ".gridkit-data-grid-viewport",
          );
          if (viewport === null) throw new Error("no viewport");
          // Every element in the grid that scrolls up and down.
          const vertical = [viewport, ...viewport.querySelectorAll("*")]
            .filter(
              (candidate) =>
                candidate.scrollHeight > candidate.clientHeight &&
                ["auto", "scroll"].includes(
                  getComputedStyle(candidate).overflowY,
                ),
            )
            .map((candidate) => candidate.className);
          const scroller = viewport.querySelector(".gridkit-data-grid-tables");
          if (scroller === null) throw new Error("no scroll area");
          const box = scroller.getBoundingClientRect();
          const frame = viewport.getBoundingClientRect();
          const innerLeft = frame.left + viewport.clientLeft;
          return {
            vertical,
            // The scrollbar's track runs down the scroll area's inline-end
            // edge, so the area spanning the viewport's inside puts it there.
            left: round(box.left) === round(innerLeft),
            right: round(box.right) === round(innerLeft + viewport.clientWidth),
          };
        });
        expect(layoutNow).toEqual({
          vertical: ["gridkit-data-grid-tables"],
          left: true,
          right: true,
        });
      }
    });

    test(`keyboard focus keeps the focused cell clear of the header and footer (${layout.name})`, async ({
      mount,
      page,
    }) => {
      const root = await wideGrid(mount, layout);
      const clear = () =>
        root.evaluate((element) => {
          const cell = document.activeElement;
          const header = element.querySelector(".gridkit-data-grid-header");
          const footer = element.querySelector(".gridkit-data-grid-footer");
          if (cell === null || header === null || footer === null) {
            throw new Error("missing part");
          }
          const box = cell.getBoundingClientRect();
          return (
            box.top >= header.getBoundingClientRect().bottom - 0.5 &&
            box.bottom <= footer.getBoundingClientRect().top + 0.5
          );
        });
      await firstRowCells(root).first().click();
      for (const key of [
        ...Array.from({ length: 10 }, () => "ArrowDown"),
        "PageDown",
        "Control+End",
        ...Array.from({ length: 10 }, () => "ArrowUp"),
        "PageUp",
      ]) {
        await page.keyboard.press(key);
        expect(await clear(), `after ${key}`).toBe(true);
      }

      // The header, stuck at the top, is in view already: focusing it
      // leaves the rows where they are.
      const tables = root.locator(".gridkit-data-grid-tables");
      await tables.evaluate((element) => {
        element.scrollTop = 200;
      });
      await page.keyboard.press("Control+Home");
      await expect(root.getByRole("columnheader").first()).toBeFocused();
      expect(await tables.evaluate((element) => element.scrollTop)).toBe(200);
    });
  }
});
