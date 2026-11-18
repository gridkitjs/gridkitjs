// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import type { Locator, Page } from "@playwright/test";
import type { MountResult } from "@playwright/experimental-ct-react";
import type {
  ColumnDefinition,
  ColumnOrderEvent,
  GroupByEvent,
} from "@gridkitjs/core";
import { DataGrid, type DataGridProps } from "@gridkitjs/react";
import { expect, test } from "./support/coverage";
import ContextMenuGrid from "./support/ContextMenuGrid";
import FilterMenuGrid from "./support/FilterMenuGrid";
import ImperativeApiGrid from "./support/ImperativeApiGrid";
import RightToLeft from "./support/RightToLeft";
import ToolbarGrid from "./support/ToolbarGrid";
import { mountGrid } from "./support/mountGrid";

/** DataGrid's space between a menu or panel and what it opens below. */
const ANCHOR_GAP = 4;

interface Row {
  id: string;
  name: string;
  status: string;
}

function buildRows(count: number): Row[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `row-${String(index)}`,
    name: `Row ${String(index)}`,
    status: "ok",
  }));
}

const columns: readonly ColumnDefinition<Row>[] = [
  { field: "id", width: 100 },
  { field: "name", width: 160 },
  { field: "status", width: 100 },
];

function headers(root: MountResult): Locator {
  return root.locator("thead th");
}

function header(root: MountResult, name: string): Locator {
  return root.getByRole("columnheader", { name, exact: true });
}

function bodyCell(root: MountResult, row: number, column: number): Locator {
  return root.locator("tbody tr").nth(row).locator("td").nth(column);
}

function viewport(root: MountResult): Locator {
  return root.locator(".gridkit-data-grid-viewport");
}

/** The item named `name`, whichever menu item role it has. */
function item(menu: Locator, name: string): Locator {
  return menu
    .getByRole("menuitem", { name, exact: true })
    .or(menu.getByRole("menuitemcheckbox", { name, exact: true }));
}

async function boxOf(locator: Locator) {
  const box = await locator.boundingBox();
  if (box === null) throw new Error("element is not visible");
  return box;
}

/** Whether the whole width of `element` shows inside the grid's viewport, to the pixel. */
async function insideView(
  root: MountResult,
  element: Locator,
): Promise<boolean> {
  const [box, view] = await Promise.all([
    boxOf(element),
    boxOf(viewport(root)),
  ]);
  return (
    Math.round(box.x) >= Math.round(view.x) &&
    Math.round(box.x + box.width) <= Math.round(view.x + view.width)
  );
}

async function columnIds(root: MountResult): Promise<(string | null)[]> {
  return headers(root).evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("data-gridkit-column")),
  );
}

async function colWidth(root: MountResult, index: number): Promise<number> {
  return root
    .locator("colgroup col")
    .nth(index)
    .evaluate((element) => parseFloat((element as HTMLElement).style.width));
}

/** Presses the mouse down on `element`'s center, without releasing it, and returns where. */
async function pressOn(
  page: Page,
  element: Locator,
): Promise<{ x: number; y: number }> {
  const box = await boxOf(element);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  return { x, y };
}

/** A right-to-left grid of `columns` whose columns keep their widths; `props` override. */
function rtlGrid(props: Partial<DataGridProps<Row>>) {
  return (
    <RightToLeft>
      <DataGrid
        columns={columns}
        dataSource={buildRows(3)}
        label="Right to left"
        resizeMode="fixed"
        {...props}
      />
    </RightToLeft>
  );
}

test.describe("layout", () => {
  test("the first column sits at the grid's right edge, the rest following leftward", async ({
    mount,
  }) => {
    const root = await mountGrid(mount, rtlGrid({}));
    const [grid, first, second, third] = await Promise.all([
      boxOf(viewport(root)),
      boxOf(headers(root).nth(0)),
      boxOf(headers(root).nth(1)),
      boxOf(headers(root).nth(2)),
    ]);

    expect(first.x + first.width).toBeCloseTo(grid.x + grid.width, 0);
    expect(second.x + second.width).toBeCloseTo(first.x, 0);
    expect(third.x + third.width).toBeCloseTo(second.x, 0);
    const cell = await boxOf(bodyCell(root, 0, 0));
    expect(cell.x + cell.width).toBeCloseTo(grid.x + grid.width, 0);
  });
});

