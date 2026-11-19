// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import type { MountResult } from "@playwright/experimental-ct-react";
import type { Page } from "@playwright/test";
import type { ColumnSortEvent, RowPointerEvent } from "@gridkitjs/core";
import { ariaRowCount } from "./support/ariaRows";
import { expect, test } from "./support/coverage";
import { mountGrid } from "./support/mountGrid";
import LoadingGrid, { type LoadingRow } from "./support/LoadingGrid";

function buildRows(count: number): LoadingRow[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `row-${String(index)}`,
    name: `Name ${String(index)}`,
  }));
}

function overlay(root: MountResult) {
  return root.locator(".gridkit-grid-loading-overlay");
}

function grid(root: MountResult) {
  return root.getByRole("grid");
}

function dataRow(root: MountResult, index: number) {
  return root.locator(`tr[data-gridkit-row-id="row-${String(index)}"]`);
}

async function startLoading(root: MountResult): Promise<void> {
  await root.getByRole("button", { name: "Start loading" }).click();
  await expect(overlay(root)).toBeVisible();
}

async function stopLoading(root: MountResult): Promise<void> {
  await root.getByRole("button", { name: "Stop loading" }).click();
  await expect(overlay(root)).toHaveCount(0);
}

/** The body's height, the scroll area's, and where a row sits in the page. */
async function layout(root: MountResult) {
  const body = await root.locator(".gridkit-data-grid-body").boundingBox();
  const area = await root.locator(".gridkit-data-grid-tables").boundingBox();
  const row = await dataRow(root, 1).boundingBox();
  if (body === null || area === null || row === null) {
    throw new Error("not laid out");
  }
  return {
    bodyHeight: Math.round(body.height),
    areaHeight: Math.round(area.height),
    rowTop: Math.round(row.y),
  };
}

/** What the pointer finds at the centre of `locator`'s box, as its closest classed element's class. */
async function hitAt(page: Page, locator: ReturnType<MountResult["locator"]>) {
  const box = await locator.boundingBox();
  if (box === null) throw new Error("not laid out");
  return page.evaluate(
    ({ x, y }) =>
      document.elementFromPoint(x, y)?.closest("[class]")?.className ?? null,
    { x: box.x + box.width / 2, y: box.y + box.height / 2 },
  );
}

