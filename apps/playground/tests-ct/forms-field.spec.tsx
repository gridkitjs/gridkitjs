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

/** The label's scale, from its transform: 0.75 once a floating label rises. */
async function labelScale(root: MountResult): Promise<number> {
  return root.locator(".gridkit-forms-field-label").evaluate((label) => {
    const { transform } = getComputedStyle(label);
    return transform === "none" ? 1 : new DOMMatrixReadOnly(transform).a;
  });
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

/**
 * Whether the required star is drawn whole inside its label, in the
 * palette's error colour.
 */
async function starIsDrawn(root: MountResult): Promise<boolean> {
  return root.locator(".gridkit-forms-field-required").evaluate((star) => {
    const label = star.closest(".gridkit-forms-field-label");
    if (label === null) {
      return false;
    }
    const probe = document.createElement("span");
    probe.style.color = "var(--gridkit-error)";
    star.append(probe);
    const errorColor = getComputedStyle(probe).color;
    probe.remove();
    const box = star.getBoundingClientRect();
    const within = label.getBoundingClientRect();
    return (
      box.width > 0 &&
      box.left >= within.left - 0.5 &&
      box.right <= within.right + 0.5 &&
      getComputedStyle(star).color === errorColor
    );
  });
}

test.describe("The required star", () => {
  const visible: readonly LabelPosition[] = ["top", "floating", "start"];
  for (const labelPosition of visible) {
    test(`shows after a ${labelPosition} label, for the field's required and for the input's own`, async ({
      mount,
    }) => {
      const byField = await mount(
        <FieldHarness labelPosition={labelPosition} required />,
      );
      await expect(byField.locator(".gridkit-forms-field-required")).toHaveText(
        "*",
      );
      expect(await starIsDrawn(byField)).toBe(true);
      await byField.unmount();

      const byInput = await mount(
        <FieldHarness labelPosition={labelPosition} inputRequired />,
      );
      await expect(email(byInput)).toHaveAttribute("aria-required", "true");
      await expect(email(byInput)).toHaveAccessibleName("Email");
      expect(await starIsDrawn(byInput)).toBe(true);
      await expect(field(byInput)).toHaveClass(/\bis-required\b/);
    });
  }

  test("stays on a floating label once it has risen", async ({ mount }) => {
    const root = await mount(
      <FieldHarness labelPosition="floating" required />,
    );
    await email(root).focus();
    await expect(field(root)).toHaveClass(/\bis-label-raised\b/);
    expect(await starIsDrawn(root)).toBe(true);
  });

  test('goes with necessityIndicator="none", and aria-required stays', async ({
    mount,
  }) => {
    const root = await mount(
      <FieldHarness required inputRequired necessityIndicator="none" />,
    );
    await expect(root.locator(".gridkit-forms-field-required")).toHaveCount(0);
    await expect(email(root)).toHaveAttribute("aria-required", "true");
  });
});

test.describe("A floating label", () => {
  test("rises on focus and comes back down when the field is left empty", async ({
    mount,
  }) => {
    const root = await mount(<FieldHarness labelPosition="floating" />);
    await expect(field(root)).not.toHaveClass(/\bis-label-raised\b/);
    expect(await labelScale(root)).toBe(1);

    await email(root).focus();
    await expect(field(root)).toHaveClass(/\bis-label-raised\b/);
    await expect.poll(() => labelScale(root)).toBe(0.75);
    // Raised, it sits across the control's top edge.
    const label = await root
      .locator(".gridkit-forms-field-label")
      .boundingBox();
    const control = await email(root).boundingBox();
    expect(label).not.toBeNull();
    expect(control).not.toBeNull();
    if (label !== null && control !== null) {
      expect(Math.abs(label.y + label.height / 2 - control.y)).toBeLessThan(1);
    }

    await root.getByRole("textbox", { name: "Next" }).focus();
    await expect(field(root)).not.toHaveClass(/\bis-label-raised\b/);
    await expect.poll(() => labelScale(root)).toBe(1);
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

  test("moves by a transition of its transform, and without one under reduced motion", async ({
    mount,
    page,
  }) => {
    const root = await mount(<FieldHarness labelPosition="floating" />);
    const transition = () =>
      root.locator(".gridkit-forms-field-label").evaluate((label) => {
        const style = getComputedStyle(label);
        return {
          properties: style.transitionProperty.split(/,\s*/),
          seconds: Math.max(
            ...style.transitionDuration
              .split(/,\s*/)
              .map((duration) => parseFloat(duration)),
          ),
        };
      });
    const moving = await transition();
    expect(moving.properties).toContain("transform");
    expect(moving.seconds).toBeGreaterThan(0);

    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect.poll(async () => (await transition()).seconds).toBe(0);
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
