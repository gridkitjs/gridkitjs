// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import type { Locator, Page } from "@playwright/test";
import type { MountResult } from "@playwright/experimental-ct-react";
import { expect, test } from "./support/coverage";
import MenuHarness from "./support/MenuHarness";

/** Opens the menu from its anchor; it renders into `document.body`, outside `root`. */
async function openMenu(root: MountResult, page: Page): Promise<Locator> {
  await root.getByRole("button", { name: "Open menu" }).click();
  const menu = page.getByRole("menu", { name: "Actions" });
  await expect(item(menu, "Cut")).toBeFocused();
  return menu;
}

/** The item named `name`, whichever menu item role it has. */
function item(menu: Locator, name: string): Locator {
  return menu
    .getByRole("menuitem", { name, exact: true })
    .or(menu.getByRole("menuitemcheckbox", { name, exact: true }));
}

async function boxOf(locator: Locator) {
  const box = await locator.boundingBox();
  if (box === null) throw new Error("element is not visible");
  return box;
}

/**
 * Waits on a timer in the page. One set for longer than a timer the menu set
 * earlier runs after it, however busy the page is — a wait in the test
 * itself promises nothing about when the page's timers have run.
 */
async function waitInPage(page: Page, ms: number): Promise<void> {
  await page.evaluate(
    (delay) =>
      new Promise<void>((resolve) => {
        setTimeout(resolve, delay);
      }),
    ms,
  );
}

/** A mouse pointer moving over the element `over` selects, or leaving the one `leave` does. */
type PointerStep = { readonly over: string } | { readonly leave: string };

/**
 * Plays `steps` in the page in a single task, then waits out the hover delay
 * there. A real pointer crossing an item takes several round trips, and on
 * a busy machine the delay could pass on the way; between steps dispatched
 * in one task, no timer can run.
 */
async function sweepPointer(
  page: Page,
  steps: readonly PointerStep[],
): Promise<void> {
  await page.evaluate((pointerSteps) => {
    for (const step of pointerSteps) {
      const over = "over" in step;
      const selector = over ? step.over : step.leave;
      const element = document.querySelector(selector);
      if (element === null) throw new Error(`nothing matches ${selector}`);
      element.dispatchEvent(
        new PointerEvent(over ? "pointermove" : "pointerleave", {
          bubbles: over,
          pointerType: "mouse",
        }),
      );
    }
  }, steps);
  await waitInPage(page, 500);
}

/** Opens the menu, then its "Sort" submenu from the keyboard. */
async function openSubmenu(root: MountResult, page: Page) {
  const menu = await openMenu(root, page);
  await page.keyboard.press("End");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowRight");
  const submenu = page.getByRole("menu", { name: "Sort" });
  await expect(item(submenu, "Ascending")).toBeFocused();
  return { menu, submenu };
}

test.describe("arrow keys, Home and End", () => {
  test("ArrowDown moves to the next item, over the separator, and wraps to the first", async ({
    mount,
    page,
  }) => {
    const root = await mount(<MenuHarness />);
    const menu = await openMenu(root, page);

    for (const name of [
      "Copy",
      "Paste",
      "Delete",
      "Show grid",
      "Sort",
      "Select all",
      "Cut",
    ]) {
      await page.keyboard.press("ArrowDown");
      await expect(item(menu, name)).toBeFocused();
    }
  });

  test("ArrowUp moves to the previous item and wraps to the last", async ({
    mount,
    page,
  }) => {
    const root = await mount(<MenuHarness />);
    const menu = await openMenu(root, page);

    await page.keyboard.press("ArrowUp");
    await expect(item(menu, "Select all")).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await expect(item(menu, "Sort")).toBeFocused();
  });

  test("Home and End move to the first and last item", async ({
    mount,
    page,
  }) => {
    const root = await mount(<MenuHarness />);
    const menu = await openMenu(root, page);

    await page.keyboard.press("End");
    await expect(item(menu, "Select all")).toBeFocused();
    await page.keyboard.press("Home");
    await expect(item(menu, "Cut")).toBeFocused();
  });

  test("only the focused item is a tab stop", async ({ mount, page }) => {
    const root = await mount(<MenuHarness />);
    const menu = await openMenu(root, page);
    await expect(item(menu, "Cut")).toHaveAttribute("tabindex", "0");
    await expect(item(menu, "Copy")).toHaveAttribute("tabindex", "-1");

    await page.keyboard.press("ArrowDown");

    await expect(item(menu, "Cut")).toHaveAttribute("tabindex", "-1");
    await expect(item(menu, "Copy")).toHaveAttribute("tabindex", "0");
  });
});

