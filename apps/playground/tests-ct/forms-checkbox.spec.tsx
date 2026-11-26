// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import type { MountResult } from "@playwright/experimental-ct-react";
import type { Locator, Page } from "@playwright/test";
import { expect, test } from "./support/coverage";
import { eventItems, loggedEvents } from "./support/forms/loggedEvents";
import ToggleHarness from "./support/forms/ToggleHarness";

function checkbox(root: MountResult): Locator {
  return root.getByRole("checkbox");
}

function box(root: MountResult): Locator {
  return root.locator(".gridkit-forms-checkbox-box");
}

/** Empties the event log, for the action under test. */
async function clearEvents(root: MountResult): Promise<void> {
  await root.getByRole("button", { name: "Clear events" }).click();
  await expect(eventItems(root)).toHaveCount(0);
}

/** Whether the native checkbox is indeterminate, which no ARIA state check reads directly. */
function isMixed(control: Locator): Promise<boolean> {
  return control.evaluate(
    (element) => (element as HTMLInputElement).indeterminate,
  );
}

/** The colour a palette token resolves to on the page, as computed styles write it. */
function tokenColor(page: Page, token: string): Promise<string> {
  return page.evaluate((name) => {
    const probe = document.createElement("span");
    probe.style.color = `var(${name})`;
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  }, token);
}

const FLIP = [
  "onBeforeChange toggle",
  "onChange toggle",
  "onValidate toggle",
  "onBeforeCommit toggle toggle",
  "onCommit toggle toggle",
];

