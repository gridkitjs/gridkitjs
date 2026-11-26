// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import type { MountResult } from "@playwright/experimental-ct-react";
import type { LabelPosition } from "@gridkitjs/forms";
import { expect, test } from "./support/coverage";
import FieldHarness from "./support/forms/FieldHarness";
import OwnInputField from "./support/forms/OwnInputField";

function field(root: MountResult) {
  return root.locator(".gridkit-forms-field");
}

function email(root: MountResult) {
  return root.getByRole("textbox", { name: "Email" });
}

/** The label's font size in pixels: the hint size once a floating label rises. */
async function labelFontSize(root: MountResult): Promise<string> {
  return root
    .locator(".gridkit-forms-field-label")
    .evaluate((label) => getComputedStyle(label).fontSize);
}

const POSITIONS: readonly LabelPosition[] = [
  "top",
  "floating",
  "start",
  "hidden",
];

test.describe("Field labels", () => {
  for (const labelPosition of POSITIONS) {
    test(`names and describes its input with the label ${labelPosition}`, async ({
      mount,
    }) => {
      const root = await mount(
        <FieldHarness
          labelPosition={labelPosition}
          description="Your work address"
        />,
      );
      await expect(email(root)).toHaveAccessibleName("Email");
      await expect(email(root)).toHaveAccessibleDescription(
        "Your work address",
      );
      await expect(field(root)).toHaveClass(
        new RegExp(`\\bis-label-${labelPosition}\\b`),
      );
    });
  }

  test("puts a start label beside the control, in a column of labelWidth", async ({
    mount,
  }) => {
    const root = await mount(
      <FieldHarness labelPosition="start" labelWidth="12rem" />,
    );
    const label = await root
      .locator(".gridkit-forms-field-label")
      .boundingBox();
    const control = await email(root).boundingBox();
    expect(label).not.toBeNull();
    expect(control).not.toBeNull();
    if (label === null || control === null) {
      return;
    }
    // 12rem plus the column gap of three spacing units.
    expect(Math.round(control.x - label.x)).toBe(12 * 16 + 12);
  });

  test("keeps a hidden label out of sight", async ({ mount }) => {
    const root = await mount(<FieldHarness labelPosition="hidden" />);
    const label = await root
      .locator(".gridkit-forms-field-label")
      .boundingBox();
    expect(label?.width).toBeLessThanOrEqual(1);
  });

  test("marks a required label with an asterisk the name leaves out, and an optional one in words", async ({
    mount,
  }) => {
    const required = await mount(<FieldHarness required />);
    await expect(email(required)).toHaveAccessibleName("Email");
    await expect(email(required)).toHaveAttribute("aria-required", "true");
    await expect(required.locator(".gridkit-forms-field-required")).toHaveText(
      "*",
    );
    await required.unmount();

    const optional = await mount(
      <FieldHarness necessityIndicator="optional" />,
    );
    await expect(
      optional.getByRole("textbox", { name: "Email (optional)" }),
    ).toBeVisible();
  });
});

test.describe("A floating label", () => {
  test("rises on focus and comes back down when the field is left empty", async ({
    mount,
  }) => {
    const root = await mount(<FieldHarness labelPosition="floating" />);
    await expect(field(root)).not.toHaveClass(/\bis-label-raised\b/);
    const resting = await labelFontSize(root);

    await email(root).focus();
    await expect(field(root)).toHaveClass(/\bis-label-raised\b/);
    await expect.poll(() => labelFontSize(root)).toBe("12px");

    await root.getByRole("textbox", { name: "Next" }).focus();
    await expect(field(root)).not.toHaveClass(/\bis-label-raised\b/);
    await expect.poll(() => labelFontSize(root)).toBe(resting);
  });

  test("stays up while the field holds typed text", async ({ mount }) => {
    const root = await mount(<FieldHarness labelPosition="floating" />);
    await email(root).click();
    await email(root).pressSequentially("ada@example.com");
    await root.getByRole("textbox", { name: "Next" }).focus();
    await expect(field(root)).toHaveClass(/\bis-label-raised\b/);

    await email(root).fill("");
    await root.getByRole("textbox", { name: "Next" }).focus();
    await expect(field(root)).not.toHaveClass(/\bis-label-raised\b/);
  });

  test("rises for a value the app sets, and falls when the app empties it", async ({
    mount,
  }) => {
    const root = await mount(<FieldHarness labelPosition="floating" />);
    await root.getByRole("button", { name: "Set to Ada" }).click();
    await expect(email(root)).toHaveValue("Ada");
    await expect(field(root)).toHaveClass(/\bis-label-raised\b/);

    await root.getByRole("button", { name: "Empty it" }).click();
    await expect(email(root)).toHaveValue("");
    await expect(field(root)).not.toHaveClass(/\bis-label-raised\b/);
  });

  test("starts up for a default value", async ({ mount }) => {
    const root = await mount(
      <FieldHarness labelPosition="floating" defaultValue="ada@example.com" />,
    );
    await expect(field(root)).toHaveClass(/\bis-label-raised\b/);
  });

  test("hides the placeholder until it has risen", async ({ mount }) => {
    const root = await mount(
      <FieldHarness labelPosition="floating" placeholder="name@example.com" />,
    );
    const placeholderOpacity = () =>
      email(root).evaluate(
        (input) => getComputedStyle(input, "::placeholder").opacity,
      );
    await expect.poll(placeholderOpacity).toBe("0");
    await email(root).focus();
    await expect.poll(placeholderOpacity).not.toBe("0");
  });

  test("moves with a transition, and without one under reduced motion", async ({
    mount,
    page,
  }) => {
    const root = await mount(<FieldHarness labelPosition="floating" />);
    const duration = () =>
      root
        .locator(".gridkit-forms-field-label")
        .evaluate((label) => getComputedStyle(label).transitionDuration);
    expect(await duration()).not.toBe("0s");

    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect.poll(duration).toBe("0s");
  });
});

