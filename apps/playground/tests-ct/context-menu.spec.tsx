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

/** Right-clicks `target` and waits for the menu named `name`, focused on its first item. */
async function openMenuOn(
  page: Page,
  target: Locator,
  name: string,
): Promise<Locator> {
  await target.click({ button: "right" });
  const menu = page.getByRole("menu", { name });
  await expect(menu.locator("[data-gridkit-menu-item]").first()).toBeFocused();
  return menu;
}

/** Right-clicks a header and waits for its menu, focused on its first item. */
function openOn(
  root: MountResult,
  page: Page,
  columnName: string,
): Promise<Locator> {
  return openMenuOn(
    page,
    header(root, columnName),
    `${columnName} column menu`,
  );
}

/** The body cell in row `row`, column `column`, both counted from zero among those drawn. */
function bodyCell(root: MountResult, row: number, column: number): Locator {
  return root.locator("tbody tr").nth(row).locator("td").nth(column);
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

interface TeamRow {
  id: string;
  name: string;
  team: string;
}

const teamRows: TeamRow[] = [
  { id: "t-1", name: "Ada", team: "Red" },
  { id: "t-2", name: "Ben", team: "Blue" },
  { id: "t-3", name: "Cleo", team: "Red" },
];

const teamColumns: readonly ColumnDefinition<TeamRow>[] = [
  { field: "name", header: "Name", width: 160 },
  { field: "team", header: "Team", width: 120, groupable: true },
];

/** A grid of people grouped by team, with the default menus; `props` override. */
function teamGrid(props: Partial<DataGridProps<TeamRow>> = {}) {
  return (
    <DataGrid
      columns={teamColumns}
      dataSource={teamRows}
      label="Teams"
      defaultGroupBy={[{ columnId: "team" }]}
      contextMenu
      {...props}
    />
  );
}

test.describe("cell menu", () => {
  test("opens its row's menu, replacing a selection the row is not in", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      grid({ selectable: { rows: "multiple" } }),
    );
    const selectedRows = root.locator('tbody tr[aria-selected="true"]');
    await bodyCell(root, 0, 1).click();
    await bodyCell(root, 1, 1).click({ modifiers: ["ControlOrMeta"] });
    await expect(selectedRows).toHaveCount(2);

    const menu = await openMenuOn(page, bodyCell(root, 2, 1), "Row menu");

    await expect(menu.locator("[data-gridkit-menu-item]")).toHaveText([
      "Select all rows",
      "Clear selection",
    ]);
    await expect(selectedRows).toHaveCount(1);
    await expect(root.locator("tbody tr").nth(2)).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    await expect(bodyCell(root, 2, 1)).toBeFocused();
    await expect(selectedRows).toHaveCount(1);
  });

  test("keeps a selection the row is in, for the menu to act on", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      grid({ selectable: { rows: "multiple" } }),
    );
    const selectedRows = root.locator('tbody tr[aria-selected="true"]');
    await bodyCell(root, 0, 1).click();
    await bodyCell(root, 1, 1).click({ modifiers: ["ControlOrMeta"] });

    const menu = await openMenuOn(page, bodyCell(root, 1, 2), "Row menu");
    await expect(selectedRows).toHaveCount(2);

    await item(menu, "Clear selection").click();
    await expect(selectedRows).toHaveCount(0);
    await expect(root.locator('[role="status"]')).toHaveText(
      "No rows selected",
    );
  });

  test("selects the cell it opens on, where cells are selectable", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      grid({ selectable: { rows: "multiple", cells: "single" } }),
    );

    const menu = await openMenuOn(page, bodyCell(root, 1, 2), "Row menu");
    await item(menu, "Select all rows").click();

    await expect(bodyCell(root, 1, 2)).toHaveAttribute("aria-selected", "true");
    await expect(root.locator('tbody tr[aria-selected="true"]')).toHaveCount(3);
    await expect(bodyCell(root, 1, 2)).toBeFocused();
  });

  for (const key of ["Shift+F10", "ContextMenu"]) {
    test(`${key} opens it below the focused cell`, async ({ mount, page }) => {
      const root = await mountGrid(
        mount,
        grid({ selectable: { rows: "multiple" } }),
      );
      const cell = bodyCell(root, 1, 1);
      await cell.click();

      await cell.press(key);

      const menu = page.getByRole("menu", { name: "Row menu" });
      await expect(item(menu, "Select all rows")).toBeFocused();
      const cellBox = await cell.boundingBox();
      const menuBox = await page.locator(".gridkit-overlay").boundingBox();
      expect(menuBox?.y).toBeCloseTo(
        (cellBox?.y ?? 0) + (cellBox?.height ?? 0),
        0,
      );
      expect(menuBox?.x).toBeCloseTo(cellBox?.x ?? 0, 0);
    });
  }

  test("a cell lists Shift+F10 among its shortcuts while it opens a menu", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      grid({ selectable: { cells: "single" } }),
    );

    await expect(bodyCell(root, 0, 0)).toHaveAttribute(
      "aria-keyshortcuts",
      "Space Enter Shift+F10",
    );
  });

  test("a cell whose menu resolves to nothing leaves the browser's", async ({
    mount,
    page,
  }) => {
    // Nothing to select and nothing grouped: every default is hidden.
    const root = await mountGrid(mount, grid({ contextMenu: { header: [] } }));
    const body = await recordContextMenu(page);

    await bodyCell(root, 0, 1).click({ button: "right" });

    await expect(body).toHaveAttribute("data-prevented", "false");
    await expect(page.getByRole("menu")).toHaveCount(0);
  });

  test("without contextMenu a cell lists no menu shortcut", async ({
    mount,
  }) => {
    const root = await mountGrid(mount, grid({ contextMenu: undefined }));

    await expect(bodyCell(root, 0, 1)).not.toHaveAttribute("aria-keyshortcuts");
  });
});

