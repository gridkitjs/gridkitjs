// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import type { Locator } from "@playwright/test";
import type { MountResult } from "@playwright/experimental-ct-react";
import { expect, test } from "./support/coverage";
import ChecklistHarness from "./support/ChecklistHarness";

/** Far more values than the list's window mounts. */
const CHECKLIST_SIZE = 5000;

/** The option for value `n`, counted from 1 as the labels are. */
function option(root: MountResult, n: number): Locator {
  return root.getByRole("option", { name: `Value ${String(n)}`, exact: true });
}

/** Focuses the list's first item by tabbing into it from the search box. */
async function tabIntoList(root: MountResult): Promise<void> {
  await root.getByRole("searchbox", { name: "Search" }).focus();
  await root.page().keyboard.press("Tab");
  await expect(option(root, 1)).toBeFocused();
}

test.describe("markup", () => {
  test("is a labelled multi-select listbox of options with their place in the whole list", async ({
    mount,
  }) => {
    const root = await mount(<ChecklistHarness size={CHECKLIST_SIZE} />);
    const list = root.getByRole("listbox");

    await expect(list).toHaveAccessibleName("Values");
    await expect(list).toHaveAttribute("aria-multiselectable", "true");
    const first = option(root, 1);
    await expect(first).toHaveAttribute("aria-checked", "false");
    await expect(first).toHaveAttribute("aria-posinset", "1");
    await expect(first).toHaveAttribute("aria-setsize", String(CHECKLIST_SIZE));
  });
});

test.describe("tab stop", () => {
  test("the list is one tab stop, on its first item to begin with", async ({
    mount,
    page,
  }) => {
    const root = await mount(<ChecklistHarness size={CHECKLIST_SIZE} />);
    await tabIntoList(root);
    await expect(root.locator('[role="option"][tabindex="0"]')).toHaveCount(1);

    await page.keyboard.press("Tab");
    await expect(root.getByRole("button", { name: "Apply" })).toBeFocused();

    await page.keyboard.press("Shift+Tab");
    await expect(option(root, 1)).toBeFocused();
  });

  test("the tab stop follows focus, and Tab comes back to it", async ({
    mount,
    page,
  }) => {
    const root = await mount(<ChecklistHarness size={CHECKLIST_SIZE} />);
    await tabIntoList(root);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await expect(option(root, 3)).toHaveAttribute("tabindex", "0");
    await expect(option(root, 1)).toHaveAttribute("tabindex", "-1");

    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");

    await expect(option(root, 3)).toBeFocused();
  });
});

