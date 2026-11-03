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
