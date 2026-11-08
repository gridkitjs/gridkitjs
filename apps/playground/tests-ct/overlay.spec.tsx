// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import type { Locator, Page } from "@playwright/test";
import type { MountResult } from "@playwright/experimental-ct-react";
import { expect, test } from "./support/coverage";
import GridOverlayHarness from "./support/GridOverlayHarness";
import { mountGrid } from "./support/mountGrid";
import OverlayHarness from "./support/OverlayHarness";

/** Opens the panel from its anchor; it renders into `document.body`, outside `root`. */
async function openPanel(root: MountResult, page: Page): Promise<Locator> {
  await root.getByRole("button", { name: "Anchor" }).click();
  const panel = page.getByRole("dialog", { name: "Panel" });
  await expect(panel).toBeVisible();
  return panel;
}

async function boxOf(locator: Locator) {
  const box = await locator.boundingBox();
  if (box === null) throw new Error("element is not visible");
  return box;
}

test.describe("placement", () => {
  test("opens below its anchor, lined up with its left edge, after the gap", async ({
    mount,
    page,
  }) => {
    const root = await mount(<OverlayHarness gap={4} />);
    const panel = await openPanel(root, page);

    const anchor = await boxOf(root.getByRole("button", { name: "Anchor" }));
    const box = await boxOf(panel);
    expect(box.y).toBeCloseTo(anchor.y + anchor.height + 4, 0);
    expect(box.x).toBeCloseTo(anchor.x, 0);
    await expect(panel).toHaveAttribute(
      "data-gridkit-placement",
      "bottom-start",
    );
  });

  test("flips above an anchor at the bottom of the viewport", async ({
    mount,
    page,
  }) => {
    const root = await mount(
      <OverlayHarness anchorStyle={{ top: "auto", bottom: 10 }} gap={4} />,
    );
    const panel = await openPanel(root, page);

    const anchor = await boxOf(root.getByRole("button", { name: "Anchor" }));
    const box = await boxOf(panel);
    expect(box.y + box.height).toBeCloseTo(anchor.y - 4, 0);
    await expect(panel).toHaveAttribute("data-gridkit-placement", "top-start");
  });

  test("lines up with the anchor's right edge at the viewport's right edge", async ({
    mount,
    page,
  }) => {
    const root = await mount(
      <OverlayHarness anchorStyle={{ left: "auto", right: 10 }} />,
    );
    const panel = await openPanel(root, page);

    const anchor = await boxOf(root.getByRole("button", { name: "Anchor" }));
    const box = await boxOf(panel);
    expect(box.x + box.width).toBeCloseTo(anchor.x + anchor.width, 0);
    await expect(panel).toHaveAttribute("data-gridkit-placement", "bottom-end");
  });

  test("a panel flipped above its anchor keeps its bottom edge there as it shrinks", async ({
    mount,
    page,
  }) => {
    const root = await mount(
      <OverlayHarness anchorStyle={{ top: "auto", bottom: 10 }} gap={4} />,
    );
    const panel = await openPanel(root, page);
    const anchor = await boxOf(root.getByRole("button", { name: "Anchor" }));
    const before = await boxOf(panel);

    await panel.getByRole("button", { name: "Shrink" }).click();

    // The new height lands at once; the panel is placed again only when its
    // ResizeObserver reports, a frame later.
    await expect
      .poll(async () => (await boxOf(panel)).y)
      .toBeGreaterThan(before.y);
    const after = await boxOf(panel);
    expect(after.height).toBe(60);
    expect(after.y + after.height).toBeCloseTo(anchor.y - 4, 0);
  });

  test("an anchor taken out of the page leaves the panel placed where it last was", async ({
    mount,
    page,
  }) => {
    const root = await mount(
      <OverlayHarness anchorStyle={{ top: "auto", bottom: 10 }} gap={4} />,
    );
    const panel = await openPanel(root, page);
    const anchor = await boxOf(root.getByRole("button", { name: "Anchor" }));
    const before = await boxOf(panel);

    await panel.getByRole("button", { name: "Drop anchor" }).click();
    await expect(root.getByRole("button", { name: "Anchor" })).toHaveCount(0);
    await panel.getByRole("button", { name: "Shrink" }).click();

    await expect
      .poll(async () => (await boxOf(panel)).y)
      .toBeGreaterThan(before.y);
    const after = await boxOf(panel);
    expect(after.x).toBe(before.x);
    expect(after.y + after.height).toBeCloseTo(anchor.y - 4, 0);
  });

  test("opens beside a point rather than its anchor", async ({
    mount,
    page,
  }) => {
    const root = await mount(<OverlayHarness point={{ x: 600, y: 300 }} />);
    const panel = await openPanel(root, page);

    const box = await boxOf(panel);
    expect(box.x).toBeCloseTo(600, 0);
    expect(box.y).toBeCloseTo(300, 0);
  });
});