test.describe("arrow keys", () => {
  test("in the body, ArrowLeft moves to the next column and ArrowRight back, stopping at the first", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, rtlGrid({}));
    await headers(root).first().focus();
    await page.keyboard.press("ArrowDown");
    await expect(bodyCell(root, 0, 0)).toBeFocused();

    await page.keyboard.press("ArrowLeft");
    await expect(bodyCell(root, 0, 1)).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(bodyCell(root, 0, 0)).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(bodyCell(root, 0, 0)).toBeFocused();
  });

  test("in the header, ArrowLeft moves to the next column and ArrowRight back", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, rtlGrid({}));
    await headers(root).first().focus();

    await page.keyboard.press("ArrowLeft");
    await expect(headers(root).nth(1)).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(headers(root).first()).toBeFocused();
  });

  test("moving focus to a column out of view to the left scrolls it into view", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, rtlGrid({}), { width: 240 });
    await headers(root).first().focus();
    await page.keyboard.press("ArrowDown");
    await expect.poll(() => insideView(root, bodyCell(root, 0, 0))).toBe(true);
    expect(await insideView(root, bodyCell(root, 0, 2))).toBe(false);

    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await expect(bodyCell(root, 0, 2)).toBeFocused();
    await expect.poll(() => insideView(root, bodyCell(root, 0, 2))).toBe(true);

    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await expect(bodyCell(root, 0, 0)).toBeFocused();
    await expect.poll(() => insideView(root, bodyCell(root, 0, 0))).toBe(true);
  });
});

test.describe("column resize", () => {
  test("the handle sits at the column's left edge, and dragging it left widens the column", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, rtlGrid({ resizableColumns: true }));
    const first = headers(root).first();
    const handle = first.locator(".gridkit-header-resize-handle");
    const [cell, grip] = await Promise.all([boxOf(first), boxOf(handle)]);
    expect(grip.x + grip.width / 2).toBeCloseTo(cell.x, -1);

    const start = await pressOn(page, handle);
    await page.mouse.move(start.x - 40, start.y, { steps: 4 });
    await page.mouse.up();

    await expect.poll(() => colWidth(root, 0)).toBeCloseTo(140, 0);
  });

  test("Alt+ArrowLeft widens the focused column and Alt+ArrowRight narrows it", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, rtlGrid({ resizableColumns: true }));
    await headers(root).first().focus();

    await page.keyboard.press("Alt+ArrowLeft");
    await expect.poll(() => colWidth(root, 0)).toBeCloseTo(110, 0);
    await page.keyboard.press("Alt+ArrowRight");
    await page.keyboard.press("Alt+ArrowRight");
    await expect.poll(() => colWidth(root, 0)).toBeCloseTo(90, 0);
  });
});

test.describe("column reorder", () => {
  test("a header dropped on another's right half lands before it, and on the last one's left half after it", async ({
    mount,
    page,
  }) => {
    const events: ColumnOrderEvent[] = [];
    const root = await mountGrid(
      mount,
      rtlGrid({
        reorderableColumns: true,
        onColumnOrderChange: (event) => {
          events.push(event);
        },
      }),
      { width: 900 },
    );

    await pressOn(page, headers(root).nth(0));
    const status = await boxOf(headers(root).nth(2));
    await page.mouse.move(
      status.x + status.width * 0.75,
      status.y + status.height / 2,
      { steps: 5 },
    );
    await expect(headers(root).nth(2)).toHaveClass(/is-drop-before/);
    await page.mouse.up();
    await expect.poll(() => events.length).toBe(1);
    expect(await columnIds(root)).toEqual(["name", "id", "status"]);

    await pressOn(page, headers(root).nth(0));
    const last = await boxOf(headers(root).nth(2));
    await page.mouse.move(
      last.x + last.width * 0.25,
      last.y + last.height / 2,
      { steps: 5 },
    );
    await expect(headers(root).nth(2)).toHaveClass(/is-drop-after/);
    await page.mouse.up();
    await expect.poll(() => events.length).toBe(2);
    expect(await columnIds(root)).toEqual(["id", "status", "name"]);
  });

  test("Ctrl+ArrowLeft moves the focused column later and Ctrl+ArrowRight earlier", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, rtlGrid({ reorderableColumns: true }));
    await headers(root).first().focus();

    await page.keyboard.press("Control+ArrowLeft");
    await expect.poll(() => columnIds(root)).toEqual(["name", "id", "status"]);
    await expect(header(root, "id")).toBeFocused();

    await page.keyboard.press("Control+ArrowRight");
    await expect.poll(() => columnIds(root)).toEqual(["id", "name", "status"]);
  });
});

