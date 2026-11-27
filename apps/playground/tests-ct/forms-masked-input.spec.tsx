// Coverage is only collected when tests import `test`/`expect` from
// ./support/coverage rather than directly from the CT package — see that
// file for why.
import type { MountResult } from "@playwright/experimental-ct-react";
import type { Locator, Page } from "@playwright/test";
import { expect, test } from "./support/coverage";
import { compose } from "./support/forms/compose";
import { eventItems, loggedEvents } from "./support/forms/loggedEvents";
import MaskedInputHarness from "./support/forms/MaskedInputHarness";

function code(root: MountResult, name = "Code"): Locator {
  return root.getByRole("textbox", { name, exact: true });
}

/** Empties the event log, for the action under test. */
async function clearEvents(root: MountResult): Promise<void> {
  await root.getByRole("button", { name: "Clear events" }).click();
  await expect(eventItems(root)).toHaveCount(0);
}

/** The text and caret of a control, the caret written as "|". */
function textWithCaret(control: Locator): Promise<string> {
  return control.evaluate((element) => {
    if (!(element instanceof HTMLInputElement)) {
      return "";
    }
    const caret = element.selectionStart ?? 0;
    return `${element.value.slice(0, caret)}|${element.value.slice(caret)}`;
  });
}

/** Selects `start` to `end` in the focused control. */
async function select(control: Locator, start: number, end = start) {
  await control.evaluate(
    (element, [from, to]) => {
      if (element instanceof HTMLInputElement) {
        element.setSelectionRange(from ?? 0, to ?? 0);
      }
    },
    [start, end],
  );
}

/** The values `onChange` reported, in order. */
async function changes(root: MountResult): Promise<unknown[]> {
  return (await loggedEvents(root))
    .filter((event) => event.name === "onChange")
    .map((event) => event.value);
}

/** Copies `text` through the "Next" field, so a real paste can put it anywhere. */
async function copyText(root: MountResult, page: Page, text: string) {
  const next = root.getByRole("textbox", { name: "Next" });
  await next.fill(text);
  await next.selectText();
  await page.keyboard.press("ControlOrMeta+c");
}

/** Focuses the control from the keyboard, as Tab from the field before it would. */
async function focus(control: Locator): Promise<void> {
  await control.focus();
}