test.describe("focus", () => {
  test("moves into the panel on opening, and back to the anchor on Escape", async ({
    mount,
    page,
  }) => {
    const root = await mount(<OverlayHarness />);
    const panel = await openPanel(root, page);
    await expect(panel.getByRole("button", { name: "First" })).toBeFocused();

    await page.keyboard.press("Escape");

    await expect(panel).toBeHidden();
    await expect(root.getByTestId("dismissed")).toHaveText("escape");
    await expect(root.getByRole("button", { name: "Anchor" })).toBeFocused();
  });

  test("returnFocusFallback takes focus when the anchor has left the page", async ({
    mount,
    page,
  }) => {
    const root = await mount(<OverlayHarness withFallback />);
    const panel = await openPanel(root, page);

    await panel.getByRole("button", { name: "Drop anchor" }).click();
    await expect(root.getByRole("button", { name: "Anchor" })).toHaveCount(0);
    await page.keyboard.press("Escape");

    await expect(panel).toBeHidden();
    await expect(root.getByRole("button", { name: "Fallback" })).toBeFocused();
  });

  test("returnFocusFallback is not used while the anchor is on the page", async ({
    mount,
    page,
  }) => {
    const root = await mount(<OverlayHarness withFallback />);
    await openPanel(root, page);

    await page.keyboard.press("Escape");

    await expect(root.getByRole("button", { name: "Anchor" })).toBeFocused();
  });

  test("returnFocusFallback leaves focus that went elsewhere alone", async ({
    mount,
    page,
  }) => {
    const root = await mount(<OverlayHarness withFallback />);
    const panel = await openPanel(root, page);

    await panel.getByRole("button", { name: "Drop anchor" }).click();
    await root.getByRole("button", { name: "Elsewhere" }).click();

    await expect(panel).toBeHidden();
    await expect(root.getByTestId("dismissed")).toHaveText("outside");
    await expect(root.getByRole("button", { name: "Elsewhere" })).toBeFocused();
  });

  test('initialFocus "first" focuses the first focusable element', async ({
    mount,
    page,
  }) => {
    const root = await mount(<OverlayHarness initialFocus="first" />);
    const panel = await openPanel(root, page);

    await expect(panel.getByRole("button", { name: "First" })).toBeFocused();
  });

  test('initialFocus "panel" focuses the panel itself', async ({
    mount,
    page,
  }) => {
    const root = await mount(<OverlayHarness initialFocus="panel" />);
    const panel = await openPanel(root, page);

    await expect(panel).toBeFocused();
    await expect(panel).toHaveAttribute("tabindex", "-1");
  });

  test('initialFocus "none" leaves focus where it was', async ({
    mount,
    page,
  }) => {
    const root = await mount(<OverlayHarness initialFocus="none" />);
    await openPanel(root, page);

    await expect(root.getByRole("button", { name: "Anchor" })).toBeFocused();
  });

  test("initialFocus given an element focuses that element", async ({
    mount,
    page,
  }) => {
    const root = await mount(<OverlayHarness initialFocus="open-child" />);
    const panel = await openPanel(root, page);

    await expect(
      panel.getByRole("button", { name: "Open child" }),
    ).toBeFocused();
  });

  test("a click on the anchor closes it without a dismissal", async ({
    mount,
    page,
  }) => {
    const root = await mount(<OverlayHarness />);
    const panel = await openPanel(root, page);

    await root.getByRole("button", { name: "Anchor" }).click();

    await expect(panel).toBeHidden();
    await expect(root.getByTestId("dismissed")).toHaveText("none");
    await expect(root.getByRole("button", { name: "Anchor" })).toBeFocused();
  });
});

