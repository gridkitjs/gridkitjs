// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import type { MountResult } from "@playwright/experimental-ct-react";
import type { ColumnDefinition } from "@gridkitjs/core";
import { DataGrid } from "@gridkitjs/react";
import { ariaRowCount } from "./support/ariaRows";
import { expect, test } from "./support/coverage";
import { mountGrid } from "./support/mountGrid";
import EmptyTemplateGrid from "./support/EmptyTemplateGrid";
import InfiniteScrollGrid from "./support/InfiniteScrollGrid";
import ToolbarGrid from "./support/ToolbarGrid";

interface Row {
  id: string;
  name: string;
}

const columns: readonly ColumnDefinition<Row>[] = [
  { field: "id", header: "Id", width: 80 },
  { field: "name", header: "Name", width: 160 },
];

const rows: readonly Row[] = [
  { id: "row-a", name: "Alice" },
  { id: "row-b", name: "Bravo" },
];

function emptyRow(root: MountResult) {
  return root.locator(".gridkit-grid-empty-row");
}

test.describe("an empty grid", () => {
  test("says so in a row the grid holds but does not count", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <DataGrid columns={columns} dataSource={[]} label="Empty" />,
    );

    const row = emptyRow(root);
    await expect(row).toHaveRole("row");
    await expect(row).not.toHaveAttribute("aria-rowindex");
    const cell = row.getByRole("gridcell");
    await expect(cell).toHaveText("No rows to show");
    await expect(cell).toHaveAttribute("colspan", "2");
    expect(await ariaRowCount(root)).toBe(1);
    await expect(root.getByRole("columnheader")).toHaveCount(2);
  });

  test("never takes keyboard focus: Tab lands on the header", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <div>
        <button type="button">Before</button>
        <DataGrid columns={columns} dataSource={[]} label="Empty" />
      </div>,
    );

    await expect(emptyRow(root).locator("[tabindex]")).toHaveCount(0);
    await root.getByRole("button", { name: "Before" }).focus();
    await page.keyboard.press("Tab");
    await expect(
      root.getByRole("columnheader", { name: "Id", exact: true }),
    ).toBeFocused();
  });

  test("names the filter when one hides every row", async ({ mount }) => {
    const root = await mountGrid(
      mount,
      <DataGrid
        columns={columns}
        dataSource={rows}
        label="Filtered"
        defaultFilter={[{ kind: "text", columnId: "name", query: "Nobody" }]}
      />,
    );

    await expect(emptyRow(root)).toHaveText("No rows match the current filter");
  });

  test("goes when the search that emptied the grid is cleared, and the rows return", async ({
    mount,
  }) => {
    const root = await mountGrid(mount, <ToolbarGrid />, { width: 900 });
    const search = root.getByRole("searchbox", { name: "Search" });

    await search.fill("nobody");
    await search.press("Enter");
    await expect(emptyRow(root)).toHaveText("No rows match the current filter");
    await expect(root.locator("tbody tr[data-gridkit-row-id]")).toHaveCount(0);

    await search.press("Escape");
    await expect(emptyRow(root)).toHaveCount(0);
    await expect(root.locator("tbody tr[data-gridkit-row-id]")).toHaveCount(3);
  });

  test("stays in view and centred while a wide grid scrolls sideways", async ({
    mount,
  }) => {
    const wideColumns: readonly ColumnDefinition<Row>[] = [
      { field: "id", header: "Id", width: 400 },
      { field: "name", header: "Name", width: 400 },
    ];
    const root = await mountGrid(
      mount,
      <DataGrid
        columns={wideColumns}
        dataSource={[]}
        label="Wide"
        resizeMode="fixed"
      />,
      { width: 400 },
    );
    const scrollArea = root.locator(".gridkit-data-grid-tables");
    const content = root.locator(".gridkit-grid-empty-content");

    await scrollArea.evaluate((element: HTMLElement) => {
      element.scrollLeft = element.scrollWidth;
    });
    await expect
      .poll(() => scrollArea.evaluate((element) => element.scrollLeft))
      .toBeGreaterThan(0);

    const area = await scrollArea.boundingBox();
    const box = await content.boundingBox();
    if (area === null || box === null) throw new Error("not laid out");
    const inner = await scrollArea.evaluate((element) => element.clientWidth);
    expect(Math.round(box.x)).toBe(Math.round(area.x));
    expect(Math.round(box.width)).toBe(inner);
  });

  test("shows a grid's own translation", async ({ mount }) => {
    const root = await mountGrid(
      mount,
      <DataGrid
        columns={columns}
        dataSource={[]}
        label="Translated"
        messages={{ noRows: "Keine Zeilen" }}
      />,
    );

    await expect(emptyRow(root)).toHaveText("Keine Zeilen");
  });

  test("is not drawn while infinite scroll loads the first rows", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <InfiniteScrollGrid
        columns={columns}
        allRows={rows}
        chunkSize={0}
        holdLoads
        height={200}
        label="Loading"
      />,
    );

    await expect(root.locator(".gridkit-grid-loading-row")).toBeVisible();
    await expect(emptyRow(root)).toHaveCount(0);
  });

  test("is drawn once infinite scroll has nothing more to load", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <InfiniteScrollGrid
        columns={columns}
        allRows={[]}
        chunkSize={10}
        height={200}
        label="Nothing to load"
      />,
    );

    await expect(emptyRow(root)).toHaveText("No rows to show");
  });
});

test.describe("emptyTemplate", () => {
  test("replaces the message, and a button in it works", async ({ mount }) => {
    const root = await mountGrid(mount, <EmptyTemplateGrid />);
    const template = root.getByTestId("empty-template");

    await expect(template).toContainText("Nothing yet");
    await expect(emptyRow(root)).not.toContainText("No rows to show");
    await template.getByRole("button", { name: "Add a row" }).click();

    await expect(emptyRow(root)).toHaveCount(0);
    await expect(root.getByRole("gridcell", { name: "Added" })).toBeVisible();
  });

  test("is told when a filter is active", async ({ mount }) => {
    const root = await mountGrid(
      mount,
      <EmptyTemplateGrid
        defaultFilter={[{ kind: "text", columnId: "name", query: "Nobody" }]}
      />,
    );
    const template = root.getByTestId("empty-template");

    await expect(template).toContainText("Filtered out");
    await template.getByRole("button", { name: "Add a row" }).click();
    await expect(template).toContainText("Filtered out");
  });
});

test.describe("the pager of an empty grid", () => {
  test("shows page 1 of 1 with nowhere to go", async ({ mount }) => {
    const root = await mountGrid(
      mount,
      <DataGrid columns={columns} dataSource={[]} label="Paged" paginated />,
    );
    const pager = root.getByRole("group", { name: "Pagination" });

    await expect(pager.locator(".gridkit-grid-pager-status")).toHaveText(
      "Page 1 of 1",
    );
    for (const name of ["First", "Previous", "Next", "Last"]) {
      await expect(pager.getByRole("button", { name })).toHaveAttribute(
        "aria-disabled",
        "true",
      );
    }
  });

  test("numbered, shows page 1 as the current page", async ({ mount }) => {
    const root = await mountGrid(
      mount,
      <DataGrid
        columns={columns}
        dataSource={[]}
        label="Paged"
        paginated
        pager={{ variant: "numbered" }}
      />,
    );
    const pages = root.locator(".gridkit-grid-pager-page");

    await expect(pages).toHaveCount(1);
    await expect(pages).toHaveAttribute("aria-current", "page");
    await expect(pages).toHaveAccessibleName("Page 1");
  });
});
