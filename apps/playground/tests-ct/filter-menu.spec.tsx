// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import type { Locator, Page } from "@playwright/test";
import type { MountResult } from "@playwright/experimental-ct-react";
import type { FilterState } from "@gridkitjs/core";
import { DataGrid } from "@gridkitjs/react";
import { expect, test } from "./support/coverage";
import FilterMenuGrid, { type FilterMenuRow } from "./support/FilterMenuGrid";
import HundredThousandRowsGrid from "./support/HundredThousandRowsGrid";
import ImperativeApiGrid from "./support/ImperativeApiGrid";
import ManyValuesGrid from "./support/ManyValuesGrid";
import PresetGrid from "./support/PresetGrid";
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

/** One of the simple editor's conditions, by its place from one. */
function condition(menu: Locator, position: number): Locator {
  return menu.getByRole("group", { name: `Condition ${String(position)}` });
}

function operatorOf(menu: Locator, position: number): Locator {
  return condition(menu, position).getByLabel("Operator", { exact: true });
}

/** A condition's value box — or, named "From" or "To", a `between`'s end. */
function valueOf(menu: Locator, position: number, name = "Value"): Locator {
  return condition(menu, position).getByLabel(name, { exact: true });
}

/** A header's filter button — a pointer affordance only, hidden from assistive technology. */
function filterButton(root: MountResult, columnName: string): Locator {
  return header(root, columnName).locator(".header-filter-toggle");
}

function names(root: MountResult): Promise<string[]> {
  return root.locator("tbody tr td:nth-child(2)").allTextContents();
}

/** What `onFilterChange` last reported, as JSON; empty before any change. */
function reported(root: MountResult): Locator {
  return root.getByTestId("filter");
}

