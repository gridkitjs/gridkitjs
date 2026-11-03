// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import type { Locator, Page } from "@playwright/test";
import type { MountResult } from "@playwright/experimental-ct-react";
import type { ColumnDefinition } from "@gridkitjs/core";
import { DataGrid } from "@gridkitjs/react";
import { expect, test } from "./support/coverage";
import { mountGrid } from "./support/mountGrid";
import ToolbarGrid from "./support/ToolbarGrid";
import ToolbarHarness from "./support/ToolbarHarness";

interface PlainRow {
  name: string;
}

const plainRows: PlainRow[] = [{ name: "Alice" }, { name: "Bravo" }];
const plainColumns: readonly ColumnDefinition<PlainRow>[] = [
  { field: "name", header: "Name" },
];

/** The search box's caret, as `[selectionStart, selectionEnd]`. */
async function caretOf(page: Page): Promise<[number | null, number | null]> {
  return page
    .getByRole("searchbox", { name: "Search" })
    .evaluate((input: HTMLInputElement) => [
      input.selectionStart,
      input.selectionEnd,
    ]);
}

function control(root: MountResult, name: string) {
  return name === "Search"
    ? root.getByRole("searchbox", { name })
    : root.getByRole("button", { name, exact: true });
}

test.describe("attachToolbar", () => {
  test("makes the toolbar one tab stop, on its first control", async ({
    mount,
    page,
  }) => {
    const root = await mount(<ToolbarHarness />);

    await control(root, "Before").focus();
    await page.keyboard.press("Tab");
    await expect(control(root, "Bold")).toBeFocused();
    await expect(control(root, "Bold")).toHaveAttribute("tabindex", "0");
    for (const name of ["Delete", "Search", "Export", "Status"]) {
      await expect(control(root, name)).toHaveAttribute("tabindex", "-1");
    }

    await page.keyboard.press("Tab");
    await expect(control(root, "After")).toBeFocused();
  });

  test("ArrowRight and ArrowLeft move between controls, wrapping round the ends", async ({
    mount,
    page,
  }) => {
    const root = await mount(<ToolbarHarness />);
    await control(root, "Bold").focus();

    // The disabled button takes focus; the separator and spacer do not.
    for (const name of ["Delete", "Search", "Export", "Status", "Bold"]) {
      await page.keyboard.press("ArrowRight");
      await expect(control(root, name)).toBeFocused();
    }
    await page.keyboard.press("ArrowLeft");
    await expect(control(root, "Status")).toBeFocused();
    await expect(control(root, "Status")).toHaveAttribute("tabindex", "0");
    await expect(control(root, "Bold")).toHaveAttribute("tabindex", "-1");
  });

  test("Home and End move to the first and last control", async ({
    mount,
    page,
  }) => {
    const root = await mount(<ToolbarHarness />);
    await control(root, "Delete").focus();

    await page.keyboard.press("End");
    await expect(control(root, "Status")).toBeFocused();
    await page.keyboard.press("Home");
    await expect(control(root, "Bold")).toBeFocused();
  });

  test("a search box keeps the keys that move its caret, and leads out at either end", async ({
    mount,
    page,
  }) => {
    const root = await mount(<ToolbarHarness />);
    const search = control(root, "Search");
    await search.click();
    await page.keyboard.type("abc");

    await page.keyboard.press("ArrowLeft");
    await expect(search).toBeFocused();
    expect(await caretOf(page)).toEqual([2, 2]);
    await page.keyboard.press("Home");
    await expect(search).toBeFocused();
    expect(await caretOf(page)).toEqual([0, 0]);
    await page.keyboard.press("ArrowLeft");
    await expect(control(root, "Delete")).toBeFocused();

    await search.focus();
    await page.keyboard.press("End");
    await expect(search).toBeFocused();
    expect(await caretOf(page)).toEqual([3, 3]);
    await page.keyboard.press("ArrowRight");
    await expect(control(root, "Export")).toBeFocused();
  });

  test("a search box with text selected keeps its arrows", async ({
    mount,
    page,
  }) => {
    const root = await mount(<ToolbarHarness />);
    const search = control(root, "Search");
    await search.fill("abc");
    await search.selectText();

    await page.keyboard.press("ArrowRight");
    await expect(search).toBeFocused();
    expect(await caretOf(page)).toEqual([3, 3]);
  });

  test("the tab stop follows focus, however it moved", async ({
    mount,
    page,
  }) => {
    const root = await mount(<ToolbarHarness />);
    await control(root, "Bold").focus();
    await page.keyboard.press("End");
    await page.keyboard.press("Tab");
    await expect(control(root, "After")).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(control(root, "Status")).toBeFocused();

    await control(root, "Export").click();
    await expect(control(root, "Export")).toHaveAttribute("tabindex", "0");
    await expect(control(root, "Status")).toHaveAttribute("tabindex", "-1");
  });

  test("a control drawn later joins without taking the tab stop", async ({
    mount,
    page,
  }) => {
    const root = await mount(<ToolbarHarness />);
    await control(root, "Export").click();
    await control(root, "Add item").click();

    await expect(control(root, "Added")).toHaveAttribute("tabindex", "-1");
    await expect(control(root, "Export")).toHaveAttribute("tabindex", "0");
    await control(root, "Before").focus();
    await page.keyboard.press("Tab");
    await expect(control(root, "Export")).toBeFocused();
    await page.keyboard.press("Home");
    await expect(control(root, "Added")).toBeFocused();
  });
});

