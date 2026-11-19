// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import type { Locator, Page } from "@playwright/test";
import type { MountResult } from "@playwright/experimental-ct-react";
import { DataGrid } from "@gridkitjs/react";
import {
  answerOrders,
  serverOrderColumns,
  serverOrders,
  type OrderQuery,
} from "../src/demos/serverOrders";
import { ariaRowCount } from "./support/ariaRows";
import { expect, test } from "./support/coverage";
import { mountGrid } from "./support/mountGrid";
import ServerDataGrid from "./support/ServerDataGrid";
import ServerInfiniteGrid from "./support/ServerInfiniteGrid";

/** `o<from>` to `o<to>`, the ids of the orders in id order. */
function orderIds(from: number, to: number): string[] {
  return Array.from(
    { length: to - from + 1 },
    (_unused, index) => `o${String(from + index)}`,
  );
}

function dataRows(root: MountResult): Locator {
  return root.locator("tr[data-gridkit-row-id]");
}

/** The id cells of the rows drawn, which a page's ids are checked against. */
function idCells(root: MountResult): Locator {
  return dataRows(root).locator('td[data-gridkit-column="id"]');
}

function header(root: MountResult, name: string): Locator {
  return root.getByRole("columnheader", { name, exact: true });
}

function sortToggle(root: MountResult, name: string): Locator {
  return header(root, name).locator(".gridkit-header-sort-toggle");
}

function pagerStatus(root: MountResult): Locator {
  return root.locator(".gridkit-grid-pager-status");
}

function pagerButton(root: MountResult, name: string): Locator {
  return root
    .locator(".gridkit-grid-pager")
    .getByRole("button", { name, exact: true });
}

function overlay(root: MountResult): Locator {
  return root.locator(".gridkit-grid-loading-overlay");
}

function liveRegion(root: MountResult): Locator {
  return root.locator('[role="status"]').first();
}

function button(root: MountResult, name: string): Locator {
  return root.getByRole("button", { name, exact: true });
}

/** Every query the harness has sent, oldest first. */
async function requests(root: MountResult): Promise<OrderQuery[]> {
  const text = await root.getByTestId("requests").textContent();
  return JSON.parse(text ?? "[]") as OrderQuery[];
}

async function lastRequest(root: MountResult): Promise<OrderQuery> {
  const sent = await requests(root);
  const last = sent.at(-1);
  if (last === undefined) throw new Error("no request sent");
  return last;
}

/** The ids the server answers the harness's newest query with. */
async function answeredIds(root: MountResult): Promise<string[]> {
  return answerOrders(await lastRequest(root)).rows.map((row) => row.id);
}

/** Waits for the harness's newest query to be answered and drawn. */
async function expectAnswered(root: MountResult): Promise<void> {
  await expect(overlay(root)).toHaveCount(0);
  await expect(idCells(root)).toHaveText(await answeredIds(root));
}

/** A column's filter menu, which renders into `document.body`, outside `root`. */
async function openFilterMenu(
  root: MountResult,
  page: Page,
  columnName: string,
): Promise<Locator> {
  await header(root, columnName)
    .locator(".gridkit-header-filter-toggle")
    .click();
  const menu = page.getByRole("dialog", { name: `${columnName} filter` });
  await expect(menu).toBeVisible();
  return menu;
}

/** Applies a "contains" condition on `columnName` through its simple filter menu. */
async function filterContains(
  root: MountResult,
  page: Page,
  columnName: string,
  text: string,
): Promise<void> {
  const menu = await openFilterMenu(root, page, columnName);
  await menu
    .getByRole("group", { name: "Condition 1" })
    .getByLabel("Value", { exact: true })
    .fill(text);
  await page.keyboard.press("Enter");
  await expect(menu).toHaveCount(0);
}

/** Errors the page logs from now on. */
function recordErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });
  return errors;
}