/** The grid's live region, which announcements are read from. */
function liveRegion(root: MountResult): Locator {
  return root.locator('[role="status"]').first();
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

  test("Filter… opens the column's filter menu below its header, on its first condition's value", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, <FilterMenuGrid />);
    const filterMenu = await openFromHeaderMenu(root, page, "Name");

    await expect(filterMenu).toHaveClass("gridkit-filter-menu");
    await expect(valueOf(filterMenu, 1)).toBeFocused();
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
    await expect(valueOf(filterMenu, 1)).toBeFocused();
    for (const control of [
      filterMenu.getByRole("radio", { name: "And" }),
      operatorOf(filterMenu, 2),
      valueOf(filterMenu, 2),
      button(filterMenu, "Cancel"),
      button(filterMenu, "OK"),
      button(filterMenu, "Sort ascending"),
    ]) {
      await page.keyboard.press("Tab");
      await expect(control).toBeFocused();
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
    await expect(valueOf(filterMenu, 1)).toBeFocused();
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
    await expect(valueOf(filterMenu, 1)).toBeFocused();
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
    await expect(valueOf(filterMenu, 1)).toBeFocused();
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

test.describe("the simple editor", () => {
  test("opens on two empty conditions, the first offering the column's operators in its type's words", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, <FilterMenuGrid />);
    const filterMenu = await openFromHeaderMenu(root, page, "Joined");

    await expect(operatorOf(filterMenu, 1)).toHaveValue("eq");
    await expect(operatorOf(filterMenu, 1).locator("option")).toHaveText([
      "Equals",
      "Does not equal",
      "Before",
      "After",
      "Between",
      "Is blank",
      "Is not blank",
    ]);
    await expect(valueOf(filterMenu, 1)).toHaveAttribute("type", "date");
    await expect(valueOf(filterMenu, 1)).toHaveValue("");
    await expect(valueOf(filterMenu, 2)).toHaveValue("");
    await expect(filterMenu.getByRole("radio", { name: "And" })).toBeChecked();
    await expect(filterMenu.getByText("Custom filter")).toHaveCount(0);
  });

  test("Enter in a text condition applies it, closing the menu", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, <FilterMenuGrid />);
    const filterMenu = await openFromHeaderMenu(root, page, "Name");

    await valueOf(filterMenu, 1).fill("li");
    await page.keyboard.press("Enter");

    await expect(filterMenu).toHaveCount(0);
    await expect(header(root, "Name")).toBeFocused();
    expect(await names(root)).toEqual(["Charlie", "Alice"]);
    await expect(reported(root)).toHaveText(
      '[{"columnId":"name","operator":"contains","value":"li"}]',
    );
  });

  test("applying announces how many of the rows the filter keeps", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, <FilterMenuGrid />);
    const filterMenu = await openFromHeaderMenu(root, page, "Name");

    await valueOf(filterMenu, 1).fill("li");
    await page.keyboard.press("Enter");

    await expect(filterMenu).toHaveCount(0);
    await expect(liveRegion(root)).toHaveText("2 of 3 rows");
  });

  test("a controlled filter that doesn't take what was applied announces nothing", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, <FilterMenuGrid filter={[]} />);
    const filterMenu = await openFromHeaderMenu(root, page, "Name");

    await valueOf(filterMenu, 1).fill("li");
    await page.keyboard.press("Enter");

    await expect(reported(root)).toHaveText(
      '[{"columnId":"name","operator":"contains","value":"li"}]',
    );
    expect(await names(root)).toEqual(["Charlie", "Alice", "Bravo"]);
    await expect(liveRegion(root)).toHaveText("");
  });

  test("Enter on a picker applies too", async ({ mount, page }) => {
    const root = await mountGrid(mount, <FilterMenuGrid />);
    const filterMenu = await openFromHeaderMenu(root, page, "Active");

    await valueOf(filterMenu, 1).selectOption({ label: "true" });
    await operatorOf(filterMenu, 1).press("Enter");

    await expect(filterMenu).toHaveCount(0);
    expect(await names(root)).toEqual(["Charlie", "Bravo"]);
  });

  test("Between takes a number at each end", async ({ mount, page }) => {
    const root = await mountGrid(mount, <FilterMenuGrid />);
    const filterMenu = await openFromHeaderMenu(root, page, "Score");

    await expect(valueOf(filterMenu, 1)).toHaveAttribute("type", "number");
    await operatorOf(filterMenu, 1).selectOption({ label: "Between" });
    await expect(valueOf(filterMenu, 1)).toHaveCount(0);
    await valueOf(filterMenu, 1, "From").fill("10");
    await valueOf(filterMenu, 1, "To").fill("25");
    await button(filterMenu, "OK").click();

    expect(await names(root)).toEqual(["Bravo"]);
    await expect(reported(root)).toHaveText(
      '[{"columnId":"score","operator":"between","value":[10,25]}]',
    );
  });

  test("a date condition reads the day its box holds", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, <FilterMenuGrid />);
    const filterMenu = await openFromHeaderMenu(root, page, "Joined");

    await operatorOf(filterMenu, 1).selectOption({ label: "Before" });
    await valueOf(filterMenu, 1).fill("2024-01-01");
    await button(filterMenu, "OK").click();

    expect(await names(root)).toEqual(["Alice"]);
    await expect(reported(root)).toContainText('"operator":"lt"');
  });

  test("a boolean condition picks true or false", async ({ mount, page }) => {
    const root = await mountGrid(mount, <FilterMenuGrid />);
    const filterMenu = await openFromHeaderMenu(root, page, "Active");

    await expect(valueOf(filterMenu, 1).locator("option")).toHaveText([
      "",
      "true",
      "false",
    ]);
    await valueOf(filterMenu, 1).selectOption({ label: "false" });
    await button(filterMenu, "OK").click();

    expect(await names(root)).toEqual(["Alice"]);
    await expect(reported(root)).toHaveText(
      '[{"columnId":"active","operator":"eq","value":false}]',
    );
  });

  test("Is blank takes no value", async ({ mount, page }) => {
    const root = await mountGrid(mount, <FilterMenuGrid />);
    const filterMenu = await openFromHeaderMenu(root, page, "Joined");

    await operatorOf(filterMenu, 1).selectOption({ label: "Is blank" });
    await expect(valueOf(filterMenu, 1)).toHaveCount(0);
    await button(filterMenu, "OK").click();

    expect(await names(root)).toEqual(["Bravo"]);
    await expect(reported(root)).toHaveText(
      '[{"columnId":"joined","operator":"isEmpty"}]',
    );
  });

  test("a date-time column's box takes a day and a time", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <DataGrid
        label="Visits"
        filterableColumns
        columns={[
          { field: "id", header: "Id" },
          { field: "seen", header: "Seen", type: "dateTime" },
        ]}
        dataSource={[
          { id: "morning", seen: "2024-05-20T09:30" },
          { id: "afternoon", seen: "2024-05-20T14:00" },
        ]}
      />,
    );
    await filterButton(root, "Seen").click();
    const filterMenu = filterMenuOf(page, "Seen");

    await expect(operatorOf(filterMenu, 1)).toHaveValue("lt");
    await expect(valueOf(filterMenu, 1)).toHaveAttribute(
      "type",
      "datetime-local",
    );
    await valueOf(filterMenu, 1).fill("2024-05-20T12:00");
    await button(filterMenu, "OK").click();

    await expect(root.locator("tbody tr td:first-child")).toHaveText([
      "morning",
    ]);
  });

  test("two conditions join with Or, and open again as applied", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, <FilterMenuGrid />);
    let filterMenu = await openFromHeaderMenu(root, page, "Name");

    await valueOf(filterMenu, 1).fill("Ch");
    await filterMenu.getByRole("radio", { name: "Or" }).check();
    await operatorOf(filterMenu, 2).selectOption({ label: "Starts with" });
    await valueOf(filterMenu, 2).fill("Al");
    await button(filterMenu, "OK").click();

    expect(await names(root)).toEqual(["Charlie", "Alice"]);
    await expect(reported(root)).toHaveText(
      JSON.stringify([
        {
          combinator: "or",
          entries: [
            { columnId: "name", operator: "contains", value: "Ch" },
            { columnId: "name", operator: "startsWith", value: "Al" },
          ],
        },
      ]),
    );

    filterMenu = await openFromHeaderMenu(root, page, "Name");
    await expect(operatorOf(filterMenu, 1)).toHaveValue("contains");
    await expect(valueOf(filterMenu, 1)).toHaveValue("Ch");
    await expect(filterMenu.getByRole("radio", { name: "Or" })).toBeChecked();
    await expect(operatorOf(filterMenu, 2)).toHaveValue("startsWith");
    await expect(valueOf(filterMenu, 2)).toHaveValue("Al");
  });

  test("a filter from defaultFilter opens filled in", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <FilterMenuGrid
        defaultFilter={[{ columnId: "score", operator: "gt", value: 10 }]}
      />,
    );
    const filterMenu = await openFromHeaderMenu(root, page, "Score");

    await expect(operatorOf(filterMenu, 1)).toHaveValue("gt");
    await expect(valueOf(filterMenu, 1)).toHaveValue("10");
    await expect(operatorOf(filterMenu, 2)).toHaveValue("eq");
    await expect(valueOf(filterMenu, 2)).toHaveValue("");
  });

  test("a condition's operator the column doesn't offer is listed for it", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <FilterMenuGrid
        defaultFilter={[{ columnId: "name", operator: "gt", value: "B" }]}
      />,
    );
    const filterMenu = await openFromHeaderMenu(root, page, "Name");

    await expect(operatorOf(filterMenu, 1)).toHaveValue("gt");
    await expect(
      operatorOf(filterMenu, 1).locator("option").first(),
    ).toHaveText("Greater than");
    await expect(
      operatorOf(filterMenu, 2).getByRole("option", { name: "Greater than" }),
    ).toHaveCount(0);
  });

  test("focus starts on the operator of a first condition that takes no value", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <FilterMenuGrid
        defaultFilter={[{ columnId: "joined", operator: "isNotEmpty" }]}
      />,
    );
    const filterMenu = await openFromHeaderMenu(root, page, "Joined");

    await expect(operatorOf(filterMenu, 1)).toBeFocused();
  });

  test("a condition missing its value keeps the menu open, marked and focused, until it is filled in", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, <FilterMenuGrid />);
    const filterMenu = await openFromHeaderMenu(root, page, "Score");

    await operatorOf(filterMenu, 1).selectOption({ label: "Greater than" });
    await button(filterMenu, "OK").click();

    await expect(filterMenu).toBeVisible();
    await expect(valueOf(filterMenu, 1)).toBeFocused();
    await expect(valueOf(filterMenu, 1)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expect(valueOf(filterMenu, 1)).toHaveAccessibleDescription(
      "Enter a number",
    );
    await expect(valueOf(filterMenu, 2)).not.toHaveAttribute("aria-invalid");
    await expect(reported(root)).toHaveText("");

    await valueOf(filterMenu, 1).fill("20");
    await expect(valueOf(filterMenu, 1)).not.toHaveAttribute("aria-invalid");
    await expect(filterMenu.getByText("Enter a number")).toHaveCount(0);
    await page.keyboard.press("Enter");

    await expect(filterMenu).toHaveCount(0);
    expect(await names(root)).toEqual(["Charlie", "Bravo"]);
  });

  test("a number the box can't read marks its condition, even the optional second", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, <FilterMenuGrid />);
    const filterMenu = await openFromHeaderMenu(root, page, "Score");

    await valueOf(filterMenu, 1).fill("9");
    await valueOf(filterMenu, 2).pressSequentially("1e");
    await button(filterMenu, "OK").click();

    await expect(valueOf(filterMenu, 2)).toBeFocused();
    await expect(valueOf(filterMenu, 2)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expect(valueOf(filterMenu, 1)).not.toHaveAttribute("aria-invalid");
    await expect(reported(root)).toHaveText("");
  });

  test("a date missing its year marks its condition, though nothing else was changed", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, <FilterMenuGrid />);
    const filterMenu = await openFromHeaderMenu(root, page, "Joined");

    // The box reports no value, and no change, until the date is whole.
    await page.keyboard.type("0315");
    await page.keyboard.press("Enter");

    await expect(filterMenu).toBeVisible();
    await expect(valueOf(filterMenu, 1)).toHaveAccessibleDescription(
      "Enter a date",
    );
    await expect(reported(root)).toHaveText("");
  });

  test("Between marks only the end left empty", async ({ mount, page }) => {
    const root = await mountGrid(mount, <FilterMenuGrid />);
    const filterMenu = await openFromHeaderMenu(root, page, "Score");

    await operatorOf(filterMenu, 1).selectOption({ label: "Between" });
    await valueOf(filterMenu, 1, "From").fill("10");
    await button(filterMenu, "OK").click();

    await expect(valueOf(filterMenu, 1, "To")).toBeFocused();
    await expect(valueOf(filterMenu, 1, "To")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expect(valueOf(filterMenu, 1, "From")).not.toHaveAttribute(
      "aria-invalid",
    );
  });

  test("a custom filter says so, stays through OK left alone, and is replaced once a condition is applied", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <FilterMenuGrid defaultFilter={[{ columnId: "name", query: "%li%" }]} />,
    );
    expect(await names(root)).toEqual(["Charlie", "Alice"]);

    let filterMenu = await openFromHeaderMenu(root, page, "Name");
    await expect(filterMenu.getByText("Custom filter")).toBeVisible();
    await expect(valueOf(filterMenu, 1)).toHaveValue("");
    await button(filterMenu, "OK").click();
    await expect(filterMenu).toHaveCount(0);
    expect(await names(root)).toEqual(["Charlie", "Alice"]);
    await expect(reported(root)).toHaveText("");

    filterMenu = await openFromHeaderMenu(root, page, "Name");
    await valueOf(filterMenu, 1).fill("Bra");
    await button(filterMenu, "OK").click();

    expect(await names(root)).toEqual(["Bravo"]);
    await expect(reported(root)).toHaveText(
      '[{"columnId":"name","operator":"contains","value":"Bra"}]',
    );
  });

  test("a checklist's values read as a custom filter too", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <FilterMenuGrid
        defaultFilter={[
          { columnId: "name", operator: "in", value: ["Alice", "Bravo"] },
        ]}
      />,
    );
    const filterMenu = await openFromHeaderMenu(root, page, "Name");

    await expect(filterMenu.getByText("Custom filter")).toBeVisible();
    await expect(operatorOf(filterMenu, 1)).toHaveValue("contains");
  });

  test("conditions set in code stay as they are through OK left alone", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <FilterMenuGrid
        defaultFilter={[
          { columnId: "score", operator: "gt", value: 10 },
          { columnId: "score", operator: "lt", value: 25 },
        ]}
      />,
    );
    expect(await names(root)).toEqual(["Bravo"]);

    const filterMenu = await openFromHeaderMenu(root, page, "Score");
    await expect(valueOf(filterMenu, 2)).toHaveValue("25");
    await button(filterMenu, "OK").click();

    await expect(filterMenu).toHaveCount(0);
    expect(await names(root)).toEqual(["Bravo"]);
    await expect(reported(root)).toHaveText("");
  });

  test("a day set in code as a string stays as it is through OK left alone", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <FilterMenuGrid
        defaultFilter={[
          { columnId: "joined", operator: "gt", value: "2024-01-01" },
        ]}
      />,
    );
    expect(await names(root)).toEqual(["Charlie"]);

    const filterMenu = await openFromHeaderMenu(root, page, "Joined");
    await button(filterMenu, "OK").click();

    await expect(filterMenu).toHaveCount(0);
    await expect(reported(root)).toHaveText("");
  });

  test("a value typed and taken out again closes through OK, as Cancel would", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, <FilterMenuGrid />);
    const filterMenu = await openFromHeaderMenu(root, page, "Name");

    await valueOf(filterMenu, 1).fill("li");
    await valueOf(filterMenu, 1).fill("");
    await button(filterMenu, "OK").click();

    await expect(filterMenu).toHaveCount(0);
    expect(await names(root)).toEqual(["Charlie", "Alice", "Bravo"]);
    await expect(reported(root)).toHaveText("");
  });

  test("the column's filter changing while the menu is open shows the new conditions in place of what was typed", async ({
    mount,
    page,
  }) => {
    const grid = (filter: FilterState<FilterMenuRow>) => (
      <FilterMenuGrid filter={filter} />
    );
    const scoreAbove10 = {
      columnId: "score",
      operator: "gt",
      value: 10,
    } as const;
    const root = await mountGrid(mount, grid([]));
    const filterMenu = await openFromHeaderMenu(root, page, "Name");
    await valueOf(filterMenu, 1).fill("zz");

    // Another column's filter leaves what was typed.
    await updateGrid(root, grid([scoreAbove10]));
    expect(await names(root)).toEqual(["Charlie", "Bravo"]);
    await expect(valueOf(filterMenu, 1)).toHaveValue("zz");

    await updateGrid(
      root,
      grid([
        scoreAbove10,
        { columnId: "name", operator: "startsWith", value: "Br" },
      ]),
    );
    await expect(filterMenu).toBeVisible();
    await expect(operatorOf(filterMenu, 1)).toHaveValue("startsWith");
    await expect(valueOf(filterMenu, 1)).toHaveValue("Br");
    await expect(valueOf(filterMenu, 1)).toBeFocused();
    await button(filterMenu, "OK").click();
    await expect(filterMenu).toHaveCount(0);
    await expect(reported(root)).toHaveText("");
  });

  test("Cancel drops what was typed", async ({ mount, page }) => {
    const root = await mountGrid(mount, <FilterMenuGrid />);
    let filterMenu = await openFromHeaderMenu(root, page, "Name");

    await valueOf(filterMenu, 1).fill("li");
    await button(filterMenu, "Cancel").click();

    expect(await names(root)).toEqual(["Charlie", "Alice", "Bravo"]);
    filterMenu = await openFromHeaderMenu(root, page, "Name");
    await expect(valueOf(filterMenu, 1)).toHaveValue("");
  });
});