test.describe("group menu", () => {
  test("expands and collapses every group, and stops grouping by its column", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, teamGrid());
    const status = root.locator('[role="status"]');
    const groupRow = root.locator("tr[data-gridkit-group]").first();

    let menu = await openMenuOn(page, groupRow, "Group menu");
    await expect(menu.locator("[data-gridkit-menu-item]")).toHaveText([
      "Expand all groups",
      "Collapse all groups",
      "Stop grouping by Team",
    ]);
    await item(menu, "Collapse all groups").click();
    await expect(status).toHaveText("All groups collapsed");
    await expect(root.locator('tr[aria-expanded="false"]')).toHaveCount(2);
    await expect(groupRow.locator("td")).toBeFocused();

    menu = await openMenuOn(page, groupRow, "Group menu");
    await item(menu, "Expand all groups").click();
    await expect(status).toHaveText("All groups expanded");

    menu = await openMenuOn(page, groupRow, "Group menu");
    await item(menu, "Stop grouping by Team").click();
    await expect(root.getByRole("grid")).toBeVisible();
    await expect(status).toHaveText("Team, grouping removed");
  });

  test("a grouped grid's cell menu expands and collapses too", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, teamGrid());
    const row = root.locator("tbody tr:not([data-gridkit-group])").first();

    const menu = await openMenuOn(page, row.locator("td").first(), "Row menu");

    await expect(menu.locator("[data-gridkit-menu-item]")).toHaveText([
      "Expand all groups",
      "Collapse all groups",
    ]);
  });

  test("Shift+F10 on a focused group row opens its menu", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, teamGrid());
    const groupCell = root.locator("tr[data-gridkit-group] td").first();
    await expect(groupCell).toHaveAttribute(
      "aria-keyshortcuts",
      "Space Enter Shift+F10",
    );

    await groupCell.focus();
    await groupCell.press("Shift+F10");

    await expect(
      item(page.getByRole("menu", { name: "Group menu" }), "Expand all groups"),
    ).toBeFocused();
  });
});

test.describe("body menu", () => {
  test("the body's empty space keeps the browser's menu by default", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      grid({ selectable: { rows: "multiple" }, height: 300 }),
    );
    const body = await recordContextMenu(page);

    await root
      .locator(".gridkit-data-grid-body")
      .click({ button: "right", position: { x: 20, y: 280 } });

    await expect(body).toHaveAttribute("data-prevented", "false");
    await expect(page.getByRole("menu")).toHaveCount(0);
  });

  test("the footer keeps the browser's menu", async ({ mount, page }) => {
    const root = await mountGrid(
      mount,
      grid({
        selectable: { rows: "multiple" },
        aggregates: [{ columnId: "score", fn: "sum" }],
      }),
    );
    const body = await recordContextMenu(page);

    await root
      .locator(".gridkit-data-grid-footer td")
      .first()
      .click({ button: "right" });

    await expect(body).toHaveAttribute("data-prevented", "false");
    await expect(page.getByRole("menu")).toHaveCount(0);
  });
});