test.describe("a paginated server grid", () => {
  test("covers its empty body while the first page loads, then shows it with the server's page count", async ({
    mount,
  }) => {
    const root = await mountGrid(mount, <ServerDataGrid holdResponses />);
    await expect(overlay(root)).toHaveClass(/is-empty/);
    await expect(root.getByRole("grid")).toHaveAttribute("aria-busy", "true");
    await expect(root.locator(".gridkit-grid-empty-row")).toHaveCount(0);

    await button(root, "Answer newest").click();
    await expect(idCells(root)).toHaveText(orderIds(1, 10));
    await expect(overlay(root)).toHaveCount(0);
    await expect(root.getByRole("grid")).not.toHaveAttribute("aria-busy");
    await expect(pagerStatus(root)).toHaveText("Page 1 of 10");
  });

  test("counts every row the server has for assistive technology, numbering page 3 on from the pages before it", async ({
    mount,
  }) => {
    const root = await mountGrid(mount, <ServerDataGrid />);
    await expect(idCells(root)).toHaveText(orderIds(1, 10));

    await pagerButton(root, "Next").click();
    await expectAnswered(root);
    await pagerButton(root, "Next").click();
    await expect(idCells(root)).toHaveText(orderIds(21, 30));

    expect(await ariaRowCount(root)).toBe(serverOrders.length + 1);
    await expect(dataRows(root).first()).toHaveAttribute("aria-rowindex", "22");
    await expect(dataRows(root).last()).toHaveAttribute("aria-rowindex", "31");
  });

  test("counts the grand-total footer after the server's rows", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <ServerDataGrid aggregates={[{ columnId: "total", fn: "sum" }]} />,
    );
    await expect(idCells(root)).toHaveText(orderIds(1, 10));

    expect(await ariaRowCount(root)).toBe(serverOrders.length + 2);
    await expect(root.locator("tr.gridkit-grid-footer")).toHaveAttribute(
      "aria-rowindex",
      String(serverOrders.length + 2),
    );
  });

  test("pages forward, back and to either end, asking the server for each page", async ({
    mount,
  }) => {
    const root = await mountGrid(mount, <ServerDataGrid />);
    await expect(idCells(root)).toHaveText(orderIds(1, 10));
    await expect(pagerButton(root, "Previous")).toBeDisabled();

    await pagerButton(root, "Next").click();
    await expect(idCells(root)).toHaveText(orderIds(11, 20));
    await expect(pagerStatus(root)).toHaveText("Page 2 of 10");

    await pagerButton(root, "Last").click();
    await expect(idCells(root)).toHaveText(orderIds(91, 95));
    await expect(pagerStatus(root)).toHaveText("Page 10 of 10");
    await expect(pagerButton(root, "Next")).toBeDisabled();
    await expect(dataRows(root).first()).toHaveAttribute("aria-rowindex", "92");

    await pagerButton(root, "Previous").click();
    await expect(idCells(root)).toHaveText(orderIds(81, 90));

    await pagerButton(root, "First").click();
    await expect(idCells(root)).toHaveText(orderIds(1, 10));
    expect((await requests(root)).map((query) => query.page.pageIndex)).toEqual(
      [0, 1, 9, 8, 0],
    );
  });

  test("the numbered pager lists the server's pages and goes to the one clicked", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <ServerDataGrid pager={{ variant: "numbered" }} />,
    );
    await expect(idCells(root)).toHaveText(orderIds(1, 10));
    await expect(pagerButton(root, "Page 10")).toBeVisible();

    await pagerButton(root, "Page 10").click();
    await expect(idCells(root)).toHaveText(orderIds(91, 95));
    await expect(pagerButton(root, "Page 10")).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("a new page size asks for the first page of that size and recounts the pages", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <ServerDataGrid pager={{ sizeOptions: [10, 25] }} />,
    );
    await pagerButton(root, "Next").click();
    await expect(idCells(root)).toHaveText(orderIds(11, 20));

    await root
      .getByRole("combobox", { name: "Rows per page" })
      .selectOption("25");
    await expect(idCells(root)).toHaveText(orderIds(1, 25));
    await expect(pagerStatus(root)).toHaveText("Page 1 of 4");
    expect((await lastRequest(root)).page).toEqual({
      pageIndex: 0,
      pageSize: 25,
    });
  });

  test("goToPage through the ref reaches the server's last page, and usePaginationState follows", async ({
    mount,
  }) => {
    const root = await mountGrid(mount, <ServerDataGrid />);
    await expect(idCells(root)).toHaveText(orderIds(1, 10));
    await expect(root.getByTestId("hook-pagination")).toHaveText(
      '{"pageIndex":0,"pageCount":10}',
    );

    await button(root, "Go to page 10").click();
    await expect(idCells(root)).toHaveText(orderIds(91, 95));
    await expect(root.getByTestId("hook-pagination")).toHaveText(
      '{"pageIndex":9,"pageCount":10}',
    );
  });

  for (const controlled of [false, true]) {
    test(`a header click asks the server for the sort and the first page, with ${controlled ? "controlled" : "uncontrolled"} state`, async ({
      mount,
    }) => {
      const root = await mountGrid(
        mount,
        <ServerDataGrid sortableColumns controlled={controlled} />,
      );
      await pagerButton(root, "Next").click();
      await expect(idCells(root)).toHaveText(orderIds(11, 20));

      await sortToggle(root, "Total").click();
      const query = await lastRequest(root);
      expect(query.sort).toEqual([{ columnId: "total", direction: "asc" }]);
      expect(query.page.pageIndex).toBe(0);
      await expectAnswered(root);
      await expect(header(root, "Total")).toHaveAttribute(
        "aria-sort",
        "ascending",
      );
      await expect(pagerStatus(root)).toHaveText("Page 1 of 10");
    });
  }

  test("shows the rows in the order the server gives them", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <ServerDataGrid sortableColumns pageSize={95} />,
    );
    await expect(idCells(root)).toHaveCount(95);

    await sortToggle(root, "Customer").click();
    await expectAnswered(root);
    // Text order, as the server sorts, so "Customer 10" comes before
    // "Customer 2"; the grid re-sorting would give the same, so the rows
    // are checked against the server's answer rather than a sort of them.
    const ids = await answeredIds(root);
    expect(ids).not.toEqual(orderIds(1, 95));
    await expect(idCells(root)).toHaveText(ids);
  });

  test("a filter menu asks the server for its filter, and announces the server's count once the rows arrive", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <ServerDataGrid filterableColumns holdResponses />,
    );
    await button(root, "Answer newest").click();
    await expect(idCells(root)).toHaveText(orderIds(1, 10));

    await filterContains(root, page, "Region", "North");
    expect((await lastRequest(root)).filter).toEqual([
      {
        kind: "operator",
        columnId: "region",
        operator: "contains",
        value: "North",
      },
    ]);
    await expect(overlay(root)).toBeVisible();
    await expect(liveRegion(root)).toHaveText("Loading…");

    await button(root, "Answer newest").click();
    await expectAnswered(root);
    await expect(liveRegion(root)).toHaveText("24 rows found");
    await expect(pagerStatus(root)).toHaveText("Page 1 of 3");
    expect(await ariaRowCount(root)).toBe(25);
  });

  test("a filter the server finds nothing for shows the empty message and announces no rows", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, <ServerDataGrid filterableColumns />);
    await expect(idCells(root)).toHaveText(orderIds(1, 10));

    await filterContains(root, page, "Region", "Nowhere");
    await expect(root.locator(".gridkit-grid-empty-row")).toHaveText(
      "No rows match the current filter",
    );
    await expect(dataRows(root)).toHaveCount(0);
    await expect(liveRegion(root)).toHaveText("No rows found");
    await expect(pagerStatus(root)).toHaveText("Page 1 of 1");
  });

  test("the excel editor's checklist lists only the values on the page held", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <ServerDataGrid filterableColumns filterMenu={{ ui: "excel" }} />,
    );
    await expect(idCells(root)).toHaveText(orderIds(1, 10));

    const menu = await openFilterMenu(root, page, "Customer");
    const options = menu
      .getByRole("listbox", { name: "Values" })
      .getByRole("option");
    await expect(options).toHaveCount(10);
    await expect(options.first()).toHaveAttribute("aria-setsize", "10");

    await menu.getByRole("option", { name: "Customer 3", exact: true }).click();
    await menu.getByRole("button", { name: "OK", exact: true }).click();
    await expect(menu).toHaveCount(0);
    expect((await lastRequest(root)).filter).toHaveLength(1);
    await expectAnswered(root);
  });

  test("the toolbar's search asks the server, and announces the server's count", async ({
    mount,
  }) => {
    const root = await mountGrid(mount, <ServerDataGrid toolbar />);
    await expect(idCells(root)).toHaveText(orderIds(1, 10));

    const search = root.getByRole("searchbox", { name: "Search" });
    await search.fill("Customer 7");
    await search.press("Enter");
    await expectAnswered(root);
    await expect(idCells(root)).toHaveText(["o7", "o30", "o53", "o76"]);
    await expect(liveRegion(root)).toHaveText("4 rows found");
  });

  test("an answer that arrives after a newer request's is dropped, and the newer one stays", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <ServerDataGrid sortableColumns toolbar holdResponses />,
    );
    await button(root, "Answer newest").click();
    await expect(idCells(root)).toHaveText(orderIds(1, 10));

    await sortToggle(root, "Total").click();
    const search = root.getByRole("searchbox", { name: "Search" });
    await search.fill("North");
    await search.press("Enter");
    await expect.poll(async () => (await requests(root)).length).toBe(3);
    const newest = await answeredIds(root);

    await button(root, "Answer newest").click();
    await expect(idCells(root)).toHaveText(newest);
    await expect(overlay(root)).toHaveCount(0);
    await expect(liveRegion(root)).toHaveText("24 rows found");

    await button(root, "Answer oldest").click();
    await expect(idCells(root)).toHaveText(newest);
    await expect(pagerStatus(root)).toHaveText("Page 1 of 3");
  });

  test("keeps the rows shown under the overlay while the next page loads", async ({
    mount,
  }) => {
    const root = await mountGrid(mount, <ServerDataGrid holdResponses />);
    await button(root, "Answer newest").click();
    await expect(idCells(root)).toHaveText(orderIds(1, 10));

    await pagerButton(root, "Next").click();
    await expect(overlay(root)).toBeVisible();
    await expect(overlay(root)).not.toHaveClass(/is-empty/);
    await expect(idCells(root)).toHaveText(orderIds(1, 10));

    await button(root, "Answer newest").click();
    await expect(idCells(root)).toHaveText(orderIds(11, 20));
    await expect(overlay(root)).toHaveCount(0);
  });

  test("a selected row keeps its id on another page, where getSelectedRows leaves it out", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <ServerDataGrid selectable={{ rows: "multiple" }} />,
    );
    const first = root.locator('tr[data-gridkit-row-id="o1"]');
    await first.locator("td").first().click();
    await expect(first).toHaveAttribute("aria-selected", "true");

    await pagerButton(root, "Next").click();
    await expect(idCells(root)).toHaveText(orderIds(11, 20));
    await button(root, "Read selection").click();
    await expect(root.getByTestId("selection")).toHaveText(
      '{"ids":["o1"],"rows":[]}',
    );

    await pagerButton(root, "Previous").click();
    await expect(idCells(root)).toHaveText(orderIds(1, 10));
    await expect(first).toHaveAttribute("aria-selected", "true");
    await button(root, "Read selection").click();
    await expect(root.getByTestId("selection")).toHaveText(
      '{"ids":["o1"],"rows":["o1"]}',
    );
  });

  test("scrollToRow does nothing for a row on another page", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <ServerDataGrid height={160} scrollRowId="o50" />,
    );
    await expect(idCells(root)).toHaveText(orderIds(1, 10));
    const area = root.locator(".gridkit-data-grid-tables");
    await area.evaluate((element) => {
      element.scrollTop = 40;
    });

    await button(root, "Scroll to row").click();
    expect(await area.evaluate((element) => element.scrollTop)).toBe(40);
  });

  test("keeps the focused cell's place on the next page", async ({ mount }) => {
    const root = await mountGrid(mount, <ServerDataGrid />);
    await expect(idCells(root)).toHaveText(orderIds(1, 10));
    const cell = (rowId: string) =>
      root.locator(
        `tr[data-gridkit-row-id="${rowId}"] td[data-gridkit-column="customer"]`,
      );
    await cell("o3").click();
    await expect(cell("o3")).toHaveAttribute("tabindex", "0");

    await button(root, "Go to page 10").click();
    await expect(idCells(root)).toHaveText(orderIds(91, 95));
    await expect(cell("o93")).toHaveAttribute("tabindex", "0");
    await expect(root.getByRole("grid").locator('[tabindex="0"]')).toHaveCount(
      1,
    );
  });

  test("virtualizes the rows of a long page, numbering them from the pages before it", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <ServerDataGrid pageSize={50} virtualized height={200} />,
    );
    await expect(idCells(root).first()).toHaveText("o1");
    expect(await dataRows(root).count()).toBeLessThan(50);

    await pagerButton(root, "Next").click();
    await expect(idCells(root).first()).toHaveText("o51");
    await expect(dataRows(root).first()).toHaveAttribute("aria-rowindex", "52");
    expect(await dataRows(root).count()).toBeLessThan(45);

    const area = root.locator(".gridkit-data-grid-tables");
    await area.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await expect(dataRows(root).last()).toHaveAttribute(
      "data-gridkit-row-id",
      "o95",
    );
    await expect(dataRows(root).last()).toHaveAttribute("aria-rowindex", "96");
  });
});

