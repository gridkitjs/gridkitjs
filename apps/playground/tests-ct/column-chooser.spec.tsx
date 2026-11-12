// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import type { Locator, Page } from "@playwright/test";
import type { MountResult } from "@playwright/experimental-ct-react";
import type { ColumnDefinition } from "@gridkitjs/core";
import { DataGrid, type DataGridProps } from "@gridkitjs/react";
import { expect, test } from "./support/coverage";
import { mountGrid } from "./support/mountGrid";

/** DataGrid's space between a menu or panel and what it opens below. */
const ANCHOR_GAP = 4;

interface Row {
  id: string;
  name: string;
  score: number;
  notes: string;
}

const rows: Row[] = [
  { id: "row-a", name: "Alice", score: 9, notes: "first" },
  { id: "row-b", name: "Bravo", score: 21, notes: "second" },
];

/** `Id` cannot be hidden by the user; `Notes` starts hidden. */
const columns: readonly ColumnDefinition<Row>[] = [
  { field: "id", header: "Id", width: 80, hideable: false },
  { field: "name", header: "Name", width: 140 },
  { field: "score", header: "Score", width: 100, type: "number" },
  { field: "notes", header: "Notes", width: 140, hidden: true },
];

/** A grid with the default toolbar and context menus; `props` override. */
function grid(props: Partial<DataGridProps<Row>> = {}) {
  return (
    <DataGrid
      columns={columns}
      dataSource={rows}
      label="Column chooser"
      toolbar
      contextMenu
      {...props}
    />
  );
}

/** Wider than a 260px container, with only the chooser in its toolbar. */
const narrowGrid = grid({
  resizeMode: "fixed",
  toolbar: { items: ["column.choose"] },
});

function header(root: MountResult, name: string): Locator {
  return root.getByRole("columnheader", { name, exact: true });
}

function headerNames(root: MountResult): Promise<string[]> {
  return root.getByRole("columnheader").allTextContents();
}

/** The chooser, which renders into `document.body`, outside `root`. */
function chooserOf(page: Page): Locator {
  return page.getByRole("dialog", { name: "Columns" });
}

function option(chooser: Locator, name: string): Locator {
  return chooser.getByRole("checkbox", { name, exact: true });
}

function status(root: MountResult): Locator {
  return root.locator('[role="status"]').first();
}

/** Opens the chooser from the toolbar's "Choose columns" button. */
async function openFromToolbar(
  root: MountResult,
  page: Page,
): Promise<Locator> {
  await root.getByRole("button", { name: "Choose columns" }).click();
  const chooser = chooserOf(page);
  await expect(
    chooser.getByRole("searchbox", { name: "Search columns" }),
  ).toBeFocused();
  return chooser;
}

async function boxOf(locator: Locator) {
  const box = await locator.boundingBox();
  if (box === null) throw new Error("element is not visible");
  return box;
}