test.describe("Checkbox", () => {
  test("is named by its own label and the field's", async ({ mount }) => {
    const root = await mount(
      <ToggleHarness fieldLabel="Newsletter" label="Send me the newsletter" />,
    );

    await expect(checkbox(root)).toHaveAccessibleName(
      /Newsletter.*Send me the newsletter/,
    );
    await expect(checkbox(root)).not.toBeChecked();
  });

  test("a press flips it, firing the change and the commit with the click", async ({
    mount,
  }) => {
    const root = await mount(<ToggleHarness label="Newsletter" />);

    await checkbox(root).click();

    await expect(checkbox(root)).toBeChecked();
    await expect(root.locator(".gridkit-forms-checkbox")).toHaveClass(
      /is-checked/,
    );
    await expect(eventItems(root)).toHaveText(
      // WebKit does not focus a checkbox it clicks, so there is no onFocus.
      (await eventItems(root).first().textContent()) === "onFocus"
        ? ["onFocus", ...FLIP]
        : FLIP,
    );
    const events = (await loggedEvents(root)).filter(
      (event) => event.name !== "onFocus",
    );
    expect(events[1]).toMatchObject({
      value: true,
      previousValue: false,
      text: "Yes",
      previousText: "No",
      native: "click",
    });
    expect(events[4]).toMatchObject({ changed: true, initialValue: false });
  });

  test("a press on its label flips it", async ({ mount, page }) => {
    const root = await mount(<ToggleHarness label="Newsletter" />);

    // The checkbox lies over the whole row, so this press lands on it
    // through the label's area, as a user's would.
    const label = await root.getByText("Newsletter").boundingBox();
    expect(label).not.toBeNull();
    if (label !== null) {
      await page.mouse.click(
        label.x + label.width / 2,
        label.y + label.height / 2,
      );
    }

    await expect(checkbox(root)).toBeChecked();
  });

  test("Space flips it, reporting the key", async ({ mount, page }) => {
    const root = await mount(<ToggleHarness label="Newsletter" />);
    await checkbox(root).focus();
    await clearEvents(root);

    await page.keyboard.press("Space");

    await expect(checkbox(root)).toBeChecked();
    await expect(eventItems(root)).toHaveText(FLIP);
    expect((await loggedEvents(root))[1]).toMatchObject({
      value: true,
      native: "keydown",
    });

    await page.keyboard.press("Space");
    await expect(checkbox(root)).not.toBeChecked();
  });

  test("leaving it commits nothing more", async ({ mount, page }) => {
    const root = await mount(<ToggleHarness label="Newsletter" />);
    await checkbox(root).focus();
    await page.keyboard.press("Space");
    await clearEvents(root);

    await page.keyboard.press("Tab");

    await expect(eventItems(root)).toHaveText(["onBlur"]);
  });

  test("threeState cycles unchecked, checked, mixed, unchecked", async ({
    mount,
  }) => {
    const root = await mount(<ToggleHarness label="All" threeState />);
    const control = checkbox(root);

    await control.click();
    await expect(control).toBeChecked();

    await control.click();
    await expect(root.locator(".gridkit-forms-checkbox")).toHaveClass(
      /is-mixed/,
    );
    expect(await isMixed(control)).toBe(true);
    await expect(control).toBeChecked({ indeterminate: true });
    expect((await loggedEvents(root)).at(-1)).toMatchObject({
      name: "onCommit",
      value: null,
      text: "",
    });

    await control.click();
    await expect(control).not.toBeChecked();
    expect(await isMixed(control)).toBe(false);
  });

  test("without threeState, a mixed box checks and never goes back to mixed", async ({
    mount,
  }) => {
    const root = await mount(<ToggleHarness label="All" defaultValue={null} />);
    const control = checkbox(root);
    expect(await isMixed(control)).toBe(true);

    await control.click();
    await expect(control).toBeChecked();
    expect(await isMixed(control)).toBe(false);

    await control.click();
    await expect(control).not.toBeChecked();
    expect(await isMixed(control)).toBe(false);
  });

  test("a controlled value is shown without an event", async ({ mount }) => {
    const root = await mount(<ToggleHarness label="All" controlled={false} />);

    await root.getByRole("button", { name: "Set mixed" }).click();
    await expect(root.locator(".gridkit-forms-checkbox")).toHaveClass(
      /is-mixed/,
    );
    expect(await isMixed(checkbox(root))).toBe(true);

    await root.getByRole("button", { name: "Set checked" }).click();
    await expect(checkbox(root)).toBeChecked();
    await expect(eventItems(root)).toHaveCount(0);
  });

  test("a flip onBeforeChange prevents leaves the box as it was", async ({
    mount,
  }) => {
    const root = await mount(<ToggleHarness label="Locked in" refuseChange />);

    await checkbox(root).click();

    await expect(checkbox(root)).not.toBeChecked();
    expect((await loggedEvents(root)).map((event) => event.name)).not.toContain(
      "onChange",
    );
  });

  test("readOnly refuses a press and Space, and stays focusable", async ({
    mount,
    page,
  }) => {
    const root = await mount(<ToggleHarness label="Agreed" readOnly />);
    const control = checkbox(root);
    await expect(control).toHaveAttribute("aria-readonly", "true");
    await expect(root.locator(".gridkit-forms-checkbox")).toHaveClass(
      /is-readonly/,
    );

    await control.click();
    await control.focus();
    await page.keyboard.press("Space");

    await expect(control).toBeFocused();
    await expect(control).not.toBeChecked();
    expect((await loggedEvents(root)).map((event) => event.name)).not.toContain(
      "onChange",
    );
  });

  test("disabled cannot be flipped and is not submitted", async ({ mount }) => {
    const root = await mount(
      <ToggleHarness label="Agreed" name="agreed" disabled defaultValue />,
    );

    await expect(checkbox(root)).toBeDisabled();
    await root.getByRole("button", { name: "Submit" }).click();

    await expect(root.getByTestId("submitted")).toHaveText("[]");
  });

  test("submits true, false, or nothing while mixed", async ({ mount }) => {
    const root = await mount(
      <ToggleHarness label="All" name="all" threeState />,
    );
    const submit = root.getByRole("button", { name: "Submit" });
    const submitted = root.getByTestId("submitted");

    await submit.click();
    await expect(submitted).toHaveText('[["all","false"]]');

    await checkbox(root).click();
    await submit.click();
    await expect(submitted).toHaveText('[["all","true"]]');

    await checkbox(root).click();
    await submit.click();
    await expect(submitted).toHaveText('[["all",""]]');
  });

  test("required must be checked: a plain form refuses, and an unchecking shows why", async ({
    mount,
  }) => {
    const root = await mount(
      <ToggleHarness
        fieldLabel="Terms"
        label="I agree"
        name="terms"
        required
      />,
    );

    await root.getByRole("button", { name: "Submit" }).click();
    await expect(root.getByTestId("submitted")).toHaveText("none");
    await expect(root.locator(".gridkit-forms-field")).toHaveClass(
      /is-required/,
    );

    await checkbox(root).click();
    await checkbox(root).click();

    await expect(root.getByText("Check this box to continue")).toBeVisible();
    await expect(checkbox(root)).toHaveAttribute("aria-invalid", "true");
    await expect(root.locator(".gridkit-forms-checkbox")).toHaveClass(
      /is-error/,
    );
  });

  test("the form's reset puts back its first value", async ({ mount }) => {
    const root = await mount(<ToggleHarness label="Agreed" defaultValue />);
    await checkbox(root).click();
    await expect(checkbox(root)).not.toBeChecked();
    await clearEvents(root);

    await root.getByRole("button", { name: "Reset" }).click();

    await expect(checkbox(root)).toBeChecked();
    expect(
      (await loggedEvents(root)).find((event) => event.name === "onChange"),
    ).toMatchObject({
      value: true,
      source: "api",
    });
  });

  test("display mode shows Yes, No or a dash beside the label", async ({
    mount,
  }) => {
    const checked = await mount(
      <ToggleHarness label="Agreed" mode="display" defaultValue />,
    );
    await expect(checked.getByRole("checkbox")).toHaveCount(0);
    await expect(checked.locator(".gridkit-forms-display-value")).toHaveText(
      "Yes",
    );
    await expect(checked.getByText("Agreed")).toBeVisible();
    await checked.unmount();

    const mixed = await mount(
      <ToggleHarness label="All" mode="display" defaultValue={null} />,
    );
    await expect(mixed.locator(".gridkit-forms-display-empty")).toHaveText(
      /No value/,
    );
  });

  test("a floating field label sits above it, as top", async ({ mount }) => {
    const root = await mount(
      <ToggleHarness
        fieldLabel="Terms"
        labelPosition="floating"
        label="I agree"
      />,
    );

    await expect(root.locator(".gridkit-forms-field")).toHaveClass(
      /is-label-top/,
    );
  });

  test("labelPlacement start puts the label before the box, in reading order", async ({
    mount,
  }) => {
    for (const dir of ["ltr", "rtl"] as const) {
      const root = await mount(
        <ToggleHarness label="Agreed" labelPlacement="start" dir={dir} />,
      );
      const label = await root
        .locator(".gridkit-forms-checkbox-label")
        .boundingBox();
      const drawn = await box(root).boundingBox();
      expect(label).not.toBeNull();
      expect(drawn).not.toBeNull();
      if (label !== null && drawn !== null) {
        expect(label.x < drawn.x).toBe(dir === "ltr");
      }
      await root.unmount();
    }
  });

  for (const severity of ["error", "warning", "info", "success"] as const) {
    test(`the box's border and focus ring take the ${severity} colour while one shows`, async ({
      mount,
      page,
    }) => {
      const root = await mount(
        <ToggleHarness
          fieldLabel="Terms"
          label="I agree"
          fieldMessage={{ text: `A ${severity} message`, severity }}
        />,
      );
      const color = await tokenColor(page, `--gridkit-${severity}`);

      await expect(root.locator(".gridkit-forms-checkbox")).toHaveClass(
        new RegExp(`is-${severity}`),
      );
      await expect(box(root)).toHaveCSS("border-top-color", color);

      await checkbox(root).focus();
      await page.keyboard.press("Shift+Tab");
      await page.keyboard.press("Tab");
      await expect(box(root)).toHaveCSS("outline-style", "solid");
      await expect(box(root)).toHaveCSS("outline-color", color);
    });
  }

  test("a checked box fills with the accent", async ({ mount, page }) => {
    const root = await mount(<ToggleHarness label="Agreed" defaultValue />);

    await expect(box(root)).toHaveCSS(
      "background-color",
      await tokenColor(page, "--gridkit-accent"),
    );
  });

  test("under forced colours a checked box fills with Highlight", async ({
    mount,
    page,
    browserName,
  }) => {
    test.skip(
      browserName !== "chromium",
      "Only Chromium emulates forced colours.",
    );
    await page.emulateMedia({ forcedColors: "active" });
    const root = await mount(<ToggleHarness label="Agreed" defaultValue />);
    const highlight = await page.evaluate(() => {
      const probe = document.createElement("span");
      probe.style.color = "Highlight";
      document.body.append(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    });

    await expect(box(root)).toHaveCSS("forced-color-adjust", "none");
    await expect(box(root)).toHaveCSS("background-color", highlight);
  });
});
