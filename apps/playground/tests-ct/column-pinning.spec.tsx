// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import type { CSSProperties } from "react";
import type { Locator, Page } from "@playwright/test";
import type { MountResult } from "@playwright/experimental-ct-react";
import { expect, test } from "./support/coverage";
import { mountGrid } from "./support/mountGrid";
import PinnedColumnsGrid from "./support/PinnedColumnsGrid";
import RightToLeft from "./support/RightToLeft";
import { isUncovered } from "./support/uncovered";

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

/**
 * Scrolls the area sideways to `fraction` of the way from its start edge to
 * its end. Right to left, `scrollLeft` runs from 0 down to minus the overflow.
 */
async function scrollSideways(area: Locator, fraction: number): Promise<void> {
  await area.evaluate((element, share) => {
    const overflow = element.scrollWidth - element.clientWidth;
    const rtl = getComputedStyle(element).direction === "rtl";
    element.scrollLeft = (rtl ? -overflow : overflow) * share;
  }, fraction);
}

/** The scroll area's scrollport, its scrollbars left out. */
interface Scrollport extends Clip {
  readonly rtl: boolean;
  /** The width the pinned columns cover at the start and the end edge. */
  readonly startWidth: number;
  readonly endWidth: number;
}

/**
 * The area's scrollport. `clientLeft` takes in a vertical scrollbar on the
 * left, where a right-to-left area draws it.
 */
async function scrollportOf(area: Locator): Promise<Scrollport> {
  return area.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      x: box.left + element.clientLeft,
      y: box.top + element.clientTop,
      width: element.clientWidth,
      height: element.clientHeight,
      rtl: style.direction === "rtl",
      startWidth: parseFloat(
        style.getPropertyValue("--gridkit-pinned-start-width"),
      ),
      endWidth: parseFloat(
        style.getPropertyValue("--gridkit-pinned-end-width"),
      ),
    };
  });
}

/**
 * The scrollport and the two strips the pinned columns cover at its start
 * and end, each a pixel short of its edges so rounding never takes in a
 * scrolled cell beside it.
 */
async function stripsOf(
  area: Locator,
): Promise<{ scrollport: Clip; start: Clip; end: Clip }> {
  const port = await scrollportOf(area);
  const { x, y, width, height } = port;
  const atLeft = (stripWidth: number) => ({
    x: x + 1,
    y,
    width: stripWidth - 2,
    height,
  });
  const atRight = (stripWidth: number) => ({
    x: x + width - stripWidth + 1,
    y,
    width: stripWidth - 2,
    height,
  });
  return {
    scrollport: { x, y, width, height },
    start: port.rtl ? atRight(port.startWidth) : atLeft(port.startWidth),
    end: port.rtl ? atLeft(port.endWidth) : atRight(port.endWidth),
  };
}

/** What sits at the pinned edges of one row, read with `elementFromPoint`. */
interface EdgeHits {
  /**
   * The columns met walking in from the start edge: the first 3px inside
   * it, each next one 3px past the outer edge of the one before.
   */
  readonly start: readonly (string | null)[];
  /** The column 3px inside the end edge. */
  readonly end: string | null;
  /** How far the outer edge of the first and the last column hit lies from the scrollport's edge. */
  readonly startGap: number;
  readonly endGap: number;
}

/**
 * Hit-tests `row` across its middle at the scrollport's edges, meeting
 * `startCount` columns from the start. A column scrolled under a pinned one
 * is not what the point finds, so this proves which cell is on top.
 */