test.describe("dismissal", () => {
  test("a pointer down outside dismisses it, leaving focus where it landed", async ({
    mount,
    page,
  }) => {
    const root = await mount(<OverlayHarness />);
    const panel = await openPanel(root, page);

    await root.getByRole("button", { name: "Elsewhere" }).click();

    await expect(panel).toBeHidden();
    await expect(root.getByTestId("dismissed")).toHaveText("outside");
    await expect(root.getByRole("button", { name: "Elsewhere" })).toBeFocused();
  });

  test("a pointer down inside the panel keeps it open", async ({
    mount,
    page,
  }) => {
    const root = await mount(<OverlayHarness />);
    const panel = await openPanel(root, page);

    await panel.getByRole("button", { name: "First" }).click();

    await expect(panel).toBeVisible();
    await expect(root.getByTestId("dismissed")).toHaveText("none");
  });

  test("a scroll outside the panel dismisses it, a scroll inside does not", async ({
    mount,
    page,
  }) => {
    const root = await mount(<OverlayHarness />);
    const panel = await openPanel(root, page);

    await page.getByTestId("panel-scroller").evaluate((element) => {
      element.scrollTop = 100;
    });
    await expect
      .poll(() =>
        page
          .getByTestId("panel-scroller")
          .evaluate((element) => element.scrollTop),
      )
      .toBe(100);
    await expect(panel).toBeVisible();

    await root.getByTestId("scroller").evaluate((element) => {
      element.scrollTop = 100;
    });

    await expect(panel).toBeHidden();
    await expect(root.getByTestId("dismissed")).toHaveText("scroll");
  });

  test("a window resize dismisses it", async ({ mount, page }) => {
    const root = await mount(<OverlayHarness />);
    const panel = await openPanel(root, page);

    await page.setViewportSize({ width: 1000, height: 700 });

    await expect(panel).toBeHidden();
    await expect(root.getByTestId("dismissed")).toHaveText("resize");
  });

  test("focus moving outside the panel dismisses it, and stays where it went", async ({
    mount,
    page,
  }) => {
    const root = await mount(<OverlayHarness />);
    const panel = await openPanel(root, page);

    await root.getByRole("button", { name: "Elsewhere" }).focus();

    await expect(panel).toBeHidden();
    await expect(root.getByTestId("dismissed")).toHaveText("blur");
    await expect(root.getByRole("button", { name: "Elsewhere" })).toBeFocused();
  });

  test("the window losing focus dismisses it", async ({ mount, page }) => {
    const root = await mount(<OverlayHarness />);
    const panel = await openPanel(root, page);

    await page.evaluate(() => window.dispatchEvent(new Event("blur")));

    await expect(panel).toBeHidden();
    await expect(root.getByTestId("dismissed")).toHaveText("blur");
  });
});