test.describe("a loading grid", () => {
  test("covers the body and marks the grid busy only while loading", async ({
    mount,
  }) => {
    const root = await mountGrid(mount, <LoadingGrid rows={buildRows(3)} />);
    await expect(overlay(root)).toHaveCount(0);
    await expect(grid(root)).not.toHaveAttribute("aria-busy");
    const rowCount = await ariaRowCount(root);

    await startLoading(root);
    await expect(grid(root)).toHaveAttribute("aria-busy", "true");
    await expect(overlay(root)).toHaveRole("row");
    await expect(overlay(root)).not.toHaveAttribute("aria-rowindex");
    await expect(overlay(root).getByRole("gridcell")).toHaveText("Loading…");
    await expect(overlay(root)).not.toHaveClass(/is-empty/);
    await expect(root.locator("tr[data-gridkit-row-id]")).toHaveCount(3);
    expect(await ariaRowCount(root)).toBe(rowCount);

    await stopLoading(root);
    await expect(grid(root)).not.toHaveAttribute("aria-busy");
  });

  test("leaves the rows where they are, in a body as tall as its rows", async ({
    mount,
  }) => {
    const root = await mountGrid(mount, <LoadingGrid rows={buildRows(3)} />);
    const before = await layout(root);

    await startLoading(root);
    expect(await layout(root)).toEqual(before);
    const body = await root.locator(".gridkit-data-grid-body").boundingBox();
    const cover = await overlay(root).boundingBox();
    expect(cover).not.toBeNull();
    expect(Math.round(cover?.height ?? 0)).toBe(Math.round(body?.height ?? -1));

    await stopLoading(root);
    expect(await layout(root)).toEqual(before);
  });

  test("leaves the rows and the scroll where they are under a fixed height, centring the message in the rows in view", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <LoadingGrid rows={buildRows(30)} height={200} />,
    );
    const area = root.locator(".gridkit-data-grid-tables");
    await area.evaluate((element) => {
      element.scrollTop = 300;
    });
    const before = await layout(root);
    const scrollTop = await area.evaluate((element) => element.scrollTop);

    await startLoading(root);
    expect(await layout(root)).toEqual(before);
    expect(await area.evaluate((element) => element.scrollTop)).toBe(scrollTop);

    const header = await root
      .locator(".gridkit-data-grid-header")
      .boundingBox();
    const content = await root
      .locator(".gridkit-grid-loading-overlay-content")
      .boundingBox();
    if (header === null || content === null) throw new Error("not laid out");
    expect(Math.round(content.y)).toBe(Math.round(header.y + header.height));
    expect(Math.round(content.height)).toBe(200);

    await stopLoading(root);
    expect(await layout(root)).toEqual(before);
  });

  test("keeps its message in view while a wide grid scrolls sideways", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <LoadingGrid rows={buildRows(3)} resizeMode="fixed" defaultLoading />,
      { width: 160 },
    );
    const area = root.locator(".gridkit-data-grid-tables");
    await area.evaluate((element) => {
      element.scrollLeft = element.scrollWidth;
    });
    await expect
      .poll(() => area.evaluate((element) => element.scrollLeft))
      .toBeGreaterThan(0);

    const box = await area.boundingBox();
    const content = await root
      .locator(".gridkit-grid-loading-overlay-content")
      .boundingBox();
    if (box === null || content === null) throw new Error("not laid out");
    const inner = await area.evaluate((element) => element.clientWidth);
    expect(Math.round(content.x)).toBe(Math.round(box.x));
    expect(Math.round(content.width)).toBe(inner);
  });

  test("lies over pinned cells and under the header", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <LoadingGrid
        rows={buildRows(3)}
        defaultColumnPinning={{ id: "start" }}
        defaultLoading
      />,
    );

    expect(await hitAt(page, dataRow(root, 0).locator("td").first())).toMatch(
      /gridkit-grid-loading-overlay/,
    );
    expect(
      await hitAt(page, root.getByRole("columnheader", { name: "Id" })),
    ).toMatch(/gridkit-header-cell/);
  });

  test("takes a click on a covered row, which selects nothing", async ({
    mount,
    page,
  }) => {
    const clicks: RowPointerEvent<LoadingRow>[] = [];
    const root = await mountGrid(
      mount,
      <LoadingGrid
        rows={buildRows(3)}
        selectable={{ rows: "single" }}
        onRowClick={(event) => {
          clicks.push(event);
        }}
        defaultLoading
      />,
    );

    const box = await dataRow(root, 1).boundingBox();
    if (box === null) throw new Error("not laid out");
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

    await expect(root.locator('[aria-selected="true"]')).toHaveCount(0);
    expect(clicks).toHaveLength(0);
  });

  test("still takes a sort click on the header", async ({ mount }) => {
    const events: ColumnSortEvent[] = [];
    const root = await mountGrid(
      mount,
      <LoadingGrid
        rows={buildRows(3)}
        sortableColumns
        onColumnSortChange={(event) => {
          events.push(event);
        }}
        defaultLoading
      />,
    );

    await root
      .getByRole("columnheader", { name: "Name" })
      .locator(".gridkit-header-sort-toggle")
      .click();
    await expect.poll(() => events.length).toBe(1);
    expect(events[0]?.sort).toEqual([{ columnId: "name", direction: "asc" }]);
  });

  test("leaves keyboard focus where it was", async ({ mount }) => {
    const root = await mountGrid(mount, <LoadingGrid rows={buildRows(3)} />);
    const cell = dataRow(root, 1).locator("td").first();
    await cell.click();
    await expect(cell).toBeFocused();

    // A synthetic click, which moves no focus, as a fetch starting would not.
    await root
      .getByRole("button", { name: "Start loading" })
      .dispatchEvent("click");
    await expect(overlay(root)).toBeVisible();
    await expect(cell).toBeFocused();
  });

  test("draws a loadingTemplate in place of the message", async ({ mount }) => {
    const root = await mountGrid(
      mount,
      <LoadingGrid
        rows={buildRows(3)}
        withTemplate
        defaultLoading
        infiniteScroll={{
          hasMore: true,
          isLoadingMore: true,
          onLoadMore: () => undefined,
        }}
      />,
    );

    await expect(overlay(root)).toHaveText("Fetching page…");
    await expect(root.getByTestId("loading-template")).toBeVisible();
    await expect(root.locator(".gridkit-grid-loading-cell")).toHaveText(
      "Loading more…",
    );
  });

  test("announces once as loading starts, and not as it ends", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, <LoadingGrid rows={buildRows(3)} />);
    await page.evaluate(() => {
      const announced: string[] = [];
      const region = document.querySelector('[role="status"]');
      if (region === null) throw new Error("no live region");
      new MutationObserver(() => {
        announced.push(region.textContent.trim());
        document.body.dataset.announced = JSON.stringify(announced);
      }).observe(region, { childList: true, characterData: true });
    });
    const body = page.locator("body");

    await startLoading(root);
    await root.getByRole("button", { name: "Redraw" }).click();
    await root.getByRole("button", { name: "Start loading" }).click();
    await expect(root.locator('[role="status"]')).toHaveText("Loading…");
    await stopLoading(root);

    await expect(body).toHaveAttribute(
      "data-announced",
      JSON.stringify(["Loading…"]),
    );
  });

  test("shows over an empty body in place of the empty message, which follows it", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <LoadingGrid rows={[]} defaultLoading />,
    );
    await expect(overlay(root)).toHaveClass(/is-empty/);
    await expect(overlay(root)).toHaveText("Loading…");
    await expect(root.locator(".gridkit-grid-empty-row")).toHaveCount(0);
    const loadingHeight = (
      await root.locator(".gridkit-data-grid-body").boundingBox()
    )?.height;

    await stopLoading(root);
    await expect(root.locator(".gridkit-grid-empty-row")).toHaveText(
      "No rows to show",
    );
    const emptyHeight = (
      await root.locator(".gridkit-data-grid-body").boundingBox()
    )?.height;
    expect(
      Math.abs((emptyHeight ?? 0) - (loadingHeight ?? 0)),
    ).toBeLessThanOrEqual(2);
  });
});