test.describe("MaskedInput: typing", () => {
  test("shows the template on focus, with the caret in the first slot", async ({
    mount,
  }) => {
    const root = await mount(<MaskedInputHarness />);
    await expect(code(root)).toHaveValue("");
    await expect(code(root)).toHaveAttribute("placeholder", "(___) ___-____");

    await focus(code(root));

    expect(await textWithCaret(code(root))).toBe("(|___) ___-____");
  });

  test("fills the slots, steps over literals, and reports the value once complete", async ({
    mount,
    page,
  }) => {
    const root = await mount(<MaskedInputHarness />);
    await focus(code(root));

    await page.keyboard.type("555");
    expect(await textWithCaret(code(root))).toBe("(555) |___-____");
    await page.keyboard.type("123");
    expect(await textWithCaret(code(root))).toBe("(555) 123-|____");
    expect(await changes(root)).toEqual([]);

    await page.keyboard.type("4567");

    expect(await textWithCaret(code(root))).toBe("(555) 123-4567|");
    expect(await changes(root)).toEqual(["5551234567"]);
    expect(
      (await loggedEvents(root)).findLast((event) => event.name === "onChange"),
    ).toMatchObject({
      raw: "5551234567",
      formatted: "(555) 123-4567",
      complete: true,
      pattern: "(000) 000-0000",
    });
  });

  test("a refused character fires onBeforeInput and nothing after it", async ({
    mount,
    page,
  }) => {
    const root = await mount(<MaskedInputHarness />);
    await focus(code(root));
    await page.keyboard.type("55");
    await clearEvents(root);

    await page.keyboard.type("a");

    expect(await textWithCaret(code(root))).toBe("(55|_) ___-____");
    await expect(eventItems(root)).toHaveText(["onBeforeInput typing"]);
  });

  test("typing past the first pattern moves to the next", async ({
    mount,
    page,
  }) => {
    const root = await mount(
      <MaskedInputHarness mask={["(000) 000-0000", "+0 (000) 000-0000"]} />,
    );
    await focus(code(root));

    await page.keyboard.type("55512345678");

    await expect(code(root)).toHaveValue("+5 (551) 234-5678");
    expect(await changes(root)).toEqual(["5551234567", "55512345678"]);
  });

  test("Backspace steps back over a literal, and the characters after close up", async ({
    mount,
    page,
  }) => {
    const root = await mount(<MaskedInputHarness defaultValue="5551234567" />);
    await focus(code(root));
    await select(code(root), 6);

    await page.keyboard.press("Backspace");

    expect(await textWithCaret(code(root))).toBe("(55|1) 234-567_");
    expect(await changes(root)).toEqual([]);
    const validate = (await loggedEvents(root)).findLast(
      (event) => event.name === "onValidate",
    );
    expect(validate).toMatchObject({ value: "5551234567", complete: false });
  });

  test("deleting a selection removes its characters", async ({
    mount,
    page,
  }) => {
    const root = await mount(<MaskedInputHarness defaultValue="5551234567" />);
    await focus(code(root));
    await select(code(root), 6, 9);

    await page.keyboard.press("Delete");

    expect(await textWithCaret(code(root))).toBe("(555) |456-7___");
  });

  test("a click past the text typed puts the caret in the first empty slot", async ({
    mount,
    page,
  }) => {
    const root = await mount(<MaskedInputHarness />);
    await focus(code(root));
    await page.keyboard.type("55");
    const box = await code(root).boundingBox();
    if (box === null) {
      throw new Error("the control has no box");
    }

    await page.mouse.click(box.x + box.width - 4, box.y + box.height / 2);

    expect(await textWithCaret(code(root))).toBe("(55|_) ___-____");
  });

  test("a literal typed where it comes moves past it, leaving optional slots empty", async ({
    mount,
    page,
  }) => {
    const root = await mount(<MaskedInputHarness preset="ipv4" />);
    await focus(code(root));

    await page.keyboard.type("192.168.1.1");

    await expect(code(root)).toHaveValue("192.168.1.1__");
    expect(await changes(root)).toEqual(["192.168.1.1"]);
    await code(root).press("Tab");
    await expect(code(root)).toHaveValue("192.168.1.1");
  });

  test("a preset upper-cases letters and keeps its literals in the value", async ({
    mount,
    page,
  }) => {
    const root = await mount(<MaskedInputHarness preset="postalCodeCA" />);
    await expect(code(root)).toHaveAttribute("inputmode", "text");
    await expect(code(root)).toHaveAttribute("autocapitalize", "characters");
    await expect(code(root)).toHaveAttribute("autocomplete", "postal-code");
    await focus(code(root));

    await page.keyboard.type("k1a0b1");

    await expect(code(root)).toHaveValue("K1A 0B1");
    expect(await changes(root)).toEqual(["K1A 0B1"]);
  });

  test("an optional section: complete without it, and again with it", async ({
    mount,
    page,
  }) => {
    const root = await mount(<MaskedInputHarness preset="postalCodeUS" />);
    await focus(code(root));

    await page.keyboard.type("12345");
    expect(await changes(root)).toEqual(["12345"]);
    await page.keyboard.type("6789");

    await expect(code(root)).toHaveValue("12345-6789");
    expect(await changes(root)).toEqual(["12345", "12345-6789"]);
  });

  test("a token of the app's own", async ({ mount, page }) => {
    const root = await mount(
      <MaskedInputHarness mask="\#>HHHHHH" hexToken valueFormat="formatted" />,
    );
    await focus(code(root));

    await page.keyboard.type("ff00agb1");

    await expect(code(root)).toHaveValue("#FF00AB");
    expect(await changes(root)).toEqual(["#FF00AB"]);
  });

  test("Escape puts back the last committed value", async ({ mount, page }) => {
    const root = await mount(<MaskedInputHarness defaultValue="5551234567" />);
    await focus(code(root));
    await select(code(root), 14);
    await page.keyboard.press("Backspace");
    await expect(code(root)).toHaveValue("(555) 123-456_");

    await page.keyboard.press("Escape");

    await expect(code(root)).toHaveValue("(555) 123-4567");
  });
});

