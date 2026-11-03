// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import type { Locator, Page } from "@playwright/test";
import type { MountResult } from "@playwright/experimental-ct-react";
import type { ColumnDefinition } from "@gridkitjs/core";
import { DataGrid, type DataGridProps } from "@gridkitjs/react";
import { expect, test } from "./support/coverage";
import ContextMenuTriggerHarness from "./support/ContextMenuTriggerHarness";
import { mountGrid } from "./support/mountGrid";

interface Row {
  id: string;
  name: string;
  score: number;
}

const rows: Row[] = [
  { id: "row-c", name: "Charlie", score: 30 },
  { id: "row-a", name: "Alice", score: 9 },
  { id: "row-b", name: "Bravo", score: 21 },
];

const columns: readonly ColumnDefinition<Row>[] = [
  { field: "id", header: "Id", width: 100 },
  { field: "name", header: "Name", width: 160, groupable: true },
  { field: "score", header: "Score", width: 100, type: "number" },
];

/** A grid whose headers sort, resize and open the default menu; `props` override. */
function grid(props: Partial<DataGridProps<Row>> = {}) {
  return (
    <DataGrid
      columns={columns}
      dataSource={rows}
      label="Context menu"
      sortableColumns
      resizableColumns
      contextMenu
      {...props}
    />
  );
}

function header(root: MountResult, name: string): Locator {
  return root.getByRole("columnheader", { name, exact: true });
}

/** A header's menu, which renders into `document.body`, outside `root`. */
function headerMenu(page: Page, columnName: string): Locator {
  return page.getByRole("menu", { name: `${columnName} column menu` });
}

/** Right-clicks a header and waits for its menu, focused on its first item. */
async function openOn(
  root: MountResult,
  page: Page,
  columnName: string,
): Promise<Locator> {
  await header(root, columnName).click({ button: "right" });
  const menu = headerMenu(page, columnName);
  await expect(menu.locator("[data-gridkit-menu-item]").first()).toBeFocused();
  return menu;
}

/** The item named `name`, whichever menu item role it has. */
function item(menu: Locator, name: string): Locator {
  return menu
    .getByRole("menuitem", { name, exact: true })
    .or(menu.getByRole("menuitemcheckbox", { name, exact: true }));
}

function names(root: MountResult): Promise<string[]> {
  return root
    .locator("tbody tr")
    .evaluateAll((trs) =>
      trs.map((tr) => tr.querySelectorAll("td")[1]?.textContent ?? ""),
    );
}

/** Notes, on the page's body, whether the next `contextmenu` reached the window prevented. */
async function recordContextMenu(page: Page): Promise<Locator> {
  await page.evaluate(() => {
    window.addEventListener("contextmenu", (event) => {
      document.body.dataset.prevented = String(event.defaultPrevented);
    });
  });
  return page.locator("body");
}

