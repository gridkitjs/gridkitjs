// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import type { Locator, Page } from "@playwright/test";
import type { MountResult } from "@playwright/experimental-ct-react";
import { expect, test } from "./support/coverage";
import ClipboardGrid from "./support/ClipboardGrid";
import { mountGrid } from "./support/mountGrid";

test.use({ permissions: ["clipboard-read", "clipboard-write"] });

interface ClipboardRead {
  readonly text: string | null;
  readonly html: string | null;
}

/**
 * What the clipboard holds now, by type; `null` for a type it lacks. Text
 * comes back with the platform's line ends — CRLF on Windows — so they are
 * read as LF, as the grid wrote them.
 */
function readClipboard(page: Page): Promise<ClipboardRead> {
  return page.evaluate(async () => {
    const [item] = await navigator.clipboard.read();
    async function read(type: string): Promise<string | null> {
      return item?.types.includes(type)
        ? (await (await item.getType(type)).text()).replace(/\r\n/g, "\n")
        : null;
    }
    return { text: await read("text/plain"), html: await read("text/html") };
  });
}

/** Empties the clipboard, so a spec can tell that nothing was written. */
async function clearClipboard(page: Page): Promise<void> {
  await page.evaluate(() => navigator.clipboard.writeText(""));
}

/** The body cell in row `row`, column `column`, both counted from zero. */
function bodyCell(root: MountResult, row: number, column: number): Locator {
  return root.locator("tbody tr").nth(row).locator("td").nth(column);
}

function status(root: MountResult): Locator {
  return root.locator('[role="status"]');
}

/** Right-clicks `cell` and chooses `name` from its row's menu. */
async function chooseFromMenu(
  page: Page,
  cell: Locator,
  name: string,
): Promise<void> {
  await cell.click({ button: "right" });
  await page
    .getByRole("menu", { name: "Row menu" })
    .getByRole("menuitem", { name, exact: true })
    .click();
}

/** Notes, on the page's body, whether the grid prevented the next C pressed. */
async function recordCopyKey(page: Page): Promise<Locator> {
  await page.evaluate(() => {
    window.addEventListener("keydown", (event) => {
      if (event.key === "c") {
        document.body.dataset.prevented = String(event.defaultPrevented);
      }
    });
  });
  return page.locator("body");
}

test.describe("from the context menu", () => {
  test("Copy cell puts the cell's text and a one-cell table on the clipboard", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, <ClipboardGrid contextMenu />);

    await chooseFromMenu(page, bodyCell(root, 1, 1), "Copy cell");

    await expect(status(root)).toHaveText("1 cell copied");
    const copied = await readClipboard(page);
    expect(copied.text).toBe("East");
    expect(copied.html).toContain(
      '<table class="gridkit-export-table"><tbody><tr><td>East</td></tr></tbody></table>',
    );
  });

  test("Copy row copies the row's shown, exportable cells, without a header", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, <ClipboardGrid contextMenu />);

    await chooseFromMenu(page, bodyCell(root, 1, 0), "Copy row");

    await expect(status(root)).toHaveText("1 row copied");
    const copied = await readClipboard(page);
    expect(copied.text).toBe("Bravo\tEast\t9");
    expect(copied.html).toContain(
      '<tbody><tr><td>Bravo</td><td>East</td><td style="text-align:right">9</td></tr></tbody>',
    );
    expect(copied.html).not.toContain("<thead>");
    for (const absent of ["B2", "second", "Code", "Notes", "Comment"]) {
      expect(copied.html).not.toContain(absent);
    }
  });

  test("Copy selection copies the selected rows, in grid order, under a header", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <ClipboardGrid contextMenu selectable={{ rows: "multiple" }} />,
    );
    await bodyCell(root, 2, 0).click();
    await bodyCell(root, 0, 0).click({ modifiers: ["ControlOrMeta"] });

    await chooseFromMenu(page, bodyCell(root, 0, 1), "Copy selection");

    await expect(status(root)).toHaveText("2 rows copied");
    const copied = await readClipboard(page);
    expect(copied.text).toBe(
      "Name\tRegion\tScore\nAlice\tWest\t30\nCharlie\tWest\t21",
    );
    expect(copied.html).toContain(
      '<thead><tr><th>Name</th><th>Region</th><th style="text-align:right">Score</th></tr></thead>',
    );
  });

  test("Copy cell is disabled on a column that never leaves the grid", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, <ClipboardGrid contextMenu />);

    await bodyCell(root, 0, 3).click({ button: "right" });

    await expect(
      page
        .getByRole("menu", { name: "Row menu" })
        .getByRole("menuitem", { name: "Copy cell", exact: true }),
    ).toHaveAttribute("aria-disabled", "true");
  });
});

