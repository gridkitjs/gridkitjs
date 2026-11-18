// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import type { Locator, Page } from "@playwright/test";
import type { MountResult } from "@playwright/experimental-ct-react";
import type { ColumnDefinition } from "@gridkitjs/core";
import { DataGrid, type DataGridProps } from "@gridkitjs/react";
import { expect, test } from "./support/coverage";
import RightToLeft from "./support/RightToLeft";
import ToolbarGrid from "./support/ToolbarGrid";
import { mountGrid } from "./support/mountGrid";
import {
  TOUCH_DRAG_UNAVAILABLE,
  canDriveTouch,
  touchDrag,
  touchPress,
  type Point,
} from "./support/touchscreen";

/** WCAG 2.2's minimum target size, in CSS pixels. */
const MIN_TARGET = 24;

/** A phone held upright: the width every overlay has to fit. */
const PHONE = { width: 390, height: 844 };

interface Row {
  id: string;
  name: string;
  city: string;
  score: number;
  notes: string;
}

const rows: Row[] = Array.from({ length: 30 }, (_, index) => ({
  id: `row-${String(index)}`,
  name: `Name ${String(index)}`,
  city: index % 2 === 0 ? "Oslo" : "Lima",
  score: index,
  notes: `Note ${String(index)}`,
}));

/** Wider together than a phone, so the grid scrolls sideways. */
const columns: readonly ColumnDefinition<Row>[] = [
  { field: "id", header: "Id", width: 100 },
  { field: "name", header: "Name", width: 160 },
  { field: "city", header: "City", width: 160 },
  { field: "score", header: "Score", width: 120, type: "number" },
  { field: "notes", header: "Notes", width: 160 },
];

function grid(props: Partial<DataGridProps<Row>> = {}) {
  return (
    <DataGrid
      columns={columns}
      dataSource={rows}
      label="Touch"
      resizeMode="fixed"
      {...props}
    />
  );
}

function header(root: MountResult, name: string): Locator {
  return root.getByRole("columnheader", { name, exact: true });
}

function bodyCell(root: MountResult, row: number, column: number): Locator {
  return root.locator("tbody tr").nth(row).locator("td").nth(column);
}

async function boxOf(locator: Locator) {
  const box = await locator.boundingBox();
  if (box === null) throw new Error("element is not visible");
  return box;
}

