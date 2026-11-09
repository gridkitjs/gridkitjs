// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import type { MountResult } from "@playwright/experimental-ct-react";
import type { Page } from "@playwright/test";
import { expect, test } from "./support/coverage";
import { mountGrid } from "./support/mountGrid";
import PrintGrid from "./support/PrintGrid";
import PrintHarness from "./support/PrintHarness";
import type { RecordedPrint } from "./support/printRecorder";

/** Every print the harness saw open, in order. */
async function printsOf(root: MountResult): Promise<RecordedPrint[]> {
  const text = await root.getByTestId("prints").textContent();
  return JSON.parse(text ?? "[]") as RecordedPrint[];
}

/** The print frame, which `printDocument` puts straight into `document.body`. */
function printFrames(page: Page) {
  return page.locator("body > iframe");
}

interface TrackedWindow {
  trackedReturnListeners: Set<unknown>;
}

/**
 * Starts tracking the `pointerdown` and `keydown` listeners added to
 * `window` from now on, and returns a reader for how many are still
 * attached. An open print listens there for the user coming back to the
 * page, so a count left above zero once it has settled is a print that
 * never cleaned up.
 */
async function trackReturnListeners(
  page: Page,
): Promise<() => Promise<number>> {
  await page.evaluate(() => {
    const types = new Set(["pointerdown", "keydown"]);
    const tracked = new Set<unknown>();
    const add: EventTarget["addEventListener"] =
      window.addEventListener.bind(window);
    const remove: EventTarget["removeEventListener"] =
      window.removeEventListener.bind(window);
    Object.assign(window, {
      trackedReturnListeners: tracked,
      addEventListener(...args: Parameters<EventTarget["addEventListener"]>) {
        if (types.has(args[0])) {
          tracked.add(args[1]);
        }
        add(...args);
      },
      removeEventListener(
        ...args: Parameters<EventTarget["removeEventListener"]>
      ) {
        if (types.has(args[0])) {
          tracked.delete(args[1]);
        }
        remove(...args);
      },
    });
  });
  return () =>
    page.evaluate(
      () => (window as unknown as TrackedWindow).trackedReturnListeners.size,
    );
}

test.describe("printDocument", () => {
  test("prints the document in a hidden frame, then removes it", async ({
    mount,
    page,
  }) => {
    const root = await mount(<PrintHarness />);
    await root.getByRole("button", { name: "Print", exact: true }).click();

    await expect(root.getByTestId("settled")).toHaveText("first");
    const prints = await printsOf(root);
    expect(prints).toHaveLength(1);
    const [print] = prints;
    expect(print?.frame).toEqual({ ariaHidden: "true", width: 0, height: 0 });
    await expect(printFrames(page)).toHaveCount(0);
  });

  test("gives the frame the title, the stylesheet and every row", async ({
    mount,
  }) => {
    const root = await mount(<PrintHarness />);
    await root.getByRole("button", { name: "Print", exact: true }).click();
    await expect(root.getByTestId("settled")).toHaveText("first");

    const [print] = await printsOf(root);
    expect(print?.title).toBe("Orders <Q1>");
    expect(print?.styles).toContain("@page { size: A4 portrait; margin: 12mm;");
    expect(print?.styles).toContain(
      ".gridkit-export-table thead { display: table-header-group; }",
    );
    expect(print?.styles).toContain(".app-extra { color: red; }");
    expect(print?.bodyHtml).toContain(
      '<h1 class="print-title">Orders &lt;Q1&gt;</h1>',
    );
    expect(print?.bodyHtml.match(/<tr>/g)).toHaveLength(3);
    expect(print?.bodyHtml).toContain("<td>&lt;Bravo&gt;</td>");
  });

  test("refuses a second print while one is open", async ({ mount }) => {
    const root = await mount(<PrintHarness />);
    await root.getByRole("button", { name: "Print twice" }).click();

    // The second settles at once, without printing; the first once printed.
    await expect(root.getByTestId("settled")).toHaveText("second,first");
    expect(await printsOf(root)).toHaveLength(1);
  });

  test("prints again once the last print is over", async ({ mount }) => {
    const root = await mount(<PrintHarness />);
    const print = root.getByRole("button", { name: "Print", exact: true });
    await print.click();
    await expect(root.getByTestId("settled")).toHaveText("first");
    await print.click();

    await expect(root.getByTestId("settled")).toHaveText("first,first");
    expect(await printsOf(root)).toHaveLength(2);
  });

  test("a print whose dialog fails to open rejects, removes its listeners and lets the next print run", async ({
    mount,
    page,
  }) => {
    const root = await mount(<PrintHarness />);
    const returnListeners = await trackReturnListeners(page);
    await root.getByRole("button", { name: "Print, failing" }).click();

    await expect(root.getByTestId("settled")).toHaveText("first failed");
    await expect(printFrames(page)).toHaveCount(0);
    expect(await returnListeners()).toBe(0);

    await root.getByRole("button", { name: "Print", exact: true }).click();
    await expect(root.getByTestId("settled")).toHaveText("first failed,first");
    expect(await printsOf(root)).toHaveLength(1);
  });

  test("a frame taken away before it loads rejects, and the next print runs", async ({
    mount,
  }) => {
    const root = await mount(<PrintHarness />);
    await root.getByRole("button", { name: "Print, frame taken away" }).click();
    await expect(root.getByTestId("settled")).toHaveText("first failed");

    await root.getByRole("button", { name: "Print", exact: true }).click();
    await expect(root.getByTestId("settled")).toHaveText("first failed,first");
    expect(await printsOf(root)).toHaveLength(1);
  });

  test("a print whose fonts never report ready prints without them, and the next print runs", async ({
    mount,
  }) => {
    const root = await mount(<PrintHarness />);
    await root
      .getByRole("button", { name: "Print, fonts never ready" })
      .click();
    await expect(root.getByTestId("settled")).toHaveText("first", {
      timeout: 10_000,
    });
    expect(await printsOf(root)).toHaveLength(1);

    await root.getByRole("button", { name: "Print", exact: true }).click();
    await expect(root.getByTestId("settled")).toHaveText("first,first");
    expect(await printsOf(root)).toHaveLength(2);
  });

  test("gives focus back where it was", async ({ mount }) => {
    const root = await mount(<PrintHarness />);
    const print = root.getByRole("button", { name: "Print", exact: true });
    await print.focus();
    await print.press("Enter");

    await expect(root.getByTestId("settled")).toHaveText("first");
    await expect(print).toBeFocused();
  });
});

