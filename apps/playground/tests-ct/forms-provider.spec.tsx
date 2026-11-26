// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import type { MountResult } from "@playwright/experimental-ct-react";
import { expect, test } from "./support/coverage";
import ProviderHarness from "./support/forms/ProviderHarness";
import { typeInto } from "./support/forms/typeInto";

function counters(root: MountResult) {
  return root.locator(".gridkit-forms-text-input-counter");
}

test.describe("FormsProvider", () => {
  test("gives its density to every field, inside a form or not", async ({
    mount,
  }) => {
    const root = await mount(<ProviderHarness density="comfortable" />);
    const fields = root.locator(".gridkit-forms-field");
    await expect(fields).toHaveCount(3);
    for (const field of await fields.all()) {
      await expect(field).toHaveClass(/\bis-comfortable\b/);
    }
  });

  test("a form's own density wins over the provider's", async ({ mount }) => {
    const root = await mount(
      <ProviderHarness density="comfortable" formDensity="compact" />,
    );
    const fields = root.locator(".gridkit-forms-field");
    await expect(fields.nth(0)).toHaveClass(/\bis-comfortable\b/);
    await expect(fields.nth(1)).toHaveClass(/\bis-compact\b/);
    await expect(fields.nth(2)).toHaveClass(/\bis-compact\b/);
  });

  test("gives its locale to every input", async ({ mount }) => {
    const root = await mount(<ProviderHarness locale="ar-EG" />);
    await expect(counters(root)).toHaveText(["٣/١٠", "٣/١٠"]);
  });

  test("gives its strings to every input", async ({ mount }) => {
    const root = await mount(<ProviderHarness wordyCounter />);
    await expect(counters(root)).toHaveText(["3 of 10", "3 of 10"]);
  });
});

test.describe("useField onReveal", () => {
  test("a refused submit reveals the app input's message and focuses it", async ({
    mount,
  }) => {
    const root = await mount(<ProviderHarness />);
    const code = root.getByRole("textbox", { name: "Code" });
    await expect(code).toHaveAccessibleDescription("");

    await root.getByRole("button", { name: "Save" }).click();
    await expect(code).toBeFocused();
    await expect(code).toHaveAccessibleDescription("Error: Enter a code");
    await expect(code).toHaveAttribute("aria-invalid", "true");
    await expect(root.getByRole("status", { name: "Submitted" })).toHaveText(
      "0",
    );

    await typeInto(code, "A1");
    await root.getByRole("button", { name: "Save" }).click();
    await expect(root.getByRole("status", { name: "Submitted" })).toHaveText(
      "1",
    );
  });
});
