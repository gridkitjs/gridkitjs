// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import type { MountResult } from "@playwright/experimental-ct-react";
import type { Locator, Page } from "@playwright/test";
import { expect, test } from "./support/coverage";
import { eventItems, loggedEvents } from "./support/forms/loggedEvents";
import TextInputHarness from "./support/forms/TextInputHarness";
import { typeInto } from "./support/forms/typeInto";

function nameField(root: MountResult): Locator {
  return root.getByRole("textbox", { name: "Name" });
}

function box(root: MountResult): Locator {
  return root.locator(".gridkit-forms-control");
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

test.describe("TextInput", () => {
  test("draws a named textbox in the box, submitting its value by name", async ({
    mount,
  }) => {
    const root = await mount(<TextInputHarness name="name" />);

    await expect(box(root)).toHaveCount(1);
    await typeInto(nameField(root), "Ada");
    await root.getByRole("button", { name: "Submit" }).click();

    await expect(root.getByTestId("submitted")).toHaveText('[["name","Ada"]]');
  });

  test("reports every keystroke with its text details", async ({
    mount,
    page,
  }) => {
    const root = await mount(<TextInputHarness />);
    await nameField(root).click();
    await clearEvents(root);

    await page.keyboard.type("a");

    expect(await loggedEvents(root)).toMatchObject([
      { name: "onBeforeInput", text: "a", inputType: "insertText", data: "a" },
      { name: "onInput", text: "a", inputType: "insertText", data: "a" },
      { name: "onBeforeChange", value: "a" },
      { name: "onChange", value: "a", previousValue: null, source: "typing" },
      { name: "onValidate", value: "a" },
    ]);
  });

  test("the clear button fires onClear, then the clear chain, and keeps focus", async ({
    mount,
  }) => {
    const root = await mount(<TextInputHarness clearable defaultValue="Ada" />);
    const clearButton = root.getByRole("button", {
      name: "Clear",
      exact: true,
    });
    await nameField(root).click();
    await clearEvents(root);

    await clearButton.click();

    await expect(nameField(root)).toHaveValue("");
    await expect(nameField(root)).toBeFocused();
    await expect(clearButton).toHaveCount(0);
    await expect(eventItems(root)).toHaveText([
      "onClear",
      "onInput clear",
      "onBeforeChange clear",
      "onChange clear",
      "onValidate clear",
      "onBeforeCommit clear clear",
      "onCommit clear clear",
    ]);
    expect((await loggedEvents(root))[0]).toMatchObject({
      previousValue: "Ada",
      previousText: "Ada",
      native: "click",
    });
  });

  test("shows the clear button only while there is text to clear and it can be edited", async ({
    mount,
  }) => {
    const empty = await mount(<TextInputHarness clearable />);
    await expect(
      empty.getByRole("button", { name: "Clear", exact: true }),
    ).toHaveCount(0);
    await empty.unmount();

    const readOnly = await mount(
      <TextInputHarness clearable readOnly defaultValue="Ada" />,
    );
    await expect(
      readOnly.getByRole("button", { name: "Clear", exact: true }),
    ).toHaveCount(0);
  });

  test("uppercase reads the value upper-cased and leaves the caret where it was", async ({
    mount,
    page,
  }) => {
    const root = await mount(<TextInputHarness uppercase />);
    const control = nameField(root);
    await typeInto(control, "ac");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.type("b");

    await expect(control).toHaveValue("abc");
    expect(
      await control.evaluate((element: HTMLInputElement) => [
        element.selectionStart,
        getComputedStyle(element).textTransform,
      ]),
    ).toEqual([2, "uppercase"]);
    const changes = (await loggedEvents(root)).filter(
      (event) => event.name === "onChange",
    );
    expect(changes.at(-1)).toMatchObject({ value: "ABC" });

    await page.keyboard.press("Tab");
    await expect(control).toHaveValue("ABC");
  });

  test("trim drops the whitespace around the value", async ({ mount }) => {
    const root = await mount(<TextInputHarness trim />);
    await typeInto(nameField(root), " Ada ");

    const changes = (await loggedEvents(root)).filter(
      (event) => event.name === "onChange",
    );
    expect(changes.at(-1)).toMatchObject({ value: "Ada" });
  });

  test("prefix and suffix sit in the box and describe the control", async ({
    mount,
  }) => {
    const root = await mount(<TextInputHarness prefix="€" suffix="net" />);

    await expect(box(root).locator(".gridkit-forms-prefix")).toHaveText("€");
    await expect(box(root).locator(".gridkit-forms-suffix")).toHaveText("net");
    await expect(nameField(root)).toHaveAccessibleDescription(/€ net/);
  });

  test("a placeholder shows whenever the field is empty, with a top label", async ({
    mount,
  }) => {
    const root = await mount(<TextInputHarness placeholder="Ada Lovelace" />);

    await expect(nameField(root)).toHaveAttribute(
      "placeholder",
      "Ada Lovelace",
    );
    expect(await placeholderOpacity(nameField(root))).toBe("1");
  });

  test("with a floating label, the placeholder shows only while the label is raised", async ({
    mount,
  }) => {
    const root = await mount(
      <TextInputHarness labelPosition="floating" placeholder="Ada Lovelace" />,
    );
    const field = root.locator(".gridkit-forms-field");

    await expect(field).not.toHaveClass(/is-label-raised/);
    expect(await placeholderOpacity(nameField(root))).toBe("0");

    await nameField(root).focus();
    await expect(field).toHaveClass(/is-label-raised/);
    await expect.poll(() => placeholderOpacity(nameField(root))).toBe("1");
  });

  test("a prefix keeps a floating label raised", async ({ mount }) => {
    const root = await mount(
      <TextInputHarness labelPosition="floating" prefix="€" />,
    );

    await expect(root.locator(".gridkit-forms-field")).toHaveClass(
      /is-label-raised/,
    );
  });

  for (const severity of ["error", "warning", "info", "success"] as const) {
    test(`the box's border and focus ring take the ${severity} colour while one shows`, async ({
      mount,
      page,
    }) => {
      const root = await mount(
        <TextInputHarness
          fieldMessage={{ text: `A ${severity} message`, severity }}
        />,
      );
      const color = await tokenColor(page, `--gridkit-${severity}`);

      await expect(box(root)).toHaveClass(new RegExp(`is-${severity}`));
      await expect(box(root)).toHaveCSS("border-top-color", color);

      await nameField(root).focus();
      await expect(box(root)).toHaveCSS("outline-style", "solid");
      await expect(box(root)).toHaveCSS("outline-color", color);
    });
  }

  test("the box's border takes the most serious message's colour", async ({
    mount,
    page,
  }) => {
    const root = await mount(
      <TextInputHarness
        fieldMessage={[
          { text: "A note", severity: "info" },
          { text: "A warning", severity: "warning" },
        ]}
      />,
    );

    await expect(box(root)).toHaveClass(/is-warning/);
    await expect(box(root)).toHaveCSS(
      "border-top-color",
      await tokenColor(page, "--gridkit-warning"),
    );
  });

  test("a plain box's border and ring are the theme's own", async ({
    mount,
    page,
  }) => {
    const root = await mount(<TextInputHarness />);

    await expect(box(root)).toHaveCSS(
      "border-top-color",
      await tokenColor(page, "--gridkit-fg-muted"),
    );
    await nameField(root).focus();
    await expect(box(root)).toHaveCSS(
      "outline-color",
      await tokenColor(page, "--gridkit-focus-ring"),
    );
  });

  test("invalid marks the box and the control as in error, with no message", async ({
    mount,
  }) => {
    const root = await mount(<TextInputHarness invalid />);

    await expect(box(root)).toHaveClass(/is-error/);
    await expect(nameField(root)).toHaveAttribute("aria-invalid", "true");
    await expect(root.locator(".gridkit-forms-message")).toHaveCount(0);
  });

  test("required stars the label and refuses an empty commit", async ({
    mount,
    page,
  }) => {
    const root = await mount(<TextInputHarness required />);

    await expect(root.locator(".gridkit-forms-field-required")).toBeVisible();
    await expect(nameField(root)).toHaveAttribute("aria-required", "true");
    await nameField(root).click();
    await page.keyboard.press("Enter");
    await expect(root.locator(".gridkit-forms-message")).toHaveText(
      /Enter a value/,
    );
    await expect(box(root)).toHaveClass(/is-error/);
  });

  test("minLength and pattern show their messages on commit", async ({
    mount,
    page,
  }) => {
    const root = await mount(
      <TextInputHarness minLength={3} pattern="[a-z]+" />,
    );
    await typeInto(nameField(root), "A");
    await page.keyboard.press("Enter");

    await expect(root.locator(".gridkit-forms-message-text")).toHaveText([
      "Enter at least 3 characters",
      "Enter a value in the expected format",
    ]);
  });

  test("Escape puts back the last commit, unless revertOnEscape is off", async ({
    mount,
    page,
  }) => {
    const root = await mount(<TextInputHarness defaultValue="Ada" />);
    await nameField(root).click();
    await page.keyboard.press("End");
    await page.keyboard.type("x");
    await page.keyboard.press("Escape");
    await expect(nameField(root)).toHaveValue("Ada");
    await root.unmount();

    const kept = await mount(
      <TextInputHarness defaultValue="Ada" revertOnEscape={false} />,
    );
    await nameField(kept).click();
    await page.keyboard.press("End");
    await page.keyboard.type("x");
    await page.keyboard.press("Escape");
    await expect(nameField(kept)).toHaveValue("Adax");
  });

  test("selectOnFocus selects all on focus from the keyboard, not from a click", async ({
    mount,
    page,
  }) => {
    const root = await mount(
      <TextInputHarness selectOnFocus defaultValue="Ada" />,
    );
    const selection = () =>
      nameField(root).evaluate((element: HTMLInputElement) => [
        element.selectionStart,
        element.selectionEnd,
      ]);

    await nameField(root).click({ position: { x: 4, y: 8 } });
    expect(await selection()).not.toEqual([0, 3]);

    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    await expect(nameField(root)).toBeFocused();
    expect(await selection()).toEqual([0, 3]);
  });

  test("loading shows a spinner and marks the control busy", async ({
    mount,
  }) => {
    const root = await mount(<TextInputHarness loading />);

    await expect(box(root)).toHaveClass(/is-loading/);
    await expect(box(root).locator(".gridkit-forms-spinner")).toHaveCount(1);
    await expect(nameField(root)).toHaveAttribute("aria-busy", "true");
  });

  test("read-only and disabled boxes take their state classes", async ({
    mount,
  }) => {
    const readOnly = await mount(<TextInputHarness readOnly />);
    await expect(box(readOnly)).toHaveClass(/is-readonly/);
    await expect(nameField(readOnly)).toHaveAttribute("readonly", "");
    await readOnly.unmount();

    const disabled = await mount(<TextInputHarness disabled />);
    await expect(box(disabled)).toHaveClass(/is-disabled/);
    await expect(nameField(disabled)).toBeDisabled();
  });

  test("density sets the root's and the box's class and the box's height", async ({
    mount,
  }) => {
    const heights: number[] = [];
    for (const density of ["compact", "standard", "comfortable"] as const) {
      const root = await mount(<TextInputHarness density={density} />);
      const input = root.locator(".gridkit-forms-text-input");
      if (density === "standard") {
        await expect(input).not.toHaveClass(/is-(compact|comfortable)/);
      } else {
        await expect(input).toHaveClass(new RegExp(`is-${density}`));
        await expect(box(root)).toHaveClass(new RegExp(`is-${density}`));
      }
      heights.push(
        await box(root).evaluate(
          (element) => element.getBoundingClientRect().height,
        ),
      );
      await root.unmount();
    }
    expect(heights).toEqual([24, 32, 40]);
  });

  test("display mode shows the text, and a password as dots", async ({
    mount,
  }) => {
    const text = await mount(
      <TextInputHarness mode="display" defaultValue="Ada" name="name" />,
    );
    await expect(text.locator(".gridkit-forms-display-value")).toHaveText(
      "Ada",
    );
    await expect(text.getByRole("textbox", { name: "Name" })).toHaveCount(0);
    await text.unmount();

    const password = await mount(
      <TextInputHarness mode="display" type="password" defaultValue="secret" />,
    );
    await expect(password.locator(".gridkit-forms-display-value")).toHaveText(
      "••••••••",
    );
  });

  test("a bare input with a label draws a field around itself", async ({
    mount,
  }) => {
    const root = await mount(<TextInputHarness bare label="Name" required />);

    await expect(root.locator(".gridkit-forms-field")).toHaveCount(1);
    await expect(nameField(root)).toBeVisible();
    await expect(root.locator(".gridkit-forms-field-required")).toBeVisible();
  });

  test("a bare input without a label lists its own messages, described by them", async ({
    mount,
    page,
  }) => {
    const root = await mount(
      <TextInputHarness bare label="" aria-label="Name" required />,
    );

    await expect(root.locator(".gridkit-forms-field")).toHaveCount(0);
    await nameField(root).click();
    await page.keyboard.press("Enter");

    await expect(root.locator(".gridkit-forms-message")).toHaveText(
      /Enter a value/,
    );
    await expect(nameField(root)).toHaveAccessibleDescription(/Enter a value/);
  });
});

test.describe("TextInput, multiline", () => {
  function notes(root: MountResult): Locator {
    return root.locator("textarea");
  }

  test("Enter adds a line, Ctrl+Enter commits", async ({ mount, page }) => {
    const root = await mount(<TextInputHarness multiline />);
    await typeInto(notes(root), "one");
    await page.keyboard.press("Enter");
    await page.keyboard.type("two");

    await expect(notes(root)).toHaveValue("one\ntwo");
    expect(
      (await loggedEvents(root)).some((event) => event.name === "onCommit"),
    ).toBe(false);

    await page.keyboard.press("ControlOrMeta+Enter");
    await expect(eventItems(root).last()).toHaveText("onCommit typing enter");
    expect((await loggedEvents(root)).at(-1)).toMatchObject({
      value: "one\ntwo",
    });
  });

  test("grows with its text from minRows to maxRows, then scrolls", async ({
    mount,
    page,
  }) => {
    const root = await mount(
      <TextInputHarness multiline minRows={2} maxRows={4} />,
    );
    const height = () =>
      notes(root).evaluate((element) => element.getBoundingClientRect().height);
    const overflow = () =>
      notes(root).evaluate((element) => getComputedStyle(element).overflowY);

    const empty = await height();
    await typeInto(notes(root), "1");
    for (const line of ["2", "3"]) {
      await page.keyboard.press("Enter");
      await page.keyboard.type(line);
    }
    const three = await height();
    expect(three).toBeGreaterThan(empty);
    expect(await overflow()).toBe("hidden");

    for (const line of ["4", "5", "6"]) {
      await page.keyboard.press("Enter");
      await page.keyboard.type(line);
    }
    const six = await height();
    expect(six).toBeGreaterThan(three);
    expect(await overflow()).toBe("auto");
    // Four lines of 1.5 at the 16px font size, the padding and the border.
    expect(Math.round(six - empty)).toBe(2 * 24);
  });

  test("shrinks back when its text is cleared", async ({ mount, page }) => {
    const root = await mount(
      <TextInputHarness multiline clearable minRows={2} />,
    );
    const height = () =>
      notes(root).evaluate((element) => element.getBoundingClientRect().height);
    const empty = await height();
    await typeInto(notes(root), "1");
    for (const line of ["2", "3", "4"]) {
      await page.keyboard.press("Enter");
      await page.keyboard.type(line);
    }
    expect(await height()).toBeGreaterThan(empty);

    await root.getByRole("button", { name: "Clear", exact: true }).click();
    await expect.poll(height).toBe(empty);
  });

  test("a resting floating label sits on the first line", async ({ mount }) => {
    const root = await mount(
      <TextInputHarness multiline labelPosition="floating" minRows={4} />,
    );
    const [label, control] = await Promise.all([
      root.locator(".gridkit-forms-field-label").boundingBox(),
      notes(root).boundingBox(),
    ]);
    expect(label).not.toBeNull();
    expect(control).not.toBeNull();
    if (label === null || control === null) {
      return;
    }
    const labelMiddle = label.y + label.height / 2;
    // Within the first line: the padding (6px) and one line (24px).
    expect(labelMiddle - control.y).toBeGreaterThan(6);
    expect(labelMiddle - control.y).toBeLessThan(6 + 24);
  });
});

test.describe("TextInput, counter and password", () => {
  test("counts characters against maxLength, letting the text run over", async ({
    mount,
    page,
  }) => {
    const root = await mount(<TextInputHarness maxLength={5} />);
    const counter = root.locator(".gridkit-forms-text-input-counter");

    await expect(counter).toHaveText("0/5");
    await expect(counter).toHaveAttribute("aria-hidden", "true");
    await expect(nameField(root)).toHaveAccessibleDescription(
      /Up to 5 characters/,
    );

    await typeInto(nameField(root), "Lovelace");
    await expect(nameField(root)).toHaveValue("Lovelace");
    await expect(counter).toHaveText("8/5");
    await expect(counter).toHaveClass(/is-over-limit/);

    await page.keyboard.press("Enter");
    await expect(root.locator(".gridkit-forms-message")).toHaveText(
      /Enter no more than 5 characters/,
    );
  });

  test("announces what is left once typing pauses near the limit, not per keystroke", async ({
    mount,
    page,
  }) => {
    const root = await mount(<TextInputHarness maxLength={10} />);
    const announcer = root.locator(
      ".gridkit-forms-text-input [aria-live='polite']",
    );

    await typeInto(nameField(root), "Ada");
    await page.waitForTimeout(1200);
    await expect(announcer).toHaveText("");

    await page.keyboard.type("Lovela");
    await expect(announcer).toHaveText("");
    await expect(announcer).toHaveText("1 character left");

    await page.keyboard.type("ce");
    await expect(announcer).toHaveText("");
    await expect(announcer).toHaveText("1 character too many");
  });

  test("the reveal button shows the password and keeps focus and the caret", async ({
    mount,
    page,
  }) => {
    const root = await mount(<TextInputHarness type="password" />);
    const control = root.locator("input.gridkit-forms-text-input-control");
    const reveal = root.getByRole("button", { name: "Show password" });

    await expect(control).toHaveAttribute("type", "password");
    await expect(reveal).toHaveAttribute("aria-pressed", "false");
    await expect(reveal).toHaveAttribute(
      "aria-controls",
      (await control.getAttribute("id")) ?? "",
    );

    await typeInto(control, "secret");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await reveal.click();

    await expect(control).toHaveAttribute("type", "text");
    await expect(reveal).toHaveAttribute("aria-pressed", "true");
    await expect(control).toBeFocused();
    expect(
      await control.evaluate((element: HTMLInputElement) => [
        element.selectionStart,
        element.selectionEnd,
      ]),
    ).toEqual([4, 4]);

    await reveal.click();
    await expect(control).toHaveAttribute("type", "password");
  });

  test("from the keyboard, focus stays on the reveal button", async ({
    mount,
    page,
  }) => {
    const root = await mount(<TextInputHarness type="password" />);
    const reveal = root.getByRole("button", { name: "Show password" });
    await root.locator("input.gridkit-forms-text-input-control").click();
    await page.keyboard.press("Tab");
    await expect(reveal).toBeFocused();

    await page.keyboard.press("Space");

    await expect(reveal).toHaveAttribute("aria-pressed", "true");
    await expect(reveal).toBeFocused();
  });

  test("revealable={false} leaves the reveal button out", async ({ mount }) => {
    const root = await mount(
      <TextInputHarness type="password" revealable={false} />,
    );
    await expect(
      root.getByRole("button", { name: "Show password" }),
    ).toHaveCount(0);
  });
});

/** The opacity of the control's placeholder, as computed styles give it. */
function placeholderOpacity(control: Locator): Promise<string> {
  return control.evaluate(
    (element) => getComputedStyle(element, "::placeholder").opacity,
  );
}