/** The opening tag of every row in the printed table's body, data and group rows alike. */
function bodyRows(print: RecordedPrint | undefined): string[] {
  const body = /<tbody>(.*)<\/tbody>/s.exec(print?.bodyHtml ?? "")?.[1] ?? "";
  return body.match(/<tr[^>]*>/g) ?? [];
}

/** The printed table's column headers, in order. */
function printedHeaders(print: RecordedPrint | undefined): string[] {
  const head = /<thead>(.*)<\/thead>/s.exec(print?.bodyHtml ?? "")?.[1] ?? "";
  return [...head.matchAll(/<th[^>]*>([^<]*)<\/th>/g)].map(
    (match) => match[1] ?? "",
  );
}

/** Waits for the grid fixture to have seen `count` prints, and returns them. */
async function waitForPrints(
  root: MountResult,
  count: number,
): Promise<RecordedPrint[]> {
  await expect.poll(async () => (await printsOf(root)).length).toBe(count);
  return printsOf(root);
}

function printButton(root: MountResult) {
  return root.locator('[data-gridkit-toolbar-item="print"]');
}

test.describe("printing the grid", () => {
  test("the toolbar's Print prints every filtered row of a paginated grid", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <PrintGrid
        rowCount={30}
        toolbar={{ items: ["print"] }}
        paginated
        defaultPagination={{ pageIndex: 0, pageSize: 5 }}
        defaultFilter={[{ columnId: "region", query: "West" }]}
      />,
    );
    await expect(printButton(root)).toHaveText("Print");
    await printButton(root).click();

    const [print] = await waitForPrints(root, 1);
    expect(bodyRows(print)).toHaveLength(15);
    expect(print?.bodyHtml).toContain("<td>Name 29</td>");
    expect(print?.bodyHtml).not.toContain("<td>Name 2</td>");
  });

  test("print() prints every row of a virtualised grid, not only those drawn", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <PrintGrid rowCount={200} virtualized height={200} />,
    );
    const drawn = root.locator("tbody tr[data-gridkit-row-index]");
    expect(await drawn.count()).toBeLessThan(200);

    await root.getByRole("button", { name: "Print through the ref" }).click();

    await expect(root.getByTestId("settled")).toHaveText("1");
    const [print] = await printsOf(root);
    expect(bodyRows(print)).toHaveLength(200);
  });

  test("prints group header rows alongside every row, collapsed groups included", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <PrintGrid
        rowCount={6}
        toolbar={{ items: ["print"] }}
        defaultGroupBy={[{ columnId: "region" }]}
        defaultGroupExpansion={['["East"]']}
      />,
    );
    await expect(
      root.getByRole("gridcell", { name: "Name 2", exact: true }),
    ).toHaveCount(0);
    await printButton(root).click();

    const [print] = await waitForPrints(root, 1);
    const rows = bodyRows(print);
    expect(rows).toHaveLength(8);
    expect(rows.filter((row) => row.includes("export-group"))).toHaveLength(2);
  });

  test("titles the print with the grid's label when it has no title", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <PrintGrid toolbar={{ items: ["print"] }} />,
    );
    await printButton(root).click();

    const [print] = await waitForPrints(root, 1);
    expect(print?.title).toBe("Print grid");
    expect(print?.bodyHtml).toContain(
      '<h1 class="print-title">Print grid</h1>',
    );
  });

  test("prints under the print option, a call's options over it", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <PrintGrid
        toolbar={{ items: ["print"] }}
        print={{
          title: "Orders",
          subtitle: "All regions",
          footer: "Confidential",
          styles: ".print-title { color: navy; }",
        }}
        printOptions={{ subtitle: "West only" }}
      />,
    );
    await printButton(root).click();
    await waitForPrints(root, 1);
    await root.getByRole("button", { name: "Print through the ref" }).click();

    const [fromToolbar, fromRef] = await waitForPrints(root, 2);
    expect(fromToolbar?.title).toBe("Orders");
    expect(fromToolbar?.bodyHtml).toContain(
      '<p class="print-subtitle">All regions</p>',
    );
    expect(fromToolbar?.bodyHtml).toContain(
      '<footer class="gridkit-print-footer">Confidential</footer>',
    );
    expect(fromToolbar?.styles).toContain("@page { size: A4 portrait;");
    expect(fromToolbar?.styles).toContain(".print-title { color: navy; }");
    expect(fromRef?.title).toBe("Orders");
    expect(fromRef?.bodyHtml).toContain(
      '<p class="print-subtitle">West only</p>',
    );
    expect(fromRef?.styles).toContain(".print-title { color: navy; }");
  });

  test("turns a table of more than six columns landscape", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <PrintGrid wide toolbar={{ items: ["print"] }} />,
    );
    await printButton(root).click();

    const [print] = await waitForPrints(root, 1);
    expect(printedHeaders(print)).toHaveLength(7);
    expect(print?.styles).toContain("@page { size: A4 landscape;");
  });

  test("leaves out hidden and unexportable columns", async ({ mount }) => {
    const root = await mountGrid(
      mount,
      <PrintGrid toolbar={{ items: ["print"] }} />,
    );
    await printButton(root).click();

    const [print] = await waitForPrints(root, 1);
    expect(printedHeaders(print)).toEqual(["Name", "Region", "Score"]);
    expect(print?.bodyHtml).not.toContain("secret");
  });

  test("prints from the keyboard, and gives focus back to the button", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <PrintGrid toolbar={{ items: ["print"] }} />,
    );
    await printButton(root).focus();
    await printButton(root).press("Enter");

    await waitForPrints(root, 1);
    await expect(printButton(root)).toBeFocused();
  });

  test("prints from a cell's menu when listed", async ({ mount, page }) => {
    const root = await mountGrid(
      mount,
      <PrintGrid contextMenu={{ cell: ["print"] }} />,
    );
    await root
      .getByRole("gridcell", { name: "Name 2" })
      .click({ button: "right" });
    await page
      .getByRole("menu", { name: "Row menu" })
      .getByRole("menuitem", { name: "Print" })
      .click();

    const [print] = await waitForPrints(root, 1);
    expect(bodyRows(print)).toHaveLength(4);
  });

  test("a print that fails is logged and announced", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <PrintGrid toolbar={{ items: ["print"] }} />,
    );
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    // The print frame is taken away as soon as it is added, before it loads.
    await page.evaluate(() => {
      const observer = new MutationObserver((records) => {
        const frame = records
          .flatMap((record) => [...record.addedNodes])
          .find((node) => node instanceof HTMLIFrameElement);
        if (frame !== undefined) {
          observer.disconnect();
          frame.remove();
        }
      });
      observer.observe(document.body, { childList: true });
    });
    await printButton(root).click();

    await expect(root.locator('[role="status"]')).toHaveText("Print failed");
    await expect
      .poll(() => errors)
      .toContainEqual(expect.stringContaining("print failed"));
  });
});

test.describe("the theme's print media styles", () => {
  test("hide the toolbar and pager, and let every drawn row flow", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <PrintGrid
        rowCount={20}
        height={120}
        toolbar={{ items: ["print"] }}
        paginated
        defaultPagination={{ pageIndex: 0, pageSize: 20 }}
      />,
    );
    const body = root.locator(".gridkit-data-grid-body");
    await expect(body).toHaveCSS("height", "120px");

    await page.emulateMedia({ media: "print" });

    await expect(root.locator(".gridkit-toolbar")).toBeHidden();
    await expect(root.locator(".gridkit-grid-pager")).toBeHidden();
    await expect(body).toHaveCSS("overflow-y", "visible");
    const heights = await body.evaluate((element) => ({
      body: element.getBoundingClientRect().height,
      rows: element.querySelector("table")?.getBoundingClientRect().height,
    }));
    expect(heights.body).toBeGreaterThan(120);
    expect(heights.body).toBeCloseTo(heights.rows ?? 0, 0);
  });
});
