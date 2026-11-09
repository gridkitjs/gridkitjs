// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import { readFile } from "node:fs/promises";
import type { Locator, Page } from "@playwright/test";
import type { MountResult } from "@playwright/experimental-ct-react";
import { strFromU8, unzipSync } from "fflate";
import { expect, test } from "./support/coverage";
import { mountGrid } from "./support/mountGrid";
import ExportGrid from "./support/ExportGrid";

/** Written as an escape: an editor or shell can turn the literal into nothing. */
const BOM = String.fromCharCode(0xfeff);

/** The fixture's four rows as CSV: the shown, exportable columns only. */
const ALL_ROWS_CSV = [
  "Name,Region,Score",
  "Alice,West,30",
  "Bravo,East,9",
  "Charlie,West,21",
  "Delta,East,14",
].join("\r\n");

interface Downloaded {
  readonly name: string;
  readonly text: string;
}

/** Runs `action` and reads the bytes of the file it downloads. */
async function downloadBytes(
  page: Page,
  action: () => Promise<void>,
): Promise<{ readonly name: string; readonly bytes: Buffer }> {
  const [file] = await Promise.all([page.waitForEvent("download"), action()]);
  return {
    name: file.suggestedFilename(),
    bytes: await readFile(await file.path()),
  };
}

/** Runs `action` and reads the file it downloads, as text. */
async function download(
  page: Page,
  action: () => Promise<void>,
): Promise<Downloaded> {
  const { name, bytes } = await downloadBytes(page, action);
  return { name, text: bytes.toString("utf8") };
}

function exportButton(root: MountResult): Locator {
  return root.locator('[data-gridkit-toolbar-item="export"]');
}

function exportMenu(page: Page): Locator {
  return page.getByRole("menu", { name: "Export" });
}

/** Opens the toolbar's Export dropdown and reads its items' names. */
async function exportItems(root: MountResult, page: Page): Promise<string[]> {
  await exportButton(root).click();
  const menu = exportMenu(page);
  await expect(menu).toBeVisible();
  return menu.getByRole("menuitem").allTextContents();
}

/** What "Export data" or "Export lines" wrote: the `Blob`, or the rejection. */
async function exportResult(
  root: MountResult,
  button: "Export data" | "Export lines",
): Promise<string> {
  await root.getByRole("button", { name: button }).click();
  const result = root.getByTestId("result");
  await expect(result).not.toBeEmpty();
  return (await result.textContent()) ?? "";
}

test.describe("the toolbar's Export dropdown", () => {
  test("lists CSV and JSON, and downloads each as a named file", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <ExportGrid toolbar={{ items: ["export"] }} />,
    );

    expect(await exportItems(root, page)).toEqual([
      "Export to CSV",
      "Export to JSON",
    ]);
    const csv = await download(page, () =>
      exportMenu(page).getByRole("menuitem", { name: "Export to CSV" }).click(),
    );
    expect(csv).toEqual({ name: "export.csv", text: BOM + ALL_ROWS_CSV });
    await expect(exportMenu(page)).toHaveCount(0);

    await exportButton(root).click();
    const json = await download(page, () =>
      exportMenu(page)
        .getByRole("menuitem", { name: "Export to JSON" })
        .click(),
    );
    expect(json.name).toBe("export.json");
    expect(JSON.parse(json.text)).toEqual([
      { name: "Alice", region: "West", score: 30 },
      { name: "Bravo", region: "East", score: 9 },
      { name: "Charlie", region: "West", score: 21 },
      { name: "Delta", region: "East", score: 14 },
    ]);
  });

  test("works from the keyboard", async ({ mount, page }) => {
    const root = await mountGrid(
      mount,
      <ExportGrid toolbar={{ items: ["export"] }} />,
    );
    const menu = exportMenu(page);

    await exportButton(root).focus();
    await page.keyboard.press("Enter");
    await expect(
      menu.getByRole("menuitem", { name: "Export to CSV" }),
    ).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(
      menu.getByRole("menuitem", { name: "Export to JSON" }),
    ).toBeFocused();

    const json = await download(page, () => page.keyboard.press("Enter"));
    expect(json.name).toBe("export.json");
    await expect(menu).toHaveCount(0);
    await expect(exportButton(root)).toBeFocused();
  });

  test("offers the selection's exports only while rows are selected", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <ExportGrid
        selectable={{ rows: "multiple" }}
        toolbar={{ items: ["export"] }}
      />,
    );

    expect(await exportItems(root, page)).toEqual([
      "Export to CSV",
      "Export to JSON",
    ]);
    await page.keyboard.press("Escape");

    await root.getByRole("gridcell", { name: "Charlie" }).click();
    expect(await exportItems(root, page)).toEqual([
      "Export to CSV",
      "Export to JSON",
      "Export selection to CSV",
      "Export selection to JSON",
    ]);
    const csv = await download(page, () =>
      exportMenu(page)
        .getByRole("menuitem", { name: "Export selection to CSV" })
        .click(),
    );
    expect(csv.text).toBe(BOM + "Name,Region,Score\r\nCharlie,West,21");
  });

  test("names the file from the grid's export option", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <ExportGrid
        toolbar={{ items: ["export"] }}
        export={{ fileName: "players", includeHeader: false }}
      />,
    );

    await exportButton(root).click();
    const csv = await download(page, () =>
      exportMenu(page).getByRole("menuitem", { name: "Export to CSV" }).click(),
    );
    expect(csv.name).toBe("players.csv");
    expect(csv.text).toBe(
      BOM + ALL_ROWS_CSV.split("\r\n").slice(1).join("\r\n"),
    );
  });

  test("exports a collapsed group's rows", async ({ mount, page }) => {
    const root = await mountGrid(
      mount,
      <ExportGrid
        toolbar={{ items: ["export"] }}
        defaultGroupBy={[{ columnId: "region" }]}
        defaultGroupExpansion={{ mode: "allExpanded", except: ['["East"]'] }}
      />,
    );
    await expect(root.getByRole("gridcell", { name: "Bravo" })).toHaveCount(0);

    await exportButton(root).click();
    const csv = await download(page, () =>
      exportMenu(page).getByRole("menuitem", { name: "Export to CSV" }).click(),
    );
    expect(csv.text).toContain("Region: East");
    expect(csv.text).toContain("\r\nBravo,East,9\r\n");
    expect(csv.text).toContain("Delta,East,14");
  });

  test("exports every page of a paginated grid", async ({ mount, page }) => {
    const root = await mountGrid(
      mount,
      <ExportGrid
        toolbar={{ items: ["export"] }}
        paginated
        defaultPagination={{ pageIndex: 0, pageSize: 2 }}
      />,
    );
    await expect(root.getByRole("gridcell", { name: "Delta" })).toHaveCount(0);

    await exportButton(root).click();
    const csv = await download(page, () =>
      exportMenu(page).getByRole("menuitem", { name: "Export to CSV" }).click(),
    );
    expect(csv.text).toBe(BOM + ALL_ROWS_CSV);
  });
});