test.describe("with the keyboard", () => {
  test("Ctrl+C copies the selected rows", async ({ mount, page }) => {
    const root = await mountGrid(
      mount,
      <ClipboardGrid selectable={{ rows: "multiple" }} />,
    );
    const body = await recordCopyKey(page);
    await bodyCell(root, 0, 0).click();
    await bodyCell(root, 1, 0).click({ modifiers: ["Shift"] });

    await page.keyboard.press("ControlOrMeta+c");

    await expect(status(root)).toHaveText("2 rows copied");
    await expect(body).toHaveAttribute("data-prevented", "true");
    expect((await readClipboard(page)).text).toBe(
      "Name\tRegion\tScore\nAlice\tWest\t30\nBravo\tEast\t9",
    );
  });

  test("Ctrl+C on a header copies the selected column under its header", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <ClipboardGrid selectable={{ columns: "multiple" }} />,
    );
    await root.getByRole("columnheader", { name: "Score" }).click();

    await page.keyboard.press("ControlOrMeta+c");

    await expect(status(root)).toHaveText("1 column copied");
    expect((await readClipboard(page)).text).toBe("Score\n30\n9\n21");
  });

  test("Ctrl+C with nothing selected copies the focused cell", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, <ClipboardGrid />);
    await bodyCell(root, 1, 2).click();

    await page.keyboard.press("ControlOrMeta+c");

    await expect(status(root)).toHaveText("1 cell copied");
    expect((await readClipboard(page)).text).toBe("9");
  });

  test("Ctrl+C on a header with nothing selected is left to the browser", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, <ClipboardGrid />);
    const body = await recordCopyKey(page);
    await root.getByRole("columnheader", { name: "Name" }).click();

    await page.keyboard.press("ControlOrMeta+c");

    await expect(body).toHaveAttribute("data-prevented", "false");
    await expect(status(root)).toHaveText("");
  });

  test("Ctrl+C with text highlighted in a cell copies that text", async ({
    mount,
    page,
  }) => {
    // Nothing selectable: a selectable row is drawn `user-select: none`.
    const root = await mountGrid(mount, <ClipboardGrid />);
    const cell = bodyCell(root, 1, 0);
    await cell.click();
    await clearClipboard(page);
    // "rav" of "Bravo": not the whole cell, which the grid would copy too.
    await cell.evaluate((element) => {
      const text = document
        .createTreeWalker(element, NodeFilter.SHOW_TEXT)
        .nextNode();
      if (text === null) throw new Error("the cell has no text");
      const range = document.createRange();
      range.setStart(text, 1);
      range.setEnd(text, 4);
      document.getSelection()?.removeAllRanges();
      document.getSelection()?.addRange(range);
    });

    await page.keyboard.press("ControlOrMeta+c");

    await expect.poll(async () => (await readClipboard(page)).text).toBe("rav");
    await expect(status(root)).toHaveText("");
  });

  test("Ctrl+C in a text field inside a cell copies the field's text", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, <ClipboardGrid />);
    const field = root.getByRole("textbox", { name: "Comment on Alice" });
    await field.click();
    await clearClipboard(page);
    await field.selectText();

    await page.keyboard.press("ControlOrMeta+c");

    await expect
      .poll(async () => (await readClipboard(page)).text)
      .toBe("first");
    await expect(status(root)).toHaveText("");
  });
});

test("the ref copies through runCommand", async ({ mount, page }) => {
  const root = await mountGrid(mount, <ClipboardGrid />);

  await root.getByRole("button", { name: "Copy row Bravo" }).click();

  await expect(status(root)).toHaveText("1 row copied");
  expect((await readClipboard(page)).text).toBe("Bravo\tEast\t9");
});

test("of two copies close together, only the latest is announced", async ({
  mount,
  page,
}) => {
  const root = await mountGrid(mount, <ClipboardGrid />);
  await page.evaluate(() => {
    const clipboard = navigator.clipboard;
    const write = clipboard.write.bind(clipboard);
    let writes = 0;
    // The first write lands at once but takes 300ms to say so.
    clipboard.write = async (items) => {
      writes += 1;
      await write(items);
      if (writes === 1) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        document.body.dataset.slowWriteDone = "true";
      }
    };
    const announced: string[] = [];
    const region = document.querySelector('[role="status"]');
    if (region === null) throw new Error("no live region");
    new MutationObserver(() => {
      announced.push(region.textContent.trim());
      document.body.dataset.announced = JSON.stringify(announced);
    }).observe(region, { childList: true, characterData: true });
  });

  await root.getByRole("button", { name: "Copy row Bravo" }).click();
  await bodyCell(root, 2, 0).click();
  await page.keyboard.press("ControlOrMeta+c");

  const body = page.locator("body");
  await expect(body).toHaveAttribute("data-slow-write-done", "true");
  await expect(status(root)).toHaveText("1 cell copied");
  expect(await body.getAttribute("data-announced")).toBe(
    JSON.stringify(["1 cell copied"]),
  );
  expect((await readClipboard(page)).text).toBe("Charlie");
});

test.describe("fallbacks", () => {
  test("without ClipboardItem, the plain text alone is written", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, <ClipboardGrid />);
    await page.evaluate(() => Reflect.deleteProperty(window, "ClipboardItem"));
    await bodyCell(root, 0, 0).click();

    await page.keyboard.press("ControlOrMeta+c");

    await expect(status(root)).toHaveText("1 cell copied");
    expect(await readClipboard(page)).toEqual({ text: "Alice", html: null });
  });

  test("outside the async Clipboard API, the copy event writes both types and focus comes back", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, <ClipboardGrid />);
    await page.evaluate(() =>
      Object.defineProperty(navigator, "clipboard", {
        value: undefined,
        configurable: true,
      }),
    );
    const cell = bodyCell(root, 2, 1);
    await cell.click();

    await page.keyboard.press("ControlOrMeta+c");

    await expect(status(root)).toHaveText("1 cell copied");
    await expect(cell).toBeFocused();
    await page.evaluate(() => Reflect.deleteProperty(navigator, "clipboard"));
    const copied = await readClipboard(page);
    expect(copied.text).toBe("West");
    expect(copied.html).toContain("<td>West</td>");
  });

  test("a copy the browser refuses is announced and logged", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, <ClipboardGrid />);
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.evaluate(() => {
      Object.defineProperty(navigator, "clipboard", {
        value: undefined,
        configurable: true,
      });
      Object.defineProperty(document, "execCommand", { value: () => false });
    });
    await bodyCell(root, 0, 0).click();

    await page.keyboard.press("ControlOrMeta+c");

    await expect(status(root)).toHaveText("Copy failed");
    expect(errors.join("\n")).toContain(
      "DataGrid: the clipboard could not be written.",
    );
  });
});