test.describe("group-by bar", () => {
  test("chips run leftward; Ctrl+ArrowLeft moves one later and Ctrl+ArrowRight earlier", async ({
    mount,
  }) => {
    const events: GroupByEvent[] = [];
    const root = await mountGrid(
      mount,
      rtlGrid({
        defaultGroupBy: [{ columnId: "id" }, { columnId: "status" }],
        groupByBarVisibility: "always",
        onGroupByChange: (event) => {
          events.push(event);
        },
      }),
    );
    const chips = root.locator(".gridkit-group-by-chip");
    const [firstChip, secondChip] = await Promise.all([
      boxOf(chips.nth(0)),
      boxOf(chips.nth(1)),
    ]);
    expect(secondChip.x).toBeLessThan(firstChip.x);

    await chips.nth(0).focus();
    await chips.nth(0).press("Control+ArrowLeft");
    await expect.poll(() => events.length).toBe(1);
    expect(events[0]?.groupBy.map((entry) => entry.columnId)).toEqual([
      "status",
      "id",
    ]);

    await chips.nth(1).focus();
    await chips.nth(1).press("Control+ArrowRight");
    await expect.poll(() => events.length).toBe(2);
    expect(events[1]?.groupBy.map((entry) => entry.columnId)).toEqual([
      "id",
      "status",
    ]);
  });
});