test.describe("export writers on the grid", () => {
  test("a registered format shows in the dropdown, and a slow writer saves once", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <ExportGrid withWriters toolbar={{ items: ["export"] }} />,
    );
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    const names: string[] = [];
    page.on("download", (file) => {
      names.push(file.suggestedFilename());
    });

    expect(await exportItems(root, page)).toEqual([
      "Export to CSV",
      "Export to JSON",
      "Export to Excel",
      "Export to PDF",
    ]);
    await exportMenu(page)
      .getByRole("menuitem", { name: "Export to Excel" })
      .click();

    // Asked for again while the first is still being written: dropped.
    await exportButton(root).click();
    await exportMenu(page)
      .getByRole("menuitem", { name: "Export to CSV" })
      .click();
    await expect
      .poll(() => errors)
      .toContainEqual(expect.stringContaining("still being written"));

    const xlsx = await download(page, () =>
      root.getByRole("button", { name: "Finish writing" }).click(),
    );
    expect(xlsx).toEqual({ name: "export.xlsx", text: "rows: 4" });

    // Written, so the next export saves.
    await exportButton(root).click();
    await download(page, () =>
      exportMenu(page).getByRole("menuitem", { name: "Export to CSV" }).click(),
    );
    expect(names).toEqual(["export.xlsx", "export.csv"]);
  });

  test("the xlsx writer shows Excel in the dropdown and downloads a workbook", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <ExportGrid
        withXlsxWriter
        toolbar={{ items: ["export"] }}
        defaultGroupBy={[{ columnId: "region" }]}
      />,
    );

    expect(await exportItems(root, page)).toEqual([
      "Export to CSV",
      "Export to JSON",
      "Export to Excel",
    ]);
    const xlsx = await downloadBytes(page, () =>
      exportMenu(page)
        .getByRole("menuitem", { name: "Export to Excel" })
        .click(),
    );

    expect(xlsx.name).toBe("export.xlsx");
    expect(xlsx.bytes.subarray(0, 2).toString("latin1")).toBe("PK");
    const parts = unzipSync(xlsx.bytes);
    const part = (path: string) => strFromU8(parts[path] ?? new Uint8Array());
    expect(part("xl/workbook.xml")).toContain('<sheet name="Players"');
    const sheet = part("xl/worksheets/sheet1.xml");
    expect(sheet).toContain(">Region: West</t>");
    expect(sheet).toContain(">Alice</t>");
    expect(sheet).toContain("<v>30</v>");
    expect(sheet).toContain('outlineLevel="1"');
  });

  test("a writer that fails is logged and announced, and saves nothing", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <ExportGrid withWriters toolbar={{ items: ["export"] }} />,
    );
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    let downloads = 0;
    page.on("download", () => {
      downloads += 1;
    });

    await exportButton(root).click();
    await exportMenu(page)
      .getByRole("menuitem", { name: "Export to PDF" })
      .click();

    await expect(root.locator('[role="status"]')).toHaveText("Export failed");
    await expect
      .poll(() => errors)
      .toContainEqual(expect.stringContaining("writer failed"));

    // No longer writing, so another export goes through.
    await exportButton(root).click();
    await download(page, () =>
      exportMenu(page).getByRole("menuitem", { name: "Export to CSV" }).click(),
    );
    expect(downloads).toBe(1);
  });

  test("a written export the browser refuses to save is logged and announced", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(
      mount,
      <ExportGrid withWriters toolbar={{ items: ["export"] }} />,
    );
    const errors: string[] = [];
    const pageErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });

    await exportButton(root).click();
    await exportMenu(page)
      .getByRole("menuitem", { name: "Export to Excel" })
      .click();
    await page.evaluate(() => {
      URL.createObjectURL = () => {
        throw new Error("Downloads are blocked.");
      };
    });
    await root.getByRole("button", { name: "Finish writing" }).click();

    await expect(root.locator('[role="status"]')).toHaveText("Export failed");
    await expect
      .poll(() => errors)
      .toContainEqual(expect.stringContaining("could not be saved"));
    expect(pageErrors).toEqual([]);
  });

  test("an export dropped while another is written is not reported to onCommand", async ({
    mount,
    page,
  }) => {
    const commands: string[] = [];
    const root = await mountGrid(
      mount,
      <ExportGrid
        withWriters
        toolbar={{ items: ["export"] }}
        onCommand={(event) => {
          commands.push(event.commandId);
        }}
      />,
    );

    await exportButton(root).click();
    await exportMenu(page)
      .getByRole("menuitem", { name: "Export to Excel" })
      .click();
    // The fixture finishes only its latest xlsx write, so the second is a CSV.
    await exportButton(root).click();
    await exportMenu(page)
      .getByRole("menuitem", { name: "Export to CSV" })
      .click();
    await download(page, () =>
      root.getByRole("button", { name: "Finish writing" }).click(),
    );

    expect(commands).toEqual(["export.xlsx"]);
  });
});