/** Sets the toolbar's width directly, as a container resizing around it would. */
async function resize(root: MountResult, width: number): Promise<void> {
  await root
    .getByRole("toolbar", { name: "Actions" })
    .evaluate((toolbar: HTMLElement, value) => {
      toolbar.style.width = `${String(value)}px`;
    }, width);
}

test.describe("observeToolbarOverflow", () => {
  // Every entry is a fixed width with an 8px gap and 5px of padding a side:
  // 477px of entries, the search box (120) and the custom entry (60) pinned,
  // and a 60px "More" button.

  test("reports every entry fitting a toolbar wide enough", async ({
    mount,
  }) => {
    const root = await mount(<ToolbarHarness />);

    await expect(root.getByTestId("fit")).toHaveText("7");
    await expect(control(root, "Export")).toBeVisible();
    await expect(control(root, "More")).toHaveCount(0);
  });

  test("moves what does not fit into More, keeping the search box and custom entry", async ({
    mount,
  }) => {
    const root = await mount(<ToolbarHarness />);
    await resize(root, 410);

    await expect(root.getByTestId("fit")).toHaveText("1");
    await expect(control(root, "Bold")).toBeVisible();
    await expect(control(root, "Delete")).toHaveCount(0);
    await expect(control(root, "Export")).toHaveCount(0);
    await expect(control(root, "Search")).toBeVisible();
    await expect(control(root, "Status")).toBeVisible();
    await expect(control(root, "More")).toBeVisible();
  });

  test("keeps only the pinned entries when nothing else fits", async ({
    mount,
  }) => {
    const root = await mount(<ToolbarHarness />);
    await resize(root, 300);

    await expect(root.getByTestId("fit")).toHaveText("0");
    await expect(control(root, "Bold")).toHaveCount(0);
    await expect(control(root, "Search")).toBeVisible();
    await expect(control(root, "Status")).toBeVisible();
  });

  test("widening brings back entries it measured before moving them out", async ({
    mount,
  }) => {
    const root = await mount(<ToolbarHarness />);
    await resize(root, 300);
    await expect(root.getByTestId("fit")).toHaveText("0");

    await resize(root, 410);
    await expect(root.getByTestId("fit")).toHaveText("1");
    await resize(root, 600);
    await expect(root.getByTestId("fit")).toHaveText("7");
    await expect(control(root, "Export")).toBeVisible();
    await expect(control(root, "More")).toHaveCount(0);
  });

  test("counts an entry added to its items", async ({ mount }) => {
    const root = await mount(<ToolbarHarness />);
    await resize(root, 500);
    await expect(root.getByTestId("fit")).toHaveText("7");

    // An 80px button more: 565px of entries no longer fit in 498.
    await control(root, "Add item").click();
    await expect(root.getByTestId("fit")).toHaveText("2");
    await expect(control(root, "Added")).toBeVisible();
    await expect(control(root, "Delete")).toHaveCount(0);
  });
});