test.describe("keys", () => {
  test("ArrowDown and ArrowUp move one item, stopping at the ends", async ({
    mount,
    page,
  }) => {
    const root = await mount(<ChecklistHarness size={CHECKLIST_SIZE} />);
    await tabIntoList(root);

    await page.keyboard.press("ArrowDown");
    await expect(option(root, 2)).toBeFocused();
    await expect(root.getByTestId("focused")).toHaveText("1");

    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("ArrowUp");
    await expect(option(root, 1)).toBeFocused();
    await expect(root.getByTestId("focused")).toHaveText("0");
  });

  test("End focuses the last item, mounting it first, and Home the first", async ({
    mount,
    page,
  }) => {
    const root = await mount(<ChecklistHarness size={CHECKLIST_SIZE} />);
    await tabIntoList(root);
    await expect(option(root, CHECKLIST_SIZE)).toHaveCount(0);

    await page.keyboard.press("End");

    const last = option(root, CHECKLIST_SIZE);
    await expect(last).toBeFocused();
    await expect(last).toHaveAttribute("aria-posinset", String(CHECKLIST_SIZE));
    await expect(last).toBeInViewport();
    await expect(root.getByTestId("focused")).toHaveText(
      String(CHECKLIST_SIZE - 1),
    );
    await expect(option(root, 1)).toHaveCount(0);

    await page.keyboard.press("ArrowDown");
    await expect(last).toBeFocused();

    await page.keyboard.press("Home");
    await expect(option(root, 1)).toBeFocused();
  });

  test("PageDown and PageUp move by the items the list shows whole", async ({
    mount,
    page,
  }) => {
    const root = await mount(<ChecklistHarness size={CHECKLIST_SIZE} />);
    await tabIntoList(root);

    await page.keyboard.press("PageDown");
    await expect(option(root, 9)).toBeFocused();
    await page.keyboard.press("PageDown");
    await expect(option(root, 17)).toBeFocused();

    await page.keyboard.press("PageUp");
    await expect(option(root, 9)).toBeFocused();
    await page.keyboard.press("PageUp");
    await page.keyboard.press("PageUp");
    await expect(option(root, 1)).toBeFocused();
  });

  test("Space toggles the focused item, which the renderer marks checked", async ({
    mount,
    page,
  }) => {
    const root = await mount(<ChecklistHarness size={CHECKLIST_SIZE} />);
    await tabIntoList(root);
    await page.keyboard.press("ArrowDown");

    await page.keyboard.press(" ");
    await expect(option(root, 2)).toHaveAttribute("aria-checked", "true");
    await expect(root.getByTestId("toggled")).toHaveText("1");

    await page.keyboard.press(" ");
    await expect(option(root, 2)).toHaveAttribute("aria-checked", "false");
    await expect(option(root, 2)).toBeFocused();
  });

  test("Enter is left to the form around the list", async ({ mount, page }) => {
    const root = await mount(<ChecklistHarness size={CHECKLIST_SIZE} />);
    await tabIntoList(root);

    await page.keyboard.press("Enter");

    await expect(root.getByTestId("submitted")).toHaveText("1");
    await expect(root.getByTestId("toggled")).toHaveText("none");
  });

  test("a move past the end of a list narrowed under it lands on the new last item", async ({
    mount,
  }) => {
    const root = await mount(<ChecklistHarness size={CHECKLIST_SIZE} />);
    await tabIntoList(root);

    await root.getByRole("button", { name: "End, then narrow" }).click();
    await expect(option(root, 100)).toBeFocused();

    // The value the move first asked for mounting later takes no focus.
    await root.getByRole("button", { name: "Show all" }).click();
    const list = root.getByRole("listbox");
    await list.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await expect(option(root, CHECKLIST_SIZE)).toBeVisible();
    await expect(option(root, CHECKLIST_SIZE)).not.toBeFocused();
  });

  test("a key with a modifier is left alone", async ({ mount, page }) => {
    const root = await mount(<ChecklistHarness size={CHECKLIST_SIZE} />);
    await tabIntoList(root);

    await page.keyboard.press("Shift+ArrowDown");

    await expect(option(root, 1)).toBeFocused();
    await expect(root.getByTestId("focused")).toHaveText("none");
  });
});

test.describe("pointer", () => {
  test("a click toggles an item and focuses it", async ({ mount }) => {
    const root = await mount(<ChecklistHarness size={CHECKLIST_SIZE} />);

    await option(root, 4).click();

    await expect(option(root, 4)).toBeFocused();
    await expect(option(root, 4)).toHaveAttribute("aria-checked", "true");
    await expect(option(root, 4)).toHaveAttribute("tabindex", "0");
    await expect(root.getByTestId("toggled")).toHaveText("3");
    await expect(root.getByTestId("focused")).toHaveText("3");
  });

  test("the tab stop moves to a mounted item while the focused one is scrolled away", async ({
    mount,
    page,
  }) => {
    const root = await mount(<ChecklistHarness size={CHECKLIST_SIZE} />);
    await option(root, 2).click();
    await root.getByRole("searchbox", { name: "Search" }).focus();

    await root.getByRole("listbox").evaluate((list) => {
      list.scrollTop = 2400;
    });
    await expect(option(root, 2)).toHaveCount(0);
    await expect(root.locator('[role="option"][tabindex="0"]')).toHaveCount(1);

    await page.keyboard.press("Tab");
    await expect(root.locator('[role="option"]:focus')).toBeInViewport();
  });
});
