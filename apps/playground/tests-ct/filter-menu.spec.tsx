// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import type { Locator, Page } from "@playwright/test";
import type { MountResult } from "@playwright/experimental-ct-react";
import { expect, test } from "./support/coverage";
import FilterMenuGrid from "./support/FilterMenuGrid";
import ImperativeApiGrid from "./support/ImperativeApiGrid";
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

/** A header's filter button — a pointer affordance only, hidden from assistive technology. */
function filterButton(root: MountResult, columnName: string): Locator {
  return header(root, columnName).locator(".header-filter-toggle");
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

    await header(root, "Id").click();

    await expect(filterMenu).toHaveCount(0);
    await expect(header(root, "Id")).toBeFocused();
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

test.describe("filter menu from the header", () => {
  test("a filterable header's button opens its menu, and closes it pressed again", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <FilterMenuGrid selectable={{ columns: "single" }} />,
    );
    const filterMenu = filterMenuOf(page, "Name");

    await expect(filterButton(root, "Id")).toHaveCount(0);
    await expect(filterButton(root, "Name")).toHaveAttribute(
      "aria-hidden",
      "true",
    );

    await filterButton(root, "Name").click();
    await expect(filterMenu).toBeVisible();
    await expect(button(filterMenu, "Sort ascending")).toBeFocused();
    // The button opens the menu without selecting the column.
    await expect(header(root, "Name")).not.toHaveClass(/is-selected/);

    await filterButton(root, "Name").click();
    await expect(filterMenu).toHaveCount(0);
  });

  test("a press on another header's button opens that header's menu in its place", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, <FilterMenuGrid />);

    await filterButton(root, "Name").click();
    await expect(filterMenuOf(page, "Name")).toBeVisible();
    await filterButton(root, "Score").click();

    await expect(filterMenuOf(page, "Score")).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(1);
  });

  test("Alt+Shift+ArrowDown on a focused header opens its filter menu; a header without one ignores it", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, <FilterMenuGrid />);
    const name = header(root, "Name");

    await expect(name).toHaveAttribute(
      "aria-keyshortcuts",
      "Alt+ArrowUp Alt+Shift+ArrowDown Shift+F10",
    );
    await name.focus();
    await name.press("Alt+Shift+ArrowDown");

    const filterMenu = filterMenuOf(page, "Name");
    await expect(button(filterMenu, "Sort ascending")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(name).toBeFocused();

    const id = header(root, "Id");
    await expect(id).toHaveAttribute(
      "aria-keyshortcuts",
      "Alt+ArrowUp Shift+F10",
    );
    await id.focus();
    await id.press("Alt+Shift+ArrowDown");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(id).toBeFocused();
  });

  test("Alt+ArrowDown still groups, and Alt+Shift+ArrowDown no longer does", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, <FilterMenuGrid groupableColumns />);
    const id = header(root, "Id");

    // Groupable, with no filter menu: Shift makes the key mean nothing.
    await id.focus();
    await id.press("Alt+Shift+ArrowDown");
    await expect(root.getByRole("grid")).toBeVisible();

    const name = header(root, "Name");
    await name.focus();
    await name.press("Alt+Shift+ArrowDown");
    await expect(filterMenuOf(page, "Name")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(root.getByRole("grid")).toBeVisible();

    await name.press("Alt+ArrowDown");
    await expect(root.getByRole("treegrid")).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("the button and the header's description show the column filtered as setFilter changes it", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <ImperativeApiGrid
        columns={[{ field: "id" }, { field: "name" }]}
        dataSource={[
          { id: "row-0", name: "Ada" },
          { id: "row-1", name: "Grace" },
        ]}
        label="Filtered headers"
        filterableColumns
        filterToSet={[{ columnId: "name", operator: "contains", value: "a" }]}
      />,
    );
    const name = header(root, "name");

    await expect(filterButton(root, "name")).not.toHaveClass(/is-filtered/);
    await expect(name).not.toHaveAttribute("aria-description");

    await root.getByRole("button", { name: "set-filter" }).click();

    await expect(filterButton(root, "name")).toHaveClass(
      "header-filter-toggle is-filtered",
    );
    await expect(name).toHaveAttribute("aria-description", "Filtered");
    await expect(header(root, "id")).not.toHaveAttribute("aria-description");
    await expect(filterButton(root, "id")).not.toHaveClass(/is-filtered/);
  });

  test("the filtered state follows a controlled filter", async ({ mount }) => {
    const root = await mountGrid(
      mount,
      <FilterMenuGrid
        filter={[{ columnId: "score", operator: "gt", value: 10 }]}
      />,
    );

    await expect(filterButton(root, "Score")).toHaveClass(/is-filtered/);
    await expect(header(root, "Score")).toHaveAttribute(
      "aria-description",
      "Filtered",
    );

    await updateGrid(root, <FilterMenuGrid filter={[]} />);

    await expect(filterButton(root, "Score")).not.toHaveClass(/is-filtered/);
    await expect(header(root, "Score")).not.toHaveAttribute("aria-description");
  });

  test("a column filtered in code with no filter menu shows no filtered state", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <FilterMenuGrid
        defaultFilter={[{ columnId: "id", operator: "eq", value: "row-a" }]}
      />,
    );

    expect(await names(root)).toEqual(["Alice"]);
    await expect(header(root, "Id")).not.toHaveAttribute("aria-description");
  });
});
