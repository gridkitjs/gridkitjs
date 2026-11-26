// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import type { MountResult } from "@playwright/experimental-ct-react";
import { expect, test } from "./support/coverage";
import SummaryHarness from "./support/forms/SummaryHarness";
import { typeInto } from "./support/forms/typeInto";

function summary(root: MountResult) {
  return root.locator(".gridkit-forms-message-summary");
}

function links(root: MountResult) {
  return summary(root).getByRole("link");
}

const MESSAGES = {
  name: "Enter your full name",
  email: [
    { text: "A personal address", severity: "warning" as const },
    { text: "Checked against the directory", severity: "info" as const },
  ],
  phone: { text: "No area code", severity: "warning" as const },
};

test.describe("MessageSummary", () => {
  test("renders nothing while no field shows a message", async ({ mount }) => {
    const root = await mount(<SummaryHarness />);
    await expect(root.getByRole("textbox", { name: "Name" })).toBeVisible();
    await expect(summary(root)).toHaveCount(0);
  });

  test("lists errors and warnings field by field, with a count per severity", async ({
    mount,
  }) => {
    const root = await mount(<SummaryHarness messages={MESSAGES} />);
    await expect(
      root.getByRole("region", {
        name: "There are 3 problems with this form",
      }),
    ).toBeVisible();
    await expect(
      summary(root).locator(".gridkit-forms-message-summary-count"),
    ).toHaveText(["1 error", "2 warnings"]);
    await expect(links(root)).toHaveText([
      "Name: Enter your full name",
      "Email: A personal address",
      "Phone: No area code",
    ]);
    await expect(summary(root)).toHaveClass(/\bis-error\b/);
  });

  test("lists the severities it is given", async ({ mount }) => {
    const root = await mount(
      <SummaryHarness messages={MESSAGES} severities={["info"]} />,
    );
    await expect(links(root)).toHaveText([
      "Email: Checked against the directory",
    ]);
    await expect(
      summary(root).locator(".gridkit-forms-message-summary-count"),
    ).toHaveText(["1 note"]);
    await expect(summary(root)).toHaveClass(/\bis-info\b/);
  });

  test("a link focuses its field", async ({ mount }) => {
    const root = await mount(<SummaryHarness messages={MESSAGES} />);
    await links(root).filter({ hasText: "Phone" }).click();
    await expect(root.getByRole("textbox", { name: "Phone" })).toBeFocused();
    await expect(links(root).first()).toHaveAttribute("href", /^#.+/);
  });

  test("after a refused submit, links to a group's first input and into a collapsed section", async ({
    mount,
  }) => {
    const root = await mount(<SummaryHarness collapsedDelivery />);
    const toggle = root.getByRole("button", { name: "Delivery" });
    await root.getByRole("button", { name: "Send" }).click();

    await expect(summary(root)).toBeFocused();
    await expect(links(root)).toHaveText([
      "Address: Enter a value",
      "Address: Enter a value",
      "City: Enter a value",
    ]);

    await links(root).first().click();
    await expect(
      root.getByRole("textbox", { name: "Postal code" }),
    ).toBeFocused();

    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await links(root).filter({ hasText: "City" }).click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(root.getByRole("textbox", { name: "City" })).toBeFocused();
  });

  test("updates as the user fixes a field, and goes when nothing is left", async ({
    mount,
  }) => {
    const root = await mount(<SummaryHarness />);
    await root.getByRole("button", { name: "Send" }).click();
    await expect(links(root)).toHaveCount(3);

    await links(root).filter({ hasText: "City" }).click();
    await typeInto(root.getByRole("textbox", { name: "City" }), "London");
    await expect(links(root)).toHaveCount(2);

    await typeInto(root.getByRole("textbox", { name: "Postal code" }), "1000");
    await typeInto(root.getByRole("textbox", { name: "Street" }), "Main");
    await expect(summary(root)).toHaveCount(0);
  });
});