/** Wide enough for every entry of `ToolbarGrid`'s toolbar. */
const WIDE = { width: 900 };

function gridToolbar(root: MountResult) {
  return root.getByRole("toolbar", { name: "Grid toolbar" });
}

function toolbarButton(root: MountResult, name: string) {
  return gridToolbar(root).getByRole("button", { name, exact: true });
}

function gridSearch(root: MountResult) {
  return gridToolbar(root).getByRole("searchbox", { name: "Search" });
}

/** The `data-gridkit-toolbar-item` of every entry drawn, in order. */
function entryKeys(toolbar: Locator): Promise<(string | null)[]> {
  return toolbar
    .locator("[data-gridkit-toolbar-item]")
    .evaluateAll((entries) =>
      entries.map((entry) => entry.getAttribute("data-gridkit-toolbar-item")),
    );
}

function names(root: MountResult): Promise<string[]> {
  return root
    .locator("tbody tr")
    .evaluateAll((trs) =>
      trs.map((tr) => tr.querySelectorAll("td")[1]?.textContent ?? ""),
    );
}

test.describe("DataGrid toolbar", () => {
  test("is off by default", async ({ mount }) => {
    const root = await mountGrid(
      mount,
      <DataGrid columns={plainColumns} dataSource={plainRows} />,
    );

    await expect(root.getByRole("toolbar")).toHaveCount(0);
  });

  test("is not drawn while it lists nothing", async ({ mount }) => {
    const root = await mountGrid(mount, <ToolbarGrid onlyExtra />);

    await expect(root.getByRole("toolbar")).toHaveCount(0);
  });

  test("toolbar alone draws the defaults above the group-by bar, controlling the grid", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <DataGrid
        columns={plainColumns}
        dataSource={plainRows}
        groupByBarVisibility="always"
        toolbar
      />,
    );
    const toolbar = gridToolbar(root);

    await expect(toolbar).toHaveClass("gridkit-toolbar");
    await expect(gridSearch(root)).toHaveAttribute("placeholder", "Search…");
    await expect(toolbarButton(root, "Clear filters")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(await entryKeys(toolbar)).toEqual([
      "search",
      "spacer-1",
      "filter.clearAll",
    ]);

    const id = await root.getByRole("grid").getAttribute("id");
    expect(id).toBeTruthy();
    await expect(toolbar).toHaveAttribute("aria-controls", id ?? "");
    expect(
      await toolbar.evaluate(
        (element) =>
          element.parentElement?.firstElementChild === element &&
          element.nextElementSibling?.matches(".gridkit-group-by-bar"),
      ),
    ).toBe(true);
  });

  test("takes its name from label, and lists items in order", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <DataGrid
        columns={plainColumns}
        dataSource={plainRows}
        toolbar={{
          label: "Order actions",
          items: ["filter.clearAll", "separator", "search"],
        }}
      />,
    );
    const toolbar = root.getByRole("toolbar", { name: "Order actions" });

    await expect(toolbar.getByRole("separator")).toHaveAttribute(
      "aria-orientation",
      "vertical",
    );
    expect(await entryKeys(toolbar)).toEqual([
      "filter.clearAll",
      "separator-1",
      "search",
    ]);
  });

  test("a command's button follows the grid's state, and reports to onCommand", async ({
    mount,
  }) => {
    const root = await mountGrid(mount, <ToolbarGrid />, WIDE);
    const clearSort = toolbarButton(root, "Clear all sorting");

    await expect(clearSort).toHaveAttribute("aria-disabled", "true");
    // Disabled, so it runs nothing and reports nothing.
    await clearSort.click({ force: true });
    await expect(root.getByTestId("commands")).toHaveText("");

    await root
      .getByRole("columnheader", { name: "Name" })
      .locator(".header-sort-toggle")
      .click();
    await expect(clearSort).not.toHaveAttribute("aria-disabled");
    expect(await names(root)).toEqual(["Alice", "Bravo", "Charlie"]);

    await clearSort.click();
    expect(await names(root)).toEqual(["Charlie", "Alice", "Bravo"]);
    await expect(clearSort).toHaveAttribute("aria-disabled", "true");
    await expect(root.getByTestId("commands")).toHaveText(
      'toolbar sort.clearAll {"area":"toolbar","itemId":"sort.clearAll"}',
    );
  });

  test("a checkable item is a toggle button", async ({ mount }) => {
    const root = await mountGrid(mount, <ToolbarGrid />, WIDE);
    const compact = toolbarButton(root, "Compact");

    await expect(compact).toHaveAttribute("aria-pressed", "false");
    await compact.click();
    await expect(compact).toHaveAttribute("aria-pressed", "true");
    await expect(toolbarButton(root, "status: compact")).toBeVisible();
    await expect(root.getByTestId("commands")).toHaveText(
      'toolbar view.compact {"area":"toolbar","itemId":"view.compact"}',
    );
  });

  test("a custom entry draws what renderToolbarItem returns", async ({
    mount,
  }) => {
    const root = await mountGrid(mount, <ToolbarGrid />, WIDE);

    await expect(
      gridToolbar(root).locator('[data-gridkit-toolbar-item="status"]'),
    ).toHaveClass("toolbar-custom");
    await expect(toolbarButton(root, "status: roomy")).toBeVisible();
  });

  test("searching filters the rows once typing rests, and announces the count", async ({
    mount,
  }) => {
    const root = await mountGrid(mount, <ToolbarGrid />, WIDE);
    const search = gridSearch(root);

    await search.pressSequentially("li");
    await expect.poll(() => names(root)).toEqual(["Charlie", "Alice"]);
    await expect(root.locator('[role="status"]')).toHaveText("2 rows found");
    await expect(search).toHaveValue("li");

    await toolbarButton(root, "Clear filters").click();
    await expect(search).toHaveValue("");
    expect(await names(root)).toEqual(["Charlie", "Alice", "Bravo"]);
    await expect(root.getByTestId("commands")).toHaveText(
      'toolbar filter.clearAll {"area":"toolbar","itemId":"filter.clearAll"}',
    );
  });

  test("Enter searches at once, and Escape empties the box", async ({
    mount,
  }) => {
    const root = await mountGrid(mount, <ToolbarGrid />, WIDE);
    const search = gridSearch(root);

    await search.fill("bra");
    await search.press("Enter");
    expect(await names(root)).toEqual(["Bravo"]);
    await expect(root.locator('[role="status"]')).toHaveText("1 row found");

    await search.press("Escape");
    await expect(search).toHaveValue("");
    expect(await names(root)).toEqual(["Charlie", "Alice", "Bravo"]);
  });

  test("the box reads its text back from the filter, and leaves column entries alone", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <ToolbarGrid
        defaultFilter={[{ query: "%ar%" }, { columnId: "score", query: "30" }]}
      />,
      WIDE,
    );
    const search = gridSearch(root);

    await expect(search).toHaveValue("ar");
    expect(await names(root)).toEqual(["Charlie"]);

    await search.press("Escape");
    await expect(search).toHaveValue("");
    expect(await names(root)).toEqual(["Charlie"]);
  });

  test("a dropdown opens its menu and runs an item from it", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, <ToolbarGrid />, WIDE);
    const actions = toolbarButton(root, "Actions");
    const menu = page.getByRole("menu", { name: "Actions" });

    await expect(actions).toHaveAttribute("aria-haspopup", "menu");
    await expect(actions).toHaveAttribute("aria-expanded", "false");
    await actions.click();
    await expect(actions).toHaveAttribute("aria-expanded", "true");
    await expect(menu.getByRole("menuitem", { name: "Export" })).toBeFocused();

    await menu.getByRole("menuitem", { name: "Export" }).click();
    await expect(menu).toHaveCount(0);
    await expect(actions).toBeFocused();
    await expect(actions).toHaveAttribute("aria-expanded", "false");
    await expect(root.getByTestId("log")).toHaveText("export 3");
    await expect(root.getByTestId("commands")).toHaveText(
      'toolbar actions.export {"area":"toolbar","itemId":"actions"}',
    );
  });

  test("a dropdown opens from the keyboard, and closes on Escape or a second click", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, <ToolbarGrid />, WIDE);
    const actions = toolbarButton(root, "Actions");
    const menu = page.getByRole("menu", { name: "Actions" });

    await actions.focus();
    await page.keyboard.press("ArrowDown");
    await expect(menu.getByRole("menuitem", { name: "Export" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    await expect(actions).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(menu.getByRole("menuitem", { name: "Export" })).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(root.getByTestId("log")).toHaveText("refresh");

    await actions.click();
    await expect(menu).toBeVisible();
    await actions.click();
    await expect(menu).toHaveCount(0);
  });

  test("focus comes back to the toolbar when a menu takes its own button away", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <ToolbarGrid
        onlyExtra
        defaultGroupBy={[{ columnId: "name" }]}
        extraItems={[
          "search",
          {
            type: "submenu",
            id: "groups",
            label: "Groups",
            items: ["group.clearAll"],
          },
        ]}
      />,
      WIDE,
    );
    const groups = toolbarButton(root, "Groups");

    await groups.click();
    await page
      .getByRole("menu", { name: "Groups" })
      .getByRole("menuitem", { name: "Ungroup all" })
      .click();

    await expect(groups).toHaveCount(0);
    await expect(gridSearch(root)).toBeFocused();
  });

  test("is one tab stop the arrow keys move within", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, <ToolbarGrid />, WIDE);
    const toolbar = gridToolbar(root);

    await gridSearch(root).focus();
    await page.keyboard.press("ArrowRight");
    await expect(toolbarButton(root, "Clear all sorting")).toBeFocused();
    await page.keyboard.press("End");
    await expect(toolbarButton(root, "status: roomy")).toBeFocused();
    await page.keyboard.press("Home");
    await expect(gridSearch(root)).toBeFocused();

    await page.keyboard.press("Tab");
    expect(
      await toolbar.evaluate((element) =>
        element.contains(document.activeElement),
      ),
    ).toBe(false);
    await page.keyboard.press("Shift+Tab");
    await expect(gridSearch(root)).toBeFocused();
  });

  test("stays in view while the grid scrolls sideways", async ({ mount }) => {
    const root = await mountGrid(mount, <ToolbarGrid resizeMode="fixed" />, {
      width: 240,
    });
    const viewport = root.locator(".gridkit-data-grid-viewport");

    await viewport.evaluate((element) => {
      element.scrollLeft = 100;
    });

    expect(await viewport.evaluate((element) => element.scrollLeft)).toBe(100);
    const [toolbarBox, viewportBox] = await Promise.all([
      gridToolbar(root).boundingBox(),
      viewport.boundingBox(),
    ]);
    expect(toolbarBox?.x).toBe(viewportBox?.x);
  });
});