async function centerOf(locator: Locator): Promise<Point> {
  const box = await boxOf(locator);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function tap(page: Page, locator: Locator): Promise<void> {
  const { x, y } = await centerOf(locator);
  await page.touchscreen.tap(x, y);
}

async function expectTappable(locator: Locator): Promise<void> {
  const box = await boxOf(locator);
  expect(box.width).toBeGreaterThanOrEqual(MIN_TARGET);
  expect(box.height).toBeGreaterThanOrEqual(MIN_TARGET);
}

/** Expects `locator` to lie inside the page's width, with nothing cut off. */
async function expectWithinPage(page: Page, locator: Locator): Promise<void> {
  const box = await boxOf(locator);
  const width = await page.evaluate(() => document.documentElement.clientWidth);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(width);
}

/**
 * How far `cell` sits from `header` sideways. A swipe can fling on after
 * the finger lifts, so a test polls this rather than comparing one cell's
 * position with the header's taken earlier.
 */
async function offsetFromHeader(
  cell: Locator,
  header: Locator,
): Promise<number> {
  return (await boxOf(cell)).x - (await boxOf(header)).x;
}

function scrollLeftOf(locator: Locator): Promise<number> {
  return locator.evaluate((element) => element.scrollLeft);
}

test.describe("touch", { tag: "@touch" }, () => {
  test("a tap selects a row, and a tap selects a cell", async ({
    mount,
    page,
  }) => {
    const rowsGrid = await mountGrid(
      mount,
      grid({ selectable: { rows: "single" } }),
    );
    const row = rowsGrid.locator("tbody tr").nth(2);
    await tap(page, bodyCell(rowsGrid, 2, 1));
    await expect(row).toHaveAttribute("aria-selected", "true");
    await rowsGrid.unmount();

    const cellsGrid = await mountGrid(
      mount,
      grid({ selectable: { cells: "single" } }),
    );
    const cell = bodyCell(cellsGrid, 3, 1);
    await tap(page, cell);
    await expect(cell).toHaveAttribute("aria-selected", "true");
    await expect(cell).toBeFocused();
  });

  test("a header's sort, filter and group toggles show without hover, big enough to tap", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      grid({
        sortableColumns: true,
        filterableColumns: true,
        groupableColumns: true,
        resizableColumns: true,
      }),
    );
    const name = header(root, "Name");
    const toggles = {
      sort: name.locator(".gridkit-header-sort-toggle"),
      filter: name.locator(".gridkit-header-filter-toggle"),
      group: name.locator(".gridkit-header-group-toggle"),
    };
    for (const toggle of Object.values(toggles)) {
      await expect(toggle).toHaveCSS("opacity", "1");
      await expectTappable(toggle);
    }

    const [sort, filter, handle] = await Promise.all([
      boxOf(toggles.sort),
      boxOf(toggles.filter),
      boxOf(name.locator(".gridkit-header-resize-handle")),
    ]);
    // Side by side, so a tap meant for one never lands on another.
    expect(sort.x + sort.width).toBeLessThanOrEqual(filter.x);
    expect(filter.x + filter.width).toBeLessThanOrEqual(handle.x);

    await tap(page, toggles.sort);
    await expect(name).toHaveAttribute("aria-sort", "ascending");

    await tap(page, toggles.filter);
    const panel = page.getByRole("dialog", { name: "Name filter" });
    await expect(panel).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(panel).toHaveCount(0);

    await tap(page, toggles.group);
    await expect(root.getByRole("treegrid")).toBeVisible();
  });

  test("a long-press opens the context menu, and a tap outside closes it", async ({
    mount,
    page,
    browserName,
  }) => {
    test.skip(!canDriveTouch(browserName), TOUCH_DRAG_UNAVAILABLE);
    const root = await mountGrid(mount, grid({ contextMenu: true }));
    const lift = await touchPress(page, await centerOf(bodyCell(root, 1, 1)));
    const menu = page.getByRole("menu", { name: "Row menu" });
    await expect(menu).toBeVisible();
    await lift();
    await expect(menu).toBeVisible();

    const below = await boxOf(root.locator(".gridkit-data-grid-viewport"));
    await page.touchscreen.tap(below.x + 10, below.y + below.height + 40);
    await expect(menu).toHaveCount(0);
  });

  test("dragging the rows sideways scrolls them", async ({
    mount,
    page,
    browserName,
  }) => {
    test.skip(!canDriveTouch(browserName), TOUCH_DRAG_UNAVAILABLE);
    const root = await mountGrid(mount, grid(), { width: 360 });
    const cell = bodyCell(root, 2, 1);
    const before = await boxOf(cell);
    const from = await centerOf(cell);
    await touchDrag(page, from, { x: from.x - 150, y: from.y });
    await expect.poll(async () => (await boxOf(cell)).x).toBeLessThan(before.x);
  });

  test("dragging the rows sideways keeps the header in line with them", async ({
    mount,
    page,
    browserName,
  }) => {
    test.skip(!canDriveTouch(browserName), TOUCH_DRAG_UNAVAILABLE);
    const root = await mountGrid(mount, grid(), { width: 360 });
    const cell = bodyCell(root, 2, 2);
    const from = await centerOf(cell);
    await touchDrag(page, from, { x: from.x - 150, y: from.y });
    await expect
      .poll(() => offsetFromHeader(cell, header(root, "City")))
      .toBeCloseTo(0, 2);
  });

  test("dragging the rows of a right-to-left grid with a height sideways keeps the header in line with them", async ({
    mount,
    page,
    browserName,
  }) => {
    test.skip(!canDriveTouch(browserName), TOUCH_DRAG_UNAVAILABLE);
    const root = await mountGrid(
      mount,
      <RightToLeft>{grid({ height: 200 })}</RightToLeft>,
      { width: 360 },
    );
    const cell = bodyCell(root, 2, 2);
    const before = await boxOf(cell);
    const from = await centerOf(cell);
    // The columns past the visible ones lie to the left, so the finger
    // moves right to bring them in.
    await touchDrag(page, from, { x: from.x + 150, y: from.y });
    await expect
      .poll(async () => (await boxOf(cell)).x)
      .toBeGreaterThan(before.x);
    await expect
      .poll(() => offsetFromHeader(cell, header(root, "City")))
      .toBeCloseTo(0, 2);
  });

  test("dragging a header that does not reorder scrolls the grid sideways", async ({
    mount,
    page,
    browserName,
  }) => {
    test.skip(!canDriveTouch(browserName), TOUCH_DRAG_UNAVAILABLE);
    const root = await mountGrid(mount, grid(), { width: 360 });
    const tables = root.locator(".gridkit-data-grid-tables");
    const from = await centerOf(header(root, "City"));
    await touchDrag(page, from, { x: from.x - 150, y: from.y });
    await expect.poll(() => scrollLeftOf(tables)).toBeGreaterThan(0);
  });

  test("dragging a reorderable header moves its column rather than scrolling", async ({
    mount,
    page,
    browserName,
  }) => {
    test.skip(!canDriveTouch(browserName), TOUCH_DRAG_UNAVAILABLE);
    const root = await mountGrid(mount, grid({ reorderableColumns: true }), {
      width: 360,
    });
    const tables = root.locator(".gridkit-data-grid-tables");
    const from = await centerOf(header(root, "Name"));
    const to = await centerOf(header(root, "Id"));
    await touchDrag(page, from, { x: to.x - 20, y: to.y });
    await expect(root.locator("thead th").first()).toHaveAccessibleName("Name");
    expect(await scrollLeftOf(tables)).toBe(0);
  });

  test("a column resizes by dragging its edge, which is wide enough for a finger", async ({
    mount,
    page,
    browserName,
  }) => {
    const root = await mountGrid(mount, grid({ resizableColumns: true }));
    const name = header(root, "Name");
    const handle = name.locator(".gridkit-header-resize-handle");
    expect((await boxOf(handle)).width).toBeGreaterThanOrEqual(MIN_TARGET);

    test.skip(!canDriveTouch(browserName), TOUCH_DRAG_UNAVAILABLE);
    const before = (await boxOf(name)).width;
    const from = await centerOf(handle);
    await touchDrag(page, from, { x: from.x + 60, y: from.y });
    await expect
      .poll(async () => Math.round((await boxOf(name)).width))
      .toBe(Math.round(before + 60));
  });

  test.describe("on a phone-wide page", () => {
    test.use({ viewport: PHONE });

    test("the filter panel fits and applies a filter", async ({
      mount,
      page,
    }) => {
      const root = await mountGrid(mount, grid({ filterableColumns: true }), {
        width: PHONE.width,
      });
      await tap(
        page,
        header(root, "Name").locator(".gridkit-header-filter-toggle"),
      );
      const panel = page.getByRole("dialog", { name: "Name filter" });
      await expect(panel).toBeVisible();
      await expectWithinPage(page, panel);

      await panel
        .getByRole("group", { name: "Condition 1" })
        .getByLabel("Value", { exact: true })
        .fill("Name 1");
      await tap(page, panel.getByRole("button", { name: "OK", exact: true }));
      await expect(panel).toHaveCount(0);
      await expect(bodyCell(root, 1, 1)).toHaveText("Name 10");
    });

    test("the column chooser fits and hides a column", async ({
      mount,
      page,
    }) => {
      const root = await mountGrid(
        mount,
        grid({ toolbar: { items: ["column.choose"] } }),
        { width: PHONE.width },
      );
      await tap(page, root.getByRole("button", { name: "Choose columns" }));
      const chooser = page.getByRole("dialog", { name: "Columns" });
      await expect(chooser).toBeVisible();
      await expectWithinPage(page, chooser);

      const notes = chooser.getByRole("checkbox", { name: "Notes" });
      await tap(page, notes);
      await expect(notes).not.toBeChecked();
      await expect(header(root, "Notes")).toHaveCount(0);
    });

    test("the toolbar's overflow menu fits and runs an item", async ({
      mount,
      page,
    }) => {
      const root = await mountGrid(mount, <ToolbarGrid />, {
        width: PHONE.width,
      });
      await tap(page, root.getByRole("button", { name: "More" }));
      const menu = page.getByRole("menu", { name: "More" });
      await expect(menu).toBeVisible();
      await expectWithinPage(page, menu);

      await tap(page, menu.getByRole("menuitemcheckbox", { name: "Compact" }));
      await expect(menu).toHaveCount(0);
      await expect(
        root.getByRole("button", { name: "status: compact" }),
      ).toBeVisible();
    });

    test("the pager's buttons are big enough to tap, and a tap turns the page", async ({
      mount,
      page,
    }) => {
      const root = await mountGrid(
        mount,
        grid({
          paginated: true,
          defaultPagination: { pageIndex: 0, pageSize: 5 },
        }),
        { width: PHONE.width },
      );
      const pager = root.locator(".gridkit-grid-pager");
      const buttons = pager.locator(".gridkit-grid-pager-button");
      expect(await buttons.count()).toBeGreaterThan(2);
      for (const button of await buttons.all()) {
        await expectTappable(button);
      }
      await expectWithinPage(page, pager);

      await tap(page, pager.getByRole("button", { name: /next/i }));
      await expect(bodyCell(root, 0, 0)).toHaveText("row-5");
    });
  });
});
