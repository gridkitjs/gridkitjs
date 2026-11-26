// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import type { MountResult } from "@playwright/experimental-ct-react";
import { expect, test } from "./support/coverage";
import LayoutHarness from "./support/forms/LayoutHarness";
import SectionHarness from "./support/forms/SectionHarness";
import { typeInto } from "./support/forms/typeInto";

/** How many columns the layout's grid has, from its computed template. */
async function columnCount(root: MountResult): Promise<number> {
  return root
    .locator(".gridkit-forms-layout-grid")
    .evaluate(
      (grid) => getComputedStyle(grid).gridTemplateColumns.split(" ").length,
    );
}

async function box(root: MountResult, selector: string) {
  const found = await root.locator(selector).first().boundingBox();
  if (found === null) {
    throw new Error(`${selector} is not drawn`);
  }
  return found;
}

function field(root: MountResult, label: string) {
  return root.locator(".gridkit-forms-field").filter({ hasText: label });
}

test.describe("FormLayout", () => {
  test("drops its columns as it narrows", async ({ mount }) => {
    const wide = await mount(<LayoutHarness width="70rem" columns={3} />);
    expect(await columnCount(wide)).toBe(3);
    await wide.unmount();

    const narrow = await mount(<LayoutHarness width="40rem" columns={3} />);
    expect(await columnCount(narrow)).toBe(2);
    await narrow.unmount();

    const phone = await mount(<LayoutHarness width="25rem" columns={3} />);
    expect(await columnCount(phone)).toBe(1);
  });

  test("never has more columns than it asks for", async ({ mount }) => {
    const root = await mount(<LayoutHarness width="70rem" columns={2} />);
    expect(await columnCount(root)).toBe(2);
  });

  test("clamps a span to the columns there are", async ({ mount }) => {
    const wide = await mount(
      <LayoutHarness width="70rem" columns={3} span={2} />,
    );
    const grid = await box(wide, ".gridkit-forms-layout-grid");
    const name = await field(wide, "Name").boundingBox();
    const email = await field(wide, "Email").boundingBox();
    // Two of three columns, with the gap between them.
    expect(Math.round(name?.width ?? 0)).toBeGreaterThan(
      Math.round(grid.width / 2),
    );
    expect(Math.round(name?.width ?? 0)).toBeLessThan(Math.round(grid.width));
    expect(Math.round(email?.y ?? 0)).toBe(Math.round(name?.y ?? -1));
    await wide.unmount();

    const narrow = await mount(
      <LayoutHarness width="40rem" columns={3} span={4} />,
    );
    const narrowGrid = await box(narrow, ".gridkit-forms-layout-grid");
    const narrowName = await field(narrow, "Name").boundingBox();
    expect(Math.round(narrowName?.width ?? 0)).toBe(
      Math.round(narrowGrid.width),
    );
    expect(await columnCount(narrow)).toBe(2);
  });

  test('takes a whole row with span="full"', async ({ mount }) => {
    const root = await mount(
      <LayoutHarness width="70rem" columns={4} span="full" />,
    );
    const grid = await box(root, ".gridkit-forms-layout-grid");
    const name = await field(root, "Name").boundingBox();
    expect(Math.round(name?.width ?? 0)).toBe(Math.round(grid.width));
  });

  test("runs its columns right to left under dir=rtl", async ({ mount }) => {
    const root = await mount(
      <LayoutHarness width="70rem" columns={2} dir="rtl" />,
    );
    const name = await field(root, "Name").boundingBox();
    const email = await field(root, "Email").boundingBox();
    expect(name?.x ?? 0).toBeGreaterThan(email?.x ?? 0);
  });

  test("stacks a start label on top below 30rem", async ({ mount }) => {
    const wide = await mount(
      <LayoutHarness width="40rem" labelPosition="start" />,
    );
    const wideLabel = await box(wide, ".gridkit-forms-field-label");
    const wideControl = await box(wide, "input");
    expect(wideControl.x).toBeGreaterThan(wideLabel.x + wideLabel.width);
    await wide.unmount();

    const narrow = await mount(
      <LayoutHarness width="25rem" labelPosition="start" />,
    );
    const label = await box(narrow, ".gridkit-forms-field-label");
    const control = await box(narrow, "input");
    expect(control.y).toBeGreaterThanOrEqual(label.y + label.height);
    expect(Math.round(control.x)).toBe(Math.round(label.x));
  });
});

test.describe("FormSection", () => {
  test("collapses and expands by keyboard, as a disclosure", async ({
    mount,
  }) => {
    const root = await mount(<SectionHarness />);
    const toggle = root.getByRole("button", { name: "Delivery" });
    const city = root.getByRole("textbox", { name: "City" });
    await expect(root.getByRole("heading", { name: "Delivery" })).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(city).toBeVisible();

    await toggle.focus();
    await toggle.press("Enter");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(city).toBeHidden();
    await expect(root.locator(".gridkit-forms-section")).toHaveClass(
      /\bis-collapsed\b/,
    );

    await toggle.press(" ");
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(city).toBeVisible();
  });

  test("keeps a hidden field's value while collapsed", async ({ mount }) => {
    const root = await mount(<SectionHarness />);
    const toggle = root.getByRole("button", { name: "Delivery" });
    await typeInto(root.getByRole("textbox", { name: "City" }), "Paris");
    await toggle.click();
    await toggle.click();
    await expect(root.getByRole("textbox", { name: "City" })).toHaveValue(
      "Paris",
    );
  });

  test("controlled, it reports each change and follows expanded", async ({
    mount,
  }) => {
    const root = await mount(<SectionHarness controlled />);
    const toggle = root.getByRole("button", { name: "Delivery" });
    await toggle.click();
    await expect(root.getByRole("status", { name: "Expanded" })).toHaveText(
      "false",
    );
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  test("turns its chevron with a transition, and without one under reduced motion", async ({
    mount,
    page,
  }) => {
    const root = await mount(<SectionHarness />);
    const duration = () =>
      root
        .locator(".gridkit-forms-section-toggle-icon")
        .evaluate((icon) => getComputedStyle(icon).transitionDuration);
    expect(await duration()).not.toBe("0s");

    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect.poll(duration).toBe("0s");
  });

  test("names its region by its title and describes it", async ({ mount }) => {
    const root = await mount(<SectionHarness />);
    const section = root.getByRole("region", { name: "Delivery" });
    await expect(section).toHaveAccessibleDescription("Where the order goes");
  });
});