async function edgeHits(
  row: Locator,
  port: Scrollport,
  startCount = 2,
): Promise<EdgeHits> {
  return row.evaluate(
    (element, { port: { x, width, rtl }, startCount: count }) => {
      const box = element.getBoundingClientRect();
      const y = box.top + box.height / 2;
      const inward = rtl ? -1 : 1;
      const startEdge = rtl ? x + width : x;
      const endEdge = rtl ? x : x + width;
      const cellAt = (pointX: number) =>
        document
          .elementFromPoint(pointX, y)
          ?.closest<HTMLElement>("[data-gridkit-column]") ?? null;
      const outerStart = (cell: HTMLElement) => {
        const rect = cell.getBoundingClientRect();
        return rtl ? rect.right : rect.left;
      };
      const outerEnd = (cell: HTMLElement) => {
        const rect = cell.getBoundingClientRect();
        return rtl ? rect.left : rect.right;
      };

      const start: (HTMLElement | null)[] = [];
      let pointX = startEdge + inward * 3;
      for (let index = 0; index < count; index += 1) {
        const cell = cellAt(pointX);
        start.push(cell);
        if (cell === null) break;
        pointX = outerEnd(cell) + inward * 3;
      }
      const first = start[0] ?? null;
      const end = cellAt(endEdge - inward * 3);
      return {
        start: start.map((cell) => cell?.dataset.gridkitColumn ?? null),
        end: end?.dataset.gridkitColumn ?? null,
        startGap:
          first === null ? width : Math.abs(outerStart(first) - startEdge),
        endGap: end === null ? width : Math.abs(outerEnd(end) - endEdge),
      };
    },
    { port, startCount },
  );
}

/**
 * Which of the `selector` rows is in the middle of those whose whole box
 * lies in the scrollport between the sticky header and footer rows; -1 when
 * none does.
 */
async function rowIndexInView(
  area: Locator,
  selector: string,
): Promise<number> {
  return area.evaluate((element, rowSelector) => {
    const port = element.getBoundingClientRect();
    const top =
      element.querySelector(".gridkit-grid-header")?.getBoundingClientRect()
        .bottom ?? port.top;
    const bottom =
      element.querySelector(".gridkit-grid-footer")?.getBoundingClientRect()
        .top ?? port.top + element.clientHeight;
    const rows = Array.from(element.querySelectorAll(rowSelector));
    const inView = rows.flatMap((row, rowIndex) => {
      const box = row.getBoundingClientRect();
      return box.top >= top && box.bottom <= bottom ? [rowIndex] : [];
    });
    return inView[Math.floor(inView.length / 2)] ?? -1;
  }, selector);
}

/** The `selector` row `rowIndexInView` finds. */
async function rowInView(area: Locator, selector: string): Promise<Locator> {
  const index = await rowIndexInView(area, selector);
  if (index < 0) throw new Error(`no ${selector} row in view`);
  return area.locator(selector).nth(index);
}

/** A data row, as opposed to a group, summary, spacer or loading row. */
const DATA_ROW = ".gridkit-grid-body .gridkit-grid-row";
const SUMMARY_ROW = ".gridkit-grid-group-summary-row";

/** The header row, a data row in view and the footer row. */
async function rowsToHit(area: Locator): Promise<Locator[]> {
  return [
    area.locator(".gridkit-grid-header"),
    await rowInView(area, DATA_ROW),
    area.locator(".gridkit-grid-footer"),
  ];
}

/** `PinnedColumnsGrid`'s pinned columns: two at the start, one at the end. */
const PINNED_HITS = { start: ["team", "c1"], end: "c7" };

/** Expects `row` to show `PinnedColumnsGrid`'s pinned columns, flush with both edges. */
async function expectPinnedAtEdges(
  row: Locator,
  port: Scrollport,
): Promise<void> {
  const hits = await edgeHits(row, port);
  expect({ start: hits.start, end: hits.end }).toEqual(PINNED_HITS);
  expect(hits.startGap).toBeLessThanOrEqual(1);
  expect(hits.endGap).toBeLessThanOrEqual(1);
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

  test("is one line where the start and end edges meet", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <PinnedColumnsGrid
        height={300}
        borders="vertical"
        defaultColumnPinning={{
          c2: "start",
          c3: "start",
          c4: "start",
          c5: "start",
          c6: "start",
        }}
      />,
      // Wide enough for every column, so neither edge covers the other.
      { width: 1100 },
    );
    const row = root.locator('[data-gridkit-row-id="r1"]');
    const startEdge = row.locator('[data-gridkit-column="c6"]');
    const endEdge = row.locator('[data-gridkit-column="c7"]');

    await expect(startEdge).toHaveClass(/is-pinned-start is-pinned-edge/);
    await expect(startEdge).toHaveCSS("border-inline-end-width", "0px");
    await expect(endEdge).toHaveCSS("border-inline-start-width", "1px");
    const box = await endEdge.boundingBox();
    if (box === null) throw new Error("no end edge cell");
    expect(
      await lineColumns(page, {
        x: Math.round(box.x) - 6,
        y: Math.round(box.y) + 2,
        width: 12,
        height: 1,
      }),
    ).toBe(1);
  });
});

