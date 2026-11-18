// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import type { CSSProperties } from "react";
import type { Locator, Page } from "@playwright/test";
import type { MountResult } from "@playwright/experimental-ct-react";
import { expect, test } from "./support/coverage";
import { mountGrid } from "./support/mountGrid";
import PinnedColumnsGrid from "./support/PinnedColumnsGrid";

interface Clip {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The scroll area the header, rows and footer scroll in. */
function scrollArea(root: MountResult): Locator {
  return root.locator(".gridkit-data-grid-tables");
}

/** Scrolls the area sideways to `fraction` of the way to its end. */
async function scrollSideways(area: Locator, fraction: number): Promise<void> {
  await area.evaluate((element, share) => {
    element.scrollLeft = (element.scrollWidth - element.clientWidth) * share;
  }, fraction);
}

/**
 * The scrollport, scrollbars left out, and the two strips the pinned columns
 * cover at its start and end, each a pixel short of its edges so rounding
 * never takes in a scrolled cell beside it.
 */
async function stripsOf(
  area: Locator,
): Promise<{ scrollport: Clip; start: Clip; end: Clip }> {
  return area.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const startWidth = parseFloat(
      style.getPropertyValue("--gridkit-pinned-start-width"),
    );
    const endWidth = parseFloat(
      style.getPropertyValue("--gridkit-pinned-end-width"),
    );
    const left = box.left + element.clientLeft;
    const top = box.top + element.clientTop;
    const width = element.clientWidth;
    const height = element.clientHeight;
    return {
      scrollport: { x: left, y: top, width, height },
      start: { x: left + 1, y: top, width: startWidth - 2, height },
      end: {
        x: left + width - endWidth + 1,
        y: top,
        width: endWidth - 2,
        height,
      },
    };
  });
}

/** How many pixels of `clip` on screen are the red blocks' red. */
async function redPixels(page: Page, clip: Clip): Promise<number> {
  const png = await page.screenshot({ clip, scale: "css" });
  return page.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d");
    if (context === null) throw new Error("no 2d canvas");
    context.drawImage(image, 0, 0);
    const { data } = context.getImageData(0, 0, image.width, image.height);
    let count = 0;
    for (let index = 0; index < data.length; index += 4) {
      const red = data[index] ?? 0;
      const green = data[index + 1] ?? 0;
      const blue = data[index + 2] ?? 0;
      if (red > 200 && green < 90 && blue < 90) count += 1;
    }
    return count;
  }, png.toString("base64"));
}

/**
 * How many one-pixel columns of a one-pixel-high line across `clip` differ
 * from the colour at its ends: the vertical lines it crosses, each counted
 * once per pixel of its width.
 */
async function lineColumns(page: Page, clip: Clip): Promise<number> {
  const png = await page.screenshot({ clip, scale: "css" });
  return page.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d");
    if (context === null) throw new Error("no 2d canvas");
    context.drawImage(image, 0, 0);
    const { data } = context.getImageData(0, 0, image.width, 1);
    const background = [data[0] ?? 0, data[1] ?? 0, data[2] ?? 0];
    let count = 0;
    for (let index = 0; index < data.length; index += 4) {
      const distance = background.reduce(
        (sum, channel, offset) =>
          sum + Math.abs(channel - (data[index + offset] ?? 0)),
        0,
      );
      if (distance > 24) count += 1;
    }
    return count;
  }, png.toString("base64"));
}

/** A translucent stripe, so the surface under a pinned cell shows through it. */
const STRIPED = {
  "--gridkit-row-stripe-bg": "rgb(0 0 255 / 0.15)",
} as CSSProperties;

test.describe("pinned cells' backgrounds", () => {
  for (const palette of ["gridkit-light", "gridkit-dark"]) {
    for (const fraction of [0.5, 1]) {
      test(`hide the scrolled cells in every row state, ${palette}, scrolled ${String(fraction * 100)}%`, async ({
        mount,
        page,
      }) => {
        const root = await mountGrid(
          mount,
          <div className={palette}>
            <div style={STRIPED}>
              <PinnedColumnsGrid
                height={300}
                selectable={{ rows: "multiple", cells: "single" }}
                defaultRowSelection={["r2"]}
                defaultCellSelection={{
                  kind: "cell",
                  rowId: "r4",
                  columnId: "team",
                }}
              />
            </div>
          </div>,
        );
        const area = scrollArea(root);
        await scrollSideways(area, fraction);
        const { scrollport, start, end } = await stripsOf(area);
        // Hovers a row, and the start-pinned cell under the pointer.
        const hovered = root.locator('[data-gridkit-row-id="r6"]');
        const hoveredBox = await hovered.boundingBox();
        if (hoveredBox === null) throw new Error("row r6 is not drawn");
        await page.mouse.move(
          start.x + 20,
          hoveredBox.y + hoveredBox.height / 2,
        );

        expect(await redPixels(page, scrollport)).toBeGreaterThan(0);
        expect(await redPixels(page, start)).toBe(0);
        expect(await redPixels(page, end)).toBe(0);
      });
    }

    test(`hide the scrolled cells in group and summary rows, ${palette}`, async ({
      mount,
      page,
    }) => {
      const root = await mountGrid(
        mount,
        <div className={palette}>
          <PinnedColumnsGrid
            height={300}
            defaultGroupBy={[{ columnId: "team" }]}
            groupAggregateDisplay="row"
            rowCount={8}
          />
        </div>,
      );
      const area = scrollArea(root);
      await scrollSideways(area, 0.5);
      const { scrollport, start, end } = await stripsOf(area);

      await expect(
        root.locator(".gridkit-grid-group-summary-row").first(),
      ).toBeVisible();
      expect(await redPixels(page, scrollport)).toBeGreaterThan(0);
      expect(await redPixels(page, start)).toBe(0);
      expect(await redPixels(page, end)).toBe(0);
    });
  }
});