test.describe("Field messages", () => {
  test("announce an error through the input's description once it shows", async ({
    mount,
  }) => {
    const root = await mount(
      <FieldHarness required description="Your work address" />,
    );
    const messages = root.locator(".gridkit-forms-field-messages");
    await expect(messages).toHaveAttribute("aria-live", "polite");
    await expect(email(root)).not.toHaveAttribute("aria-invalid");

    await email(root).click();
    await email(root).press("a");
    await email(root).press("Backspace");
    await email(root).press("Enter");
    await expect(email(root)).toHaveAccessibleDescription(
      "Your work address Error: Enter a value",
    );
    await expect(email(root)).toHaveAttribute("aria-invalid", "true");
    await expect(field(root)).toHaveClass(/\bis-error\b/);

    await email(root).pressSequentially("ada");
    await expect(email(root)).toHaveAccessibleDescription("Your work address");
    await expect(email(root)).not.toHaveAttribute("aria-invalid");
  });

  test("show the app's messages, most serious first, and only an error makes the input invalid", async ({
    mount,
  }) => {
    const root = await mount(
      <FieldHarness
        message={[
          { text: "Saved", severity: "success" },
          { text: "A personal address", severity: "warning" },
          { text: "Checked against the directory", severity: "info" },
        ]}
      />,
    );
    await expect(root.locator(".gridkit-forms-message")).toHaveText([
      "Warning: A personal address",
      "Information: Checked against the directory",
      "Success: Saved",
    ]);
    await expect(field(root)).toHaveClass(/\bis-warning\b/);
    await expect(email(root)).not.toHaveAttribute("aria-invalid");
  });
});

test.describe("Field modes", () => {
  test("display mode shows the value as text in a group the label names", async ({
    mount,
  }) => {
    const root = await mount(
      <FieldHarness
        label="Name"
        mode="display"
        defaultValue="Ada Lovelace"
        name="name"
      />,
    );
    await expect(root.getByRole("textbox", { name: "Name" })).toHaveCount(0);
    await expect(root.getByRole("group", { name: "Name" })).toHaveText(
      /Ada Lovelace/,
    );
    await expect(root.locator('input[type="hidden"]')).toHaveValue(
      "Ada Lovelace",
    );
  });

  test("display mode reads an empty value as no value", async ({ mount }) => {
    const root = await mount(<FieldHarness label="Name" mode="display" />);
    await expect(root.getByRole("group", { name: "Name" })).toHaveText(
      /No value/,
    );
  });

  test("a read-only field keeps its input focusable but unchangeable", async ({
    mount,
  }) => {
    const root = await mount(<FieldHarness readOnly defaultValue="ada" />);
    await expect(email(root)).toHaveAttribute("readonly", "");
    await expect(field(root)).toHaveClass(/\bis-readonly\b/);
    await email(root).focus();
    await expect(email(root)).toBeFocused();
    await email(root).press("x");
    await expect(email(root)).toHaveValue("ada");
  });

  test("a disabled field disables its input and shows only the app's messages", async ({
    mount,
  }) => {
    const root = await mount(
      <FieldHarness
        disabled
        required
        name="email"
        message={{ text: "Managed by your administrator", severity: "info" }}
      />,
    );
    await expect(email(root)).toBeDisabled();
    await expect(root.locator('input[type="hidden"]')).toBeDisabled();
    await expect(field(root)).toHaveClass(/\bis-disabled\b/);
    await expect(root.locator(".gridkit-forms-message")).toHaveText([
      "Information: Managed by your administrator",
    ]);
  });
});

test.describe("useField", () => {
  test("wires an app's own input into its field", async ({ mount }) => {
    const root = await mount(<OwnInputField />);
    const code = root.getByRole("textbox", { name: "Code" });
    await expect(code).toHaveAccessibleDescription("Six letters");
    await expect(code).toHaveAttribute("aria-required", "true");
    await expect(root).not.toHaveClass(/\bis-label-raised\b/);

    await code.fill("bad");
    await expect(root).toHaveClass(/\bis-label-raised\b/);
    await expect(code).toHaveAccessibleDescription(
      "Six letters Warning: That code is unusual",
    );
    await expect(root).toHaveClass(/\bis-warning\b/);

    await code.fill("");
    await code.blur();
    await expect(root).not.toHaveClass(/\bis-label-raised\b/);
  });
});