test.describe("pinned cells stay at their edges", () => {
  for (const dir of ["ltr", "rtl"] as const) {
    test(`in the header, body and footer, scrolled 0%, 50% and 100%, ${dir}`, async ({
      mount,
    }) => {
      const grid = <PinnedColumnsGrid height={300} />;
      const root = await mountGrid(
        mount,
        dir === "rtl" ? <RightToLeft>{grid}</RightToLeft> : grid,
      );
      const area = scrollArea(root);
      const port = await scrollportOf(area);
      expect(port.rtl).toBe(dir === "rtl");

      for (const fraction of [0, 0.5, 1]) {
        await scrollSideways(area, fraction);
        for (const row of await rowsToHit(area)) {
          await expectPinnedAtEdges(row, port);
        }
      }
      expect(
        await area.evaluate((element) => Math.abs(element.scrollLeft)),
      ).toBeGreaterThan(0);
    });
  }

  test("without a height", async ({ mount }) => {
    const root = await mountGrid(mount, <PinnedColumnsGrid rowCount={5} />);
    const area = scrollArea(root);
    const port = await scrollportOf(area);
    await scrollSideways(area, 1);

    for (const row of await rowsToHit(area)) {
      await expectPinnedAtEdges(row, port);
    }
  });

  test("pinned to the start only", async ({ mount }) => {
    const root = await mountGrid(
      mount,
      <PinnedColumnsGrid height={300} defaultColumnPinning={{ c7: "none" }} />,
    );
    const area = scrollArea(root);
    const port = await scrollportOf(area);
    await scrollSideways(area, 0.5);

    for (const row of await rowsToHit(area)) {
      const hits = await edgeHits(row, port);
      expect(hits.start).toEqual(["team", "c1"]);
      expect(hits.startGap).toBeLessThanOrEqual(1);
      // Half scrolled, the column at the unpinned edge runs past it.
      expect(hits.end).not.toBe("c7");
      expect(hits.endGap).toBeGreaterThan(1);
    }
  });

  test("pinned to the end only", async ({ mount }) => {
    const root = await mountGrid(
      mount,
      <PinnedColumnsGrid
        height={300}
        defaultColumnPinning={{ team: "none", c1: "none" }}
      />,
    );
    const area = scrollArea(root);
    const port = await scrollportOf(area);
    await scrollSideways(area, 0.5);

    for (const row of await rowsToHit(area)) {
      const hits = await edgeHits(row, port, 1);
      expect(hits.end).toBe("c7");
      expect(hits.endGap).toBeLessThanOrEqual(1);
      // Half scrolled, the column at the unpinned edge runs past it.
      expect(hits.startGap).toBeGreaterThan(1);
    }
  });

  test("in virtualized rows, scrolled up and down", async ({ mount }) => {
    const root = await mountGrid(
      mount,
      <PinnedColumnsGrid height={300} virtualized rowCount={2000} />,
    );
    const area = scrollArea(root);
    const port = await scrollportOf(area);

    for (const share of [0.5, 0.25, 0.75, 1]) {
      await area.evaluate((element, fraction) => {
        element.scrollTop =
          (element.scrollHeight - element.clientHeight) * fraction;
      }, share);
      await scrollSideways(area, share);
      // The virtualizer draws the rows now in view a frame after the scroll.
      await expect
        .poll(() => rowIndexInView(area, DATA_ROW))
        .toBeGreaterThanOrEqual(0);
      for (const row of await rowsToHit(area)) {
        await expectPinnedAtEdges(row, port);
      }
    }
  });

  test("in grouped rows and their summary rows", async ({ mount }) => {
    const root = await mountGrid(
      mount,
      <PinnedColumnsGrid
        height={300}
        defaultGroupBy={[{ columnId: "team" }]}
        groupAggregateDisplay="row"
        rowCount={8}
      />,
    );
    const area = scrollArea(root);
    const port = await scrollportOf(area);
    await scrollSideways(area, 0.5);

    await expectPinnedAtEdges(await rowInView(area, SUMMARY_ROW), port);
    for (const row of await rowsToHit(area)) {
      await expectPinnedAtEdges(row, port);
    }
  });

  test("in fit mode, where nothing scrolls", async ({ mount }) => {
    const root = await mountGrid(
      mount,
      <PinnedColumnsGrid height={300} resizeMode="fit" />,
      { width: 1100 },
    );
    const area = scrollArea(root);
    const port = await scrollportOf(area);
    await scrollSideways(area, 1);

    expect(await area.evaluate((element) => element.scrollLeft)).toBe(0);
    for (const row of await rowsToHit(area)) {
      await expectPinnedAtEdges(row, port);
    }
  });
});