test.describe("focus trap", () => {
  test("Tab from the last control wraps to the first, Shift+Tab back to the last", async ({
    mount,
    page,
  }) => {
    const root = await mount(<OverlayHarness trapFocus />);
    const panel = await openPanel(root, page);
    const first = panel.getByRole("button", { name: "First" });
    const last = panel.getByRole("button", { name: "Drop anchor" });
    await expect(first).toBeFocused();

    await page.keyboard.press("Shift+Tab");
    await expect(last).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(first).toBeFocused();
    await expect(panel).toBeVisible();
    await expect(root.getByTestId("dismissed")).toHaveText("none");
  });

  test("Tab between the ends moves as the browser moves it", async ({
    mount,
    page,
  }) => {
    const root = await mount(
      <OverlayHarness trapFocus initialFocus="open-child" />,
    );
    const panel = await openPanel(root, page);

    await page.keyboard.press("Tab");
    await expect(panel.getByRole("button", { name: "Shrink" })).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(
      panel.getByRole("button", { name: "Open child" }),
    ).toBeFocused();
  });

  test("Shift+Tab from the focused panel itself wraps to its last control", async ({
    mount,
    page,
  }) => {
    const root = await mount(<OverlayHarness trapFocus initialFocus="panel" />);
    const panel = await openPanel(root, page);
    await expect(panel).toBeFocused();

    await page.keyboard.press("Shift+Tab");

    await expect(
      panel.getByRole("button", { name: "Drop anchor" }),
    ).toBeFocused();
    await expect(root.getByTestId("dismissed")).toHaveText("none");
  });

  test("a pointer down outside still dismisses it", async ({ mount, page }) => {
    const root = await mount(<OverlayHarness trapFocus />);
    const panel = await openPanel(root, page);

    await root.getByRole("button", { name: "Elsewhere" }).click();

    await expect(panel).toBeHidden();
    await expect(root.getByTestId("dismissed")).toHaveText("outside");
  });

  test("focus moved outside by a script still dismisses it", async ({
    mount,
    page,
  }) => {
    const root = await mount(<OverlayHarness trapFocus />);
    const panel = await openPanel(root, page);

    await root.getByRole("button", { name: "Elsewhere" }).focus();

    await expect(panel).toBeHidden();
    await expect(root.getByTestId("dismissed")).toHaveText("blur");
  });

  test("an overlay above keeps its own Tab, and the panel stays open", async ({
    mount,
    page,
  }) => {
    const root = await mount(<OverlayHarness trapFocus />);
    const panel = await openPanel(root, page);
    await panel.getByRole("button", { name: "Open child" }).click();
    const child = page.getByRole("dialog", { name: "Child" });
    const childItem = child.getByRole("button", { name: "Child item" });
    await expect(childItem).toBeFocused();

    await page.keyboard.press("Shift+Tab");
    await expect(
      child.getByRole("button", { name: "Close panel" }),
    ).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(childItem).toBeFocused();

    await expect(panel).toBeVisible();
    await expect(root.getByTestId("child-dismissed")).toHaveText("none");
    await expect(root.getByTestId("dismissed")).toHaveText("none");
  });
});