test.describe("MaskedInput: pasting and input methods", () => {
  // One test, so no other test's copy lands on the shared clipboard between
  // a copy and its paste.
  test("a paste keeps what fits, in the pattern that keeps every digit", async ({
    mount,
    page,
  }) => {
    const root = await mount(
      <MaskedInputHarness mask={["(000) 000-0000", "+0 (000) 000-0000"]} />,
    );
    await copyText(root, page, "555.123.4567");
    await focus(code(root));

    await page.keyboard.press("ControlOrMeta+v");

    await expect(code(root)).toHaveValue("(555) 123-4567");
    expect(await changes(root)).toEqual(["5551234567"]);
    expect(
      (await loggedEvents(root)).findLast((event) => event.name === "onChange"),
    ).toMatchObject({ source: "paste" });

    await copyText(root, page, "+1 (555) 123-4567");
    await code(root).selectText();
    await page.keyboard.press("ControlOrMeta+v");

    await expect(code(root)).toHaveValue("+1 (555) 123-4567");
    expect(await changes(root)).toEqual(["5551234567", "15551234567"]);
  });

  test("composed text is laid into the mask once composition ends", async ({
    mount,
    page,
    browserName,
  }) => {
    const root = await mount(<MaskedInputHarness />);
    await focus(code(root));

    await compose(page, browserName, code(root), ["５", "５５"], "５５５");

    expect(await textWithCaret(code(root))).toBe("(555) |___-____");
    const inputs = (await loggedEvents(root)).filter(
      (event) => event.name === "onInput",
    );
    expect(inputs.at(-1)).toMatchObject({
      text: "(555) ___-____",
      raw: "555",
      complete: false,
      native: "compositionend",
    });
  });

  test("composed text no slot takes is taken back once composition ends", async ({
    mount,
    page,
    browserName,
  }) => {
    const root = await mount(<MaskedInputHarness defaultValue="5551234567" />);
    await focus(code(root));
    await select(code(root), 14);
    await page.keyboard.press("Backspace");

    await compose(page, browserName, code(root), ["か"], "か");

    expect(await textWithCaret(code(root))).toBe("(555) 123-456|_");
  });

  test("composed text completes the mask and reports the value once", async ({
    mount,
    page,
    browserName,
  }) => {
    const root = await mount(<MaskedInputHarness preset="postalCodeDE" />);
    await focus(code(root));

    await compose(page, browserName, code(root), ["10"], "10115");

    await expect(code(root)).toHaveValue("10115");
    expect(await changes(root)).toEqual(["10115"]);
  });
});

test.describe("MaskedInput: value and states", () => {
  test("incomplete text shows its message on commit and keeps the last value", async ({
    mount,
    page,
  }) => {
    const root = await mount(<MaskedInputHarness name="phone" />);
    await focus(code(root));
    await page.keyboard.type("5551");

    await code(root).press("Tab");

    // Unreadable text stays as typed, its empty slots showing what is missing.
    await expect(code(root)).toHaveValue("(555) 1__-____");
    await expect(code(root)).toHaveAttribute("aria-invalid", "true");
    await expect(root.getByText("Complete this field")).toBeVisible();
    await root.getByRole("button", { name: "Submit" }).click();
    await expect(root.getByTestId("submitted")).toHaveText("none");
  });

  test("submits the raw value, or the formatted one by prop", async ({
    mount,
    page,
  }) => {
    const raw = await mount(
      <MaskedInputHarness name="phone" defaultValue="5551234567" />,
    );
    await raw.getByRole("button", { name: "Submit" }).click();
    await expect(raw.getByTestId("submitted")).toHaveText(
      '[["phone","5551234567"]]',
    );
    await raw.unmount();

    const formatted = await mount(
      <MaskedInputHarness name="phone" valueFormat="formatted" />,
    );
    await focus(code(formatted));
    await page.keyboard.type("5551234567");
    await formatted.getByRole("button", { name: "Submit" }).click();
    await expect(formatted.getByTestId("submitted")).toHaveText(
      '[["phone","(555) 123-4567"]]',
    );
  });

  test("an IBAN with wrong check digits shows the preset's message", async ({
    mount,
    page,
  }) => {
    const root = await mount(<MaskedInputHarness preset="iban" monospace />);
    await expect(root.locator(".gridkit-forms-masked-input")).toHaveClass(
      /is-monospace/,
    );
    await focus(code(root));

    await page.keyboard.type("de89370400440532013001");
    await code(root).press("Tab");

    await expect(code(root)).toHaveValue("DE89 3704 0044 0532 0130 01");
    await expect(root.getByText("Enter a valid IBAN")).toBeVisible();
  });

  test("the clear button shows only once something is typed", async ({
    mount,
    page,
  }) => {
    const root = await mount(<MaskedInputHarness clearable />);
    const clear = root.getByRole("button", { name: "Clear", exact: true });
    await focus(code(root));
    await expect(clear).toHaveCount(0);

    await page.keyboard.type("5");
    await clear.click();

    expect(await textWithCaret(code(root))).toBe("(|___) ___-____");
  });

  test("display mode shows the formatted text", async ({ mount }) => {
    const root = await mount(
      <MaskedInputHarness mode="display" defaultValue="5551234567" />,
    );

    await expect(root.locator(".gridkit-forms-display-value")).toHaveText(
      "(555) 123-4567",
    );
  });

  test("stays left to right in a right-to-left page, at the field's start", async ({
    mount,
  }) => {
    const root = await mount(
      <MaskedInputHarness dir="rtl" defaultValue="5551234567" />,
    );

    await expect(code(root)).toHaveAttribute("dir", "ltr");
    await expect(code(root)).toHaveCSS("text-align", "right");
    await expect(code(root)).toHaveAttribute("inputmode", "numeric");
  });
});