test.describe("choosing an item", () => {
  for (const key of ["Enter", " "]) {
    test(`${key === " " ? "Space" : key} activates the focused item and closes the menu`, async ({
      mount,
      page,
    }) => {
      const root = await mount(<MenuHarness />);
      const menu = await openMenu(root, page);
      await page.keyboard.press("ArrowDown");

      await page.keyboard.press(key);

      await expect(root.getByTestId("activated")).toHaveText("copy");
      await expect(menu).toBeHidden();
      await expect(
        root.getByRole("button", { name: "Open menu" }),
      ).toBeFocused();
    });
  }

  test("a click activates an item", async ({ mount, page }) => {
    const root = await mount(<MenuHarness />);
    const menu = await openMenu(root, page);

    await item(menu, "Paste").click();

    await expect(root.getByTestId("activated")).toHaveText("paste");
    await expect(menu).toBeHidden();
  });

  test("a checkable item activates like any other", async ({ mount, page }) => {
    const root = await mount(<MenuHarness />);
    let menu = await openMenu(root, page);
    await expect(item(menu, "Show grid")).toHaveAttribute(
      "aria-checked",
      "false",
    );
    await page.keyboard.press("s");

    await page.keyboard.press("Enter");

    await expect(root.getByTestId("activated")).toHaveText("showGrid");
    menu = await openMenu(root, page);
    await expect(item(menu, "Show grid")).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  test("a disabled item takes focus but is never activated", async ({
    mount,
    page,
  }) => {
    const root = await mount(<MenuHarness />);
    const menu = await openMenu(root, page);
    const deleteItem = item(menu, "Delete");
    await page.keyboard.press("d");
    await expect(deleteItem).toBeFocused();

    await page.keyboard.press("Enter");
    await page.keyboard.press(" ");
    // Playwright will not click an element it reads as disabled; a user can.
    await deleteItem.click({ force: true });

    await expect(deleteItem).toBeFocused();
    await expect(menu).toBeVisible();
    await expect(root.getByTestId("activated")).toHaveText("none");
  });
});

test.describe("submenus", () => {
  for (const key of ["Enter", " ", "ArrowRight"]) {
    test(`${key === " " ? "Space" : key} on a submenu item opens it and focuses its first item`, async ({
      mount,
      page,
    }) => {
      const root = await mount(<MenuHarness />);
      const menu = await openMenu(root, page);
      await page.keyboard.press("End");
      await page.keyboard.press("ArrowUp");

      await page.keyboard.press(key);

      const submenu = page.getByRole("menu", { name: "Sort" });
      await expect(item(submenu, "Ascending")).toBeFocused();
      await expect(item(menu, "Sort")).toHaveAttribute("aria-expanded", "true");
      await expect(root.getByTestId("activated")).toHaveText("none");
    });
  }

  test("ArrowRight on an item that opens no submenu does nothing", async ({
    mount,
    page,
  }) => {
    const root = await mount(<MenuHarness />);
    const menu = await openMenu(root, page);

    await page.keyboard.press("ArrowRight");

    await expect(item(menu, "Cut")).toBeFocused();
    await expect(page.getByRole("menu", { name: "Sort" })).toBeHidden();
  });

  test("opens beside its item, its first item level with it", async ({
    mount,
    page,
  }) => {
    const root = await mount(<MenuHarness />);
    const { menu, submenu } = await openSubmenu(root, page);

    const sortBox = await boxOf(item(menu, "Sort"));
    const firstBox = await boxOf(item(submenu, "Ascending"));
    expect(firstBox.y).toBeCloseTo(sortBox.y, 0);
    expect(firstBox.x).toBeGreaterThanOrEqual(sortBox.x + sortBox.width - 1);
  });

  test("the arrow keys move within the submenu alone", async ({
    mount,
    page,
  }) => {
    const root = await mount(<MenuHarness />);
    const { submenu } = await openSubmenu(root, page);

    await page.keyboard.press("ArrowUp");
    await expect(item(submenu, "Clear sort")).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(item(submenu, "Ascending")).toBeFocused();
  });

  test("ArrowLeft closes the submenu and focuses the item that opened it", async ({
    mount,
    page,
  }) => {
    const root = await mount(<MenuHarness />);
    const { menu, submenu } = await openSubmenu(root, page);

    await page.keyboard.press("ArrowLeft");

    await expect(submenu).toBeHidden();
    await expect(item(menu, "Sort")).toBeFocused();
    await expect(item(menu, "Sort")).toHaveAttribute("aria-expanded", "false");
  });

  test("ArrowLeft in a menu that is not a submenu does nothing", async ({
    mount,
    page,
  }) => {
    const root = await mount(<MenuHarness />);
    const menu = await openMenu(root, page);

    await page.keyboard.press("ArrowLeft");

    await expect(menu).toBeVisible();
    await expect(item(menu, "Cut")).toBeFocused();
  });

  test("Escape closes only the submenu, then the menu", async ({
    mount,
    page,
  }) => {
    const root = await mount(<MenuHarness />);
    const { menu, submenu } = await openSubmenu(root, page);

    await page.keyboard.press("Escape");

    await expect(submenu).toBeHidden();
    await expect(menu).toBeVisible();
    await expect(item(menu, "Sort")).toBeFocused();

    await page.keyboard.press("Escape");

    await expect(menu).toBeHidden();
    await expect(root.getByRole("button", { name: "Open menu" })).toBeFocused();
  });

  test("activating a submenu's item closes every menu", async ({
    mount,
    page,
  }) => {
    const root = await mount(<MenuHarness />);
    const { menu, submenu } = await openSubmenu(root, page);

    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");

    await expect(root.getByTestId("activated")).toHaveText("descending");
    await expect(submenu).toBeHidden();
    await expect(menu).toBeHidden();
    await expect(root.getByRole("button", { name: "Open menu" })).toBeFocused();
  });
});

test.describe("Tab", () => {
  test("Tab closes the menu and focus returns to its opener", async ({
    mount,
    page,
  }) => {
    const root = await mount(<MenuHarness />);
    const menu = await openMenu(root, page);

    await page.keyboard.press("Tab");

    await expect(menu).toBeHidden();
    await expect(root.getByTestId("closed")).toHaveText("tab");
    await expect(root.getByRole("button", { name: "Open menu" })).toBeFocused();
  });

  test("Shift+Tab in a submenu closes every menu and focus returns to the opener", async ({
    mount,
    page,
  }) => {
    const root = await mount(<MenuHarness />);
    const { menu, submenu } = await openSubmenu(root, page);

    await page.keyboard.press("Shift+Tab");

    await expect(submenu).toBeHidden();
    await expect(menu).toBeHidden();
    await expect(root.getByTestId("closed")).toHaveText("tab");
    await expect(root.getByRole("button", { name: "Open menu" })).toBeFocused();
  });
});

test.describe("typeahead", () => {
  test("a letter focuses the next item it starts, ignoring case", async ({
    mount,
    page,
  }) => {
    const root = await mount(<MenuHarness />);
    const menu = await openMenu(root, page);

    await page.keyboard.press("P");

    await expect(item(menu, "Paste")).toBeFocused();
  });

  test("the same letter again steps through every item it starts", async ({
    mount,
    page,
  }) => {
    const root = await mount(<MenuHarness />);
    const menu = await openMenu(root, page);

    for (const name of ["Show grid", "Sort", "Select all", "Show grid"]) {
      await page.keyboard.press("s");
      await expect(item(menu, name)).toBeFocused();
    }
  });

  test("letters typed together match a longer prefix", async ({
    mount,
    page,
  }) => {
    const root = await mount(<MenuHarness />);
    const menu = await openMenu(root, page);

    await page.keyboard.type("se");

    await expect(item(menu, "Select all")).toBeFocused();
  });

  test("a pause starts the typing afresh", async ({ mount, page }) => {
    const root = await mount(<MenuHarness />);
    const menu = await openMenu(root, page);
    await page.keyboard.press("s");
    await expect(item(menu, "Show grid")).toBeFocused();

    // Past the typeahead's timeout, "e" is a query of its own, which no
    // item starts; typed straight after the "s" it would pick "Select all".
    await waitInPage(page, 600);
    await page.keyboard.press("e");

    await expect(item(menu, "Show grid")).toBeFocused();
  });

  test("a submenu's typeahead searches its own items", async ({
    mount,
    page,
  }) => {
    const root = await mount(<MenuHarness />);
    const { submenu } = await openSubmenu(root, page);

    await page.keyboard.press("c");

    await expect(item(submenu, "Clear sort")).toBeFocused();
  });
});

test.describe("pointer", () => {
  test("hovering an item focuses it", async ({ mount, page }) => {
    const root = await mount(<MenuHarness />);
    const menu = await openMenu(root, page);

    await item(menu, "Paste").hover();

    await expect(item(menu, "Paste")).toBeFocused();
    await expect(item(menu, "Paste")).toHaveAttribute("tabindex", "0");
  });

  test("resting on a submenu item opens it, leaving focus on the item", async ({
    mount,
    page,
  }) => {
    const root = await mount(<MenuHarness />);
    const menu = await openMenu(root, page);

    await item(menu, "Sort").hover();

    const submenu = page.getByRole("menu", { name: "Sort" });
    await expect(submenu).toBeVisible();
    await expect(item(menu, "Sort")).toBeFocused();
  });

  test("ArrowRight on a submenu the pointer opened moves focus into it", async ({
    mount,
    page,
  }) => {
    const root = await mount(<MenuHarness />);
    const menu = await openMenu(root, page);
    await item(menu, "Sort").hover();
    const submenu = page.getByRole("menu", { name: "Sort" });
    await expect(submenu).toBeVisible();

    await page.keyboard.press("ArrowRight");

    await expect(item(submenu, "Ascending")).toBeFocused();
  });

  test("a click on a submenu item opens it, leaving focus on the item", async ({
    mount,
    page,
  }) => {
    const root = await mount(<MenuHarness />);
    const menu = await openMenu(root, page);

    await item(menu, "Sort").click();

    await expect(page.getByRole("menu", { name: "Sort" })).toBeVisible();
    await expect(item(menu, "Sort")).toBeFocused();
    await expect(root.getByTestId("activated")).toHaveText("none");
  });

  test("hovering a submenu's item focuses it, keeping both menus open", async ({
    mount,
    page,
  }) => {
    const root = await mount(<MenuHarness />);
    const menu = await openMenu(root, page);
    await item(menu, "Sort").hover();
    const submenu = page.getByRole("menu", { name: "Sort" });

    await item(submenu, "Descending").hover();

    await expect(item(submenu, "Descending")).toBeFocused();
    await expect(menu).toBeVisible();
  });

  test("resting on another item closes the open submenu", async ({
    mount,
    page,
  }) => {
    const root = await mount(<MenuHarness />);
    const menu = await openMenu(root, page);
    await item(menu, "Sort").hover();
    const submenu = page.getByRole("menu", { name: "Sort" });
    await expect(submenu).toBeVisible();

    await item(menu, "Paste").hover();

    await expect(submenu).toBeHidden();
    await expect(item(menu, "Paste")).toBeFocused();
    await expect(menu).toBeVisible();
  });

  test("crossing another item on the way into the submenu leaves it open", async ({
    mount,
    page,
  }) => {
    const root = await mount(<MenuHarness />);
    const menu = await openMenu(root, page);
    await item(menu, "Sort").hover();
    const submenu = page.getByRole("menu", { name: "Sort" });
    await expect(submenu).toBeVisible();

    await sweepPointer(page, [
      { over: '[data-gridkit-menu-item="selectAll"]' },
      { leave: '[role="menu"][aria-label="Actions"]' },
      { over: '[data-gridkit-menu-item="clearSort"]' },
    ]);

    await expect(submenu).toBeVisible();
    await expect(item(submenu, "Clear sort")).toBeFocused();
  });

  test("a submenu item the pointer leaves before resting on stays closed", async ({
    mount,
    page,
  }) => {
    const root = await mount(<MenuHarness />);
    const menu = await openMenu(root, page);

    await sweepPointer(page, [
      { over: '[data-gridkit-menu-item="sort"]' },
      { leave: '[role="menu"][aria-label="Actions"]' },
    ]);

    await expect(item(menu, "Sort")).toBeFocused();
    await expect(page.getByRole("menu", { name: "Sort" })).toBeHidden();
    await expect(menu).toBeVisible();
  });
});