test.describe("stacking", () => {
  /** Opens the panel, then the child panel above it. */
  async function openChild(root: MountResult, page: Page) {
    const panel = await openPanel(root, page);
    await panel.getByRole("button", { name: "Open child" }).click();
    const child = page.getByRole("dialog", { name: "Child" });
    await expect(
      child.getByRole("button", { name: "Child item" }),
    ).toBeFocused();
    return { panel, child };
  }

  test("an Escape an overlay takes never reaches the page", async ({
    mount,
    page,
  }) => {
    const root = await mount(<OverlayHarness />);
    const escapes = root.getByTestId("page-escapes");
    await root.getByRole("button", { name: "Elsewhere" }).focus();
    await page.keyboard.press("Escape");
    await expect(escapes).toHaveText("1");

    const panel = await openPanel(root, page);
    await page.keyboard.press("Escape");

    await expect(panel).toBeHidden();
    await expect(escapes).toHaveText("1");
    await page.keyboard.press("Escape");
    await expect(escapes).toHaveText("2");
  });

  test("Escape closes only the topmost overlay, returning focus to what opened it", async ({
    mount,
    page,
  }) => {
    const root = await mount(<OverlayHarness />);
    const { panel, child } = await openChild(root, page);

    await page.keyboard.press("Escape");

    await expect(child).toBeHidden();
    await expect(panel).toBeVisible();
    await expect(root.getByTestId("child-dismissed")).toHaveText("escape");
    await expect(root.getByTestId("dismissed")).toHaveText("none");
    await expect(
      panel.getByRole("button", { name: "Open child" }),
    ).toBeFocused();

    await page.keyboard.press("Escape");

    await expect(panel).toBeHidden();
    await expect(root.getByTestId("dismissed")).toHaveText("escape");
    await expect(root.getByRole("button", { name: "Anchor" })).toBeFocused();
  });

  test("a click inside the child keeps both open", async ({ mount, page }) => {
    const root = await mount(<OverlayHarness />);
    const { panel, child } = await openChild(root, page);

    await child.getByRole("button", { name: "Child item" }).click();

    await expect(child).toBeVisible();
    await expect(panel).toBeVisible();
    await expect(root.getByTestId("child-dismissed")).toHaveText("none");
    await expect(root.getByTestId("dismissed")).toHaveText("none");
  });

  test("a click in the panel outside the child closes only the child", async ({
    mount,
    page,
  }) => {
    const root = await mount(<OverlayHarness />);
    const { panel, child } = await openChild(root, page);

    await panel.getByRole("button", { name: "First" }).click();

    await expect(child).toBeHidden();
    await expect(panel).toBeVisible();
    await expect(root.getByTestId("child-dismissed")).toHaveText("outside");
    await expect(root.getByTestId("dismissed")).toHaveText("none");
  });

  test("closing the panel closes the child above it", async ({
    mount,
    page,
  }) => {
    const root = await mount(<OverlayHarness />);
    const { panel, child } = await openChild(root, page);

    await child.getByRole("button", { name: "Close panel" }).click();

    await expect(panel).toBeHidden();
    await expect(child).toBeHidden();
    await expect(root.getByTestId("child-dismissed")).toHaveText("parent");
    await expect(root.getByTestId("dismissed")).toHaveText("none");
  });
});

test.describe("inside a grid", () => {
  /** Selects the first two rows, then opens the panel from the header. */
  async function selectTwoRowsAndOpen(
    root: MountResult,
    page: Page,
  ): Promise<{ rows: Locator; panel: Locator }> {
    const rows = root.locator("tbody tr");
    await rows.nth(0).locator("td").first().click();
    await rows
      .nth(1)
      .locator("td")
      .first()
      .click({ modifiers: ["Control"] });
    await expect(rows.nth(1)).toHaveAttribute("aria-selected", "true");

    await root.getByRole("button", { name: "Open panel" }).click();
    const panel = page.getByRole("dialog", { name: "Panel" });
    await expect(panel.getByRole("textbox")).toBeFocused();
    return { rows, panel };
  }

  test("Escape in a portalled panel closes it and leaves the selection alone", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, <GridOverlayHarness />);
    const { rows, panel } = await selectTwoRowsAndOpen(root, page);

    await page.keyboard.press("Escape");

    await expect(panel).toBeHidden();
    await expect(rows.nth(0)).toHaveAttribute("aria-selected", "true");
    await expect(rows.nth(1)).toHaveAttribute("aria-selected", "true");
  });

  test("Ctrl+A in a portalled panel's input selects its text, not the rows", async ({
    mount,
    page,
  }) => {
    const root = await mountGrid(mount, <GridOverlayHarness />);
    const { rows, panel } = await selectTwoRowsAndOpen(root, page);
    const input = panel.getByRole("textbox");
    await input.evaluate((element: HTMLInputElement) => {
      element.setSelectionRange(element.value.length, element.value.length);
    });

    await page.keyboard.press("Control+a");

    await expect(rows.nth(2)).toHaveAttribute("aria-selected", "false");
    expect(
      await input.evaluate((element: HTMLInputElement) => [
        element.selectionStart,
        element.selectionEnd,
      ]),
    ).toEqual([0, "hello".length]);
  });
});