test.describe("selection on pinned cells", () => {
  test("a selected row, cell and column colour their pinned cells", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <PinnedColumnsGrid
        height={300}
        selectable={{ rows: "multiple", cells: "single", columns: "multiple" }}
        defaultRowSelection={["r1"]}
        defaultCellSelection={{ kind: "cell", rowId: "r3", columnId: "team" }}
        defaultColumnSelection={["c7"]}
      />,
    );
    await scrollSideways(scrollArea(root), 0.5);

    /** A cell's colour and the colour its top background layer paints. */
    function colours(rowId: string, columnId: string) {
      return root
        .locator(
          `[data-gridkit-row-id="${rowId}"] [data-gridkit-column="${columnId}"]`,
        )
        .evaluate((cell) => ({
          cell: getComputedStyle(cell).backgroundColor,
          layer: getComputedStyle(cell, "::after").backgroundColor,
        }));
    }
    const selected = await root
      .locator('[data-gridkit-row-id="r1"]')
      .evaluate((row) => getComputedStyle(row).backgroundColor);
    expect((await colours("r5", "team")).cell).not.toBe(selected);

    for (const [rowId, columnId] of [
      ["r1", "team"],
      ["r1", "c7"],
      ["r3", "team"],
      ["r5", "c7"],
    ] as const) {
      expect(await colours(rowId, columnId)).toEqual({
        cell: selected,
        layer: selected,
      });
    }
    await expect(
      root.locator('.gridkit-header-cell[data-gridkit-column="c7"]'),
    ).toHaveClass(/is-selected/);
  });
});

test.describe("pinning at run time", () => {
  test("pins and unpins a column from its header menu", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <PinnedColumnsGrid height={300} contextMenu />,
    );
    const area = scrollArea(root);
    const header = (columnId: string) =>
      root.locator(`.gridkit-header-cell[data-gridkit-column="${columnId}"]`);
    async function runFromMenu(columnId: string, item: string): Promise<void> {
      await header(columnId).click({ button: "right" });
      await page
        .getByRole("menu", { name: `${columnId} column menu` })
        .getByRole("menuitem", { name: item, exact: true })
        .click();
    }

    await runFromMenu("c3", "Pin to start");
    await expect(header("c3")).toHaveClass(/is-pinned-start is-pinned-edge/);
    await expect(header("c1")).not.toHaveClass(/is-pinned-edge/);
    await scrollSideways(area, 1);
    let port = await scrollportOf(area);
    for (const row of await rowsToHit(area)) {
      const hits = await edgeHits(row, port, 3);
      expect(hits.start).toEqual(["team", "c1", "c3"]);
      expect(hits.end).toBe("c7");
    }

    await scrollSideways(area, 0);
    await runFromMenu("team", "Unpin");
    await expect(header("team")).not.toHaveClass(/is-pinned/);
    await scrollSideways(area, 1);
    port = await scrollportOf(area);
    for (const row of await rowsToHit(area)) {
      const hits = await edgeHits(row, port, 3);
      expect(hits.start.slice(0, 2)).toEqual(["c1", "c3"]);
      expect(hits.start[2]).not.toBe("team");
      expect(hits.end).toBe("c7");
    }
  });
});

