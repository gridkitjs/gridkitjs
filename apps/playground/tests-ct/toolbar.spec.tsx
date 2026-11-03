// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import type { Page } from "@playwright/test";
import type { MountResult } from "@playwright/experimental-ct-react";
import { expect, test } from "./support/coverage";
import ToolbarHarness from "./support/ToolbarHarness";

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