test.describe("column chooser", () => {
  test("opens from the toolbar below its button, listing every column in order", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, grid());
    const chooser = await openFromToolbar(root, page);

    const [button, panel] = await Promise.all([
      boxOf(root.getByRole("button", { name: "Choose columns" })),
      boxOf(chooser),
    ]);
    expect(panel.x + panel.width).toBeCloseTo(button.x + button.width, 0);
    expect(panel.y).toBeCloseTo(button.y + button.height + ANCHOR_GAP, 0);
    await expect(chooser).toHaveClass("gridkit-column-chooser");

    await expect(chooser.locator(".gridkit-column-chooser-list li")).toHaveText(
      ["Id", "Name", "Score", "Notes"],
    );
    await expect(option(chooser, "Id")).toBeChecked();
    await expect(option(chooser, "Id")).toBeDisabled();
    await expect(option(chooser, "Name")).toBeChecked();
    await expect(option(chooser, "Name")).toBeEnabled();
    await expect(option(chooser, "Notes")).not.toBeChecked();
    await expect(option(chooser, "Notes")).toBeEnabled();
  });

  test("toggling a column hides or shows it at once, announcing it", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, grid());
    const chooser = await openFromToolbar(root, page);

    await option(chooser, "Score").click();

    await expect(header(root, "Score")).toHaveCount(0);
    await expect(option(chooser, "Score")).not.toBeChecked();
    await expect(status(root)).toHaveText("Score, column hidden");

    await option(chooser, "Notes").click();

    expect(await headerNames(root)).toEqual(["Id", "Name", "Notes"]);
    await expect(status(root)).toHaveText("Notes, column shown");
    // Still open: every change applies at once, with nothing to confirm.
    await expect(chooser).toBeVisible();
  });

  test("stays open when hiding a column scrolls a grid scrolled to its end", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, narrowGrid, { width: 260 });
    const viewport = root.locator(".gridkit-data-grid-viewport");
    await viewport.evaluate((element) => {
      element.scrollLeft = element.scrollWidth;
    });
    expect(await viewport.evaluate((element) => element.scrollLeft)).toBe(60);
    const chooser = await openFromToolbar(root, page);

    // The tables become narrower than the grid, which scrolls back to 0.
    await option(chooser, "Score").click();

    await expect(header(root, "Score")).toHaveCount(0);
    await expect
      .poll(() => viewport.evaluate((element) => element.scrollLeft))
      .toBe(0);
    await option(chooser, "Name").click();
    await expect(header(root, "Name")).toHaveCount(0);
    await expect(chooser).toBeVisible();
    await expect(option(chooser, "Name")).toBeFocused();
  });

  test("a scroll it did not cause still closes it", async ({ mount, page }) => {
    const root = await mountGrid(mount, narrowGrid, { width: 260 });
    const chooser = await openFromToolbar(root, page);
    await option(chooser, "Notes").click();
    await expect(header(root, "Notes")).toHaveCount(1);
    // Past the frames a scroll the change caused would come in.
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          let frames = 3;
          const tick = () => {
            frames -= 1;
            if (frames === 0) resolve();
            else requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }),
    );

    await root.locator(".gridkit-data-grid-viewport").evaluate((element) => {
      element.scrollLeft = 20;
    });

    await expect(chooser).toHaveCount(0);
  });

  test("the search narrows the list, and Show all acts on what it lists", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, grid());
    const chooser = await openFromToolbar(root, page);
    const showAll = option(chooser, "Show all");

    // Notes is hidden, so not every column shows.
    await expect(showAll).not.toBeChecked();
    expect(
      await showAll.evaluate((input: HTMLInputElement) => input.indeterminate),
    ).toBe(true);

    await page.keyboard.type("O");
    await expect(chooser.locator(".gridkit-column-chooser-list li")).toHaveText(
      ["Score", "Notes"],
    );

    await showAll.click();

    expect(await headerNames(root)).toEqual(["Id", "Name", "Score", "Notes"]);
    await expect(showAll).toBeChecked();
    await expect(status(root)).toHaveText("Notes, column shown");

    await showAll.click();

    expect(await headerNames(root)).toEqual(["Id", "Name"]);
    await expect(showAll).not.toBeChecked();
    await expect(status(root)).toHaveText("2 columns hidden");
  });

  test("a search matching nothing says so", async ({ mount, page }) => {
    const root = await mountGrid(mount, grid());
    const chooser = await openFromToolbar(root, page);

    await page.keyboard.type("zzz");

    await expect(chooser.getByRole("status")).toHaveText("No matching columns");
    await expect(chooser.getByRole("checkbox")).toHaveCount(0);
  });

  test("the last column shown cannot be hidden, by its checkbox or by Show all", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      grid({
        columns: columns.map((column) => ({ ...column, hideable: true })),
      }),
    );
    const chooser = await openFromToolbar(root, page);

    await option(chooser, "Show all").click();
    await expect(option(chooser, "Show all")).toBeChecked();
    await option(chooser, "Show all").click();

    // Show all keeps the first column rather than hide them all.
    expect(await headerNames(root)).toEqual(["Id"]);
    await expect(option(chooser, "Id")).toBeChecked();
    await expect(option(chooser, "Id")).toBeDisabled();

    await option(chooser, "Name").click();
    await expect(option(chooser, "Id")).toBeEnabled();
  });

  test("Escape closes it, giving focus back to its button and leaving the selection", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      grid({ selectable: { rows: "multiple" } }),
    );
    const firstRow = root.locator("tbody tr").first();
    await firstRow.locator("td").nth(1).click();
    await expect(firstRow).toHaveAttribute("aria-selected", "true");

    const chooser = await openFromToolbar(root, page);
    await page.keyboard.press("Escape");

    await expect(chooser).toHaveCount(0);
    await expect(
      root.getByRole("button", { name: "Choose columns" }),
    ).toBeFocused();
    await expect(firstRow).toHaveAttribute("aria-selected", "true");
  });

  test("a click outside closes it", async ({ mount, page }) => {
    const root = await mountGrid(mount, grid());
    const chooser = await openFromToolbar(root, page);

    await header(root, "Name").click();

    await expect(chooser).toHaveCount(0);
  });

  test("opens from a header's menu, below the header, and gives focus back to it", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, grid());

    await header(root, "Name").click({ button: "right" });
    const menu = page.getByRole("menu", { name: "Name column menu" });
    await menu.getByRole("menuitem", { name: "Choose columns" }).click();

    const chooser = chooserOf(page);
    await expect(
      chooser.getByRole("searchbox", { name: "Search columns" }),
    ).toBeFocused();
    await expect(menu).toHaveCount(0);
    const [cell, panel] = await Promise.all([
      boxOf(header(root, "Name")),
      boxOf(chooser),
    ]);
    expect(panel.x).toBeCloseTo(cell.x, 0);
    expect(panel.y).toBeCloseTo(cell.y + cell.height + ANCHOR_GAP, 0);

    await page.keyboard.press("Escape");

    await expect(chooser).toHaveCount(0);
    await expect(header(root, "Name")).toBeFocused();
  });

  test("hiding the header it opened from keeps it in place, then gives focus to the grid", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, grid());
    await header(root, "Name").click({ button: "right" });
    await page
      .getByRole("menu", { name: "Name column menu" })
      .getByRole("menuitem", { name: "Choose columns" })
      .click();
    const chooser = chooserOf(page);
    const before = await boxOf(chooser);

    await option(chooser, "Name").click();
    await expect(header(root, "Name")).toHaveCount(0);
    await chooser.getByRole("searchbox").fill("s");

    await expect(chooser.locator(".gridkit-column-chooser-list li")).toHaveText(
      ["Score", "Notes"],
    );
    await expect.poll(async () => (await boxOf(chooser)).x).toBe(before.x);
    expect((await boxOf(chooser)).y).toBe(before.y);

    await page.keyboard.press("Escape");

    await expect(chooser).toHaveCount(0);
    await expect(root.locator('th[tabindex="0"]')).toBeFocused();
  });

  test("opens from More below the More button while the toolbar is narrow", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, grid(), { width: 300 });
    const more = root.getByRole("button", { name: "More" });

    await more.click();
    await page
      .getByRole("menu", { name: "More" })
      .getByRole("menuitem", { name: "Choose columns" })
      .click();

    const chooser = chooserOf(page);
    await expect(
      chooser.getByRole("searchbox", { name: "Search columns" }),
    ).toBeFocused();
    const [button, panel] = await Promise.all([boxOf(more), boxOf(chooser)]);
    expect(panel.y).toBeCloseTo(button.y + button.height + ANCHOR_GAP, 0);

    await page.keyboard.press("Escape");

    await expect(more).toBeFocused();
  });

  test("onCommand hears it from the toolbar", async ({ mount, page }) => {
    const heard: unknown[] = [];
    const root = await mountGrid(
      mount,
      grid({
        onCommand: (event) => {
          heard.push(event);
        },
      }),
    );

    await openFromToolbar(root, page);

    await expect
      .poll(() => heard)
      .toEqual([
        {
          commandId: "column.choose",
          target: { area: "toolbar", itemId: "column.choose" },
          source: "toolbar",
        },
      ]);
  });
});