test.describe("trigger", () => {
  test("a right-click inside the root asks once, at the pointer, and prevents the browser's menu", async ({
    mount,
  }) => {
    const root = await mount(<ContextMenuTriggerHarness />);

    await root.getByRole("button", { name: "Cell" }).click({ button: "right" });

    await expect(root.getByTestId("requests")).toHaveText(
      "pointer on cell at a point",
    );
    await expect(root.getByTestId("prevented")).toContainText(
      "contextmenu true",
    );
  });

  for (const key of ["Shift+F10", "ContextMenu"]) {
    test(`${key} asks once from the keyboard, with no point`, async ({
      mount,
    }) => {
      const root = await mount(<ContextMenuTriggerHarness />);
      const cell = root.getByRole("button", { name: "Cell" });

      await cell.focus();
      await cell.press(key);

      await expect(root.getByTestId("requests")).toHaveText(
        "keyboard on cell no point",
      );
      await expect(root.getByTestId("prevented")).toContainText(
        `${key.replace("Shift+", "")} true`,
      );
    });
  }

  test("the contextmenu event a key press brings is taken, not asked for again", async ({
    mount,
    page,
  }) => {
    const root = await mount(<ContextMenuTriggerHarness />);
    const cell = root.getByRole("button", { name: "Cell" });

    await cell.focus();
    await cell.press("Shift+F10");
    // What a browser that turns the key into a `contextmenu` of its own fires.
    await page.evaluate(() => {
      document
        .getElementById("cell")
        ?.dispatchEvent(
          new MouseEvent("contextmenu", { bubbles: true, cancelable: true }),
        );
    });

    await expect(root.getByTestId("requests")).toHaveText(
      "keyboard on cell no point",
    );
    await expect(root.getByTestId("prevented")).toContainText(
      "contextmenu true",
    );

    await cell.click({ button: "right" });
    await expect(root.getByTestId("requests")).toHaveText(
      "keyboard on cell no point; pointer on cell at a point",
    );
  });

  test("an event a template prevented is left to it", async ({ mount }) => {
    const root = await mount(<ContextMenuTriggerHarness />);

    await root.getByText("Template").click({ button: "right" });

    await expect(root.getByTestId("template-menus")).toHaveText("1");
    await expect(root.getByTestId("requests")).toHaveText("");
  });

  test("nothing outside the root is asked for", async ({ mount }) => {
    const root = await mount(<ContextMenuTriggerHarness />);

    await root
      .getByRole("button", { name: "Outside" })
      .click({ button: "right" });

    await expect(root.getByTestId("prevented")).toHaveText("contextmenu false");
    await expect(root.getByTestId("requests")).toHaveText("");
  });

  test("a request that opens no menu leaves the browser's own", async ({
    mount,
  }) => {
    const root = await mount(<ContextMenuTriggerHarness opens={false} />);

    await root.getByRole("button", { name: "Cell" }).click({ button: "right" });

    await expect(root.getByTestId("requests")).toHaveText(
      "pointer on cell at a point",
    );
    await expect(root.getByTestId("prevented")).toHaveText("contextmenu false");
  });
});