test.describe("the excel editor", () => {
  function searchOf(menu: Locator): Locator {
    return menu.getByRole("searchbox", { name: "Search values" });
  }

  function selectAllOf(menu: Locator): Locator {
    return menu.getByRole("checkbox", { name: "Select all" });
  }

  function checklistOf(menu: Locator): Locator {
    return menu.getByRole("listbox", { name: "Values" });
  }

  /** Every option the list has mounted, in order. */
  function optionsOf(menu: Locator): Locator {
    return checklistOf(menu).getByRole("option");
  }

  function option(menu: Locator, name: string): Locator {
    return checklistOf(menu).getByRole("option", { name, exact: true });
  }

  /** Opens a column's filter menu from its header's filter button. */
  async function openFromButton(
    root: MountResult,
    page: Page,
    columnName: string,
  ): Promise<Locator> {
    await filterButton(root, columnName).click();
    const filterMenu = filterMenuOf(page, columnName);
    await expect(filterMenu).toBeVisible();
    return filterMenu;
  }

  /** The menu of conditions a "… filters" button opens, outside the filter menu. */
  function operatorMenuOf(page: Page, name: string): Locator {
    return page.getByRole("menu", { name });
  }

  test("opens on the column's values in its sort order, labelled as its cells print, every one checked", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <FilterMenuGrid filterMenu={{ ui: "excel" }} />,
    );

    let filterMenu = await openFromHeaderMenu(root, page, "Name");
    await expect(searchOf(filterMenu)).toBeFocused();
    await expect(searchOf(filterMenu)).toHaveAttribute(
      "placeholder",
      "Search…",
    );
    await expect(checklistOf(filterMenu)).toHaveAttribute(
      "aria-multiselectable",
      "true",
    );
    await expect(optionsOf(filterMenu)).toHaveText([
      "Alice",
      "Bravo",
      "Charlie",
    ]);
    for (const [index, name] of ["Alice", "Bravo", "Charlie"].entries()) {
      const item = option(filterMenu, name);
      await expect(item).toHaveAttribute("aria-checked", "true");
      await expect(item).toHaveAttribute("aria-setsize", "3");
      await expect(item).toHaveAttribute("aria-posinset", String(index + 1));
    }
    await expect(selectAllOf(filterMenu)).toBeChecked();
    await page.keyboard.press("Escape");

    filterMenu = await openFromHeaderMenu(root, page, "Score");
    await expect(optionsOf(filterMenu)).toHaveText(["9", "21", "30"]);
    await page.keyboard.press("Escape");

    // Charlie's day, Alice's, then Bravo's blank.
    const days = await root
      .locator("tbody tr td:nth-child(4)")
      .allTextContents();
    filterMenu = await openFromHeaderMenu(root, page, "Joined");
    await expect(optionsOf(filterMenu)).toHaveText([
      days[1] ?? "",
      days[0] ?? "",
      "(Blanks)",
    ]);
    await page.keyboard.press("Escape");

    filterMenu = await openFromHeaderMenu(root, page, "Active");
    await expect(optionsOf(filterMenu)).toHaveText(["false", "true"]);
  });

  test("a column's filterMenu.ui picks the excel editor over the grid's", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <DataGrid
        label="Per column"
        columns={[
          { field: "name", header: "Name", filterMenu: { ui: "excel" } },
          { field: "city", header: "City" },
        ]}
        dataSource={[{ name: "Alice", city: "Oslo" }]}
        filterableColumns
      />,
    );

    let filterMenu = await openFromButton(root, page, "Name");
    await expect(optionsOf(filterMenu)).toHaveText(["Alice"]);
    await page.keyboard.press("Escape");

    filterMenu = await openFromButton(root, page, "City");
    await expect(valueOf(filterMenu, 1)).toBeFocused();
    await expect(checklistOf(filterMenu)).toHaveCount(0);
  });

  test("unchecking two values filters, reopening shows them unchecked, and checking every value again takes the filter out", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <FilterMenuGrid filterMenu={{ ui: "excel" }} />,
    );

    let filterMenu = await openFromHeaderMenu(root, page, "Name");
    await option(filterMenu, "Alice").click();
    await option(filterMenu, "Charlie").click();
    await expect(option(filterMenu, "Alice")).toHaveAttribute(
      "aria-checked",
      "false",
    );
    await button(filterMenu, "OK").click();

    await expect(filterMenu).toHaveCount(0);
    expect(await names(root)).toEqual(["Bravo"]);
    await expect(reported(root)).toHaveText(
      '[{"columnId":"name","operator":"in","value":["Bravo"]}]',
    );
    await expect(liveRegion(root)).toHaveText("1 of 3 rows");

    filterMenu = await openFromHeaderMenu(root, page, "Name");
    for (const [name, checked] of [
      ["Alice", "false"],
      ["Bravo", "true"],
      ["Charlie", "false"],
    ] as const) {
      await expect(option(filterMenu, name)).toHaveAttribute(
        "aria-checked",
        checked,
      );
    }
    await expect(selectAllOf(filterMenu)).toHaveJSProperty(
      "indeterminate",
      true,
    );
    await selectAllOf(filterMenu).click();
    await expect(selectAllOf(filterMenu)).toBeChecked();
    await expect(selectAllOf(filterMenu)).toHaveJSProperty(
      "indeterminate",
      false,
    );
    await button(filterMenu, "OK").click();

    await expect(reported(root)).toHaveText("[]");
    expect(await names(root)).toEqual(["Charlie", "Alice", "Bravo"]);
  });

  test("a search narrows the list, and Select all acts on the values it shows", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <FilterMenuGrid filterMenu={{ ui: "excel" }} />,
    );
    const filterMenu = await openFromHeaderMenu(root, page, "Name");

    await selectAllOf(filterMenu).click();
    await expect(selectAllOf(filterMenu)).not.toBeChecked();
    await searchOf(filterMenu).fill("LI");
    await expect(optionsOf(filterMenu)).toHaveText(["Alice", "Charlie"]);
    await expect(option(filterMenu, "Alice")).toHaveAttribute(
      "aria-setsize",
      "2",
    );
    await selectAllOf(filterMenu).click();
    await expect(selectAllOf(filterMenu)).toBeChecked();

    await searchOf(filterMenu).fill("");
    await expect(optionsOf(filterMenu)).toHaveText([
      "Alice",
      "Bravo",
      "Charlie",
    ]);
    await expect(option(filterMenu, "Bravo")).toHaveAttribute(
      "aria-checked",
      "false",
    );
    await expect(selectAllOf(filterMenu)).not.toBeChecked();
    await expect(selectAllOf(filterMenu)).toHaveJSProperty(
      "indeterminate",
      true,
    );

    await searchOf(filterMenu).fill("zz");
    await expect(optionsOf(filterMenu)).toHaveCount(0);
    await expect(selectAllOf(filterMenu)).toBeDisabled();
    await searchOf(filterMenu).press("Enter");

    await expect(filterMenu).toHaveCount(0);
    expect(await names(root)).toEqual(["Charlie", "Alice"]);
  });

  test("the arrow keys, Home and End move through the list, Space checks and unchecks, and Enter applies", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <FilterMenuGrid filterMenu={{ ui: "excel" }} />,
    );
    const filterMenu = await openFromHeaderMenu(root, page, "Name");

    await page.keyboard.press("Tab");
    await expect(selectAllOf(filterMenu)).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(option(filterMenu, "Alice")).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(option(filterMenu, "Bravo")).toBeFocused();
    await page.keyboard.press("End");
    await expect(option(filterMenu, "Charlie")).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await expect(option(filterMenu, "Bravo")).toBeFocused();
    await page.keyboard.press("Home");
    await expect(option(filterMenu, "Alice")).toBeFocused();

    await page.keyboard.press("Space");
    await expect(option(filterMenu, "Alice")).toHaveAttribute(
      "aria-checked",
      "false",
    );
    await page.keyboard.press("Space");
    await expect(option(filterMenu, "Alice")).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Space");
    await page.keyboard.press("Enter");

    await expect(filterMenu).toHaveCount(0);
    await expect(header(root, "Name")).toBeFocused();
    expect(await names(root)).toEqual(["Charlie", "Alice"]);
  });

  test("the blanks come last, as an item of their own", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <FilterMenuGrid filterMenu={{ ui: "excel" }} />,
    );
    const days = await root
      .locator("tbody tr td:nth-child(4)")
      .allTextContents();

    let filterMenu = await openFromHeaderMenu(root, page, "Joined");
    await option(filterMenu, "(Blanks)").click();
    await button(filterMenu, "OK").click();

    expect(await names(root)).toEqual(["Charlie", "Alice"]);
    await expect(reported(root)).not.toContainText("isEmpty");

    filterMenu = await openFromHeaderMenu(root, page, "Joined");
    await expect(option(filterMenu, "(Blanks)")).toHaveAttribute(
      "aria-checked",
      "false",
    );
    await option(filterMenu, "(Blanks)").click();
    await option(filterMenu, days[1] ?? "").click();
    await button(filterMenu, "OK").click();

    expect(await names(root)).toEqual(["Charlie", "Bravo"]);
    await expect(reported(root)).toContainText('"combinator":"or"');
    await expect(reported(root)).toContainText(
      '{"columnId":"joined","operator":"isEmpty"}',
    );
  });

  test("showCounts shows how many rows hold each value", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <FilterMenuGrid filterMenu={{ ui: "excel", showCounts: true }} />,
    );

    let filterMenu = await openFromHeaderMenu(root, page, "Active");
    await expect(option(filterMenu, "false 1")).toBeVisible();
    await expect(option(filterMenu, "true 2")).toBeVisible();
    await expect(
      checklistOf(filterMenu).locator(".filter-menu-option-count"),
    ).toHaveText(["1", "2"]);
    await page.keyboard.press("Escape");

    await updateGrid(root, <FilterMenuGrid filterMenu={{ ui: "excel" }} />);
    filterMenu = await openFromHeaderMenu(root, page, "Active");
    await expect(option(filterMenu, "true")).toBeVisible();
    await expect(
      checklistOf(filterMenu).locator(".filter-menu-option-count"),
    ).toHaveCount(0);
  });

  test("the excelFilter preset opens the excel editor with counts, and a prop after it wins", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, <PresetGrid />);

    let filterMenu = await openFromHeaderMenu(root, page, "Active");
    await expect(
      checklistOf(filterMenu).locator(".filter-menu-option-count"),
    ).toHaveText(["1", "2"]);
    await page.keyboard.press("Escape");

    await updateGrid(root, <PresetGrid simpleAfter />);
    filterMenu = await openFromHeaderMenu(root, page, "Active");
    await expect(checklistOf(filterMenu)).toHaveCount(0);
  });

  test("the values cascade from the other columns' filters", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <FilterMenuGrid filterMenu={{ ui: "excel", showCounts: true }} />,
    );

    let filterMenu = await openFromHeaderMenu(root, page, "Active");
    await option(filterMenu, "false 1").click();
    await button(filterMenu, "OK").click();
    expect(await names(root)).toEqual(["Charlie", "Bravo"]);

    filterMenu = await openFromHeaderMenu(root, page, "Name");
    await expect(optionsOf(filterMenu)).toHaveText(["Bravo 1", "Charlie 1"]);
    await page.keyboard.press("Escape");

    // A column's own filter leaves its list whole.
    filterMenu = await openFromHeaderMenu(root, page, "Active");
    await expect(optionsOf(filterMenu)).toHaveText(["false 1", "true 2"]);
  });

  test("the column's filter changing while the menu is open shows the new one in place of what was checked", async ({
    mount,
    page,
  }) => {
    const grid = (filter: FilterState<FilterMenuRow>) => (
      <FilterMenuGrid filterMenu={{ ui: "excel" }} filter={filter} />
    );
    const root = await mountGrid(mount, grid([]));
    const filterMenu = await openFromHeaderMenu(root, page, "Name");
    await option(filterMenu, "Alice").click();

    await updateGrid(
      root,
      grid([{ columnId: "name", operator: "in", value: ["Bravo"] }]),
    );

    await expect(filterMenu).toBeVisible();
    for (const [name, checked] of [
      ["Alice", "false"],
      ["Bravo", "true"],
      ["Charlie", "false"],
    ] as const) {
      await expect(option(filterMenu, name)).toHaveAttribute(
        "aria-checked",
        checked,
      );
    }
    await button(filterMenu, "OK").click();
    await expect(filterMenu).toHaveCount(0);
    await expect(reported(root)).toHaveText("");
  });

  test("Cancel drops what was checked", async ({ mount, page }) => {
    const root = await mountGrid(
      mount,
      <FilterMenuGrid filterMenu={{ ui: "excel" }} />,
    );

    let filterMenu = await openFromHeaderMenu(root, page, "Name");
    await option(filterMenu, "Alice").click();
    await button(filterMenu, "Cancel").click();

    expect(await names(root)).toEqual(["Charlie", "Alice", "Bravo"]);
    filterMenu = await openFromHeaderMenu(root, page, "Name");
    await expect(option(filterMenu, "Alice")).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  test("conditions open with every value checked under a note, and stay through OK until a value changes", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <FilterMenuGrid
        filterMenu={{ ui: "excel" }}
        defaultFilter={[{ columnId: "score", operator: "gt", value: 10 }]}
      />,
    );
    expect(await names(root)).toEqual(["Charlie", "Bravo"]);

    let filterMenu = await openFromHeaderMenu(root, page, "Score");
    await expect(filterMenu.getByText("Filtered by condition")).toBeVisible();
    await expect(optionsOf(filterMenu)).toHaveText(["9", "21", "30"]);
    await expect(selectAllOf(filterMenu)).toBeChecked();
    await button(filterMenu, "OK").click();
    await expect(filterMenu).toHaveCount(0);
    expect(await names(root)).toEqual(["Charlie", "Bravo"]);
    await expect(reported(root)).toHaveText("");

    filterMenu = await openFromHeaderMenu(root, page, "Score");
    await option(filterMenu, "30").click();
    await button(filterMenu, "OK").click();

    expect(await names(root)).toEqual(["Alice", "Bravo"]);
    await expect(reported(root)).toHaveText(
      '[{"columnId":"score","operator":"in","value":[9,21]}]',
    );
  });

  test("a value unchecked and checked again, or every value, leaves a filter set in code be", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <FilterMenuGrid
        filterMenu={{ ui: "excel" }}
        defaultFilter={[{ columnId: "score", operator: "gt", value: 10 }]}
      />,
    );

    const filterMenu = await openFromHeaderMenu(root, page, "Score");
    await option(filterMenu, "9").click();
    await option(filterMenu, "9").click();
    await selectAllOf(filterMenu).click();
    await selectAllOf(filterMenu).click();
    await expect(selectAllOf(filterMenu)).toBeChecked();
    await button(filterMenu, "OK").click();

    await expect(filterMenu).toHaveCount(0);
    expect(await names(root)).toEqual(["Charlie", "Bravo"]);
    await expect(reported(root)).toHaveText("");
  });

  test("a custom filter says so above the checklist, and stays through OK", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <FilterMenuGrid
        filterMenu={{ ui: "excel" }}
        defaultFilter={[{ columnId: "name", query: "%li%" }]}
      />,
    );

    const filterMenu = await openFromHeaderMenu(root, page, "Name");
    await expect(filterMenu.getByText("Custom filter")).toBeVisible();
    await searchOf(filterMenu).fill("a");
    await button(filterMenu, "OK").click();

    await expect(filterMenu).toHaveCount(0);
    expect(await names(root)).toEqual(["Charlie", "Alice"]);
    await expect(reported(root)).toHaveText("");
  });

  test("reopening a column's menu reuses the values it counted, until another column's filter changes them", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, <ManyValuesGrid size={6} />);
    const labels = root.getByTestId("labels");
    const countLabels = root.getByRole("button", { name: "Count the labels" });

    let filterMenu = await openFromButton(root, page, "Value");
    await expect(optionsOf(filterMenu)).toHaveCount(6);
    await page.keyboard.press("Escape");
    await countLabels.click();
    await expect(labels).toHaveText("6");

    filterMenu = await openFromButton(root, page, "Value");
    await expect(optionsOf(filterMenu)).toHaveCount(6);
    await page.keyboard.press("Escape");
    await countLabels.click();
    await expect(labels).toHaveText("6");

    filterMenu = await openFromButton(root, page, "Parity");
    await option(filterMenu, "Even").click();
    await button(filterMenu, "OK").click();
    filterMenu = await openFromButton(root, page, "Value");
    await expect(optionsOf(filterMenu)).toHaveText([
      "Value 00001",
      "Value 00003",
      "Value 00005",
    ]);
    await page.keyboard.press("Escape");
    await countLabels.click();
    await expect(labels).toHaveText("9");
  });

  test("past its value limit the list waits for a search, then lists the first matches and how many more there are", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <ManyValuesGrid size={50} valueLimit={20} />,
    );
    const filterMenu = await openFromButton(root, page, "Value");

    await expect(
      filterMenu.getByText("Type to search 50 values"),
    ).toBeVisible();
    await expect(checklistOf(filterMenu)).toHaveCount(0);
    await expect(selectAllOf(filterMenu)).toBeChecked();

    await searchOf(filterMenu).fill("Value 0000");
    await expect(optionsOf(filterMenu)).toHaveCount(9);
    await expect(filterMenu.getByRole("status")).toHaveCount(0);

    await searchOf(filterMenu).fill("Value 000");
    await expect(filterMenu.getByRole("status")).toHaveText(
      "30 more, refine the search",
    );
    await expect(optionsOf(filterMenu).first()).toHaveAttribute(
      "aria-setsize",
      "20",
    );
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("End");
    const last = option(filterMenu, "Value 00020");
    await expect(last).toBeFocused();
    await expect(last).toHaveAttribute("aria-posinset", "20");
  });

  test("lists 10,000 values by default, windowed, and keeps up with the keyboard", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, <ManyValuesGrid size={20000} />);
    const filterMenu = await openFromButton(root, page, "Value");

    await expect(
      filterMenu.getByText("Type to search 20,000 values"),
    ).toBeVisible();

    await searchOf(filterMenu).fill("Value 1");
    const first = option(filterMenu, "Value 10000");
    await expect(first).toHaveAttribute("aria-setsize", "10000");
    expect(await optionsOf(filterMenu).count()).toBeLessThan(50);

    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await expect(first).toBeFocused();
    await page.keyboard.press("End");
    const last = option(filterMenu, "Value 19999");
    await expect(last).toBeFocused();
    await expect(last).toHaveAttribute("aria-posinset", "10000");
    await page.keyboard.press("Space");
    await expect(last).toHaveAttribute("aria-checked", "false");
    await page.keyboard.press("PageUp");
    await expect(last).not.toBeFocused();
    await page.keyboard.press("Home");
    await expect(first).toBeFocused();
  });

  test("the operator submenu, opened by the keyboard, shows the condition chosen in place of the checklist, and OK applies it", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <FilterMenuGrid filterMenu={{ ui: "excel" }} />,
    );
    const filterMenu = await openFromHeaderMenu(root, page, "Score");
    const submenuButton = button(filterMenu, "Number filters");
    await expect(submenuButton).toHaveAttribute("aria-haspopup", "menu");
    await expect(submenuButton).toHaveAttribute("aria-expanded", "false");

    await page.keyboard.press("Shift+Tab");
    await expect(submenuButton).toBeFocused();
    await page.keyboard.press("Enter");
    const operators = operatorMenuOf(page, "Number filters");
    await expect(operators.getByRole("menuitem")).toHaveText([
      "Equals",
      "Does not equal",
      "Greater than",
      "Greater than or equal to",
      "Less than",
      "Less than or equal to",
      "Between",
      "Is blank",
      "Is not blank",
    ]);
    await expect(submenuButton).toHaveAttribute("aria-expanded", "true");
    await expect(
      operators.getByRole("menuitem", { name: "Equals" }),
    ).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await expect(
      operators.getByRole("menuitem", { name: "Greater than", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(operators).toHaveCount(0);
    await expect(checklistOf(filterMenu)).toHaveCount(0);
    await expect(submenuButton).toHaveCount(0);
    await expect(operatorOf(filterMenu, 1)).toHaveValue("gt");
    await expect(valueOf(filterMenu, 1)).toBeFocused();
    await page.keyboard.type("10");
    await page.keyboard.press("Enter");

    await expect(filterMenu).toHaveCount(0);
    expect(await names(root)).toEqual(["Charlie", "Bravo"]);
    await expect(reported(root)).toHaveText(
      '[{"columnId":"score","operator":"gt","value":10}]',
    );
    await expect(liveRegion(root)).toHaveText("2 of 3 rows");
  });

  test("Escape, a click elsewhere in the filter menu or the button pressed again closes only the operator submenu", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <FilterMenuGrid filterMenu={{ ui: "excel" }} />,
    );
    const filterMenu = await openFromHeaderMenu(root, page, "Name");
    const submenuButton = button(filterMenu, "Text filters");
    const operators = operatorMenuOf(page, "Text filters");

    await submenuButton.click();
    await expect(
      operators.getByRole("menuitem", { name: "Contains" }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(operators).toHaveCount(0);
    await expect(filterMenu).toBeVisible();
    await expect(submenuButton).toBeFocused();
    await expect(submenuButton).toHaveAttribute("aria-expanded", "false");

    await page.keyboard.press("ArrowUp");
    await expect(
      operators.getByRole("menuitem", { name: "Is not blank" }),
    ).toBeFocused();
    await submenuButton.click();
    await expect(operators).toHaveCount(0);

    await submenuButton.click();
    await expect(operators).toBeVisible();
    await searchOf(filterMenu).click();
    await expect(operators).toHaveCount(0);
    await expect(filterMenu).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(filterMenu).toHaveCount(0);
    await expect(header(root, "Name")).toBeFocused();
  });

  test("on a conditions filter the operator submenu checks its operators, and one chosen opens with the value applied", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <FilterMenuGrid
        filterMenu={{ ui: "excel" }}
        defaultFilter={[{ columnId: "score", operator: "gt", value: 10 }]}
      />,
    );
    const operators = operatorMenuOf(page, "Number filters");

    let filterMenu = await openFromHeaderMenu(root, page, "Score");
    await expect(filterMenu.getByText("Filtered by condition")).toBeVisible();
    const submenuButton = button(filterMenu, "Number filters");
    await expect(
      submenuButton.locator(".filter-menu-submenu-icon svg"),
    ).toHaveCount(1);
    await submenuButton.click();
    const greaterThan = operators.getByRole("menuitemcheckbox", {
      name: "Greater than",
      exact: true,
    });
    await expect(greaterThan).toHaveAttribute("aria-checked", "true");
    await expect(
      operators.getByRole("menuitemcheckbox", { name: "Equals" }),
    ).toHaveAttribute("aria-checked", "false");
    await greaterThan.click();
    await expect(operatorOf(filterMenu, 1)).toHaveValue("gt");
    await expect(valueOf(filterMenu, 1)).toHaveValue("10");
    await page.keyboard.press("Escape");

    // Another operator keeps the value, as picking it in the condition does.
    filterMenu = await openFromHeaderMenu(root, page, "Score");
    await button(filterMenu, "Number filters").click();
    await operators
      .getByRole("menuitemcheckbox", { name: "Less than", exact: true })
      .click();
    await expect(operatorOf(filterMenu, 1)).toHaveValue("lt");
    await expect(valueOf(filterMenu, 1)).toHaveValue("10");
    await button(filterMenu, "OK").click();

    expect(await names(root)).toEqual(["Alice"]);
    await expect(reported(root)).toHaveText(
      '[{"columnId":"score","operator":"lt","value":10}]',
    );
    filterMenu = await openFromHeaderMenu(root, page, "Name");
    await expect(
      button(filterMenu, "Text filters").locator(
        ".filter-menu-submenu-icon svg",
      ),
    ).toHaveCount(0);
  });

  test("Back to values brings the checklist back as it was left, and a condition applied replaces the checked values", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <FilterMenuGrid
        filterMenu={{ ui: "excel" }}
        defaultFilter={[
          { columnId: "name", operator: "in", value: ["Alice", "Bravo"] },
        ]}
      />,
    );
    const filterMenu = await openFromHeaderMenu(root, page, "Name");
    const submenuButton = button(filterMenu, "Text filters");
    const contains = operatorMenuOf(page, "Text filters").getByRole(
      "menuitem",
      { name: "Contains", exact: true },
    );
    await searchOf(filterMenu).fill("li");
    await option(filterMenu, "Charlie").click();

    await submenuButton.click();
    await contains.click();
    await expect(valueOf(filterMenu, 1)).toBeFocused();
    await expect(filterMenu.getByText("Custom filter")).toHaveCount(0);
    await valueOf(filterMenu, 1).fill("ar");
    await button(filterMenu, "Back to values").click();

    await expect(submenuButton).toBeFocused();
    await expect(searchOf(filterMenu)).toHaveValue("li");
    await expect(optionsOf(filterMenu)).toHaveText(["Alice", "Charlie"]);
    await expect(option(filterMenu, "Charlie")).toHaveAttribute(
      "aria-checked",
      "true",
    );

    await submenuButton.click();
    await contains.click();
    await expect(valueOf(filterMenu, 1)).toHaveValue("");
    await valueOf(filterMenu, 1).fill("ar");
    await page.keyboard.press("Enter");

    await expect(filterMenu).toHaveCount(0);
    expect(await names(root)).toEqual(["Charlie"]);
    await expect(reported(root)).toHaveText(
      '[{"columnId":"name","operator":"contains","value":"ar"}]',
    );
  });

  test("a column offering no conditions has no operator submenu", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <DataGrid
        label="Checklist only"
        columns={[
          { field: "name", header: "Name", filterMenu: { operators: [] } },
        ]}
        dataSource={[{ name: "Alice" }]}
        filterableColumns
        filterMenu={{ ui: "excel" }}
      />,
    );

    const filterMenu = await openFromButton(root, page, "Name");
    await expect(optionsOf(filterMenu)).toHaveText(["Alice"]);
    await expect(filterMenu.locator('[aria-haspopup="menu"]')).toHaveCount(0);
  });

  test("switching filterMenu.ui at runtime keeps every filter, each editor opening on what it can show", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, <FilterMenuGrid />);
    let filterMenu = await openFromHeaderMenu(root, page, "Score");
    await operatorOf(filterMenu, 1).selectOption("gt");
    await valueOf(filterMenu, 1).fill("10");
    await button(filterMenu, "OK").click();
    expect(await names(root)).toEqual(["Charlie", "Bravo"]);

    await updateGrid(root, <FilterMenuGrid filterMenu={{ ui: "excel" }} />);
    expect(await names(root)).toEqual(["Charlie", "Bravo"]);
    filterMenu = await openFromHeaderMenu(root, page, "Score");
    await expect(filterMenu.getByText("Filtered by condition")).toBeVisible();
    await button(filterMenu, "Number filters").click();
    await expect(
      operatorMenuOf(page, "Number filters").getByRole("menuitemcheckbox", {
        name: "Greater than",
        exact: true,
      }),
    ).toHaveAttribute("aria-checked", "true");
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");

    filterMenu = await openFromHeaderMenu(root, page, "Name");
    await expect(optionsOf(filterMenu)).toHaveText(["Bravo", "Charlie"]);
    await option(filterMenu, "Bravo").click();
    await button(filterMenu, "OK").click();
    expect(await names(root)).toEqual(["Charlie"]);

    await updateGrid(root, <FilterMenuGrid />);
    expect(await names(root)).toEqual(["Charlie"]);
    filterMenu = await openFromHeaderMenu(root, page, "Score");
    await expect(operatorOf(filterMenu, 1)).toHaveValue("gt");
    await expect(valueOf(filterMenu, 1)).toHaveValue("10");
    await page.keyboard.press("Escape");
    filterMenu = await openFromHeaderMenu(root, page, "Name");
    await expect(filterMenu.getByText("Custom filter")).toBeVisible();
    await page.keyboard.press("Escape");

    await updateGrid(root, <FilterMenuGrid filterMenu={{ ui: "excel" }} />);
    filterMenu = await openFromHeaderMenu(root, page, "Name");
    await expect(option(filterMenu, "Bravo")).toHaveAttribute(
      "aria-checked",
      "false",
    );
    await expect(option(filterMenu, "Charlie")).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(reported(root)).toHaveText(
      '[{"columnId":"score","operator":"gt","value":10},{"columnId":"name","operator":"in","value":["Charlie"]}]',
    );
  });

  test.describe("on 100,000 rows", () => {
    /**
     * Clicks `target` in the page — or, given `text`, types it into the box
     * in one go — and returns the milliseconds until the frame after the
     * render it causes has painted: a timing to record, never to assert on.
     */
    function timed(
      target: Locator,
      text: string | null = null,
    ): Promise<number> {
      return target.evaluate(async (element: HTMLElement, typed) => {
        const start = performance.now();
        if (typed === null) {
          element.click();
        } else if (element instanceof HTMLInputElement) {
          // The native setter, which React's tracking of the value lets
          // through as typing.
          Object.getOwnPropertyDescriptor(
            HTMLInputElement.prototype,
            "value",
          )?.set?.call(element, typed);
          element.dispatchEvent(new Event("input", { bubbles: true }));
        }
        await new Promise((resolve) => {
          requestAnimationFrame(() => {
            setTimeout(resolve);
          });
        });
        return performance.now() - start;
      }, text);
    }

    /** Records a timing on the test, for the report to show. */
    function record(what: string, milliseconds: number): void {
      test.info().annotations.push({
        type: "timing",
        description: `${what}: ${milliseconds.toFixed(0)} ms`,
      });
    }

    test("a column of a value per row waits for a search, one of five lists them, and a pick of 1,000 applies", async ({
      mount,
      page,
    }) => {
      const root = await mountGrid(mount, <HundredThousandRowsGrid />);
      const nameButton = filterButton(root, "Name");
      const regionButton = filterButton(root, "Region");

      record("first open, 100,000 values", await timed(nameButton));
      let filterMenu = filterMenuOf(page, "Name");
      await expect(
        filterMenu.getByText("Type to search 100,000 values"),
      ).toBeVisible();
      await page.keyboard.press("Escape");
      record("reopen, 100,000 values", await timed(nameButton));
      await expect(filterMenu).toBeVisible();
      await page.keyboard.press("Escape");

      record("first open, 5 values", await timed(regionButton));
      filterMenu = filterMenuOf(page, "Region");
      await expect(optionsOf(filterMenu)).toHaveText([
        "Central 20000",
        "East 20000",
        "North 20000",
        "South 20000",
        "West 20000",
      ]);
      await page.keyboard.press("Escape");
      record("reopen, 5 values", await timed(regionButton));
      await expect(filterMenu).toBeVisible();
      await page.keyboard.press("Escape");

      // None of the names, then the 1,111 a search for "m 50" finds less the
      // 111 "m 500" finds: "Item 50", "Item 501" to "Item 509" and so on.
      await nameButton.click();
      filterMenu = filterMenuOf(page, "Name");
      record(
        "Select all, 100,000 values",
        await timed(selectAllOf(filterMenu)),
      );
      await expect(selectAllOf(filterMenu)).not.toBeChecked();
      record(
        "search, 100,000 values",
        await timed(searchOf(filterMenu), "m 50"),
      );
      await expect(optionsOf(filterMenu).first()).toHaveAttribute(
        "aria-setsize",
        "1111",
      );
      await selectAllOf(filterMenu).click();
      await searchOf(filterMenu).fill("m 500");
      await expect(optionsOf(filterMenu).first()).toHaveAttribute(
        "aria-setsize",
        "111",
      );
      await selectAllOf(filterMenu).click();
      record(
        "apply, 1,000 values of 100,000",
        await timed(button(filterMenu, "OK")),
      );

      await expect(filterMenu).toHaveCount(0);
      await expect(liveRegion(root)).toHaveText("1,000 of 100,000 rows");
    });
  });
});