test.describe("the rowCount warning", () => {
  test("a paginated server grid without rowCount warns", async ({
    mount,
    page,
  }) => {
    const errors = recordErrors(page);
    await mountGrid(mount, <ServerDataGrid withoutRowCount />);

    await expect
      .poll(() => errors.some((error) => error.includes("needs `rowCount`")))
      .toBe(true);
  });

  test("a server grid with rowCount warns of nothing", async ({
    mount,
    page,
  }) => {
    const errors = recordErrors(page);
    const root = await mountGrid(mount, <ServerDataGrid />);
    await expect(idCells(root)).toHaveText(orderIds(1, 10));
    expect(errors.filter((error) => error.includes("rowCount"))).toEqual([]);
  });

  test("a paginated client grid warns of nothing", async ({ mount, page }) => {
    const errors = recordErrors(page);
    await mountGrid(
      mount,
      <DataGrid
        columns={serverOrderColumns}
        dataSource={serverOrders}
        label="Client orders"
        paginated
      />,
    );
    expect(errors.filter((error) => error.includes("rowCount"))).toEqual([]);
  });
});

test.describe("infinite scroll under server mode", () => {
  function scrollToBottom(root: MountResult): Promise<void> {
    return root.locator(".gridkit-data-grid-tables").evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
  }

  test("appends each chunk the server sends, counting the server's rows", async ({
    mount,
  }) => {
    const root = await mountGrid(mount, <ServerInfiniteGrid height={200} />);
    await expect(idCells(root)).toHaveText(orderIds(1, 20));
    expect(await ariaRowCount(root)).toBe(serverOrders.length + 1);

    await scrollToBottom(root);
    await expect(idCells(root)).toHaveText(orderIds(1, 40));
    await expect(dataRows(root).last()).toHaveAttribute("aria-rowindex", "41");
  });

  test("keeps the rows in the order the server sends them, under a sort the server ignored", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <ServerInfiniteGrid height={200} sortableColumns serverSorts={false} />,
    );
    await expect(idCells(root)).toHaveText(orderIds(1, 20));

    await sortToggle(root, "Total").click();
    await expect(header(root, "Total")).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
    await expect(root.getByTestId("load-count")).toHaveText("2");
    await expect(idCells(root)).toHaveText(orderIds(1, 20));

    await scrollToBottom(root);
    await expect(idCells(root)).toHaveText(orderIds(1, 40));
  });

  test("a sort change starts the list again from the server's first chunk", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <ServerInfiniteGrid height={200} sortableColumns />,
    );
    await expect(idCells(root)).toHaveText(orderIds(1, 20));
    await scrollToBottom(root);
    await expect(idCells(root)).toHaveCount(40);

    await sortToggle(root, "Total").click();
    const sorted = answerOrders({
      sort: [{ columnId: "total", direction: "asc" }],
      filter: [],
      page: { pageIndex: 0, pageSize: 20 },
    }).rows.map((row) => row.id);
    await expect(idCells(root)).toHaveText(sorted);
  });
});