test.describe("rows drawn with one cell", () => {
  test("a group row's label stays at the start edge, scrolled sideways", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <PinnedColumnsGrid
        height={300}
        defaultGroupBy={[{ columnId: "team" }]}
        rowCount={8}
      />,
    );
    const area = scrollArea(root);
    await scrollSideways(area, 1);
    const { scrollport } = await stripsOf(area);
    const label = root.locator(".gridkit-group-label").first();
    const box = await label.boundingBox();
    if (box === null) throw new Error("no group label");

    expect(box.x).toBeGreaterThanOrEqual(scrollport.x);
    expect(box.x + box.width).toBeLessThan(scrollport.x + scrollport.width);
    const hit = await label.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const top = document.elementFromPoint(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
      );
      return top !== null && element.contains(top);
    });
    expect(hit).toBe(true);
  });

  test("spacer rows and group cells take no pinning", async ({ mount }) => {
    const root = await mountGrid(
      mount,
      <PinnedColumnsGrid height={300} virtualized rowCount={2000} />,
    );
    const area = scrollArea(root);
    await area.evaluate((element) => {
      element.scrollTop = 30000;
    });
    await scrollSideways(area, 0.5);
    const spacers = root.locator(
      '.gridkit-data-grid-body tr[aria-hidden="true"]:not([class]) td',
    );
    await expect(spacers).toHaveCount(2);

    for (const spacer of await spacers.all()) {
      await expect(spacer).toHaveCSS("position", "static");
      await expect(spacer).not.toHaveClass(/is-pinned/);
    }
  });
});

test.describe("printing", () => {
  test("puts pinned columns back in their own places", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, <PinnedColumnsGrid height={300} />);
    await scrollSideways(scrollArea(root), 0.5);
    await page.emulateMedia({ media: "print" });
    const row = root.locator('[data-gridkit-row-id="r1"]');
    const first = row.locator('[data-gridkit-column="team"]');
    const end = row.locator('[data-gridkit-column="c7"]');

    // Relative, not sticky: still the containing block of the cell's
    // background layers and, in the header, its toggles.
    await expect(end).toHaveCSS("position", "relative");
    const firstBox = await first.boundingBox();
    const endBox = await end.boundingBox();
    if (firstBox === null || endBox === null) throw new Error("not drawn");
    expect(Math.round(endBox.x - firstBox.x)).toBe(7 * 120);
  });
});

test.describe("the divider", () => {
  test("is the edge cells' border on the scrolling side", async ({ mount }) => {
    const root = await mountGrid(mount, <PinnedColumnsGrid height={300} />);
    const header = root.locator(".gridkit-header-cell");

    await expect(header.nth(1)).toHaveClass(/is-pinned-start is-pinned-edge/);
    await expect(header.nth(1)).toHaveCSS("border-inline-end-width", "1px");
    await expect(header.nth(0)).toHaveCSS("border-inline-end-width", "0px");
    await expect(header.nth(7)).toHaveClass(/is-pinned-end is-pinned-edge/);
    await expect(header.nth(7)).toHaveCSS("border-inline-start-width", "1px");
  });

  for (const resizeMode of ["fixed", "fit"] as const) {
    test(`meets the column before it as one line, ${resizeMode}`, async ({
      mount,
      page,
    }) => {
      const root = await mountGrid(
        mount,
        <PinnedColumnsGrid
          height={300}
          borders="vertical"
          resizeMode={resizeMode}
        />,
      );
      const area = scrollArea(root);
      await scrollSideways(area, 1);
      const row = root.locator('[data-gridkit-row-id="r1"]');
      const before = row.locator('[data-gridkit-column="c6"]');
      const edge = row.locator('[data-gridkit-column="c7"]');

      await expect(before).toHaveCSS("border-inline-end-width", "0px");
      await expect(edge).toHaveCSS("border-inline-start-width", "1px");
      const box = await edge.boundingBox();
      if (box === null) throw new Error("no end edge cell");
      // Across the seam, through the cells' top padding, clear of content.
      expect(
        await lineColumns(page, {
          x: Math.round(box.x) - 6,
          y: Math.round(box.y) + 2,
          width: 12,
          height: 1,
        }),
      ).toBe(1);
    });
  }
});
