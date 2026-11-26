// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import type { MountResult } from "@playwright/experimental-ct-react";
import { expect, test } from "./support/coverage";
import FieldGroupHarness from "./support/forms/FieldGroupHarness";
import FormHarness from "./support/forms/FormHarness";
import { typeInto } from "./support/forms/typeInto";

function textbox(root: MountResult, name: string) {
  return root.getByRole("textbox", { name, exact: true });
}

function submitted(root: MountResult) {
  return root.getByRole("status", { name: "Submitted" });
}

async function fillRequired(root: MountResult): Promise<void> {
  await typeInto(textbox(root, "Name"), "Ada");
  await typeInto(textbox(root, "City"), "London");
}

test.describe("Form submit", () => {
  test("a refused submit shows every field's error and focuses the first invalid field", async ({
    mount,
  }) => {
    const root = await mount(<FormHarness />);
    await root.getByRole("button", { name: "Send" }).click();

    await expect(textbox(root, "Name")).toBeFocused();
    await expect(textbox(root, "Name")).toHaveAccessibleDescription(
      "Error: Enter a value",
    );
    await expect(textbox(root, "City")).toHaveAccessibleDescription(
      "Error: Enter a value",
    );
    await expect(submitted(root)).toHaveText("");
  });

  test("an accepted submit reaches onSubmit with every field's value", async ({
    mount,
  }) => {
    const root = await mount(<FormHarness />);
    await fillRequired(root);
    await root.getByRole("button", { name: "Send" }).click();
    await expect(submitted(root)).toHaveText(
      "name=Ada&email=&account=A-100&notes=&comments=&city=London",
    );
  });

  test("a refused submit runs no React form action, and an accepted one does", async ({
    mount,
  }) => {
    const root = await mount(<FormHarness submitWith="action" />);
    await root.getByRole("button", { name: "Send" }).click();
    await expect(textbox(root, "Name")).toBeFocused();
    await expect(submitted(root)).toHaveText("");

    await fillRequired(root);
    await root.getByRole("button", { name: "Send" }).click();
    await expect(submitted(root)).toHaveText(
      "name=Ada&email=&account=A-100&notes=&comments=&city=London",
    );
  });

  test("a refused submit focuses the message summary when the form shows one", async ({
    mount,
  }) => {
    const root = await mount(<FormHarness withSummary />);
    await root.getByRole("button", { name: "Send" }).click();
    const summary = root.getByRole("region", {
      name: "There are 2 problems with this form",
    });
    await expect(summary).toBeFocused();
    await expect(submitted(root)).toHaveText("");
  });

  test("a native constraint of the app's own control refuses the submit too", async ({
    mount,
  }) => {
    const root = await mount(<FormHarness nativeRequired />);
    await fillRequired(root);
    await root.getByRole("button", { name: "Send" }).click();
    await expect(textbox(root, "Code")).toBeFocused();
    await expect(submitted(root)).toHaveText("");
  });

  test("a refused submit opens the collapsed section around the first invalid field", async ({
    mount,
  }) => {
    const root = await mount(<FormHarness collapsedCity />);
    const toggle = root.getByRole("button", { name: "Delivery" });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await typeInto(textbox(root, "Name"), "Ada");
    await root.getByRole("button", { name: "Send" }).click();

    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(textbox(root, "City")).toBeFocused();
  });

  test("noValidate lets every submit through", async ({ mount }) => {
    const root = await mount(<FormHarness noValidate />);
    await root.getByRole("button", { name: "Send" }).click();
    await expect(submitted(root)).toHaveText(/^name=&/);
    await expect(textbox(root, "Name")).not.toHaveAttribute("aria-invalid");
  });
});