test.describe("menus and panels", () => {
  test("a header's menu lines up with the header's right edge and takes its direction from the wrapper", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <RightToLeft>
        <ContextMenuGrid />
      </RightToLeft>,
    );
    const name = header(root, "Name");
    await name.focus();
    await name.press("Shift+F10");

    const menu = page.getByRole("menu", { name: "Name column menu" });
    await expect(
      menu.locator("[data-gridkit-menu-item]").first(),
    ).toBeFocused();
    const overlay = page.locator(".gridkit-overlay");
    await expect(overlay).toHaveAttribute("dir", "rtl");
    await expect(overlay).toHaveAttribute(
      "data-gridkit-placement",
      "bottom-start",
    );
    const [cell, panel] = await Promise.all([boxOf(name), boxOf(overlay)]);
    expect(panel.x + panel.width).toBeCloseTo(cell.x + cell.width, 0);
    expect(panel.y).toBeCloseTo(cell.y + cell.height + ANCHOR_GAP, 0);
  });

  test("ArrowLeft opens a submenu to the left of its item, and ArrowRight closes it", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <RightToLeft>
        <ContextMenuGrid />
      </RightToLeft>,
      // Room on the left for the submenu to open into.
      { width: 900 },
    );
    const name = header(root, "Name");
    await name.focus();
    await name.press("Shift+F10");
    const menu = page.getByRole("menu", { name: "Name column menu" });
    const view = item(menu, "View");
    const submenu = page.getByRole("menu", { name: "View" });
    await expect(
      menu.locator("[data-gridkit-menu-item]").first(),
    ).toBeFocused();

    await page.keyboard.press("End");
    await page.keyboard.press("ArrowUp");
    await expect(view).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(submenu).toHaveCount(0);

    await page.keyboard.press("ArrowLeft");
    await expect(item(submenu, "Compact rows")).toBeFocused();
    const [parent, child] = await Promise.all([boxOf(menu), boxOf(submenu)]);
    expect(Math.round(child.x + child.width)).toBeLessThanOrEqual(
      Math.round(parent.x + 1),
    );

    await page.keyboard.press("ArrowRight");
    await expect(submenu).toHaveCount(0);
    await expect(view).toBeFocused();
  });

  test("a column's filter menu opens below its header, lined up with its right edge", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <RightToLeft>
        <FilterMenuGrid />
      </RightToLeft>,
    );
    const name = header(root, "Name");
    await name.locator(".gridkit-header-filter-toggle").click();

    await expect(
      page.getByRole("dialog", { name: "Name filter" }),
    ).toBeVisible();
    const overlay = page.locator(".gridkit-overlay");
    await expect(overlay).toHaveAttribute("dir", "rtl");
    const [cell, panel] = await Promise.all([boxOf(name), boxOf(overlay)]);
    expect(panel.x + panel.width).toBeCloseTo(cell.x + cell.width, 0);
    expect(panel.y).toBeCloseTo(cell.y + cell.height + ANCHOR_GAP, 0);
  });

  test("a panel opened with nothing to anchor to opens at the grid's top-left corner", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <RightToLeft>
        <ImperativeApiGrid
          columns={columns}
          dataSource={buildRows(3)}
          label="Choose columns"
        />
      </RightToLeft>,
    );
    // From the keyboard: WebKit, as Safari does, leaves a clicked button
    // without focus.
    await root
      .getByRole("button", { name: "open-column-chooser" })
      .press("Enter");

    const chooser = page.getByRole("dialog", { name: "Columns" });
    await expect(
      chooser.getByRole("searchbox", { name: "Search columns" }),
    ).toBeFocused();
    const [panel, grid] = await Promise.all([
      boxOf(chooser),
      boxOf(viewport(root)),
    ]);
    expect(panel.x).toBeCloseTo(grid.x, 0);
    expect(panel.y).toBeCloseTo(grid.y, 0);
  });
});

test.describe("toolbar", () => {
  function gridToolbar(root: MountResult): Locator {
    return root.getByRole("toolbar", { name: "Grid toolbar" });
  }

  function toolbarButton(root: MountResult, name: string): Locator {
    return gridToolbar(root).getByRole("button", { name, exact: true });
  }

  test("moves into More what it does in a left-to-right page, with More at the left end", async ({
    mount,
  }) => {
    // At 520px, left to right, the search box, the separator, "Clear all
    // sorting" and the custom entry fit beside "More"; the rest do not.
    const root = await mountGrid(
      mount,
      <RightToLeft>
        <ToolbarGrid />
      </RightToLeft>,
      { width: 520 },
    );
    const toolbar = gridToolbar(root);
    const more = toolbarButton(root, "More");
    await expect(more).toBeVisible();

    expect(
      await toolbar
        .locator("[data-gridkit-toolbar-item]")
        .evaluateAll((entries) =>
          entries.map((entry) =>
            entry.getAttribute("data-gridkit-toolbar-item"),
          ),
        ),
    ).toEqual(["search", "separator-1", "sort.clearAll", "status", "more"]);
    const [bar, button, status] = await Promise.all([
      boxOf(toolbar),
      boxOf(more),
      boxOf(toolbarButton(root, "status: roomy")),
    ]);
    expect(button.x).toBeGreaterThanOrEqual(bar.x);
    expect(button.x + button.width).toBeLessThanOrEqual(status.x);
  });

  test("ArrowLeft moves to the next control and ArrowRight back", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <RightToLeft>
        <ToolbarGrid />
      </RightToLeft>,
      { width: 900 },
    );
    const search = gridToolbar(root).getByRole("searchbox", { name: "Search" });
    await search.focus();

    await page.keyboard.press("ArrowLeft");
    await expect(toolbarButton(root, "Clear all sorting")).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(search).toBeFocused();
  });
});
