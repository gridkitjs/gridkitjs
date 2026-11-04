// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import type { Locator, Page } from "@playwright/test";
import type { MountResult } from "@playwright/experimental-ct-react";
import { expect, test } from "./support/coverage";
import FilterMenuGrid from "./support/FilterMenuGrid";
import { mountGrid, updateGrid } from "./support/mountGrid";

/** DataGrid's space between a menu or panel and what it opens below. */
const ANCHOR_GAP = 4;

function header(root: MountResult, name: string): Locator {
  return root.getByRole("columnheader", { name, exact: true });
}

/** A column's filter menu, which renders into `document.body`, outside `root`. */
function filterMenuOf(page: Page, columnName: string): Locator {
  return page.getByRole("dialog", { name: `${columnName} filter` });
}

function button(menu: Locator, name: string): Locator {
  return menu.getByRole("button", { name, exact: true });
}

function names(root: MountResult): Promise<string[]> {
  return root.locator("tbody tr td:nth-child(2)").allTextContents();
}

/** Right-clicks a header and waits for its context menu. */
async function headerMenuOf(
  root: MountResult,
  page: Page,
  columnName: string,
): Promise<Locator> {
  await header(root, columnName).click({ button: "right" });
  const menu = page.getByRole("menu", { name: `${columnName} column menu` });
  await expect(menu).toBeVisible();
  return menu;
}

/** Opens a column's filter menu from "Filter…" in its header's context menu. */
async function openFromHeaderMenu(
  root: MountResult,
  page: Page,
  columnName: string,
): Promise<Locator> {
  const menu = await headerMenuOf(root, page, columnName);
  await menu.getByRole("menuitem", { name: "Filter…" }).click();
  const filterMenu = filterMenuOf(page, columnName);
  await expect(filterMenu).toBeVisible();
  return filterMenu;
}