test.describe("header menu", () => {
  test("opens on a right-click with the default items, named after its column", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, grid());
    const menu = await openOn(root, page, "Name");

    await expect(menu.locator("[data-gridkit-menu-item]")).toHaveText([
      "Sort ascending",
      "Sort descending",
      "Clear sort",
      "Group by Name",
      "Autofit column",
      "Autofit all columns",
      "Hide column",
    ]);
    await expect(menu.getByRole("separator")).toHaveCount(3);
    await expect(item(menu, "Sort ascending")).toHaveAttribute(
      "role",
      "menuitemcheckbox",
    );
    await expect(item(menu, "Sort ascending")).toHaveAttribute(
      "aria-checked",
      "false",
    );
    // Focus went to the header first, which holds the grid's tab stop.
    await expect(header(root, "Name")).toHaveAttribute("tabindex", "0");
  });

  for (const key of ["Shift+F10", "ContextMenu"]) {
    test(`${key} opens one menu below the focused header`, async ({
      mount,
      page,
    }) => {
      const root = await mountGrid(mount, grid());
      const score = header(root, "Score");

      await score.focus();
      await score.press(key);

      const menu = headerMenu(page, "Score");
      await expect(item(menu, "Sort ascending")).toBeFocused();
      await expect(page.getByRole("menu")).toHaveCount(1);
      const overlay = page.locator(".gridkit-overlay");
      await expect(overlay).toHaveAttribute(
        "data-gridkit-placement",
        "bottom-start",
      );
      const cellBox = await score.boundingBox();
      const menuBox = await overlay.boundingBox();
      expect(menuBox?.y).toBeCloseTo(
        (cellBox?.y ?? 0) + (cellBox?.height ?? 0),
        0,
      );
      expect(menuBox?.x).toBeCloseTo(cellBox?.x ?? 0, 0);
    });
  }

  test("a header lists Shift+F10 among its shortcuts while it opens a menu", async ({
    mount,
  }) => {
    const root = await mountGrid(mount, grid());

    await expect(header(root, "Name")).toHaveAttribute(
      "aria-keyshortcuts",
      /Shift\+F10/,
    );
  });

  test("sorts ascending and descending, announcing each, with focus back on the header", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, grid());
    const status = root.locator('[role="status"]');

    let menu = await openOn(root, page, "Name");
    await item(menu, "Sort ascending").click();
    await expect(menu).toHaveCount(0);
    await expect(header(root, "Name")).toBeFocused();
    await expect(status).toHaveText("Name sorted ascending");
    expect(await names(root)).toEqual(["Alice", "Bravo", "Charlie"]);

    menu = await openOn(root, page, "Name");
    await expect(item(menu, "Sort ascending")).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(menu).toHaveCount(0);
    await expect(status).toHaveText("Name sorted descending");
    expect(await names(root)).toEqual(["Charlie", "Bravo", "Alice"]);
  });

  test("Clear sort takes the column out and names it, even as the first key", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      grid({
        defaultColumnSort: [
          { columnId: "name", direction: "asc" },
          { columnId: "score", direction: "desc" },
        ],
      }),
    );

    const menu = await openOn(root, page, "Name");
    await item(menu, "Clear sort").click();

    await expect(root.locator('[role="status"]')).toHaveText(
      "Name, sort cleared",
    );
    await expect(header(root, "Name")).not.toHaveAttribute("aria-sort");
    await expect(header(root, "Score")).toHaveAttribute(
      "aria-sort",
      "descending",
    );
  });

  test("Clear sort on an unsorted column takes focus but does nothing", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, grid());
    const menu = await openOn(root, page, "Name");
    const clear = item(menu, "Clear sort");

    await expect(clear).toHaveAttribute("aria-disabled", "true");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await expect(clear).toBeFocused();
    await page.keyboard.press("Enter");
    // Forced: Playwright waits for an `aria-disabled` element to be enabled.
    await clear.click({ force: true });

    await expect(clear).toBeFocused();
    await expect(header(root, "Name")).not.toHaveAttribute("aria-sort");
  });

  test("groups by the column, and then stops grouping by it", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, grid());
    const status = root.locator('[role="status"]');

    let menu = await openOn(root, page, "Name");
    await item(menu, "Group by Name").click();
    await expect(root.getByRole("treegrid")).toBeVisible();
    await expect(status).toHaveText("Grouped by Name");

    menu = await openOn(root, page, "Name");
    await expect(item(menu, "Group by Name")).toHaveCount(0);
    await item(menu, "Stop grouping by Name").click();
    await expect(root.getByRole("grid")).toBeVisible();
    await expect(status).toHaveText("Name, grouping removed");
  });

  test("hides the column, announcing it, with focus on the header now in its place", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, grid());
    const menu = await openOn(root, page, "Name");

    await page.keyboard.press("End");
    await page.keyboard.press("Enter");

    await expect(header(root, "Name")).toHaveCount(0);
    await expect(root.locator('[role="status"]')).toHaveText(
      "Name, column hidden",
    );
    await expect(menu).toHaveCount(0);
    await expect(header(root, "Score")).toBeFocused();
  });

  test("sizes the column to its content", async ({ mount, page }) => {
    const root = await mountGrid(
      mount,
      grid({
        resizeMode: "fixed",
        columns: columns.map((column) =>
          column.field === "name" ? { ...column, width: 320 } : column,
        ),
      }),
    );

    const menu = await openOn(root, page, "Name");
    await item(menu, "Autofit column").click();

    await expect
      .poll(async () => (await header(root, "Name").boundingBox())?.width)
      .toBeLessThan(200);
  });

  test("Escape closes it, back on the header, leaving a selection made before", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      grid({ selectable: { rows: "multiple" } }),
    );
    const selectedRows = root.locator('tbody tr[aria-selected="true"]');
    await root.locator("tbody tr").nth(0).click();
    await root
      .locator("tbody tr")
      .nth(1)
      .click({ modifiers: ["ControlOrMeta"] });
    await expect(selectedRows).toHaveCount(2);

    const menu = await openOn(root, page, "Name");
    await page.keyboard.press("Escape");

    await expect(menu).toHaveCount(0);
    await expect(header(root, "Name")).toBeFocused();
    await expect(selectedRows).toHaveCount(2);
  });

  test("Tab closes it, back on the header", async ({ mount, page }) => {
    const root = await mountGrid(mount, grid());
    const menu = await openOn(root, page, "Name");

    await page.keyboard.press("Tab");

    await expect(menu).toHaveCount(0);
    await expect(header(root, "Name")).toBeFocused();
  });

  test("a click outside closes it", async ({ mount, page }) => {
    const root = await mountGrid(mount, grid());
    const menu = await openOn(root, page, "Name");

    await page.mouse.click(1000, 600);

    await expect(menu).toHaveCount(0);
  });

  test("a right-click on another header opens that header's menu in its place", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, grid());
    await openOn(root, page, "Name");

    await openOn(root, page, "Score");

    await expect(page.getByRole("menu")).toHaveCount(1);
  });

  test("selects a column that is not selected, and keeps a selection it is in", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      grid({ selectable: { columns: "multiple" } }),
    );
    const selected = root.locator('thead th[aria-selected="true"]');

    await openOn(root, page, "Name");
    await expect(selected).toHaveText(["Name"]);
    await page.keyboard.press("Escape");

    await header(root, "Score").click({ modifiers: ["ControlOrMeta"] });
    await expect(selected).toHaveCount(2);
    await openOn(root, page, "Name");
    await expect(selected).toHaveCount(2);
  });

  test("listed entries replace the defaults", async ({ mount, page }) => {
    const root = await mountGrid(
      mount,
      grid({
        contextMenu: { header: ["column.hide", "separator", "sort.ascending"] },
      }),
    );

    const menu = await openOn(root, page, "Name");

    await expect(menu.locator("[data-gridkit-menu-item]")).toHaveText([
      "Hide column",
      "Sort ascending",
    ]);
  });

  test("takes the palette of the grid's .gridkit-dark wrapper", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <div className="gridkit-dark">{grid()}</div>,
    );

    await openOn(root, page, "Name");

    await expect(page.locator(".gridkit-overlay")).toHaveClass(/gridkit-dark/);
  });

  test("without contextMenu the browser's menu shows, and no shortcut is listed", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, grid({ contextMenu: undefined }));
    const body = await recordContextMenu(page);

    await header(root, "Name").click({ button: "right" });

    await expect(body).toHaveAttribute("data-prevented", "false");
    await expect(page.getByRole("menu")).toHaveCount(0);
    await expect(header(root, "Name")).not.toHaveAttribute(
      "aria-keyshortcuts",
      /Shift\+F10/,
    );
  });

  test("an empty header menu leaves the browser's", async ({ mount, page }) => {
    const root = await mountGrid(mount, grid({ contextMenu: { header: [] } }));
    const body = await recordContextMenu(page);

    await header(root, "Name").click({ button: "right" });

    await expect(body).toHaveAttribute("data-prevented", "false");
    await expect(page.getByRole("menu")).toHaveCount(0);
  });

  test("a header whose menu resolves to nothing leaves the browser's", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      grid({
        sortableColumns: false,
        resizableColumns: false,
        columns: columns.map((column) => ({
          ...column,
          groupable: false,
          hideable: false,
        })),
      }),
    );
    const body = await recordContextMenu(page);

    await header(root, "Name").click({ button: "right" });

    await expect(body).toHaveAttribute("data-prevented", "false");
    await expect(page.getByRole("menu")).toHaveCount(0);
  });
});