test.describe("keyboard focus", () => {
  const COLUMN_IDS = ["team", "c1", "c2", "c3", "c4", "c5", "c6", "c7"];

  /** The focused cell's column, and whether any of it is covered. */
  async function focusedCell(
    page: Page,
  ): Promise<{ column: string | null; uncovered: boolean }> {
    const cell = page.locator(":focus");
    return {
      column: await cell.getAttribute("data-gridkit-column"),
      uncovered: await isUncovered(cell),
    };
  }

  async function expectFocusClear(page: Page, column: string): Promise<void> {
    await expect
      .poll(() => focusedCell(page))
      .toEqual({ column, uncovered: true });
  }

  /** Mounts `PinnedColumnsGrid` and tabs to its header's first cell. */
  async function tabIntoGrid(
    mount: Parameters<typeof mountGrid>[0],
    page: Page,
    dir: "ltr" | "rtl",
  ): Promise<{ area: Locator; forward: string; back: string }> {
    const grid = <PinnedColumnsGrid height={300} />;
    const root = await mountGrid(
      mount,
      dir === "rtl" ? <RightToLeft>{grid}</RightToLeft> : grid,
    );
    await page.keyboard.press("Tab");
    await expectFocusClear(page, "team");
    return {
      area: scrollArea(root),
      forward: dir === "rtl" ? "ArrowLeft" : "ArrowRight",
      back: dir === "rtl" ? "ArrowRight" : "ArrowLeft",
    };
  }

  for (const dir of ["ltr", "rtl"] as const) {
    test(`keeps the focused cell clear of the pinned columns, arrowing across the header and a row and back, ${dir}`, async ({
      mount,
      page,
    }) => {
      const { area, forward, back } = await tabIntoGrid(mount, page, dir);

      for (const row of ["header", "body"]) {
        if (row === "body") {
          await page.keyboard.press("ArrowDown");
          await expectFocusClear(page, "team");
        }
        for (const column of COLUMN_IDS.slice(1)) {
          await page.keyboard.press(forward);
          await expectFocusClear(page, column);
        }
        expect(
          await area.evaluate((element) => Math.abs(element.scrollLeft)),
        ).toBeGreaterThan(0);
        for (const column of COLUMN_IDS.slice(0, -1).reverse()) {
          await page.keyboard.press(back);
          await expectFocusClear(page, column);
        }
      }
    });

    test(`Home, End and Ctrl+Home onto pinned cells leave the scroll position, ${dir}`, async ({
      mount,
      page,
    }) => {
      const { area, forward } = await tabIntoGrid(mount, page, dir);
      await page.keyboard.press("ArrowDown");
      for (const column of COLUMN_IDS.slice(1, 5)) {
        await page.keyboard.press(forward);
        await expectFocusClear(page, column);
      }
      const scrolled = await area.evaluate((element) => element.scrollLeft);
      expect(scrolled).not.toBe(0);

      for (const [key, column] of [
        ["Home", "team"],
        ["End", "c7"],
        ["Control+Home", "team"],
      ] as const) {
        await page.keyboard.press(key);
        await expectFocusClear(page, column);
        expect(await area.evaluate((element) => element.scrollLeft)).toBe(
          scrolled,
        );
      }
      await expect(page.locator(":focus")).toHaveClass(/gridkit-header-cell/);
    });
  }
});