test.describe("filter menu", () => {
  test("the header menu offers Filter… and Clear filter on a column with a filter menu only", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, <FilterMenuGrid />);

    let menu = await headerMenuOf(root, page, "Name");
    await expect(menu.locator("[data-gridkit-menu-item]")).toHaveText([
      "Sort ascending",
      "Sort descending",
      "Clear sort",
      "Filter…",
      "Clear filter",
      "Hide column",
      "Choose columns",
    ]);
    await expect(
      menu.getByRole("menuitem", { name: "Clear filter" }),
    ).toHaveAttribute("aria-disabled", "true");
    await page.keyboard.press("Escape");

    menu = await headerMenuOf(root, page, "Id");
    await expect(menu.getByRole("menuitem", { name: "Filter…" })).toHaveCount(
      0,
    );
    await expect(
      menu.getByRole("menuitem", { name: "Clear filter" }),
    ).toHaveCount(0);
  });

  test("Filter… opens the column's filter menu below its header, on its first control", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, <FilterMenuGrid />);
    const filterMenu = await openFromHeaderMenu(root, page, "Name");

    await expect(filterMenu).toHaveClass("gridkit-filter-menu");
    await expect(button(filterMenu, "Sort ascending")).toBeFocused();
    const overlay = page.locator(".gridkit-overlay");
    await expect(overlay).toHaveAttribute(
      "data-gridkit-placement",
      "bottom-start",
    );
    const [cell, panel] = await Promise.all([
      header(root, "Name").boundingBox(),
      overlay.boundingBox(),
    ]);
    if (cell === null || panel === null) throw new Error("not visible");
    expect(panel.x).toBeCloseTo(cell.x, 0);
    expect(panel.y).toBeCloseTo(cell.y + cell.height + ANCHOR_GAP, 0);
  });

  test("Tab and Shift+Tab cycle inside it, past its disabled buttons", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, <FilterMenuGrid />);
    const filterMenu = await openFromHeaderMenu(root, page, "Name");

    await expect(button(filterMenu, "Clear sort")).toBeDisabled();
    await expect(button(filterMenu, "Clear filter")).toBeDisabled();
    for (const name of ["Sort descending", "Cancel", "OK", "Sort ascending"]) {
      await page.keyboard.press("Tab");
      await expect(button(filterMenu, name)).toBeFocused();
    }
    await page.keyboard.press("Shift+Tab");
    await expect(button(filterMenu, "OK")).toBeFocused();
    await expect(filterMenu).toBeVisible();
  });

  test("Escape closes it unapplied, giving focus back to the header", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, <FilterMenuGrid />);
    const filterMenu = await openFromHeaderMenu(root, page, "Name");

    await page.keyboard.press("Escape");

    await expect(filterMenu).toHaveCount(0);
    await expect(header(root, "Name")).toBeFocused();
    await expect(root.getByTestId("filter")).toHaveText("");
  });

  test("Cancel and OK close it, giving focus back to the header", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, <FilterMenuGrid />);

    let filterMenu = await openFromHeaderMenu(root, page, "Name");
    await button(filterMenu, "Cancel").click();
    await expect(filterMenu).toHaveCount(0);
    await expect(header(root, "Name")).toBeFocused();

    filterMenu = await openFromHeaderMenu(root, page, "Name");
    await button(filterMenu, "OK").click();
    await expect(filterMenu).toHaveCount(0);
    await expect(header(root, "Name")).toBeFocused();
    await expect(root.getByTestId("filter")).toHaveText("");
  });

  test("a click outside closes it", async ({ mount, page }) => {
    const root = await mountGrid(mount, <FilterMenuGrid />);
    const filterMenu = await openFromHeaderMenu(root, page, "Name");

    await root.getByTestId("commands").click({ force: true });

    await expect(filterMenu).toHaveCount(0);
  });

  test("a sort entry sorts the column, reports it as the filter menu's, and closes it", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, <FilterMenuGrid />);
    const heard = root.getByTestId("commands");

    let filterMenu = await openFromHeaderMenu(root, page, "Name");
    await expect(button(filterMenu, "Sort ascending")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await button(filterMenu, "Sort descending").click();

    await expect(filterMenu).toHaveCount(0);
    await expect(header(root, "Name")).toBeFocused();
    expect(await names(root)).toEqual(["Charlie", "Bravo", "Alice"]);
    // "Filter…" itself ran from the context menu.
    await expect(heard).toHaveText(
      [
        'contextMenu filter.open {"area":"header","columnId":"name"}',
        'filterMenu sort.descending {"area":"header","columnId":"name"}',
      ].join("; "),
    );

    filterMenu = await openFromHeaderMenu(root, page, "Name");
    await expect(button(filterMenu, "Sort descending")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await button(filterMenu, "Clear sort").click();

    expect(await names(root)).toEqual(["Charlie", "Alice", "Bravo"]);
    await expect(heard).toContainText(
      'filterMenu sort.clear {"area":"header","columnId":"name"}',
    );
  });

  test("a column that cannot sort offers no sort entries", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, <FilterMenuGrid />);
    const filterMenu = await openFromHeaderMenu(root, page, "Score");

    await expect(button(filterMenu, "Sort ascending")).toHaveCount(0);
    await expect(filterMenu.locator(".filter-menu-sort")).toHaveCount(0);
    // "Clear filter" is disabled, so focus starts on the first enabled button.
    await expect(button(filterMenu, "Cancel")).toBeFocused();
  });

  test("Clear filter takes out the column's filter, keeping the rest, reports it and closes", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <FilterMenuGrid
        defaultFilter={[
          { columnId: "name", operator: "eq", value: "Charlie" },
          { columnId: "score", operator: "gt", value: 10 },
        ]}
      />,
    );
    expect(await names(root)).toEqual(["Charlie"]);

    const filterMenu = await openFromHeaderMenu(root, page, "Name");
    await button(filterMenu, "Clear filter").click();

    await expect(filterMenu).toHaveCount(0);
    await expect(header(root, "Name")).toBeFocused();
    expect(await names(root)).toEqual(["Charlie", "Bravo"]);
    await expect(root.getByTestId("filter")).toHaveText(
      '[{"columnId":"score","operator":"gt","value":10}]',
    );
    await expect(root.getByTestId("commands")).toContainText(
      'filterMenu filter.clear {"area":"header","columnId":"name"}',
    );
  });

  test("Clear filter in the header menu clears the column's filter too", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <FilterMenuGrid
        defaultFilter={[{ columnId: "name", operator: "eq", value: "Alice" }]}
      />,
    );

    const menu = await headerMenuOf(root, page, "Name");
    await menu.getByRole("menuitem", { name: "Clear filter" }).click();

    expect(await names(root)).toEqual(["Charlie", "Alice", "Bravo"]);
    await expect(root.getByTestId("commands")).toHaveText(
      'contextMenu filter.clear {"area":"header","columnId":"name"}',
    );
  });

  test("closes once its column no longer has a filter menu", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, <FilterMenuGrid />);
    const filterMenu = await openFromHeaderMenu(root, page, "Name");

    await updateGrid(root, <FilterMenuGrid filterableColumns={false} />);

    await expect(filterMenu).toHaveCount(0);
    await expect(header(root, "Name")).toBeFocused();
  });
});
