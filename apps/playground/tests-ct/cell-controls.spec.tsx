// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import type { Locator, Page } from "@playwright/test";
import type { MountResult } from "@playwright/experimental-ct-react";
import { expect, test } from "./support/coverage";
import { mountGrid } from "./support/mountGrid";
import CellControlsGrid, {
  type CellControlsRow,
} from "./support/CellControlsGrid";

function buildRows(count: number): CellControlsRow[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `row-${String(index)}`,
    note: `Note ${String(index)}`,
  }));
}

async function mountControls(
  mount: Parameters<typeof mountGrid>[0],
): Promise<MountResult> {
  return mountGrid(
    mount,
    <CellControlsGrid
      dataSource={buildRows(3)}
      label="Controls"
      selectable={{ rows: "multiple", columns: "multiple" }}
    />,
    { width: 720 },
  );
}

function bodyRow(root: MountResult, rowIndex: number): Locator {
  return root.locator(`tbody tr[data-gridkit-row-index="${String(rowIndex)}"]`);
}

function selectedRows(root: MountResult): Locator {
  return root.locator('tbody tr[aria-selected="true"]');
}

/**
 * Presses `keys` one after another wherever focus is, never refocusing the
 * control between them as `locator.press` would: a key that moves focus out
 * of the control shows as the keys after it landing elsewhere.
 */
async function pressInTurn(page: Page, keys: readonly string[]) {
  for (const key of keys) {
    await page.keyboard.press(key);
  }
}

test.describe("a text field in a cell", () => {
  test("keeps the focus a click gives it", async ({ mount, page }) => {
    const root = await mountControls(mount);
    const field = bodyRow(root, 1).getByRole("textbox", { name: "Note" });

    await field.click();
    await pressInTurn(page, ["End", "!"]);

    await expect(field).toBeFocused();
    await expect(field).toHaveValue("Note 1!");
  });

  test("keeps Space, the arrows, Home, End and Enter", async ({
    mount,
    page,
  }) => {
    const root = await mountControls(mount);
    const field = bodyRow(root, 1).getByRole("textbox", { name: "Note" });
    await field.fill("bc");

    await pressInTurn(page, [
      "Home",
      "a",
      "End",
      "Space",
      "d",
      "ArrowLeft",
      "ArrowLeft",
      "e",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "PageDown",
      "Enter",
    ]);

    await expect(field).toHaveValue("abce d");
    await expect(field).toBeFocused();
    await expect(selectedRows(root)).toHaveCount(0);
  });

  test("keeps Ctrl+A, selecting its own text rather than every row", async ({
    mount,
    page,
  }) => {
    const root = await mountControls(mount);
    const field = bodyRow(root, 0).getByRole("textbox", { name: "Note" });
    await field.focus();

    await page.keyboard.press("ControlOrMeta+a");

    await expect(selectedRows(root)).toHaveCount(0);
    expect(
      await field.evaluate((input: HTMLInputElement) => [
        input.selectionStart,
        input.selectionEnd,
      ]),
    ).toEqual([0, "Note 0".length]);
  });

  test("Escape returns focus to its cell and leaves the selection alone", async ({
    mount,
    page,
  }) => {
    const root = await mountControls(mount);
    await bodyRow(root, 0).locator("td").first().click();
    await expect(selectedRows(root)).toHaveCount(1);
    await bodyRow(root, 1).getByRole("textbox", { name: "Note" }).focus();

    await page.keyboard.press("Escape");

    await expect(bodyRow(root, 1).locator("td").nth(1)).toBeFocused();
    await expect(selectedRows(root)).toHaveCount(1);
    await expect(bodyRow(root, 0)).toHaveAttribute("aria-selected", "true");
  });
});

test("a select in a cell keeps the arrow keys", async ({ mount, page }) => {
  const root = await mountControls(mount);
  const select = bodyRow(root, 1).getByRole("combobox", { name: "Size" });
  await select.focus();

  await page.keyboard.press("ArrowDown");

  await expect(select).toBeFocused();
  await expect(bodyRow(root, 2).locator("td").nth(2)).toHaveAttribute(
    "tabindex",
    "-1",
  );
});

test("Space on a checkbox in a cell ticks it without selecting the row", async ({
  mount,
  page,
}) => {
  const root = await mountControls(mount);
  const checkbox = bodyRow(root, 1).getByRole("checkbox", { name: "Done" });
  await checkbox.focus();

  await page.keyboard.press("Space");

  await expect(checkbox).toBeChecked();
  await expect(selectedRows(root)).toHaveCount(0);
});

test("Space and Enter on a button in a cell press it without selecting the row", async ({
  mount,
  page,
}) => {
  const root = await mountControls(mount);
  const button = bodyRow(root, 1).getByRole("button");
  await button.focus();

  await pressInTurn(page, ["Space", "Enter"]);

  await expect(button).toHaveText("Pressed 2");
  await expect(button).toBeFocused();
  await expect(selectedRows(root)).toHaveCount(0);
});

test("an arrow key on a button in a cell still moves the grid's focus", async ({
  mount,
  page,
}) => {
  const root = await mountControls(mount);
  await bodyRow(root, 1).getByRole("button").focus();

  await page.keyboard.press("ArrowDown");

  await expect(bodyRow(root, 2).locator("td").nth(4)).toBeFocused();
});

test("a text field in a header keeps its keys", async ({ mount, page }) => {
  const root = await mountControls(mount);
  const header = root.locator('thead th[data-gridkit-column="note"]');
  const field = header.getByRole("textbox", { name: "Filter notes" });
  await field.focus();

  await pressInTurn(page, [
    "b",
    "Home",
    "a",
    "End",
    "Space",
    "Enter",
    "ArrowDown",
    "Alt+ArrowDown",
    "Control+ArrowLeft",
    "End",
    "c",
  ]);

  await expect(field).toHaveValue("ab c");
  await expect(field).toBeFocused();
  await expect(header).toHaveAttribute("aria-selected", "false");
  await expect(selectedRows(root)).toHaveCount(0);
});

test("Tab reaches a control in a header, and Escape returns to its header", async ({
  mount,
  page,
}) => {
  const root = await mountControls(mount);
  const headers = root.locator("thead th");
  await headers.first().focus();

  await page.keyboard.press("Tab");
  const field = headers.nth(1).getByRole("textbox", { name: "Filter notes" });
  await expect(field).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(headers.nth(1)).toBeFocused();
  await expect(headers.nth(1)).toHaveAttribute("tabindex", "0");
});
