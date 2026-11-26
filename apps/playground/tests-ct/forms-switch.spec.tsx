// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import type { MountResult } from "@playwright/experimental-ct-react";
import type { Locator, Page } from "@playwright/test";
import { expect, test } from "./support/coverage";
import { eventItems, loggedEvents } from "./support/forms/loggedEvents";
import ToggleHarness from "./support/forms/ToggleHarness";

function control(root: MountResult): Locator {
  return root.getByRole("switch");
}

function track(root: MountResult): Locator {
  return root.locator(".gridkit-forms-switch-track");
}

/** Empties the event log, for the action under test. */
async function clearEvents(root: MountResult): Promise<void> {
  await root.getByRole("button", { name: "Clear events" }).click();
  await expect(eventItems(root)).toHaveCount(0);
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

/** Where the thumb's centre sits along the track, from its left edge, in pixels. */
async function thumbOffset(root: MountResult): Promise<number> {
  const thumb = await root.locator(".gridkit-forms-switch-thumb").boundingBox();
  const drawn = await track(root).boundingBox();
  if (thumb === null || drawn === null) {
    throw new Error("The switch is not drawn.");
  }
  return thumb.x + thumb.width / 2 - drawn.x;
}

test.describe("Switch", () => {
  test("is a named switch, off unless given", async ({ mount }) => {
    const root = await mount(
      <ToggleHarness variant="switch" label="Email alerts" />,
    );

    await expect(control(root)).toHaveAccessibleName("Email alerts");
    await expect(control(root)).not.toBeChecked();
    await expect(control(root)).not.toHaveAttribute("aria-checked");
  });

  test("a press turns it on, firing the change and the commit with On", async ({
    mount,
  }) => {
    const root = await mount(
      <ToggleHarness variant="switch" label="Email alerts" />,
    );

    await control(root).click();

    await expect(control(root)).toBeChecked();
    await expect(root.locator(".gridkit-forms-switch")).toHaveClass(
      /is-checked/,
    );
    const events = (await loggedEvents(root)).filter(
      (event) => event.name !== "onFocus",
    );
    expect(events.map((event) => event.name)).toEqual([
      "onBeforeChange",
      "onChange",
      "onValidate",
      "onBeforeCommit",
      "onCommit",
    ]);
    expect(events[1]).toMatchObject({
      value: true,
      previousValue: false,
      text: "On",
      source: "toggle",
      native: "click",
    });
    expect(events[4]).toMatchObject({ trigger: "toggle", text: "On" });
  });

  test("Space flips it, reporting the key", async ({ mount, page }) => {
    const root = await mount(
      <ToggleHarness variant="switch" label="Email alerts" defaultValue />,
    );
    await control(root).focus();
    await clearEvents(root);

    await page.keyboard.press("Space");

    await expect(control(root)).not.toBeChecked();
    expect(
      (await loggedEvents(root)).find((event) => event.name === "onChange"),
    ).toMatchObject({ value: false, text: "Off", native: "keydown" });
  });

  test("readOnly refuses a press and Space, and stays focusable", async ({
    mount,
    page,
  }) => {
    const root = await mount(
      <ToggleHarness variant="switch" label="Email alerts" readOnly />,
    );
    await expect(control(root)).toHaveAttribute("aria-readonly", "true");

    await control(root).click();
    await control(root).focus();
    await page.keyboard.press("Space");

    await expect(control(root)).toBeFocused();
    await expect(control(root)).not.toBeChecked();
    expect((await loggedEvents(root)).map((event) => event.name)).not.toContain(
      "onChange",
    );
  });

  test("showStateLabel shows On or Off, hidden from screen readers", async ({
    mount,
  }) => {
    const root = await mount(
      <ToggleHarness variant="switch" label="Email alerts" showStateLabel />,
    );
    const state = root.locator(".gridkit-forms-switch-state");

    await expect(state).toHaveText("Off");
    await expect(state).toHaveAttribute("aria-hidden", "true");
    await control(root).click();
    await expect(state).toHaveText("On");
    await expect(control(root)).toHaveAccessibleName("Email alerts");
  });

  test("submits true or false", async ({ mount }) => {
    const root = await mount(
      <ToggleHarness variant="switch" label="Email alerts" name="alerts" />,
    );
    const submit = root.getByRole("button", { name: "Submit" });

    await submit.click();
    await expect(root.getByTestId("submitted")).toHaveText(
      '[["alerts","false"]]',
    );
    await control(root).click();
    await submit.click();
    await expect(root.getByTestId("submitted")).toHaveText(
      '[["alerts","true"]]',
    );
  });

  test("required must be on", async ({ mount }) => {
    const root = await mount(
      <ToggleHarness variant="switch" label="Accept" required defaultValue />,
    );

    await control(root).click();

    await expect(root.getByText("Turn this on to continue")).toBeVisible();
    await expect(control(root)).toHaveAttribute("aria-invalid", "true");
  });

  test("display mode shows On or Off", async ({ mount }) => {
    const root = await mount(
      <ToggleHarness
        variant="switch"
        label="Email alerts"
        mode="display"
        defaultValue
      />,
    );

    await expect(root.getByRole("switch")).toHaveCount(0);
    await expect(root.locator(".gridkit-forms-display-value")).toHaveText("On");
  });

  test("the thumb moves to the reading end when on", async ({ mount }) => {
    for (const dir of ["ltr", "rtl"] as const) {
      const root = await mount(
        <ToggleHarness variant="switch" label="Email alerts" dir={dir} />,
      );
      const off = await thumbOffset(root);
      await control(root).click();
      await expect(control(root)).toBeChecked();
      await expect
        .poll(async () => (await thumbOffset(root)) > off)
        .toBe(dir === "ltr");
      await root.unmount();
    }
  });

  test("on, the track takes the accent", async ({ mount, page }) => {
    const root = await mount(
      <ToggleHarness variant="switch" label="Email alerts" defaultValue />,
    );

    await expect(track(root)).toHaveCSS(
      "background-color",
      await tokenColor(page, "--gridkit-accent"),
    );
  });

  for (const severity of ["error", "warning", "info", "success"] as const) {
    test(`the track's border takes the ${severity} colour while one shows`, async ({
      mount,
      page,
    }) => {
      const root = await mount(
        <ToggleHarness
          variant="switch"
          fieldLabel="Alerts"
          label="Email alerts"
          fieldMessage={{ text: `A ${severity} message`, severity }}
        />,
      );

      await expect(track(root)).toHaveCSS(
        "border-top-color",
        await tokenColor(page, `--gridkit-${severity}`),
      );
    });
  }

  test("under reduced motion the thumb does not slide", async ({
    mount,
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const root = await mount(
      <ToggleHarness variant="switch" label="Email alerts" />,
    );

    await expect(root.locator(".gridkit-forms-switch-thumb")).toHaveCSS(
      "transition-property",
      "none",
    );
  });
});