test.describe("the context menu", () => {
  test("exports from a cell's menu when listed", async ({ mount, page }) => {
    const root = await mountGrid(
      mount,
      <ExportGrid contextMenu={{ cell: ["export.csv", "export.json"] }} />,
    );

    await root
      .getByRole("gridcell", { name: "Bravo" })
      .click({ button: "right" });
    const menu = page.getByRole("menu", { name: "Row menu" });
    await expect(menu.getByRole("menuitem")).toHaveText([
      "Export to CSV",
      "Export to JSON",
    ]);

    const csv = await download(page, () =>
      menu.getByRole("menuitem", { name: "Export to CSV" }).click(),
    );
    expect(csv).toEqual({ name: "export.csv", text: BOM + ALL_ROWS_CSV });
  });
});

test.describe("exportData", () => {
  test("resolves to a Blob of what the grid shows, across every page", async ({
    mount,
  }) => {
    const root = await mountGrid(
      mount,
      <ExportGrid
        defaultFilter={[{ columnId: "name", query: "%l%" }]}
        defaultColumnSort={[{ columnId: "score", direction: "desc" }]}
        paginated
        defaultPagination={{ pageIndex: 0, pageSize: 2 }}
      />,
    );

    expect(JSON.parse(await exportResult(root, "Export data"))).toEqual({
      type: "text/csv;charset=utf-8",
      bom: true,
      text: "Name,Region,Score\r\nAlice,West,30\r\nCharlie,West,21\r\nDelta,East,14",
    });
  });

  test("takes its options over the grid's export option", async ({ mount }) => {
    const root = await mountGrid(
      mount,
      <ExportGrid
        export={{ includeHeader: false, columns: ["name", "score"] }}
        dataFormat="json"
        dataOptions={{ columns: ["name", "code", "notes"] }}
      />,
    );

    const { type, text } = JSON.parse(
      await exportResult(root, "Export data"),
    ) as { type: string; text: string };
    expect(type).toBe("application/json");
    expect(JSON.parse(text)).toEqual([
      { name: "Alice", code: "A1" },
      { name: "Bravo", code: "B2" },
      { name: "Charlie", code: "C3" },
      { name: "Delta", code: "D4" },
    ]);
  });

  test("writes with a writer passed to it", async ({ mount }) => {
    const root = await mountGrid(
      mount,
      <ExportGrid defaultFilter={[{ columnId: "region", query: "West" }]} />,
    );

    expect(JSON.parse(await exportResult(root, "Export lines"))).toEqual({
      type: "text/plain",
      bom: false,
      text: "Alice West 30 | Charlie West 21",
    });
  });

  test("rejects a format no writer is registered for", async ({ mount }) => {
    const root = await mountGrid(mount, <ExportGrid dataFormat="xlsx" />);

    expect(await exportResult(root, "Export data")).toContain(
      "register one through `exportWriters`",
    );
  });
});