test.describe("Enter moves to the next field", () => {
  test("from a text field to the next one a user can change, skipping a read-only one", async ({
    mount,
  }) => {
    const root = await mount(<FormHarness enterMovesToNextField />);
    await typeInto(textbox(root, "Name"), "Ada");
    await textbox(root, "Name").press("Enter");
    await expect(textbox(root, "Email")).toBeFocused();

    await textbox(root, "Email").press("Enter");
    await expect(
      root.getByRole("checkbox", { name: "Subscribe" }),
    ).toBeFocused();

    await root.getByRole("checkbox", { name: "Subscribe" }).press("Enter");
    await expect(textbox(root, "Notes")).toBeFocused();
    await expect(submitted(root)).toHaveText("");
  });

  test("leaves Enter in a textarea alone, and submits from the last field", async ({
    mount,
  }) => {
    const root = await mount(<FormHarness enterMovesToNextField />);
    await typeInto(textbox(root, "Name"), "Ada");
    const comments = textbox(root, "Comments");
    await comments.click();
    await comments.press("Enter");
    await expect(comments).toBeFocused();
    await expect(comments).toHaveValue("\n");

    await typeInto(textbox(root, "City"), "London");
    await textbox(root, "City").press("Enter");
    await expect(submitted(root)).toHaveText(/name=Ada/);
  });

  test("is off by default: Enter in a field submits", async ({ mount }) => {
    const root = await mount(<FormHarness />);
    await fillRequired(root);
    await textbox(root, "Email").press("Enter");
    await expect(submitted(root)).toHaveText(/name=Ada/);
  });
});

test.describe("Form settings", () => {
  test("display mode shows every field as text", async ({ mount }) => {
    const root = await mount(<FormHarness mode="display" />);
    await expect(root.locator(".gridkit-forms-form")).toHaveClass(
      /\bis-display\b/,
    );
    await expect(textbox(root, "Name")).toHaveCount(0);
    await expect(root.getByRole("group", { name: "Account" })).toHaveText(
      /A-100/,
    );
  });

  test("density reaches every field", async ({ mount }) => {
    const root = await mount(<FormHarness density="compact" />);
    await expect(root.locator(".gridkit-forms-form")).toHaveClass(
      /\bis-compact\b/,
    );
    const fields = root.locator(".gridkit-forms-field");
    for (const field of await fields.all()) {
      await expect(field).toHaveClass(/\bis-compact\b/);
    }
  });

  test("a disabled fieldset disables every control in it, natively and through its fields", async ({
    mount,
  }) => {
    const root = await mount(<FormHarness fieldsetDisabled />);
    await expect(
      root.getByRole("checkbox", { name: "Subscribe" }),
    ).toBeDisabled();
    await expect(textbox(root, "Notes")).toBeDisabled();
    await expect(
      root.locator(".gridkit-forms-field").filter({ hasText: "Notes" }),
    ).toHaveClass(/\bis-disabled\b/);
    await expect(textbox(root, "Name")).toBeEnabled();
  });
});

test.describe("FieldGroup", () => {
  test("names its inputs' group and describes each with its help text", async ({
    mount,
  }) => {
    const root = await mount(<FieldGroupHarness />);
    // The mounted root is the group itself.
    await expect(root).toHaveRole("group");
    await expect(root).toHaveAccessibleName("Address");
    await expect(textbox(root, "Postal code")).toHaveAccessibleDescription(
      "As on your letters",
    );
    await expect(textbox(root, "City")).toHaveAccessibleDescription(
      "As on your letters",
    );
  });

  test("lists an input's error in the group's message area, marking only that input", async ({
    mount,
  }) => {
    const root = await mount(<FieldGroupHarness />);
    const postalCode = textbox(root, "Postal code");
    await postalCode.click();
    await postalCode.press("a");
    await postalCode.press("Backspace");
    await postalCode.press("Enter");

    await expect(root.locator(".gridkit-forms-message")).toHaveText([
      "Error: Enter a value",
    ]);
    await expect(postalCode).toHaveAttribute("aria-invalid", "true");
    await expect(textbox(root, "City")).not.toHaveAttribute("aria-invalid");
    await expect(textbox(root, "City")).toHaveAccessibleDescription(
      "As on your letters Error: Enter a value",
    );
  });
});
